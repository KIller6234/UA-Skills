#!/bin/bash
# Runs on the Oracle Cloud Ubuntu 24.04 server
# Installs Docker, opens ports 80/443, then starts the NIH app
set -e

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
echo "=== NIH Production Setup ==="
echo "App directory: $APP_DIR"
echo ""

# 1. Install Docker if missing
if ! command -v docker &>/dev/null; then
  echo "--- Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"
  echo ""
  echo "IMPORTANT: Docker installed. Please log out and back in, then run this script again."
  echo "  exit   (logout from SSH)"
  echo "  # then reconnect via MobaXterm and run:"
  echo "  cd ~/nih && bash deploy/server-setup.sh"
  exit 0
else
  echo "--- Docker: $(docker --version)"
fi

# 2. Open OS firewall ports (Ubuntu UFW + Oracle Cloud iptables bypass)
echo "--- Opening ports 80 and 443..."
sudo ufw allow 22/tcp   >/dev/null 2>&1 || true
sudo ufw allow 80/tcp   >/dev/null 2>&1 || true
sudo ufw allow 443/tcp  >/dev/null 2>&1 || true
sudo ufw --force enable >/dev/null 2>&1 || true

# Oracle Cloud Ubuntu has strict iptables rules — these bypass them
sudo iptables -I INPUT 6 -p tcp --dport 80  -j ACCEPT 2>/dev/null || true
sudo iptables -I INPUT 6 -p tcp --dport 443 -j ACCEPT 2>/dev/null || true
# Persist iptables rules across reboots
if ! dpkg -l iptables-persistent &>/dev/null; then
  echo iptables-persistent iptables-persistent/autosave_v4 boolean true | sudo debconf-set-selections
  echo iptables-persistent iptables-persistent/autosave_v6 boolean true | sudo debconf-set-selections
  sudo apt-get install -y -qq iptables-persistent
fi
sudo netfilter-persistent save >/dev/null 2>&1 || true
echo "  Ports 80 and 443 are open."

# 3. Strengthen default passwords in .env
cd "$APP_DIR"
if grep -q "my-super-secret-key" .env 2>/dev/null; then
  JWT_SECRET=$(openssl rand -hex 32)
  sed -i "s/my-super-secret-key-minimum-32-characters-long/$JWT_SECRET/" .env
  echo "  Generated strong JWT_SECRET"
fi
if grep -q "mypassword123" .env 2>/dev/null; then
  DB_PASS=$(openssl rand -base64 18 | tr -d '/+=' | head -c 18)
  sed -i "s/mypassword123/$DB_PASS/g" .env
  echo "  Generated strong DB_PASSWORD"
fi
if grep -q "myredis123" .env 2>/dev/null; then
  REDIS_PASS=$(openssl rand -base64 18 | tr -d '/+=' | head -c 18)
  sed -i "s/myredis123/$REDIS_PASS/g" .env
  echo "  Generated strong REDIS_PASSWORD"
fi

# 4. Remind about required manual edits
echo ""
echo "======================================================="
echo "  REQUIRED: Edit .env and Caddyfile before starting"
echo "======================================================="
echo ""
echo "  nano .env"
echo "  - Change: FRONTEND_URL=https://YOUR_SUBDOMAIN.duckdns.org"
echo "  - Change: NODE_ENV=production"
echo "  - Fill in: GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET  (optional)"
echo "  - Fill in: GOOGLE_CLIENT_ID  / GOOGLE_CLIENT_SECRET (optional)"
echo ""
echo "  nano Caddyfile"
echo "  - Replace YOUR_SUBDOMAIN.duckdns.org with your actual domain"
echo ""
echo "  Oracle Cloud Console: VCN -> Security Lists -> Add Ingress Rules"
echo "  - TCP port 80  (HTTP, needed for SSL certificate issuance)"
echo "  - TCP port 443 (HTTPS)"
echo ""
read -p "Have you edited .env, Caddyfile, and opened Oracle Cloud ports? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Edit the files first, then run: cd ~/nih && bash deploy/server-setup.sh"
  exit 1
fi

# 5. Build and start
echo ""
echo "--- Building and starting containers (5-10 minutes on first run)..."
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo "=== Done! ==="
echo ""
echo "Useful commands:"
echo "  docker compose -f docker-compose.prod.yml logs -f          # watch all logs"
echo "  docker compose -f docker-compose.prod.yml logs -f web      # web only"
echo "  docker compose -f docker-compose.prod.yml ps               # status"
echo "  docker compose -f docker-compose.prod.yml restart          # restart all"
echo ""
DOMAIN=$(grep -oP '(?<=FRONTEND_URL=https://).*' .env 2>/dev/null || echo "your-domain.duckdns.org")
echo "Your app: https://$DOMAIN"
echo "(SSL certificate is issued automatically by Caddy — takes ~1 minute)"
