#!/usr/bin/env bash
# ==============================================================================
# Azion Mail - 1-Click Production VPS Deployer
# Product: Azion Mail | Company: Azion Cloud
# ==============================================================================
set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
cat << "EOF"
    ___         _                __  ___      _ __
   /   |____  (_)___  ____      /  |/  /___ _(_) /
  / /| |_  / / / __ \/ __ \    / /|_/ / __ `/ / / 
 / ___ |/ /_/ / /_/ / / / /   / /  / / /_/ / / /  
/_/  |_/___/_/\____/_/ /_/   /_/  /_/\__,_/_/_/   
Enterprise Self-Hosted Email Platform | Azion Cloud
EOF
echo -e "${NC}"

# Check root privileges
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Please run this deployment script as root or with sudo.${NC}"
    exit 1
fi

echo -e "${CYAN}🔍 Step 1: Auditing Host System & Docker Installation...${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚙️  Docker not detected. Installing Docker engine automatically...${NC}"
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker
    echo -e "${GREEN}✅ Docker installed successfully.${NC}"
else
    echo -e "${GREEN}✅ Docker is already installed: $(docker --version)${NC}"
fi

# Check Docker Compose
if ! docker compose version &> /dev/null; then
    echo -e "${YELLOW}⚙️  Installing Docker Compose plugin...${NC}"
    apt-get update -y && apt-get install -y docker-compose-plugin || yum install -y docker-compose-plugin
fi
echo -e "${GREEN}✅ Docker Compose verified: $(docker compose version)${NC}"

# Configure UFW Firewall if active
if command -v ufw &> /dev/null && ufw status | grep -q "Status: active"; then
    echo -e "${CYAN}🛡️  Step 2: Configuring UFW Firewall Ports for Email Services...${NC}"
    ufw allow 25/tcp comment "SMTP Incoming"
    ufw allow 587/tcp comment "SMTP Submission (STARTTLS)"
    ufw allow 465/tcp comment "SMTPS (SSL)"
    ufw allow 143/tcp comment "IMAP (STARTTLS)"
    ufw allow 993/tcp comment "IMAPS (SSL)"
    ufw allow 110/tcp comment "POP3 (STARTTLS)"
    ufw allow 995/tcp comment "POP3S (SSL)"
    ufw allow 80/tcp comment "HTTP (Let's Encrypt / Caddy)"
    ufw allow 443/tcp comment "HTTPS (Web & Webmail)"
    echo -e "${GREEN}✅ Firewall rules updated.${NC}"
fi

# Configure Environment Variables
echo -e "${CYAN}⚙️  Step 3: Setting Up Production Environment (.env)...${NC}"

INSTALL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$INSTALL_DIR"

if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating new .env file from template...${NC}"
    cp .env.example .env

    # Generate secure random secrets
    PG_PASS=$(openssl rand -hex 16)
    JWT_SEC=$(openssl rand -hex 32)
    ADMIN_PASS="$(openssl rand -hex 8)Az1!"

    sed -i "s/replace_with_ultra_secure_password_in_prod/$PG_PASS/g" .env
    sed -i "s/azion_jwt_secret_64_characters_long_random_string_replace_in_prod/$JWT_SEC/g" .env
    sed -i "s|AzWbwZfTN9Y%hVErqU@s!9|$ADMIN_PASS|g" .env
    ARCHIVE_SECRET=$(openssl rand -hex 24)
    sed -i "s/replace_with_random_internal_secret/$ARCHIVE_SECRET/g" .env

    # Prompt for domain if running interactively
    if [ -t 0 ]; then
        read -p "Enter your primary Mail FQDN (e.g. mail.yourcompany.com) [default: mail.azioncloud.com]: " USER_MAIL_HOST
        if [ -n "$USER_MAIL_HOST" ]; then
            sed -i "s/mail.azioncloud.com/$USER_MAIL_HOST/g" .env
        fi
        read -p "Enter your Let's Encrypt notification email [default: admin@azioncloud.com]: " USER_EMAIL
        if [ -n "$USER_EMAIL" ]; then
            sed -i "s/admin@azioncloud.com/$USER_EMAIL/g" .env
        fi
    fi
    echo -e "${GREEN}✅ Generated secure environment secrets in .env${NC}"
else
    echo -e "${GREEN}✅ Existing .env detected.${NC}"
fi

# Detect if host port 80 or 443 is in use (e.g. Nginx for Pterodactyl Panel / Paymenter)
HOST_WEB_SERVER=false
if ss -tlpn 2>/dev/null | grep -E ':(80|443)\s' >/dev/null || lsof -i :80 -sTCP:LISTEN >/dev/null 2>&1 || netstat -tlpn 2>/dev/null | grep -E ':(80|443)\s' >/dev/null; then
    HOST_WEB_SERVER=true
fi

set_env_var() {
    local key="$1"
    local val="$2"
    if grep -q "^${key}=" .env; then
        sed -i "s|^${key}=.*|${key}=${val}|" .env
    else
        echo "${key}=${val}" >> .env
    fi
}

CURRENT_HOST=$(grep "^MAIL_HOST=" .env 2>/dev/null | cut -d '=' -f2)
CURRENT_HOST=${CURRENT_HOST:-mail.azioncloud.com}

if [ "$HOST_WEB_SERVER" = true ]; then
    echo -e "${YELLOW}⚠️ Port 80/443 is already in use by host services (Pterodactyl Panel / Paymenter / Nginx).${NC}"
    echo -e "${CYAN}🔄 Enabling Coexistence Mode (Mapping Azion Mail Reverse Proxy to 127.0.0.1:8088)...${NC}"
    set_env_var "CADDY_BIND_IP" "127.0.0.1"
    set_env_var "CADDY_HTTP_PORT" "8088"
    set_env_var "CADDY_HTTPS_PORT" "8443"
    set_env_var "CADDY_SITE_ADDR" ":80"

    # Configure host Nginx if installed
    if command -v nginx &>/dev/null && [ -d /etc/nginx/sites-available ]; then
        echo -e "${CYAN}⚙️  Configuring host Nginx reverse proxy for ${CURRENT_HOST}...${NC}"
        cat > /etc/nginx/sites-available/azion-mail.conf << EOF
# ==============================================================================
# Azion Mail Reverse Proxy (Coexistence with Pterodactyl & Paymenter)
# ==============================================================================
server {
    listen 80;
    listen [::]:80;
    server_name ${CURRENT_HOST};

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://127.0.0.1:8088;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        client_max_body_size 50M;
    }
}
EOF
        mkdir -p /etc/nginx/sites-enabled
        ln -sf /etc/nginx/sites-available/azion-mail.conf /etc/nginx/sites-enabled/azion-mail.conf
        if nginx -t &>/dev/null; then
            systemctl reload nginx 2>/dev/null || nginx -s reload 2>/dev/null || true
            echo -e "${GREEN}✅ Host Nginx reverse proxy loaded successfully.${NC}"
        fi
    fi
else
    set_env_var "CADDY_BIND_IP" "0.0.0.0"
    set_env_var "CADDY_HTTP_PORT" "80"
    set_env_var "CADDY_HTTPS_PORT" "443"
    set_env_var "CADDY_SITE_ADDR" ":80"
fi

# Load active environment variables for health checks
set -a
[ -f .env ] && . .env
set +a

# Pull Pre-Built Images from GitHub Container Registry and Launch
echo -e "${CYAN}🐳 Step 4: Pulling Pre-Built Images from GHCR & Launching Containers...${NC}"
echo -e "${BLUE}📦 Pulling images (this takes seconds, not minutes — built by GitHub Actions)...${NC}"
if docker compose pull 2>/dev/null; then
    echo -e "${GREEN}✅ All images pulled successfully from GHCR.${NC}"
    docker compose up -d
else
    echo -e "${YELLOW}⚠️  GHCR pull failed (first deploy or private repo). Building locally instead...${NC}"
    echo -e "${YELLOW}   Tip: Push to GitHub to trigger GitHub Actions — future deploys will be instant.${NC}"
    docker compose up -d --build
fi

# Wait for database readiness
echo -e "${CYAN}⏳ Step 5: Initializing PostgreSQL Database & Seeding Superadmin...${NC}"
for i in {1..30}; do
    if docker compose exec -T postgres pg_isready -U ${POSTGRES_USER:-azion} -d ${POSTGRES_DB:-azionmail} &>/dev/null; then
        echo -e "${GREEN}✅ Database is ready.${NC}"
        break
    fi
    echo "Waiting for PostgreSQL to start ($i/30)..."
    sleep 2
done

docker compose exec -T web npx prisma db push --accept-data-loss
docker compose exec -T web node prisma/seed.js || true

# Extract credentials for final summary
CURRENT_HOST=$(grep "^MAIL_HOST=" .env | cut -d '=' -f2)
CURRENT_ADMIN=$(grep "^INITIAL_ADMIN_EMAIL=" .env | cut -d '=' -f2)
CURRENT_PASS=$(grep "^INITIAL_ADMIN_PASSWORD=" .env | cut -d '=' -f2)

echo -e "\n${GREEN}==============================================================================${NC}"
echo -e "${GREEN}🎉 AZION MAIL HAS BEEN SUCCESSFULLY DEPLOYED TO YOUR VPS!${NC}"
echo -e "${GREEN}==============================================================================${NC}"
echo -e "🌐 Dashboard Console:  ${CYAN}http://${CURRENT_HOST}${NC}"
echo -e "📬 SnappyMail Webmail:  ${CYAN}http://${CURRENT_HOST}/webmail${NC}"
echo -e "👤 Admin Email:        ${CYAN}${CURRENT_ADMIN}${NC}"
echo -e "🔑 Admin Password:     ${YELLOW}${CURRENT_PASS}${NC}"
echo -e "------------------------------------------------------------------------------"

if [ "$HOST_WEB_SERVER" = true ]; then
    echo -e "⚙️  COEXISTENCE MODE ACTIVE (Running alongside Pterodactyl & Paymenter):"
    echo -e " • Azion Mail internal proxy running on: http://127.0.0.1:8088"
    echo -e " • Host Nginx configuration: /etc/nginx/sites-available/azion-mail.conf"
    echo -e " • To enable free SSL (HTTPS) via your host's Certbot, run:"
    echo -e "   ${YELLOW}sudo certbot --nginx -d ${CURRENT_HOST} && bash sync-ssl.sh${NC}"
    echo -e "------------------------------------------------------------------------------"
fi

# Auto-sync SSL certificates into Postfix/Dovecot if Let's Encrypt already exists on host
if [ -f "sync-ssl.sh" ]; then
    bash sync-ssl.sh 2>/dev/null || true
fi

echo -e "🚀 NEXT STEPS:"
echo -e " 1. Point your domain A record for '${CURRENT_HOST}' to your VPS public IP."
echo -e " 2. Log in to the console and click 'System Diagnostics' -> 'Run Full System Test'."
echo -e " 3. Add your custom domain and click '1-Click Cloudflare Sync' to provision DNS."
echo -e " 4. Run the 'Gmail Setup Wizard' to configure free sending & receiving in Gmail!"
echo -e "${GREEN}==============================================================================${NC}\n"
