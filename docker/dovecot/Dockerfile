FROM alpine:3.20

RUN apk add --no-cache \
    dovecot \
    dovecot-pgsql \
    dovecot-lmtpd \
    dovecot-pop3d \
    ca-certificates \
    bash \
    openssl

RUN adduser -u 5000 -D -s /bin/false vmail && \
    mkdir -p /var/mail/vhosts /etc/dovecot/conf.d && \
    chown -R vmail:vmail /var/mail/vhosts

COPY dovecot.conf /etc/dovecot/dovecot.conf
COPY dovecot-sql.conf.ext /etc/dovecot/dovecot-sql.conf.ext
COPY 10-*.conf /etc/dovecot/conf.d/
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

EXPOSE 110 143 993 995 24 12345

ENTRYPOINT ["/entrypoint.sh"]
