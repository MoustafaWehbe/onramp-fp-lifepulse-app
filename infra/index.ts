import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { ssmPrefix } from "./config";
import { createSecurityGroup, getSubnet } from "./network";
import { createInstanceProfile } from "./iam";
import { createSecrets } from "./secrets";
import { createDataVolume, attachDataVolume } from "./storage";
import { createInstance } from "./ec2";
import { createCdn } from "./cdn";
import { createDeployments } from "./deploy";

const vpc = aws.ec2.getVpcOutput({ default: true });
const subnet = getSubnet(vpc.id);

const securityGroup = createSecurityGroup(vpc.id);
const instanceProfile = createInstanceProfile();
const secrets = createSecrets();

const { instance, eip } = createInstance({
  securityGroupId: securityGroup.id,
  subnetId: subnet.id,
  instanceProfileName: instanceProfile.name,
});

const dataVolume = createDataVolume();
attachDataVolume(dataVolume.id, instance.id);

const { bucket, distribution } = createCdn({
  // The Elastic IP's public DNS name, not the raw IP: CloudFront origins must be
  // resolvable hostnames. It resolves to the public address from outside the VPC
  // (CloudFront's edges are outside), and it is stable because the EIP is.
  apiOriginDomain: eip.publicDns,
  originSecret: secrets.originSecret,
});

const publicOrigin = pulumi.interpolate`https://${distribution.domainName}`;

// Read by scripts/deploy.sh to populate CORS_ORIGIN. Not a secret, but it lives
// under the same prefix so the instance role's single grant covers it.
new aws.ssm.Parameter("param-public-origin", {
  name: `${ssmPrefix}/PUBLIC_ORIGIN`,
  type: aws.ssm.ParameterType.String,
  value: publicOrigin,
});

createDeployments({
  bucketName: bucket.bucket,
  distributionId: distribution.id,
  instanceId: instance.id,
});

export const url = publicOrigin;
export const cloudfrontDomain = distribution.domainName;
export const instanceId = instance.id;
export const apiOriginDomain = eip.publicDns;
export const elasticIp = eip.publicIp;
export const spaBucket = bucket.bucket;
export const dataVolumeId = dataVolume.id;

/** Convenience: `pulumi stack output sshCommand` then paste it. */
export const sshCommand = pulumi.interpolate`aws ssm start-session --target ${instance.id}`;
