#!/usr/bin/env bash
# ==============================================================================
# Azion Mail - SSL Certificate Sync for Postfix & Dovecot
# Extracts the active certificate from Caddy's data volume (preferred) or
# falls back to host Let's Encrypt (/etc/letsencrypt) for coexistence setups.
# Product: Azion Mail | Company: Azion Cloud
# ==============================================================================
# Note: set -e intentionally omitted; some paths may not exist on first run

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

MAIL_HOST=$(grep "^MAIL_HOST=" .env 2>/dev/null | cut -d '=' -f2)
MAIL_HOST=${MAIL_HOST:-mail.azioncloud.com}
BASE_DOMAIN=$(echo "$MAIL_HOST" | sed 's/^mail\.//')

echo -e "${CYAN}🔍 Locating TLS certificate for $MAIL_HOST...${NC}"

CERT_SRC=""    # where to read cert from
KEY_SRC=""
CERT_TYPE=""

# ── Priority 1: Caddy internal ACME storage (standard deployment) ──────────
# Caddy stores certs in its data volume at these paths (mounted at /data inside
# postfix/dovecot containers and accessible via `docker exec` on caddy):
CADDY_ACME_DIR="/data/caddy/certificates/acme-v02.api.letsencrypt.org-directory/$MAIL_HOST"
CADDY_ZEROSSL_DIR="/data/caddy/certificates/acme.zerossl.com-v2-dv90/$MAIL_HOST"

for caddy_dir in "$CADDY_ACME_DIR" "$CADDY_ZEROSSL_DIR"; do
    # Try Caddy-native format (DOMAIN.crt / DOMAIN.key) via docker exec
    if docker compose exec -T caddy test -f "$caddy_dir/$MAIL_HOST.crt" 2>/dev/null; then
        echo -e "${GREEN}✅ Found Caddy-managed certificate (Let's Encrypt).${NC}"
        TMP_CRT=$(mktemp /tmp/azion-mail.XXXXXX.crt)
        TMP_KEY=$(mktemp /tmp/azion-mail.XXXXXX.key)
        docker compose exec -T caddy cat "$caddy_dir/$MAIL_HOST.crt" > "$TMP_CRT"
        docker compose exec -T caddy cat "$caddy_dir/$MAIL_HOST.key" > "$TMP_KEY"
        CERT_SRC="$TMP_CRT"
        KEY_SRC="$TMP_KEY"
        CERT_TYPE="caddy"
        break
    fi
done

# ── Priority 2: Host Let's Encrypt (coexistence / Certbot mode) ────────────
if [ -z "$CERT_SRC" ]; then
    for le_dir in \
        "/etc/letsencrypt/live/$MAIL_HOST" \
        "/etc/letsencrypt/live/$BASE_DOMAIN"; do
        if [ -f "$le_dir/fullchain.pem" ] && [ -f "$le_dir/privkey.pem" ]; then
            echo -e "${GREEN}✅ Found host Let's Encrypt certificate: $le_dir${NC}"
            CERT_SRC="$le_dir/fullchain.pem"
            KEY_SRC="$le_dir/privkey.pem"
            CERT_TYPE="letsencrypt"
            break
        fi
    done
fi

# ── No cert found ──────────────────────────────────────────────────────────
if [ -z "$CERT_SRC" ]; then
    echo -e "${YELLOW}⚠️  No external certificate found yet.${NC}"
    echo -e "${YELLOW}   Caddy is managing the certificate automatically.${NC}"
    echo -e "${YELLOW}   Postfix and Dovecot already read Caddy certs directly from${NC}"
    echo -e "${YELLOW}   the shared caddy_data volume — no manual sync required.${NC}"
    echo ""
    echo -e "${CYAN}ℹ️  If mail clients still show TLS warnings, wait 60 seconds${NC}"
    echo -e "${CYAN}   after deploy for Caddy to complete ACME and then restart:${NC}"
    echo -e "${CYAN}   docker compose restart postfix dovecot${NC}"

    # Still run the DKIM/webmail sync steps even without cert copy
    docker compose exec -T web node scripts/export-dkim.js 2>/dev/null || true
    docker compose exec -T rspamd chown -R rspamd:rspamd /var/lib/rspamd/dkim 2>/dev/null || true
    docker compose restart rspamd 2>/dev/null || true
    bash scripts/configure-webmail.sh 2>/dev/null || true
    exit 0
fi

echo -e "${CYAN}🔄 Copying certificate into Postfix and Dovecot containers...${NC}"

# Copy into Postfix
docker compose cp "$CERT_SRC" postfix:/etc/ssl/certs/mail.crt
docker compose cp "$KEY_SRC"  postfix:/etc/ssl/certs/mail.key
docker compose exec -T postfix chmod 644 /etc/ssl/certs/mail.crt
docker compose exec -T postfix chmod 600 /etc/ssl/certs/mail.key

# Copy into Dovecot
docker compose cp "$CERT_SRC" dovecot:/etc/ssl/certs/mail.crt
docker compose cp "$KEY_SRC"  dovecot:/etc/ssl/certs/mail.key
docker compose exec -T dovecot chmod 644 /etc/ssl/certs/mail.crt
docker compose exec -T dovecot chmod 600 /etc/ssl/certs/mail.key

# Clean up any temp files
[ "$CERT_TYPE" = "caddy" ] && rm -f "$CERT_SRC" "$KEY_SRC"

echo -e "${CYAN}⚡ Reloading Postfix and Dovecot with new certificate...${NC}"
docker compose exec -T postfix postfix reload 2>/dev/null || docker compose restart postfix
docker compose exec -T dovecot dovecot reload 2>/dev/null || docker compose restart dovecot

# Sync DKIM keys into Rspamd
echo -e "${CYAN}🔑 Syncing DKIM keys and restarting Rspamd Milter...${NC}"
docker compose exec -T web node scripts/export-dkim.js 2>/dev/null || true
docker compose exec -T rspamd chown -R rspamd:rspamd /var/lib/rspamd/dkim 2>/dev/null || true
docker compose restart rspamd 2>/dev/null || true

# Auto-configure SnappyMail webmail
bash scripts/configure-webmail.sh 2>/dev/null || true

echo -e "\n${GREEN}==============================================================================${NC}"
echo -e "${GREEN}🎉 SSL CERTIFICATE SYNCED SUCCESSFULLY!${NC}"
echo -e " Source: ${CYAN}${CERT_TYPE}${NC}"
echo -e " • SMTP TLS:  ${CYAN}${MAIL_HOST}:587${NC}"
echo -e " • SMTP SSL:  ${CYAN}${MAIL_HOST}:465${NC}"
echo -e " • IMAP SSL:  ${CYAN}${MAIL_HOST}:993${NC}"
echo -e " • POP3 SSL:  ${CYAN}${MAIL_HOST}:995${NC}"
echo -e "${GREEN}==============================================================================${NC}\n"
