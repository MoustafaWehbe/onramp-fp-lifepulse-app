# Infra

AWS infrastructure for the Lifepulse app, provisioned with Pulumi.

`pulumi up` is the single entry point: it provisions infrastructure **and** deploys
the app. Critically, deploying does **not** touch the EC2 instance — see
[Why nothing restarts anymore](#why-nothing-restarts-anymore).

## Architecture

```
Browser
  └─ https://<id>.cloudfront.net            free TLS, no domain required
       ├─ /*      → S3 (private, OAC)       the SPA, cached at the edge
       │                                    a CloudFront Function rewrites
       │                                    extensionless paths to /index.html
       └─ /api/*  → EC2 :3000               CachingDisabled + AllViewer, so
          /health                           cookies and Authorization pass through

EC2 t2.micro                 security group: :3000 from CloudFront ONLY. No SSH port.
  ├─ lifepulse-api           systemd, tsx server.ts
  ├─ lifepulse-workers       systemd, tsx index.ts        (BullMQ reminders + email)
  ├─ lifepulse-datastores    systemd, docker compose up   (Postgres 16, Redis 7)
  ├─ 2 GiB swap
  └─ /mnt/data ← EBS 8 GiB gp3, a separate protected resource
                 Postgres and Redis bind-mount into it, so rebuilding
                 or replacing the instance does not touch the database.
```

| File | Role |
| --- | --- |
| `index.ts` | Wires everything together, exports stack outputs |
| `config.ts` | Stack config and defaults |
| `network.ts` | Security group (CloudFront prefix list) and subnet lookup |
| `iam.ts` | Instance profile: SSM + Parameter Store + KMS decrypt |
| `secrets.ts` | Generates secrets, stores them as SSM SecureStrings |
| `storage.ts` | The persistent EBS data volume and its attachment |
| `ec2.ts` | The instance and its Elastic IP |
| `cdn.ts` | S3 bucket, OAC, CloudFront distribution and behaviors |
| `userData.ts` | Renders `scripts/bootstrap.sh` into user-data |
| `scripts/bootstrap.sh` | First-boot machine setup. Runs exactly once |
| `../scripts/deploy.sh` | Per-release deploy. Runs on every `pulumi up`, via SSM |

## Prerequisites

- Pulumi, Node.js >= 20, and the AWS CLI
- AWS credentials configured for the profile named in `Pulumi.dev.yaml` (`personal`)
- No EC2 key pair is needed. Shell access is via SSM Session Manager.

## Setup

```bash
cd infra
npm install

pulumi stack init dev          # if the stack does not exist yet
pulumi up
```

Optional config:

```bash
pulumi config set --secret onramp-fp-lifepulse-app:openaiApiKey sk-...   # AI features
pulumi config set onramp-fp-lifepulse-app:instanceType t3.small          # bigger box
pulumi config set onramp-fp-lifepulse-app:repoBranch my-branch
```

Email, for the habit reminders and the daily re-engagement sweep. Without
`resendApiKey` the app falls back to the console provider — messages are logged
on the box and nothing is sent, which is the default:

```bash
pulumi config set --secret onramp-fp-lifepulse-app:resendApiKey re_...
pulumi config set onramp-fp-lifepulse-app:emailProvider resend           # or brevo / console
pulumi config set onramp-fp-lifepulse-app:emailFrom "Kultivar <onboarding@resend.dev>"
pulumi config set onramp-fp-lifepulse-app:reengagementEnabled false      # stop the daily sweep
```

Note that Resend will only deliver to your own account address until you verify
a sending domain, so `onboarding@resend.dev` is fine for a smoke test and not
for real users.

Everything else — JWT secrets, the Postgres password, the CloudFront origin
shared secret — is generated automatically and stored as SSM SecureStrings under
`/lifepulse/*`. There is nothing to set by hand and nothing to leak into git.

`APP_URL` is not configurable: it is set to the CloudFront origin at deploy
time, since links in outbound email have to point at the deployed site rather
than at the `localhost:5173` the code defaults to.

## Deploying

```bash
cd infra && pulumi up
```

- **Frontend**: built on *your machine*, synced to S3, and `/index.html`
  invalidated. Re-runs when anything under `packages/web` changes.
- **Backend**: an SSM Run Command tells the instance to fetch your current commit,
  reinstall dependencies, run migrations, and restart both services. Re-runs when
  `git rev-parse HEAD` changes.

The commit must already be pushed — the instance pulls it from GitHub. If it is
not, `git reset --hard` fails on the box and the deploy errors out rather than
silently shipping something else.

## Why nothing restarts anymore

Previously, `userData` was passed inline to `aws.ec2.Instance` with no
`ignoreChanges`. Editing it produced an *in-place update*, and because
`ModifyInstanceAttribute` requires a stopped instance, the AWS provider would
**stop the instance, write the attribute, and start it again**. You got downtime
and a new public IP — and since cloud-init never re-runs user-data on an existing
instance, the edit had no effect anyway.

Three changes fix this:

1. **`ignoreChanges: ["ami", "userData"]`** on the instance. The diff is
   suppressed entirely: no diff, no update, no stop/start.
2. **The AMI comes from an SSM public parameter**, not
   `getAmi({mostRecent: true})`. The old lookup produced a *replacement* diff
   every time Amazon published a new AL2023 image, which would have destroyed the
   instance — and the database with it — on an unrelated `pulumi up`.
3. **App deploys go through SSM Run Command**, so Pulumi never needs to modify
   the instance to ship a release.

The tradeoff to remember: **editing `scripts/bootstrap.sh` no longer affects a
running instance.** It is a one-time bootstrap. To re-bootstrap, replace the
instance deliberately (see below) — which is safe, because the data volume
survives.

## Operations

```bash
pulumi stack output                          # url, instanceId, elasticIp, …

aws ssm start-session --target $(pulumi stack output instanceId)   # shell, no SSH

# on the box
sudo journalctl -u lifepulse-api -f
sudo journalctl -u lifepulse-workers -f
sudo systemctl status lifepulse-datastores
cd /home/ec2-user/repo && sudo docker compose ps
df -h /mnt/data                              # the persistent volume
```

Rebuild the instance from scratch (the database survives — but take a dump first
anyway):

```bash
cd /home/ec2-user/repo
sudo docker compose exec -T postgres pg_dump -U postgres starter_kit > backup.sql

pulumi destroy --target "$(pulumi stack --show-urns | grep lifepulse-instance | ...)"
pulumi up
```

## Cost

This account is on AWS's **new Free plan** — credit-based, not the legacy
12-month free tier. Check its state with:

```bash
aws freetier get-account-plan-state
```

As of 2026-08-12: `FREE`/`ACTIVE`, **$119.93 credits remaining, expiring
2027-01-16**. Cost Explorer shows **$0.00** of actual spend since the account was
created, including for the EC2 instance.

The important consequence of this plan: **`RunInstances` is rejected outright for
any instance type that is not free-tier eligible.** Do not assume a type is
eligible — ask the API:

```bash
aws ec2 describe-instance-types \
  --filters Name=free-tier-eligible,Values=true \
  --query 'InstanceTypes[].InstanceType' --output text
```

In `us-east-1` today that returns `t3.micro`, `t3.small`, `t4g.micro`,
`t4g.small`, `c7i-flex.large`, `m7i-flex.large`. **`t2.micro` is not on the
list** — attempting it fails with `InvalidParameterCombination`.

| Resource | Cost while the Free plan is active |
| --- | --- |
| EC2 `t3.micro` | $0.00 (free-tier eligible) |
| EBS 8 GiB root + 8 GiB data | $0.00 (within the 30 GiB allowance) |
| Elastic IP, attached to a running instance | $0.00 |
| CloudFront, 1 TB + 10M requests | $0.00 — always free, no expiry |
| CloudFront Functions, 2M invocations | $0.00 — always free |
| S3 storage for the SPA | $0.00 |
| SSM Session Manager, Run Command, Parameter Store (Standard) | $0.00 |

After the plan expires on **2027-01-16** the account converts to paid, and this
stack becomes roughly **$13/month** — about $7.59 for the instance, $3.65 for the
public IPv4 address (charged on all accounts since Feb 2024), and ~$1.30 for EBS.
Set a billing alarm before then.

Notes:

- Associating an Elastic IP releases the instance's auto-assigned public address,
  so this is one billed IPv4, not two. The genuinely-free alternatives (private
  subnet + NAT gateway, or CloudFront VPC origins) cost $22–33/month instead.
- `t3.small` (2 GiB) is also free-tier eligible here and is a one-line change:
  `pulumi config set onramp-fp-lifepulse-app:instanceType t3.small`. Worth doing
  if the box feels tight — 1 GiB is workable but not generous.
- `t4g.small` (2 GiB, arm64) is eligible too, but additionally requires switching
  the AMI parameter in `ec2.ts` to the `-arm64` variant.

## Security

- Port 22 is closed. Access is via SSM Session Manager.
- Port 3000 accepts traffic only from the `com.amazonaws.global.cloudfront.origin-facing`
  managed prefix list.
- CloudFront sends an `x-origin-secret` header that the API requires
  (`packages/api/src/middleware/origin-guard.ts`), so a third party who discovers
  the origin hostname still cannot use it through their own distribution.
- Secrets live in SSM Parameter Store and are written to `/etc/lifepulse/env`
  (mode 0600) at deploy time. They are **not** in user-data, which any process on
  the instance can read from IMDS with no credentials.
- IMDSv2 is required, which closes the SSRF-to-credential-theft path.
- The S3 bucket is private, reachable only through CloudFront via OAC.

**Known limitation:** the CloudFront → EC2 leg is plain HTTP, so JWT cookies
traverse it unencrypted. CloudFront will not accept a self-signed origin
certificate, so fixing this properly requires a domain you own plus a real
certificate on the instance. The prefix-list restriction and the shared secret
mitigate discovery and misuse, but not interception.

## Troubleshooting

| Symptom | Where to look |
| --- | --- |
| Instance never finishes bootstrapping | `sudo cat /var/log/user-data.log` |
| Deploy fails | The `pulumi up` output includes the full SSM stdout/stderr |
| API 502 through CloudFront | `sudo systemctl status lifepulse-api`; check the SG still resolves the prefix list |
| API 403 on everything | `ORIGIN_SECRET` mismatch — redeploy to re-sync `/etc/lifepulse/env` |
| SPA loads but deep links 403 | The CloudFront Function is not attached to the default behavior |
| `/api/*` returns HTML | A `customErrorResponses` rule was added — it is distribution-wide and breaks API error codes |
| Data volume missing | `lsblk`, then `sudo mount -a`; `nofail` in fstab keeps the box bootable |
