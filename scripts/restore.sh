#!/usr/bin/env bash
# ==============================================================================
# Azion Mail - Backup Restoration Script
# ==============================================================================
set -e

if [ -z "$1" ]; then
    echo "Usage: ./scripts/restore.sh /path/to/azion_mail_full_YYYYMMDD_HHMMSS.tar.gz"
    exit 1
fi

ARCHIVE="$1"
RESTORE_TMP="/tmp/azion_restore_tmp"

echo "⚠️  Restoring Azion Mail from archive: $ARCHIVE..."
mkdir -p "$RESTORE_TMP"
tar -xzf "$ARCHIVE" -C "$RESTORE_TMP"
EXTRACTED_DIR=$(find "$RESTORE_TMP" -mindepth 1 -maxdepth 1 -type d | head -n 1)

# 1. Stop mail services temporarily to avoid locking
echo "⏸️  Stopping mail daemons..."
docker compose stop postfix dovecot web

# 2. Restore PostgreSQL
echo "💾 Restoring database..."
docker compose exec -T postgres psql -U azion -d azionmail < "$EXTRACTED_DIR/database.sql"

# 3. Restore Mailboxes
echo "📬 Restoring mailboxes..."
docker run --rm --volumes-from azion-dovecot -v "$EXTRACTED_DIR":/backup alpine sh -c "rm -rf /var/mail/vhosts/* && tar -xzf /backup/vmail.tar.gz -C /var/mail"

# 4. Restart Services
echo "🚀 Restarting containers..."
docker compose start

rm -rf "$RESTORE_TMP"
echo "✅ Restoration completed successfully!"
