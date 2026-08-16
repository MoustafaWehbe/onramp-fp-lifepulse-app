import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { local } from "@pulumi/command";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { execFileSync } from "child_process";
import { region, repoBranch, repoDir, ssmPrefix } from "./config";

const REPO_ROOT = path.resolve(__dirname, "..");

const IGNORED = new Set([
  "node_modules",
  "dist",
  ".turbo",
  "coverage",
  ".git",
]);

/** Stable content hash of a directory tree, used as a re-run trigger. */
function hashDir(dir: string): string {
  const hash = crypto.createHash("sha256");
  const walk = (current: string): void => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort(
      (a, b) => a.name.localeCompare(b.name),
    )) {
      if (IGNORED.has(entry.name)) continue;
      const full = path.join(current, entry.name);
      hash.update(path.relative(dir, full));
      if (entry.isDirectory()) walk(full);
      else hash.update(fs.readFileSync(full));
    }
  };
  walk(dir);
  return hash.digest("hex");
}

function git(...cliArgs: string[]): string {
  return execFileSync("git", cliArgs, { cwd: REPO_ROOT }).toString().trim();
}

/**
 * The instance deploys by fetching a commit from GitHub, so whatever is only in
 * your working tree does not exist as far as the deploy is concerned.
 *
 * Checked up front because the failure is otherwise both slow and misleading:
 * the deploy runs for several minutes, then dies somewhere in the middle with
 * something like "cannot stat scripts/deploy.sh" — which looks like a bug in the
 * bootstrap rather than an unpushed commit.
 */
function resolveDeploySha(): string {
  const sha = git("rev-parse", "HEAD");

  const remoteRef = git("ls-remote", "origin", repoBranch).split(/\s+/)[0];
  if (!remoteRef) {
    throw new Error(
      `origin has no branch '${repoBranch}'. Push it, or set repoBranch to a branch that exists.`,
    );
  }
  if (remoteRef !== sha) {
    const dirty = git("status", "--porcelain");
    throw new Error(
      [
        `Local HEAD (${sha.slice(0, 12)}) does not match origin/${repoBranch} (${remoteRef.slice(0, 12)}).`,
        "The instance deploys by fetching from GitHub, so the commit must be pushed first:",
        "",
        dirty ? "    git add -A && git commit -m '...'" : "",
        `    git push origin ${repoBranch}`,
        "",
        dirty
          ? "Note: you also have uncommitted changes, which will NOT be deployed."
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return sha;
}

/** Environment shared by both commands so the AWS CLI targets the right account. */
function cliEnv(): Record<string, string> {
  const env: Record<string, string> = { AWS_REGION: region };
  if (aws.config.profile) env.AWS_PROFILE = aws.config.profile;
  return env;
}

export interface DeployArgs {
  bucketName: pulumi.Input<string>;
  distributionId: pulumi.Input<string>;
  instanceId: pulumi.Input<string>;
  /**
   * Every SSM parameter scripts/deploy.sh reads. Passed purely for ordering:
   * the deploy command reads them over the AWS API rather than through Pulumi,
   * so without an explicit dependsOn they are unrelated nodes in the graph and
   * a newly added parameter can be created *after* the deploy that needs it.
   */
  parameters: pulumi.Resource[];
}

export function createDeployments(args: DeployArgs): void {
  /**
   * The SPA is built HERE, on your machine, and uploaded — never on the
   * instance. Building it on a 1 GiB t2.micro is what was OOM-killing the old
   * bootstrap partway through, which is why the site never came up.
   */
  const webCommand = pulumi.interpolate`set -euo pipefail
echo "building web…"
npm run build --workspace=@starter-kit/web

echo "uploading to s3://${args.bucketName}"
# Fingerprinted assets first, cached forever. Vite emits content-hashed
# filenames, so these can never go stale and never need invalidating.
aws s3 sync packages/web/dist "s3://${args.bucketName}" \
  --delete \
  --exclude index.html \
  --exclude "*.map" \
  --cache-control "public,max-age=31536000,immutable"

# index.html last and uncached. Without no-store the CachingOptimized default
# TTL (24h) would keep serving an old index pointing at asset hashes that the
# --delete above just removed.
aws s3 cp packages/web/dist/index.html "s3://${args.bucketName}/index.html" \
  --cache-control "no-cache,no-store,must-revalidate" \
  --content-type "text/html"

echo "invalidating /index.html"
aws cloudfront create-invalidation \
  --distribution-id "${args.distributionId}" \
  --paths /index.html >/dev/null
echo "web deploy complete"`;

  new local.Command("deploy-web", {
    dir: REPO_ROOT,
    environment: cliEnv(),
    triggers: [
      hashDir(path.join(REPO_ROOT, "packages", "web")),
      args.bucketName,
      args.distributionId,
    ],
    // create and update MUST be identical. With no `update`, a trigger change
    // *replaces* the resource — running `delete` then `create` — rather than
    // re-running in place.
    create: webCommand,
    update: webCommand,
  });

  const sha = resolveDeploySha();

  /**
   * The API deploy goes through SSM Run Command. Pulumi never touches the
   * instance resource itself, so this causes no stop/start and no replacement.
   *
   * Note the deliberate absence of `aws ssm wait command-executed`: it polls 20
   * times at 5s intervals and gives up after 100 seconds with exit code 255. An
   * npm ci on a t2.micro comfortably exceeds that, so it would fail `pulumi up`
   * on deploys that actually succeeded. Hence the manual poll below.
   */
  /**
   * AWS-RunShellScript joins the `commands` array with newlines into a single
   * script, so each element is one line. Individual elements must not contain
   * literal newlines (they are JSON strings), but the array as a whole gives us
   * an ordinary multi-line script.
   *
   * The first half is a readiness gate. Pulumi dispatches this the moment the
   * instance resource is created, which is minutes before cloud-init has
   * finished installing git, node and docker and mounting /mnt/data — without
   * the gate the deploy fails with "sudo: git: command not found".
   *
   * deploy.sh is copied to /opt before it runs so that the `git reset` above it
   * cannot rewrite the file bash is part-way through reading.
   */
  const remoteLines = [
    "set -euxo pipefail",
    // Blocks until cloud-init finishes. `|| true` because it exits non-zero when
    // user-data failed, and we want the specific diagnostics below instead.
    "cloud-init status --wait >/dev/null 2>&1 || true",
    "for _ in $(seq 1 90); do",
    "  if [ -f /var/lib/lifepulse/bootstrap-complete ]; then break; fi",
    "  sleep 10",
    "done",
    'if [ ! -f /var/lib/lifepulse/bootstrap-complete ]; then',
    '  echo "bootstrap did not complete; last 40 lines of /var/log/user-data.log:" >&2',
    "  tail -40 /var/log/user-data.log >&2 || true",
    "  exit 1",
    "fi",
    `cd ${repoDir}`,
    `sudo -u ec2-user git -C ${repoDir} fetch origin ${repoBranch}`,
    `sudo -u ec2-user git -C ${repoDir} reset --hard ${sha}`,
    `install -m 755 ${repoDir}/scripts/deploy.sh /opt/lifepulse/deploy.sh`,
    `REPO_DIR=${repoDir} SSM_PREFIX=${ssmPrefix} /opt/lifepulse/deploy.sh`,
  ];

  if (remoteLines.some((l) => l.includes("'"))) {
    throw new Error(
      "remote script lines must not contain single quotes — the JSON payload " +
        "below is embedded in a single-quoted shell string",
    );
  }

  const ssmParameters = JSON.stringify({
    commands: remoteLines,
    executionTimeout: ["3600"],
  });

  const apiCommand = pulumi.interpolate`set -euo pipefail

# A freshly created instance takes a little while to register with SSM. Without
# this, send-command fails outright with InvalidInstanceId.
echo "waiting for the instance to register with SSM..."
for _ in $(seq 1 60); do
  if aws ssm describe-instance-information \
      --filters "Key=InstanceIds,Values=${args.instanceId}" \
      --query 'InstanceInformationList[0].PingStatus' --output text 2>/dev/null \
      | grep -q Online; then
    break
  fi
  sleep 10
done

CID=$(aws ssm send-command \
  --instance-ids "${args.instanceId}" \
  --document-name AWS-RunShellScript \
  --comment "pulumi deploy ${sha.slice(0, 12)}" \
  --parameters '${ssmParameters}' \
  --query Command.CommandId --output text)

echo "SSM command $CID dispatched; waiting for bootstrap then deploying..."

# 480 * 5s = 40 minutes, enough to cover a full cloud-init on a cold instance
# plus the deploy itself.
for _ in $(seq 1 480); do
  STATUS=$(aws ssm get-command-invocation \
    --command-id "$CID" --instance-id "${args.instanceId}" \
    --query Status --output text 2>/dev/null || echo Pending)
  case "$STATUS" in
    Success)
      aws ssm get-command-invocation --command-id "$CID" \
        --instance-id "${args.instanceId}" \
        --query StandardOutputContent --output text
      exit 0 ;;
    Failed|Cancelled|TimedOut)
      echo "SSM command $STATUS" >&2
      aws ssm get-command-invocation --command-id "$CID" \
        --instance-id "${args.instanceId}" \
        --query StandardOutputContent --output text >&2
      aws ssm get-command-invocation --command-id "$CID" \
        --instance-id "${args.instanceId}" \
        --query StandardErrorContent --output text >&2
      exit 1 ;;
  esac
  sleep 5
done

echo "timed out waiting for SSM command $CID" >&2
exit 1`;

  new local.Command(
    "deploy-api",
    {
      environment: cliEnv(),
      // The instance pulls this exact commit from GitHub, so the SHA must already
      // be pushed. If it is not, `git reset --hard` fails and the deploy errors out
      // rather than silently shipping something else.
      triggers: [sha, args.instanceId],
      create: apiCommand,
      update: apiCommand,
    },
    { dependsOn: args.parameters },
  );
}
