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

# Set up and fix Postfix spool and queue permissions
echo "🔧 Configuring Postfix mail queue permissions..."
mkdir -p /var/spool/postfix /var/spool/postfix/pid /var/spool/postfix/maildrop /var/spool/postfix/public /var/spool/postfix/incoming /var/spool/postfix/active /var/spool/postfix/deferred /var/spool/postfix/bounce /var/spool/postfix/defer /var/spool/postfix/trace /var/spool/postfix/corrupt /var/spool/postfix/flush /var/spool/postfix/hold /var/spool/postfix/saved
chown -R postfix:root /var/spool/postfix
chown -R postfix:postdrop /var/spool/postfix/public /var/spool/postfix/maildrop
chmod 710 /var/spool/postfix/public
chmod 730 /var/spool/postfix/maildrop
chmod -R 700 /var/spool/postfix/incoming /var/spool/postfix/active /var/spool/postfix/deferred /var/spool/postfix/bounce /var/spool/postfix/defer /var/spool/postfix/trace /var/spool/postfix/corrupt /var/spool/postfix/hold /var/spool/postfix/saved
chgrp postdrop /usr/sbin/postdrop /usr/sbin/postqueue 2>/dev/null || true
chmod 2755 /usr/sbin/postdrop /usr/sbin/postqueue 2>/dev/null || true
postfix set-permissions 2>/dev/null || true

# Initialize Postsrsd for Sender Rewriting Scheme (SRS)
echo "🔄 Starting PostSRSD for SPF-compliant forwarding..."
mkdir -p /etc/postsrsd
echo "$SRS_SECRET" > /etc/postsrsd/postsrsd.secret
chmod 644 /etc/postsrsd/postsrsd.secret
chown -R postsrsd:postsrsd /etc/postsrsd 2>/dev/null || chown -R nobody:nobody /etc/postsrsd 2>/dev/null || true

# Generate PostSRSd configuration
cat <<EOF > /etc/postsrsd.conf
domains = { "$MAIL_DOMAIN", "$MAIL_HOST" }
secrets-file = "/etc/postsrsd/postsrsd.secret"
forward-port = 10001
reverse-port = 10002
EOF

# Start PostSRSd in background (support both 2.x and 1.x syntax)
postsrsd -c /etc/postsrsd.conf >/dev/null 2>&1 &
SRSPID=$!
sleep 0.5
if ! kill -0 $SRSPID 2>/dev/null; then
    postsrsd -s /etc/postsrsd/postsrsd.secret -d "$MAIL_DOMAIN" -a 127.0.0.1 -p 10001 -P 10002 -u nobody >/dev/null 2>&1 &
fi

# Set mail storage permissions
chown -R vmail:vmail /var/mail/vhosts 2>/dev/null || true
newaliases 2>/dev/null || true

echo "✅ Postfix configured and ready on ports 25, 587, 465."
exec postfix start-fg
