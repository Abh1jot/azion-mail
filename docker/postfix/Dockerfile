FROM alpine:3.20

RUN adduser -u 5000 -D -s /bin/false vmail && \
    mkdir -p /etc/postfix /var/mail/vhosts && \
    chown -R vmail:vmail /var/mail/vhosts

RUN apk add --no-cache \
    postfix \
    postfix-pgsql \
    postsrsd \
    ca-certificates \
    bash \
    openssl \
    gettext-envsubst \
    supervisor \
    python3

RUN /usr/sbin/postfix set-permissions 2>/dev/null || true

COPY main.cf /etc/postfix/main.cf
COPY master.cf /etc/postfix/master.cf
COPY pgsql-*.cf /etc/postfix/
COPY archive-mail.py /usr/local/bin/archive-mail.py
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh /usr/local/bin/archive-mail.py

EXPOSE 25 587 465

ENTRYPOINT ["/entrypoint.sh"]
