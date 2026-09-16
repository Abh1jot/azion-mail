#!/usr/bin/env bash
# ==============================================================================
# Azion Mail - 1-Click Platform Upgrade Script
# ==============================================================================
set -e

if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root or with sudo."
    exit 1
fi

echo "🔄 Checking for Azion Mail updates..."
git pull origin main

TARGET=${1:-web}
if [ "$TARGET" = "all" ]; then
    echo "🐳 Rebuilding and upgrading ALL containers..."
    docker compose up -d --build
else
    echo "⚡ Fast-upgrading Web container (pass 'all' to rebuild all mail daemons)..."
    docker compose up -d --no-deps --build web
fi

echo "🗄️ Running database migrations..."
docker compose exec -T web npx prisma migrate deploy 2>/dev/null || docker compose exec -T web npx prisma db push --accept-data-loss

echo "✅ Upgrade completed successfully!"

