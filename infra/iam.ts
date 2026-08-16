import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { ssmPrefix } from "./config";

/**
 * Instance profile granting exactly three things:
 *   1. SSM Session Manager + Run Command  (replaces SSH entirely)
 *   2. Reading this stack's SecureString parameters
 *   3. kms:Decrypt, without which #2 silently fails
 *
 * Amazon Linux 2023 ships amazon-ssm-agent preinstalled and enabled, so there is
 * nothing to install in userData — attaching this profile is sufficient.
 */
export function createInstanceProfile(): aws.iam.InstanceProfile {
  const role = new aws.iam.Role("lifepulse-instance-role", {
    description: "Lifepulse EC2: SSM access + Parameter Store reads",
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
      Service: "ec2.amazonaws.com",
    }),
    managedPolicyArns: [aws.iam.ManagedPolicy.AmazonSSMManagedInstanceCore],
  });

  const identity = aws.getCallerIdentityOutput({});
  const region = aws.getRegionOutput({});

  new aws.iam.RolePolicy("lifepulse-instance-policy", {
    role: role.id,
    policy: pulumi
      .all([identity.accountId, region.id])
      .apply(([accountId, regionId]) =>
        JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Sid: "ReadAppParameters",
              Effect: "Allow",
              Action: [
                "ssm:GetParameter",
                "ssm:GetParameters",
                "ssm:GetParametersByPath",
              ],
              Resource: `arn:aws:ssm:${regionId}:${accountId}:parameter${ssmPrefix}/*`,
            },
            {
              // GetParameter --with-decryption on a SecureString encrypted with
              // the default alias/aws/ssm key fails without this. It is the step
              // that is most often forgotten, and the error message is unhelpful.
              Sid: "DecryptSecureStrings",
              Effect: "Allow",
              Action: ["kms:Decrypt"],
              Resource: "*",
              Condition: {
                StringEquals: {
                  "kms:ViaService": `ssm.${regionId}.amazonaws.com`,
                },
              },
            },
          ],
        }),
      ),
  });

  return new aws.iam.InstanceProfile("lifepulse-instance-profile", {
    role: role.name,
  });
}
