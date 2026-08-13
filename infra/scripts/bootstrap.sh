#!/bin/bash
#
# EC2 first-boot bootstrap. Rendered by infra/userData.ts (which substitutes the
# double-at placeholder tokens below) and passed to the instance as user-data.
#
# This runs EXACTLY ONCE, at instance creation. cloud-init does not re-run
# user-data on reboot, and infra/ec2.ts sets ignoreChanges:["userData"] so
# editing this file has no effect on a running instance. Keep it to durable
# machine setup only — anything that changes per release belongs in
# scripts/deploy.sh, which runs on every deploy via SSM.
#
set -euxo pipefail
exec > >(tee /var/log/user-data.log) 2>&1

REPO_URL="@@REPO_URL@@"
REPO_BRANCH="@@REPO_BRANCH@@"
REPO_DIR="@@REPO_DIR@@"
DATA_DIR="/mnt/data"

# ─── Swap ─────────────────────────────────────────────────────────────────────
# t2.micro has 1 GiB of RAM. npm ci alone will OOM without this, and an OOM kill
# under `set -e` aborts the rest of this script silently — which is exactly how
# the previous setup ended up with no nginx, no migrations and no services.
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
# Prefer RAM, but use swap rather than dying.
sysctl -w vm.swappiness=10
echo 'vm.swappiness=10' > /etc/sysctl.d/99-swappiness.conf

# ─── Persistent data volume ───────────────────────────────────────────────────
# Pulumi attaches the EBS volume AFTER the instance boots, so the device does not
# exist yet when this script starts. Wait for it.
DEV=""
for _ in $(seq 1 60); do
  for candidate in /dev/sdf /dev/xvdf /dev/nvme1n1; do
    if [ -b "$candidate" ]; then
      DEV=$(readlink -f "$candidate")
      break 2
    fi
  done
  sleep 5
done
if [ -z "$DEV" ]; then
  echo "FATAL: data volume never appeared after 5 minutes" >&2
  exit 1
fi

# Format ONLY if there is no filesystem. This is the line standing between a
# routine instance replacement and wiping the database: on a rebuild the volume
# re-attaches with data intact, blkid succeeds, and mkfs is skipped.
#
# The label is capped at 12 characters by XFS. Exceeding it makes mkfs.xfs print
# its usage text and exit non-zero, which under `set -e` aborts the whole
# bootstrap before anything is installed. Keep it short.
if ! blkid "$DEV" >/dev/null 2>&1; then
  mkfs.xfs -L lp-data "$DEV"
fi

mkdir -p "$DATA_DIR"
UUID=$(blkid -s UUID -o value "$DEV")
# Mount by UUID, not device path: NVMe device numbering is not guaranteed stable
# across boots. `nofail` is mandatory — without it, a volume that fails to attach
# makes the instance unbootable, and you cannot even SSM in to fix it.
if ! grep -q "$UUID" /etc/fstab; then
  echo "UUID=$UUID $DATA_DIR xfs defaults,nofail,x-systemd.device-timeout=30 0 2" >> /etc/fstab
fi
systemctl daemon-reload
mount -a

mkdir -p "$DATA_DIR/postgres" "$DATA_DIR/redis"
# uid/gid inside the official postgres and redis alpine images.
chown -R 999:999 "$DATA_DIR/postgres"
chown -R 999:1000 "$DATA_DIR/redis"

# ─── Packages ─────────────────────────────────────────────────────────────────
dnf update -y
dnf install -y docker git

systemctl enable --now docker
usermod -a -G docker ec2-user

# Compose v2 as a CLI plugin, so `docker compose` (not `docker-compose`) works.
mkdir -p /usr/local/lib/docker/cli-plugins
curl -fL "https://github.com/docker/compose/releases/download/v2.29.7/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
docker compose version

curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs

# ─── Repo ─────────────────────────────────────────────────────────────────────
# Cloned once here so that the first SSM deploy has something to fetch into.
# Subsequent deploys do their own git fetch/reset — see scripts/deploy.sh.
mkdir -p "$REPO_DIR"
chown ec2-user:ec2-user "$REPO_DIR"

if [ ! -d "$REPO_DIR/.git" ]; then
  sudo -u ec2-user git clone --branch "$REPO_BRANCH" "$REPO_URL" "$REPO_DIR"
fi

mkdir -p /opt/lifepulse
mkdir -p /etc/lifepulse
chmod 700 /etc/lifepulse

# ─── systemd units ────────────────────────────────────────────────────────────
# Deliberately NOT `systemctl enable --now` here: /etc/lifepulse/env does not
# exist until the first deploy populates it from SSM Parameter Store. deploy.sh
# enables and starts these, and `enable` persists across reboots from then on.
#
# Both run under tsx rather than `tsx watch`. The watcher was the real problem in
# the old setup: it kept a full inotify watch set over the monorepo and restarted
# the process on any file touch. Plain tsx just executes the TypeScript entry
# point. (Compiled output is not an option here — @starter-kit/shared resolves
# its package main to .ts source, so `node dist/server.js` cannot load it.)

cat > /etc/systemd/system/lifepulse-api.service <<UNIT
[Unit]
Description=Lifepulse API
After=network-online.target docker.service
Wants=network-online.target
Requires=docker.service

[Service]
Type=simple
User=ec2-user
WorkingDirectory=$REPO_DIR/packages/api
EnvironmentFile=/etc/lifepulse/env
ExecStart=$REPO_DIR/node_modules/.bin/tsx server.ts
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=lifepulse-api

[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/systemd/system/lifepulse-workers.service <<UNIT
[Unit]
Description=Lifepulse background workers (BullMQ)
After=network-online.target docker.service
Wants=network-online.target
Requires=docker.service

[Service]
Type=simple
User=ec2-user
WorkingDirectory=$REPO_DIR/packages/workers
EnvironmentFile=/etc/lifepulse/env
ExecStart=$REPO_DIR/node_modules/.bin/tsx index.ts
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=lifepulse-workers

[Install]
WantedBy=multi-user.target
UNIT

# Bring the datastores up on every boot, before the app units start.
cat > /etc/systemd/system/lifepulse-datastores.service <<UNIT
[Unit]
Description=Lifepulse datastores (Postgres + Redis via Docker Compose)
After=docker.service
Requires=docker.service
# Postgres must never start before its data volume is mounted — otherwise it
# would initialise a fresh, empty database onto the root volume instead.
RequiresMountsFor=$DATA_DIR

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$REPO_DIR
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose stop

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload

# Cap journal growth on an 8 GiB root volume.
mkdir -p /etc/systemd/journald.conf.d
printf '[Journal]\nSystemMaxUse=200M\n' > /etc/systemd/journald.conf.d/99-lifepulse.conf
systemctl restart systemd-journald

# Written last, and only on success. scripts/deploy.sh is dispatched by Pulumi as
# soon as the instance exists, which is minutes before this script finishes — the
# deploy gates on this file rather than racing the package installs.
mkdir -p /var/lib/lifepulse
date -Is > /var/lib/lifepulse/bootstrap-complete

echo "bootstrap complete — awaiting first deploy via SSM"
