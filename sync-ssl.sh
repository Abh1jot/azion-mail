#!/usr/bin/env bash
# ==============================================================================
# Azion Mail - Instant SSL Certificate Sync for Postfix & Dovecot
# Synchronizes host Let's Encrypt certificates directly into mail containers
# Product: Azion Mail | Company: Azion Cloud
# ==============================================================================
set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

MAIL_HOST=$(grep "^MAIL_HOST=" .env 2>/dev/null | cut -d '=' -f2)
MAIL_HOST=${MAIL_HOST:-mail.azioncloud.com}
BASE_DOMAIN=$(echo "$MAIL_HOST" | sed 's/^mail\.//')

echo -e "${CYAN}🔍 Searching for Let's Encrypt certificate for $MAIL_HOST...${NC}"

CERT_PATH=""
KEY_PATH=""

for dir in \
    "/etc/letsencrypt/live/$MAIL_HOST" \
    "/etc/letsencrypt/live/$BASE_DOMAIN"; do
    if [ -f "$dir/fullchain.pem" ] && [ -f "$dir/privkey.pem" ]; then
        CERT_PATH="$dir/fullchain.pem"
        KEY_PATH="$dir/privkey.pem"
        break
    fi
done

if [ -z "$CERT_PATH" ]; then
    echo -e "${RED}❌ No Let's Encrypt certificate found in /etc/letsencrypt/live/ for $MAIL_HOST or $BASE_DOMAIN!${NC}"
    echo -e "${YELLOW}👉 Run this command to generate it with Certbot first:${NC}"
    echo -e "   sudo certbot certonly --nginx -d $MAIL_HOST"
    exit 1
fi

echo -e "${GREEN}✅ Found Let's Encrypt certificate: $CERT_PATH${NC}"
echo -e "${CYAN}🔄 Copying certificate into Postfix and Dovecot containers...${NC}"

# Copy into Postfix
docker compose cp -L "$CERT_PATH" postfix:/etc/ssl/certs/mail.crt
docker compose cp -L "$KEY_PATH" postfix:/etc/ssl/certs/mail.key
docker compose exec -T postfix chmod 644 /etc/ssl/certs/mail.crt
docker compose exec -T postfix chmod 600 /etc/ssl/certs/mail.key

# Copy into Dovecot
docker compose cp -L "$CERT_PATH" dovecot:/etc/ssl/certs/mail.crt
docker compose cp -L "$KEY_PATH" dovecot:/etc/ssl/certs/mail.key
docker compose exec -T dovecot chmod 644 /etc/ssl/certs/mail.crt
docker compose exec -T dovecot chmod 600 /etc/ssl/certs/mail.key

echo -e "${CYAN}⚡ Reloading Postfix, Dovecot, and Caddy services...${NC}"
docker compose exec -T postfix postfix reload 2>/dev/null || docker compose restart postfix
docker compose exec -T dovecot dovecot reload 2>/dev/null || docker compose restart dovecot
docker compose restart caddy 2>/dev/null || true

# Sync DKIM keys into Rspamd
echo -e "${CYAN}🔑 Exporting DKIM keys and restarting Rspamd Milter...${NC}"
docker compose exec -T web node scripts/export-dkim.js 2>/dev/null || true
docker compose exec -T rspamd chown -R rspamd:rspamd /var/lib/rspamd/dkim 2>/dev/null || true
docker compose restart rspamd 2>/dev/null || true

echo -e "\n${GREEN}==============================================================================${NC}"
echo -e "${GREEN}🎉 SSL CERTIFICATE SYNCED SUCCESSFULLY!${NC}"
echo -e "Your official Let's Encrypt certificate is now active on:"
echo -e " • SMTP SSL:  ${CYAN}mail.azioncloud.com:465${NC}"
echo -e " • SMTP TLS:  ${CYAN}mail.azioncloud.com:587${NC}"
echo -e " • IMAP SSL:  ${CYAN}mail.azioncloud.com:993${NC}"
echo -e "${GREEN}==============================================================================${NC}\n"
