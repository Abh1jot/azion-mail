#!/bin/bash
set -e

echo "🚀 Starting Rspamd Spam Filter Daemon..."

mkdir -p /var/lib/rspamd/dkim /var/log/rspamd
chown -R rspamd:rspamd /var/lib/rspamd /var/log/rspamd /etc/rspamd/local.d

echo "✅ Rspamd ready on Milter (:11332) and Controller (:11334)."
exec rspamd -f -u rspamd -g rspamd
