#!/bin/bash
#
# On-instance deploy. Invoked via SSM Run Command by `pulumi up` (see
# infra/deploy.ts) — not by cloud-init, and never by hand in the normal flow.
#
# Runs as root. Assumes the repo has already been fetched to the target commit by
# the caller, and that this file was copied to /opt/lifepulse/deploy.sh before
# execution (so that a `git reset` mid-deploy cannot rewrite the script that bash
# is currently reading).
#
set -euo pipefail

REPO_DIR="${REPO_DIR:-/home/ec2-user/repo}"
SSM_PREFIX="${SSM_PREFIX:-/lifepulse}"
ENV_FILE="/etc/lifepulse/env"
APP_USER="ec2-user"

log() { echo "[deploy] $*"; }

cd "$REPO_DIR"

# ─── Dependencies ─────────────────────────────────────────────────────────────
# @starter-kit/web is deliberately excluded: its dev dependencies (vite, tailwind,
# the whole Radix tree, vitest) are the bulk of the install and are never needed
# here. The SPA is built on the developer's machine and uploaded to S3.
#
# Dev dependencies of the remaining workspaces ARE required — tsx is what runs
# both services, and sequelize-cli runs the migrations.
log "installing dependencies"
sudo -u "$APP_USER" npm ci \
  --include-workspace-root \
  --workspace=@starter-kit/api \
  --workspace=@starter-kit/workers \
  --workspace=@starter-kit/shared

# Both systemd units invoke this binary by absolute path. Fail here, with a clear
# message, rather than leaving systemd to report a bare status=203/EXEC.
if [ ! -x "$REPO_DIR/node_modules/.bin/tsx" ]; then
  log "FATAL: $REPO_DIR/node_modules/.bin/tsx missing after npm ci"
  exit 1
fi

# ─── Secrets ──────────────────────────────────────────────────────────────────
log "fetching secrets from SSM Parameter Store"
# IMDSv2 is enforced on this instance (see infra/ec2.ts), so the token dance is
# mandatory — an unauthenticated GET to 169.254.169.254 just returns 401.
IMDS_TOKEN=$(curl -sf -X PUT http://169.254.169.254/latest/api/token \
  -H 'X-aws-ec2-metadata-token-ttl-seconds: 60')
REGION=$(curl -sf -H "X-aws-ec2-metadata-token: $IMDS_TOKEN" \
  http://169.254.169.254/latest/meta-data/placement/region)

get_param() {
  aws ssm get-parameter --region "$REGION" --name "$SSM_PREFIX/$1" \
    --with-decryption --query Parameter.Value --output text
}

# For parameters that legitimately may not exist. SSM rejects empty values, so
# "unset" is represented by the parameter being absent rather than by "".
get_param_optional() {
  aws ssm get-parameter --region "$REGION" --name "$SSM_PREFIX/$1" \
    --with-decryption --query Parameter.Value --output text 2>/dev/null || echo ""
}

JWT_SECRET=$(get_param JWT_SECRET)
JWT_REFRESH_SECRET=$(get_param JWT_REFRESH_SECRET)
ORIGIN_SECRET=$(get_param ORIGIN_SECRET)
POSTGRES_PASSWORD=$(get_param POSTGRES_PASSWORD)
OPENAI_API_KEY=$(get_param_optional OPENAI_API_KEY)
PUBLIC_ORIGIN=$(get_param PUBLIC_ORIGIN)

umask 077
cat > "$ENV_FILE" <<ENV
NODE_ENV=production
PORT=3000
# Read by docker-compose.yml. This is the dedicated EBS volume, so the database
# survives instance replacement.
DATA_DIR=/mnt/data
CORS_ORIGIN=$PUBLIC_ORIGIN
DATABASE_URL=postgresql://postgres:$POSTGRES_PASSWORD@localhost:5433/starter_kit
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=starter_kit
POSTGRES_HOST=localhost
POSTGRES_PORT=5433
REDIS_URL=redis://localhost:6379
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_REFRESH_EXPIRES_IN=7d
ORIGIN_SECRET=$ORIGIN_SECRET
OPENAI_API_KEY=$OPENAI_API_KEY
ENV
chmod 600 "$ENV_FILE"

# The API and workers also load a root .env via dotenv. systemd's EnvironmentFile
# already supplies everything, and dotenv does not override existing variables,
# so this symlink only keeps ad-hoc commands (npm run db:migrate below) working.
ln -sf "$ENV_FILE" "$REPO_DIR/.env"
chown -h "$APP_USER:$APP_USER" "$REPO_DIR/.env"

# ─── Datastores ───────────────────────────────────────────────────────────────
log "starting datastores"
# `systemctl enable` registers it for boot; the compose command is run directly
# rather than via `systemctl start` because the unit is a RemainAfterExit
# oneshot — once active, starting it again is a no-op, so changes to
# docker-compose.yml would never be applied. `compose up -d` is idempotent and
# only recreates containers whose config actually changed.
systemctl enable lifepulse-datastores
docker compose up -d

log "waiting for Postgres"
for i in $(seq 1 60); do
  if docker compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
    log "Postgres ready"
    break
  fi
  if [ "$i" -eq 60 ]; then
    log "FATAL: Postgres did not become ready within 120s"
    docker compose logs --tail=50 postgres >&2
    exit 1
  fi
  sleep 2
done

# ─── Migrations ───────────────────────────────────────────────────────────────
# .sequelizerc resolves its paths relative to the working directory, so this must
# run from packages/api. Migrations are plain .js and are not compiled.
log "running migrations"
cd "$REPO_DIR/packages/api"
sudo -u "$APP_USER" --preserve-env=PATH npm run db:migrate
cd "$REPO_DIR"

# ─── Services ─────────────────────────────────────────────────────────────────
log "restarting services"
systemctl enable lifepulse-api lifepulse-workers
systemctl restart lifepulse-api lifepulse-workers

# Give them a moment to fall over if they are going to, so a broken deploy fails
# the pulumi up rather than reporting success and dying seconds later.
sleep 8
systemctl is-active --quiet lifepulse-api || {
  log "FATAL: lifepulse-api is not running"
  journalctl -u lifepulse-api -n 50 --no-pager >&2
  exit 1
}
systemctl is-active --quiet lifepulse-workers || {
  log "FATAL: lifepulse-workers is not running"
  journalctl -u lifepulse-workers -n 50 --no-pager >&2
  exit 1
}

curl -fsS --max-time 10 http://127.0.0.1:3000/health >/dev/null || {
  log "FATAL: health check failed"
  journalctl -u lifepulse-api -n 50 --no-pager >&2
  exit 1
}

log "deploy complete: $(git -C "$REPO_DIR" rev-parse --short HEAD)"
