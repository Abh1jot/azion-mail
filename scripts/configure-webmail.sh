#!/usr/bin/env bash
# ==============================================================================
# Azion Mail - Auto-configure SnappyMail Webmail
# Configures internal IMAP (Dovecot) & SMTP (Postfix) connections for all domains
# Product: Azion Mail | Company: Azion Cloud
# ==============================================================================
set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

MAIL_HOST=$(grep "^MAIL_HOST=" .env 2>/dev/null | cut -d '=' -f2)
MAIL_HOST=${MAIL_HOST:-mail.azioncloud.com}
BASE_DOMAIN=$(echo "$MAIL_HOST" | sed 's/^mail\.//')

echo -e "${CYAN}🔧 Configuring SnappyMail default mail server connections...${NC}"

# Ensure webmail container is running
if ! docker compose ps webmail 2>/dev/null | grep -q "Up"; then
    echo -e "${YELLOW}Starting webmail container...${NC}"
    docker compose up -d webmail
    sleep 2
fi

# Create domains directory inside webmail container
docker compose exec -T webmail mkdir -p /snappymail/data/_data_/_default_/domains

# Generate default domain template
TMP_JSON="/tmp/snappymail_default_$$.json"
cat << 'EOF' > "$TMP_JSON"
{
    "IMAP": {
        "host": "dovecot",
        "port": 143,
        "type": 0,
        "timeout": 300,
        "shortLogin": false,
        "lowerLogin": true,
        "stripLogin": "",
        "sasl": [
            "PLAIN",
            "LOGIN"
        ],
        "ssl": {
            "verify_peer": false,
            "verify_peer_name": false,
            "allow_self_signed": true,
            "SNI_enabled": false,
            "disable_compression": true,
            "security_level": 1
        },
        "use_expunge_all_on_delete": false,
        "fast_simple_search": false,
        "force_select": false,
        "message_all_headers": false,
        "message_list_limit": 10000,
        "search_filter": "",
        "spam_headers": "",
        "virus_headers": "",
        "disabled_capabilities": []
    },
    "SMTP": {
        "host": "postfix",
        "port": 587,
        "type": 0,
        "timeout": 60,
        "shortLogin": false,
        "lowerLogin": true,
        "stripLogin": "",
        "sasl": [
            "PLAIN",
            "LOGIN"
        ],
        "ssl": {
            "verify_peer": false,
            "verify_peer_name": false,
            "allow_self_signed": true,
            "SNI_enabled": false,
            "disable_compression": true,
            "security_level": 1
        },
        "useAuth": true,
        "setSender": false,
        "usePhpMail": false,
        "authPlainLine": false
    },
    "whiteList": ""
}
EOF

# Copy into container as default.json and as BASE_DOMAIN.json
docker compose cp "$TMP_JSON" webmail:/snappymail/data/_data_/_default_/domains/default.json
docker compose cp "$TMP_JSON" webmail:/snappymail/data/_data_/_default_/domains/${BASE_DOMAIN}.json
rm -f "$TMP_JSON"

# Fix permissions so SnappyMail can read and write
docker compose exec -T webmail chmod -R 777 /snappymail/data/_data_/_default_/domains

# Restart webmail to flush caches
docker compose restart webmail

echo -e "${GREEN}✅ SnappyMail successfully configured!${NC}"
echo -e " • IMAP Host: ${CYAN}dovecot:143${NC}"
echo -e " • SMTP Host: ${CYAN}postfix:587${NC}"
echo -e " • Configured Domains: ${CYAN}default, ${BASE_DOMAIN}${NC}"
if docker compose exec -T webmail test -f /snappymail/data/_data_/_default_/admin_password.txt 2>/dev/null; then
    ADMIN_PASS=$(docker compose exec -T webmail cat /snappymail/data/_data_/_default_/admin_password.txt 2>/dev/null | tr -d '\r\n')
    echo -e " • SnappyMail Admin URL: ${CYAN}https://${MAIL_HOST}/webmail/?admin${NC} (User: admin, Pass: ${YELLOW}${ADMIN_PASS}${NC})"
fi
echo ""
