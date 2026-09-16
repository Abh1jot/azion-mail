#!/usr/bin/env bash
# ==============================================================================
# Azion Mail - Automated Backup Utility
# ==============================================================================
set -e

BACKUP_DIR="${BACKUP_DIR:-/var/backups/azion-mail}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TARGET="$BACKUP_DIR/azion_mail_backup_$TIMESTAMP"

mkdir -p "$TARGET"
echo "📦 Starting Azion Mail backup to $TARGET..."

# 1. Dump PostgreSQL Database
echo "💾 Exporting PostgreSQL database..."
. .env 2>/dev/null || true
docker compose exec -T postgres pg_dump -U "${POSTGRES_USER:-azion}" "${POSTGRES_DB:-azionmail}" > "$TARGET/database.sql"

# 2. Archive Virtual Mailboxes
echo "📬 Archiving virtual mailboxes..."
docker run --rm --volumes-from azion-dovecot -v "$TARGET":/backup alpine tar -czf /backup/vmail.tar.gz -C /var/mail vhosts

# 3. Archive DKIM keys & certs
echo "🔑 Archiving DKIM keys and SSL certificates..."
docker run --rm --volumes-from azion-rspamd -v "$TARGET":/backup alpine tar -czf /backup/dkim.tar.gz -C /var/lib/rspamd dkim 2>/dev/null || true

# 4. Copy configuration
cp .env "$TARGET/.env"

# Compress into single archive
tar -czf "$BACKUP_DIR/azion_mail_full_$TIMESTAMP.tar.gz" -C "$BACKUP_DIR" "azion_mail_backup_$TIMESTAMP"
rm -rf "$TARGET"

echo "✅ Backup complete: $BACKUP_DIR/azion_mail_full_$TIMESTAMP.tar.gz"
