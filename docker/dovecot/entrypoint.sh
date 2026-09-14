#!/bin/bash
set -e

export MAIL_HOST=${MAIL_HOST:-mail.azioncloud.com}
export POSTGRES_HOST=${POSTGRES_HOST:-postgres}
export POSTGRES_USER=${POSTGRES_USER:-azion}
export POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-azion_secure_pass}
export POSTGRES_DB=${POSTGRES_DB:-azionmail}

echo "🚀 Starting Dovecot IMAP/POP3 Service..."

# Check fallback cert
if [ ! -f /etc/ssl/certs/mail.crt ] || [ ! -f /etc/ssl/certs/mail.key ]; then
    echo "🔒 Generating fallback SSL certificate for Dovecot..."
    mkdir -p /etc/ssl/certs
    openssl req -new -newkey rsa:2048 -days 3650 -nodes -x509 \
        -subj "/C=US/ST=Cloud/L=Server/O=Azion Cloud/CN=$MAIL_HOST" \
        -keyout /etc/ssl/certs/mail.key -out /etc/ssl/certs/mail.crt
    chmod 600 /etc/ssl/certs/mail.key
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
