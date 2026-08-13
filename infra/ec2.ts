import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { instanceType, rootVolumeSize } from "./config";
import { buildUserData } from "./userData";

export interface InstanceArgs {
  securityGroupId: pulumi.Input<string>;
  subnetId: pulumi.Input<string>;
  instanceProfileName: pulumi.Input<string>;
}

export interface Compute {
  instance: aws.ec2.Instance;
  eip: aws.ec2.Eip;
}

export function createInstance(args: InstanceArgs): Compute {
  /**
   * Resolved from the SSM public parameter rather than getAmi({mostRecent:true}).
   *
   * The old lookup produced a *replacement* diff every time Amazon published a
   * new AL2023 image — meaning a routine `pulumi up` on some unrelated Tuesday
   * would destroy and recreate the instance. Combined with ignoreChanges below,
   * the AMI is now resolved once at creation and never churns.
   *
   * x86_64 because the instance is t2.micro (Xen, Intel). Switching to a Graviton
   * type later means changing this to .../al2023-ami-kernel-default-arm64.
   */
  const amiId = aws.ssm.getParameterOutput({
    name: "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64",
  }).value;

  const instance = new aws.ec2.Instance(
    "lifepulse-instance",
    {
      instanceType,
      ami: amiId,
      subnetId: args.subnetId,
      vpcSecurityGroupIds: [args.securityGroupId],
      iamInstanceProfile: args.instanceProfileName,
      associatePublicIpAddress: true,
      // IMDSv2 required. Free, and it closes off the SSRF-to-credential-theft
      // path that IMDSv1's unauthenticated GET makes trivial.
      metadataOptions: {
        httpEndpoint: "enabled",
        httpTokens: "required",
      },
      rootBlockDevice: {
        volumeType: "gp3",
        volumeSize: rootVolumeSize,
        encrypted: true,
        deleteOnTermination: true,
      },
      userData: buildUserData(),
      tags: { Name: "lifepulse-ec2" },
    },
    {
      /**
       * This is the fix for "every time I change anything the instance restarts".
       *
       * userData is passed inline. Without ignoreChanges, editing it produces an
       * in-place update — and because ModifyInstanceAttribute requires a stopped
       * instance, the AWS provider STOPS the instance, writes the attribute, and
       * STARTS it again. You take downtime, and cloud-init does not re-run
       * user-data on an existing instance, so the edit silently has no effect.
       * Worst of both worlds.
       *
       * Ignoring the property suppresses the diff entirely: no diff, no update,
       * no stop/start. userData becomes what it should always have been — a
       * one-time bootstrap. Everything that needs to change after boot goes
       * through the SSM deploy path in deploy.ts instead.
       *
       * Consequence worth remembering: editing userData.ts now has NO effect on
       * a running instance. To re-bootstrap you must deliberately replace it
       * (`pulumi destroy --target <instance urn>` then `pulumi up`), which is
       * safe because the database lives on a separate volume.
       */
      ignoreChanges: ["ami", "userData"],
      /**
       * Works around pulumi/pulumi-aws#2769: on replacement, Pulumi otherwise
       * creates the new instance before tearing down the old VolumeAttachment
       * and the attach fails with "vol-… is already attached to an instance".
       */
      deleteBeforeReplace: true,
    },
  );

  /**
   * An Elastic IP, because CloudFront needs a *stable* origin hostname and the
   * auto-assigned public IP changes on every stop/start.
   *
   * Associating an EIP releases the auto-assigned address, so this is one billed
   * IPv4, not two. Inside the 12-month free tier the 750h/month allowance covers
   * it; after that it is ~$3.65/month. Every genuinely-free alternative (private
   * subnet + NAT gateway, or CloudFront VPC origins) costs $22-33/month instead.
   */
  const eip = new aws.ec2.Eip("lifepulse-eip", {
    domain: "vpc",
    instance: instance.id,
    tags: { Name: "lifepulse-eip" },
  });

  return { instance, eip };
}
