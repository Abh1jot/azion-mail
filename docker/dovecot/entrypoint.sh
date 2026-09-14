#!/bin/bash
set -e

export MAIL_HOST=${MAIL_HOST:-mail.azioncloud.com}
export POSTGRES_HOST=${POSTGRES_HOST:-postgres}
export POSTGRES_USER=${POSTGRES_USER:-azion}
export POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-azion_secure_pass}
export POSTGRES_DB=${POSTGRES_DB:-azionmail}

echo "🚀 Starting Dovecot IMAP/POP3 Service..."

# Check for official trusted Let's Encrypt or host certificates first
LE_CERT_FOUND=false
BASE_DOMAIN=$(echo "$MAIL_HOST" | sed 's/^mail\.//')

for cert_dir in \
    "/etc/letsencrypt/live/$MAIL_HOST" \
    "/etc/letsencrypt/live/$BASE_DOMAIN" \
    "/data/caddy/certificates/acme-v02.api.letsencrypt.org-directory/$MAIL_HOST" \
    "/data/caddy/certificates/acme.zerossl.com-v2-dv90/$MAIL_HOST"; do
    if [ -f "$cert_dir/fullchain.pem" ] && [ -f "$cert_dir/privkey.pem" ]; then
        echo "🔒 Using official Let's Encrypt certificate from $cert_dir for Dovecot..."
        mkdir -p /etc/ssl/certs
        cp -L "$cert_dir/fullchain.pem" /etc/ssl/certs/mail.crt
        cp -L "$cert_dir/privkey.pem" /etc/ssl/certs/mail.key
        chmod 644 /etc/ssl/certs/mail.crt
        chmod 600 /etc/ssl/certs/mail.key
        LE_CERT_FOUND=true
        break
    elif [ -f "$cert_dir/$MAIL_HOST.crt" ] && [ -f "$cert_dir/$MAIL_HOST.key" ]; then
        echo "🔒 Using official Caddy certificate from $cert_dir for Dovecot..."
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
        echo "⚠️ Generating fallback self-signed SSL certificate for Dovecot..."
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

# Substitute Postgres variables in sql config
if [ -f /etc/dovecot/dovecot-sql.conf.ext ]; then
    envsubst '${POSTGRES_HOST} ${POSTGRES_USER} ${POSTGRES_PASSWORD} ${POSTGRES_DB}' < /etc/dovecot/dovecot-sql.conf.ext > /etc/dovecot/dovecot-sql.conf.ext.tmp
    mv /etc/dovecot/dovecot-sql.conf.ext.tmp /etc/dovecot/dovecot-sql.conf.ext
fi

mkdir -p /var/mail/vhosts
chown -R vmail:vmail /var/mail/vhosts
chmod -R 770 /var/mail/vhosts

echo "✅ Dovecot ready on IMAP (:143, :993) and POP3 (:110, :995)."
exec dovecot -F
