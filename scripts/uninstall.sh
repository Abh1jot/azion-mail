#!/usr/bin/env bash
# ==============================================================================
# Azion Mail - Safe VPS Removal Script
# Removes ONLY Azion Mail containers, volumes, and configs.
# Does NOT touch: Pterodactyl, Paymenter, Nginx, other Docker services,
#                 UFW SSH rule, or any other apps on this server.
# ==============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Run as root or with sudo.${NC}"
    exit 1
fi

echo -e "${CYAN}"
echo "============================================================"
echo "  Azion Mail — Safe Removal Script"
echo "  Only Azion Mail resources will be touched."
echo "============================================================"
echo -e "${NC}"

# Detect install dir (default: ~/azion-mail or /root/azion-mail)
INSTALL_DIR="${AZION_DIR:-$(find /root /home -maxdepth 2 -name "docker-compose.yml" -path "*/azion-mail/*" 2>/dev/null | head -1 | xargs dirname 2>/dev/null)}"
INSTALL_DIR="${INSTALL_DIR:-/root/azion-mail}"

echo -e "${YELLOW}⚠️  This will permanently remove Azion Mail from this server.${NC}"
echo -e "${YELLOW}    Install directory detected: ${INSTALL_DIR}${NC}"
echo ""

# Ask about mail data
KEEP_MAIL_DATA=false
if [ -t 0 ]; then
    read -p "❓ Keep mailbox data (vmail_data volume) for migration? [Y/n]: " KEEP_DATA
    KEEP_DATA="${KEEP_DATA:-Y}"
    if [[ "$KEEP_DATA" =~ ^[Yy] ]]; then
        KEEP_MAIL_DATA=true
        echo -e "${GREEN}✅ Mailbox data will be preserved.${NC}"
    else
        echo -e "${RED}⚠️  Mailbox data WILL be deleted permanently.${NC}"
        read -p "   Type 'DELETE' to confirm: " CONFIRM
        if [ "$CONFIRM" != "DELETE" ]; then
            echo "Aborted."
            exit 0
        fi
    fi
fi

echo ""

# Step 1: Stop and remove Azion Mail containers
echo -e "${CYAN}🛑 Step 1: Stopping Azion Mail containers...${NC}"
if [ -f "$INSTALL_DIR/docker-compose.yml" ]; then
    cd "$INSTALL_DIR"
    docker compose down --remove-orphans 2>/dev/null || true
    echo -e "${GREEN}✅ Containers stopped and removed.${NC}"
else
    # Fallback: stop by container name if compose file is gone
    for c in azion-caddy azion-web azion-postgres azion-redis azion-postfix azion-dovecot azion-rspamd azion-webmail; do
        docker stop "$c" 2>/dev/null || true
        docker rm "$c" 2>/dev/null || true
    done
    echo -e "${GREEN}✅ Containers removed by name.${NC}"
fi

# Step 2: Remove Docker volumes
echo -e "${CYAN}🗑️  Step 2: Removing Azion Mail Docker volumes...${NC}"
if [ "$KEEP_MAIL_DATA" = true ]; then
    echo -e "${YELLOW}   Skipping vmail_data and snappymail_data (keep for migration).${NC}"
    for vol in azion-mail_pgdata azion-mail_redisdata azion-mail_mail_certs azion-mail_rspamd_data azion-mail_caddy_data azion-mail_caddy_config; do
        docker volume rm "$vol" 2>/dev/null && echo "   Removed: $vol" || true
    done
else
    for vol in azion-mail_pgdata azion-mail_redisdata azion-mail_vmail_data azion-mail_mail_certs azion-mail_rspamd_data azion-mail_snappymail_data azion-mail_caddy_data azion-mail_caddy_config; do
        docker volume rm "$vol" 2>/dev/null && echo "   Removed: $vol" || true
    done
fi
echo -e "${GREEN}✅ Volumes removed.${NC}"

# Step 3: Remove Docker network
echo -e "${CYAN}🔌 Step 3: Removing Azion Mail Docker network...${NC}"
docker network rm azion-mail_azion_net 2>/dev/null || true
echo -e "${GREEN}✅ Network removed.${NC}"

# Step 4: Remove Docker images (optional — frees disk space)
echo -e "${CYAN}🐳 Step 4: Removing Azion Mail Docker images...${NC}"
for img in \
    ghcr.io/abh1jot/azion-mail-web \
    ghcr.io/abh1jot/azion-mail-postfix \
    ghcr.io/abh1jot/azion-mail-dovecot \
    ghcr.io/abh1jot/azion-mail-rspamd; do
    docker rmi "${img}:latest" 2>/dev/null && echo "   Removed: $img" || true
done
echo -e "${GREEN}✅ Images removed.${NC}"

# Step 5: Remove Nginx coexistence config (if it was created)
echo -e "${CYAN}🔧 Step 5: Removing Nginx reverse proxy config (if present)...${NC}"
NGINX_CONF="/etc/nginx/sites-available/azion-mail.conf"
NGINX_LINK="/etc/nginx/sites-enabled/azion-mail.conf"
if [ -f "$NGINX_CONF" ]; then
    rm -f "$NGINX_LINK" "$NGINX_CONF"
    if command -v nginx &>/dev/null; then
        nginx -t 2>/dev/null && (systemctl reload nginx 2>/dev/null || nginx -s reload 2>/dev/null) || true
    fi
    echo -e "${GREEN}✅ Nginx azion-mail.conf removed and Nginx reloaded.${NC}"
else
    echo -e "${GREEN}✅ No Nginx coexistence config found (standalone mode was used).${NC}"
fi

# Step 6: Remove UFW firewall rules added by Azion Mail
# Only removes mail-specific ports. SSH (22) and any other rules are untouched.
echo -e "${CYAN}🛡️  Step 6: Removing Azion Mail UFW firewall rules...${NC}"
if command -v ufw &>/dev/null && ufw status | grep -q "Status: active"; then
    ufw delete allow 25/tcp 2>/dev/null || true
    ufw delete allow 587/tcp 2>/dev/null || true
    ufw delete allow 465/tcp 2>/dev/null || true
    ufw delete allow 143/tcp 2>/dev/null || true
    ufw delete allow 993/tcp 2>/dev/null || true
    ufw delete allow 110/tcp 2>/dev/null || true
    ufw delete allow 995/tcp 2>/dev/null || true
    # Only remove 80/443 if they were added by this script and nothing else uses them
    if ! command -v nginx &>/dev/null; then
        ufw delete allow 80/tcp 2>/dev/null || true
        ufw delete allow 443/tcp 2>/dev/null || true
        echo -e "${YELLOW}   Removed ports 80/443 (no Nginx detected on host).${NC}"
    else
        echo -e "${YELLOW}   Kept ports 80/443 open (Nginx still running on host).${NC}"
    fi
    echo -e "${GREEN}✅ Mail port UFW rules removed.${NC}"
else
    echo -e "${GREEN}✅ UFW not active — no firewall rules to remove.${NC}"
fi

# Step 7: Remove install directory
echo -e "${CYAN}📁 Step 7: Removing Azion Mail directory...${NC}"
if [ -d "$INSTALL_DIR" ]; then
    # Keep a backup of the .env file just in case
    if [ -f "$INSTALL_DIR/.env" ]; then
        cp "$INSTALL_DIR/.env" /root/azion-mail-last.env 2>/dev/null || true
        echo -e "${YELLOW}   .env backed up to /root/azion-mail-last.env${NC}"
    fi
    rm -rf "$INSTALL_DIR"
    echo -e "${GREEN}✅ Directory removed: $INSTALL_DIR${NC}"
fi

echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}🎉 AZION MAIL FULLY REMOVED FROM THIS VPS!${NC}"
echo -e "${GREEN}============================================================${NC}"
if [ "$KEEP_MAIL_DATA" = true ]; then
    echo -e "${YELLOW}📦 Your mailbox data is still in Docker volume: azion-mail_vmail_data${NC}"
    echo -e "${YELLOW}   Export it before the next docker system prune:${NC}"
    echo -e "${YELLOW}   docker run --rm -v azion-mail_vmail_data:/vmail -v /root:/backup alpine tar -czf /backup/vmail_export.tar.gz -C /vmail .${NC}"
fi
echo ""
