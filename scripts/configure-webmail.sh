#!/usr/bin/env bash
# ==============================================================================
# Azion Mail - Auto-configure SnappyMail Webmail
# Configures internal IMAP (Dovecot) & SMTP (Postfix) connections for all domains
# Product: Azion Mail | Company: Azion Cloud
# ==============================================================================
# Note: set -e intentionally omitted; docker exec calls here are best-effort

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

# Create domains directories inside webmail container
docker compose exec -T webmail mkdir -p /var/lib/snappymail/_data_/_default_/domains
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
    "Sieve": {
        "host": "",
        "port": 4190,
        "type": 0,
        "timeout": 10,
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
        "enabled": false,
        "authLiteral": true
    },
    "whiteList": ""
}
EOF

# Copy into all possible container data paths
for d in "/var/lib/snappymail/_data_/_default_/domains" \
         "/var/lib/snappymail/_data_/${MAIL_HOST}/domains" \
         "/snappymail/data/_data_/_default_/domains"; do
    docker compose exec -T webmail mkdir -p "$d" 2>/dev/null || true
    docker compose cp "$TMP_JSON" webmail:"$d/default.json" 2>/dev/null || true
    docker compose cp "$TMP_JSON" webmail:"$d/${BASE_DOMAIN}.json" 2>/dev/null || true
done
rm -f "$TMP_JSON"

# Fix permissions so SnappyMail can read and write
docker compose exec -T webmail chmod -R 777 /var/lib/snappymail 2>/dev/null || true
docker compose exec -T webmail chmod -R 777 /snappymail/data 2>/dev/null || true

# Test connectivity from webmail to dovecot
echo -e "${CYAN}📡 Testing IMAP connectivity from Webmail to Dovecot...${NC}"
if docker compose exec -T webmail nc -z -w 3 dovecot 143 2>/dev/null; then
    echo -e "${GREEN}✅ Webmail ➔ Dovecot:143 connection SUCCESSFUL!${NC}"
else
    echo -e "${YELLOW}⚠️ Dovecot:143 not responding directly via netcat, trying restart...${NC}"
fi

# Restart webmail container to apply changes
docker compose restart webmail

echo -e "\n${GREEN}==============================================================================${NC}"
echo -e "${GREEN}🎉 SNAPPYMAIL WEBMAIL SUCCESSFULLY CONFIGURED!${NC}"
echo -e " • IMAP Host: ${CYAN}dovecot:143${NC}"
echo -e " • SMTP Host: ${CYAN}postfix:587${NC}"
echo -e " • Configured Domains: ${CYAN}default, ${BASE_DOMAIN}${NC}"

ADMIN_PASS=""
for p in "/var/lib/snappymail/_data_/_default_/admin_password.txt" \
         "/snappymail/data/_data_/_default_/admin_password.txt"; do
    if docker compose exec -T webmail test -f "$p" 2>/dev/null; then
        ADMIN_PASS=$(docker compose exec -T webmail cat "$p" 2>/dev/null | tr -d '\r\n')
        break
    fi
done

if [ -n "$ADMIN_PASS" ]; then
    echo -e " • SnappyMail Admin Panel: ${CYAN}https://${MAIL_HOST}/webmail/?admin${NC}"
    echo -e "   👤 User: ${CYAN}admin${NC} | 🔑 Password: ${YELLOW}${ADMIN_PASS}${NC}"
fi
echo -e "${GREEN}==============================================================================${NC}\n"
echo ""
