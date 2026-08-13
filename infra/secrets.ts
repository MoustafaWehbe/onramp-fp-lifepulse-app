import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as random from "@pulumi/random";
import { hasOpenaiApiKey, openaiApiKey, ssmPrefix } from "./config";

export interface AppSecrets {
  /** Shared secret CloudFront sends as x-origin-secret; the API rejects requests without it. */
  originSecret: pulumi.Output<string>;
  /** Postgres superuser password. Only applied on first DB init — see note below. */
  postgresPassword: pulumi.Output<string>;
  parameterArns: pulumi.Output<string>[];
}

/**
 * Secrets live in SSM Parameter Store (Standard tier — free) and are pulled onto
 * the box at deploy time into /etc/lifepulse/env (mode 0600).
 *
 * They are NOT baked into userData like the old setup did. EC2 user-data is
 * readable by any process on the instance via IMDS with no credentials at all
 * (curl http://169.254.169.254/latest/user-data), so the previous
 * JWT_SECRET=change-me-... / postgres:postgres block was effectively public to
 * anything running there, and it was stored in plaintext in Pulumi state too.
 *
 * Generating them with @pulumi/random rather than requiring config means there
 * is nothing for you to set by hand and nothing to leak into git. The values are
 * created once and then stable for the life of the stack.
 */
export function createSecrets(): AppSecrets {
  // special: false keeps these safe to drop into a DATABASE_URL and an env file
  // without URL-encoding or shell-quoting concerns.
  const mk = (name: string, length = 64) =>
    new random.RandomPassword(name, { length, special: false }).result;

  const jwtSecret = mk("jwt-secret");
  const jwtRefreshSecret = mk("jwt-refresh-secret");
  const originSecret = mk("origin-secret", 48);
  // Postgres only reads POSTGRES_PASSWORD when it initialises an empty data
  // directory. Since the data dir now lives on a persistent EBS volume, this
  // value is what the DB was created with and must not be regenerated — hence
  // a stable RandomPassword rather than anything time- or input-derived.
  const postgresPassword = mk("postgres-password", 32);

  const put = (name: string, key: string, value: pulumi.Input<string>) =>
    new aws.ssm.Parameter(name, {
      name: `${ssmPrefix}/${key}`,
      type: aws.ssm.ParameterType.SecureString,
      value,
    });

  const params = [
    put("param-jwt-secret", "JWT_SECRET", jwtSecret),
    put("param-jwt-refresh-secret", "JWT_REFRESH_SECRET", jwtRefreshSecret),
    put("param-origin-secret", "ORIGIN_SECRET", originSecret),
    put("param-postgres-password", "POSTGRES_PASSWORD", postgresPassword),
  ];

  // Only created when actually configured. SSM rejects an empty parameter value
  // ("Member must have length greater than or equal to 1"), so there is no
  // placeholder to write when the key is unset — scripts/deploy.sh treats a
  // missing parameter as an empty value instead.
  //
  // The presence check has to be a plain config.get: config.getSecret returns an
  // Output that resolves to undefined when unset rather than undefined itself,
  // so it cannot be branched on synchronously. The value below still goes
  // through requireSecret, so it stays encrypted in state.
  if (hasOpenaiApiKey) {
    params.push(
      put(
        "param-openai-api-key",
        "OPENAI_API_KEY",
        openaiApiKey as pulumi.Output<string>,
      ),
    );
  }

  return {
    originSecret,
    postgresPassword,
    parameterArns: params.map((p) => p.arn),
  };
}
