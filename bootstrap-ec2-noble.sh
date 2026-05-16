#!/usr/bin/env bash
set -euo pipefail

# Bootstrap script for AWS EC2 Ubuntu 24.04 (Noble)
# - Installs runtime/build dependencies
# - Installs Node.js 22.x (satisfies engines >=20)
# - Installs npm dependencies and builds app
# - Configures a systemd service for the dashboard

APP_NAME="stem-race-dashboard"
APP_USER="${APP_USER:-ubuntu}"
APP_DIR="${APP_DIR:-/home/${APP_USER}/${APP_NAME}}"
REPO_URL="${REPO_URL:-https://github.com/btheteach/stem-race-dashboard.git}"
PUBLIC_HOST="${PUBLIC_HOST:-0.0.0.0}"
PUBLIC_PORT="${PUBLIC_PORT:-8080}"
ADMIN_HOST="${ADMIN_HOST:-127.0.0.1}"
ADMIN_PORT="${ADMIN_PORT:-8081}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo bash $0"
  exit 1
fi

if ! id -u "${APP_USER}" >/dev/null 2>&1; then
  echo "User '${APP_USER}' does not exist."
  echo "Create it first, or set APP_USER to an existing user."
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "[1/7] Installing OS packages..."
apt-get update -y
apt-get install -y ca-certificates curl gnupg git build-essential

echo "[2/7] Installing Node.js 22.x..."
install -d -m 0755 /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
  | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" \
  > /etc/apt/sources.list.d/nodesource.list
apt-get update -y
apt-get install -y nodejs

echo "[3/7] Cloning/updating repository..."
if [[ -d "${APP_DIR}/.git" ]]; then
  sudo -u "${APP_USER}" git -C "${APP_DIR}" fetch --all --prune
  sudo -u "${APP_USER}" git -C "${APP_DIR}" pull --ff-only
elif [[ -d "${APP_DIR}" ]]; then
  echo "Directory exists but is not a git repo: ${APP_DIR}"
  exit 1
else
  sudo -u "${APP_USER}" git clone "${REPO_URL}" "${APP_DIR}"
fi

cd "${APP_DIR}"

echo "[4/7] Installing Node dependencies..."
sudo -u "${APP_USER}" npm ci

echo "[5/7] Building project..."
sudo -u "${APP_USER}" npm run build

echo "[6/7] Creating environment and systemd service..."
cat > "/etc/${APP_NAME}.env" <<EOF
PUBLIC_HOST=${PUBLIC_HOST}
PUBLIC_PORT=${PUBLIC_PORT}
ADMIN_HOST=${ADMIN_HOST}
ADMIN_PORT=${ADMIN_PORT}
NODE_ENV=production
EOF

cat > "/etc/systemd/system/${APP_NAME}.service" <<EOF
[Unit]
Description=STEM Race Dashboard
After=network.target

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=/etc/${APP_NAME}.env
ExecStart=/usr/bin/node ${APP_DIR}/dist/server/index.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

echo "[7/7] Enabling and starting service..."
systemctl daemon-reload
systemctl enable "${APP_NAME}.service"
systemctl restart "${APP_NAME}.service"

echo
echo "Bootstrap complete."
echo "Service status:"
systemctl --no-pager --full status "${APP_NAME}.service" | sed -n '1,40p'
echo
echo "Public URL: http://<ec2-public-ip>:${PUBLIC_PORT}/"
echo "Admin URL (binds to ${ADMIN_HOST}): http://<host>:${ADMIN_PORT}/admin/healthz"
