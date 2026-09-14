#!/bin/bash
set -e

# Default environment variables
export MAIL_HOST=${MAIL_HOST:-mail.azioncloud.com}
export MAIL_DOMAIN=${MAIL_DOMAIN:-$(echo $MAIL_HOST | sed 's/^mail\.//')}
export POSTGRES_HOST=${POSTGRES_HOST:-postgres}
export POSTGRES_USER=${POSTGRES_USER:-azion}
export POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-azion_secure_pass}
export POSTGRES_DB=${POSTGRES_DB:-azionmail}
export SRS_SECRET=${SRS_SECRET:-$(openssl rand -hex 16)}

echo "🚀 Starting Postfix SMTP Service for $MAIL_HOST..."

# Check for official trusted Let's Encrypt or host certificates first
LE_CERT_FOUND=false
BASE_DOMAIN=$(echo "$MAIL_HOST" | sed 's/^mail\.//')

for cert_dir in \
    "/etc/letsencrypt/live/$MAIL_HOST" \
    "/etc/letsencrypt/live/$BASE_DOMAIN" \
    "/data/caddy/certificates/acme-v02.api.letsencrypt.org-directory/$MAIL_HOST" \
    "/data/caddy/certificates/acme.zerossl.com-v2-dv90/$MAIL_HOST"; do
    if [ -f "$cert_dir/fullchain.pem" ] && [ -f "$cert_dir/privkey.pem" ]; then
        echo "🔒 Using official Let's Encrypt certificate from $cert_dir for Postfix..."
        mkdir -p /etc/ssl/certs
        cp -L "$cert_dir/fullchain.pem" /etc/ssl/certs/mail.crt
        cp -L "$cert_dir/privkey.pem" /etc/ssl/certs/mail.key
        chmod 644 /etc/ssl/certs/mail.crt
        chmod 600 /etc/ssl/certs/mail.key
        LE_CERT_FOUND=true
        break
    elif [ -f "$cert_dir/$MAIL_HOST.crt" ] && [ -f "$cert_dir/$MAIL_HOST.key" ]; then
        echo "🔒 Using official Caddy certificate from $cert_dir for Postfix..."
        mkdir -p /etc/ssl/certs
        cp -L "$cert_dir/$MAIL_HOST.crt" /etc/ssl/certs/mail.crt
        cp -L "$cert_dir/$MAIL_HOST.key" /etc/ssl/certs/mail.key
        chmod 644 /etc/ssl/certs/mail.crt
        chmod 600 /etc/ssl/certs/mail.key
        LE_CERT_FOUND=true
        break
    fi
done

# If no trusted certificate found, check fallback or generate self-signed
if [ "$LE_CERT_FOUND" = false ]; then
    if [ ! -f /etc/ssl/certs/mail.crt ] || [ ! -f /etc/ssl/certs/mail.key ]; then
        echo "⚠️ Generating fallback self-signed SSL certificate for $MAIL_HOST..."
        mkdir -p /etc/ssl/certs
        openssl req -new -newkey rsa:2048 -days 3650 -nodes -x509 \
            -subj "/C=US/ST=Cloud/L=Server/O=Azion Cloud/CN=$MAIL_HOST" \
            -keyout /etc/ssl/certs/mail.key -out /etc/ssl/certs/mail.crt
        chmod 644 /etc/ssl/certs/mail.crt
        chmod 600 /etc/ssl/certs/mail.key
    else
        echo "ℹ️ Retaining existing SSL certificate in /etc/ssl/certs/."
    fi
fi

# Substitute variables in config files
for file in /etc/postfix/main.cf /etc/postfix/pgsql-*.cf; do
    if [ -f "$file" ]; then
        envsubst '${MAIL_HOST} ${MAIL_DOMAIN} ${POSTGRES_HOST} ${POSTGRES_USER} ${POSTGRES_PASSWORD} ${POSTGRES_DB}' < "$file" > "$file.tmp"
        mv "$file.tmp" "$file"
    fi
done

# Initialize Postsrsd for Sender Rewriting Scheme (SRS)
echo "🔄 Starting PostSRSD for SPF-compliant Gmail/Outlook forwarding..."
mkdir -p /etc/postsrsd
echo "$SRS_SECRET" > /etc/postsrsd/postsrsd.secret
chown -R nobody:nobody /etc/postsrsd
chmod 600 /etc/postsrsd/postsrsd.secret
postsrsd -s /etc/postsrsd/postsrsd.secret -d "$MAIL_DOMAIN" -a 127.0.0.1 -p 10001 -P 10002 -u nobody &

# Set permissions
chown -R vmail:vmail /var/mail/vhosts 2>/dev/null || true
newaliases 2>/dev/null || true

echo "✅ Postfix configured and ready on ports 25, 587, 465."
exec postfix start-fg
