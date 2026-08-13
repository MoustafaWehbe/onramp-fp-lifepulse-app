import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const config = new pulumi.Config();

/**
 * This account is on AWS's *new* Free plan (credit-based, not the legacy
 * 12-month tier), which rejects RunInstances outright for any type that is not
 * free-tier eligible. Do not guess at the eligible list — query it:
 *
 *   aws ec2 describe-instance-types \
 *     --filters Name=free-tier-eligible,Values=true \
 *     --query 'InstanceTypes[].InstanceType'
 *
 * As of 2026-08 in us-east-1 that is: t3.micro, t3.small, t4g.micro, t4g.small,
 * c7i-flex.large, m7i-flex.large. Note t2.micro is NOT on it.
 *
 * t3.micro gives 1 GiB of RAM, which is enough only because the frontend build
 * happens on the developer's machine (see deploy.ts) and bootstrap.sh
 * provisions 2 GiB of swap. Rough steady-state: Postgres ~150 MB, Redis ~30 MB,
 * API ~180 MB, workers ~150 MB.
 *
 * For more headroom, `pulumi config set instanceType t3.small` gives 2 GiB and
 * is also free-tier eligible here. t4g.small is 2 GiB as well but is arm64, so
 * it additionally needs the AMI parameter in ec2.ts switched to -arm64.
 */
export const instanceType = config.get("instanceType") || "t3.micro";

/**
 * Pinned explicitly rather than taking `getSubnets().ids[0]`, which the old
 * ec2.ts did. Subnet ordering is not guaranteed stable across calls, so index 0
 * can silently shift to another AZ — which would replace the instance AND break
 * the EBS attachment, since a volume can only attach within its own AZ.
 */
export const availabilityZone = config.get("availabilityZone") || "us-east-1a";

export const repoUrl =
  config.get("repoUrl") ||
  "https://github.com/MoustafaWehbe/onramp-fp-lifepulse-app.git";
export const repoBranch = config.get("repoBranch") || "main";
export const repoDir = config.get("repoDir") || "/home/ec2-user/repo";

/** Persistent data volume for Postgres/Redis, mounted at /mnt/data. */
export const dataVolumeSize = config.getNumber("dataVolumeSize") || 8;

/** Root volume. Free tier covers 30 GiB of EBS total, so 8 + 8 leaves headroom. */
export const rootVolumeSize = config.getNumber("rootVolumeSize") || 8;

/** Optional — only needed if the AI suggestion/embedding features are used. */
export const openaiApiKey = config.getSecret("openaiApiKey");

/**
 * Synchronous presence check for the above. `openaiApiKey` is an Output that
 * resolves to undefined when unset (rather than being undefined itself), so it
 * cannot be tested with `??` or an `if`. Used only to decide whether to create
 * the SSM parameter at all — the value itself always flows through getSecret.
 */
export const hasOpenaiApiKey = config.get("openaiApiKey") !== undefined;

/** Prefix for all SSM Parameter Store entries this stack owns. */
export const ssmPrefix = "/lifepulse";

export const region = aws.config.region ?? "us-east-1";
