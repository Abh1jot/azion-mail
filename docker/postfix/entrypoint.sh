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

# Generate self-signed SSL cert if none exists
if [ ! -f /etc/ssl/certs/mail.crt ] || [ ! -f /etc/ssl/certs/mail.key ]; then
    echo "🔒 Generating fallback SSL certificate for $MAIL_HOST..."
    mkdir -p /etc/ssl/certs
    openssl req -new -newkey rsa:2048 -days 3650 -nodes -x509 \
        -subj "/C=US/ST=Cloud/L=Server/O=Azion Cloud/CN=$MAIL_HOST" \
        -keyout /etc/ssl/certs/mail.key -out /etc/ssl/certs/mail.crt
    chmod 600 /etc/ssl/certs/mail.key
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
