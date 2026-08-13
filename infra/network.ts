import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { availabilityZone } from "./config";

/**
 * The AWS-managed prefix list holding every CloudFront origin-facing IP range.
 * Using it means the API port is reachable from CloudFront and from nothing else,
 * so the origin can't be found and hammered directly by scanning for open :3000.
 *
 * Caveat: this prefix list has a *weight* of 55 against the default quota of 60
 * inbound rules per security group. That leaves room for ~5 more rules here.
 * Adding the IPv6 list (com.amazonaws.global.ipv6.cloudfront.origin-facing) is
 * another 55 and would exceed the quota — it needs an increase on L-0EA8095F.
 */
export function getCloudFrontPrefixList(): pulumi.Output<string> {
  return aws.ec2.getManagedPrefixListOutput({
    name: "com.amazonaws.global.cloudfront.origin-facing",
  }).id;
}

/**
 * Ingress is CloudFront -> :3000 and nothing else.
 *
 * Notably absent: port 22. Shell access is via SSM Session Manager, which needs
 * no inbound rule at all (the agent dials out over 443). Port 80 is gone too —
 * nginx no longer runs on this box; the SPA is served from S3/CloudFront.
 *
 * Egress must stay wide open: the instance pulls from dnf repos, GitHub, Docker
 * Hub, and the three SSM endpoints. Restricting it would need VPC endpoints at
 * ~$22/month, which defeats the point of staying in the free tier.
 */
export function createSecurityGroup(
  vpcId: pulumi.Input<string>,
): aws.ec2.SecurityGroup {
  return new aws.ec2.SecurityGroup("lifepulse-sg", {
    // Plain ASCII only: EC2 rejects a GroupDescription containing anything
    // outside ASCII (an em dash here fails with InvalidParameterValue).
    description: "Lifepulse API origin - reachable from CloudFront only",
    vpcId,
    ingress: [
      {
        // AWS restricts rule descriptions to [0-9A-Za-z_ .:/()#,@[]+=&;{}!$*-]
        // so no arrows here.
        description: "CloudFront origin-facing ranges to API port",
        protocol: "tcp",
        fromPort: 3000,
        toPort: 3000,
        prefixListIds: [getCloudFrontPrefixList()],
      },
    ],
    egress: [
      {
        description: "All outbound (dnf, GitHub, Docker Hub, SSM endpoints)",
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"],
      },
    ],
    tags: { Name: "lifepulse-sg" },
  });
}

/** The default-VPC subnet in our pinned AZ. The EBS data volume must match it. */
export function getSubnet(
  vpcId: pulumi.Input<string>,
): pulumi.Output<aws.ec2.GetSubnetResult> {
  return aws.ec2.getSubnetOutput({
    vpcId,
    availabilityZone,
    defaultForAz: true,
  });
}
