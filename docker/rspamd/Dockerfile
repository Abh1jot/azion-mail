FROM alpine:3.20

RUN apk add --no-cache \
    rspamd \
    rspamd-client \
    rspamd-controller \
    rspamd-proxy \
    bash \
    openssl

RUN mkdir -p /etc/rspamd/local.d /var/lib/rspamd /var/log/rspamd && \
    chown -R rspamd:rspamd /var/lib/rspamd /var/log/rspamd

COPY local.d/*.conf /etc/rspamd/local.d/
COPY local.d/*.inc /etc/rspamd/local.d/
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

EXPOSE 11332 11334

ENTRYPOINT ["/entrypoint.sh"]
