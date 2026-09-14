FROM alpine:3.20

RUN apk add --no-cache \
    postfix \
    postfix-pgsql \
    postsrsd \
    ca-certificates \
    bash \
    openssl \
    supervisor

RUN mkdir -p /etc/postfix /var/spool/postfix /var/mail/vhosts && \
    adduser -u 5000 -D -s /bin/false vmail && \
    chown -R vmail:vmail /var/mail/vhosts

COPY main.cf /etc/postfix/main.cf
COPY master.cf /etc/postfix/master.cf
COPY pgsql-*.cf /etc/postfix/
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

EXPOSE 25 587 465

ENTRYPOINT ["/entrypoint.sh"]
