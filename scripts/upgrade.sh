#!/usr/bin/env bash
# ==============================================================================
# Azion Mail - 1-Click Platform Upgrade Script
# ==============================================================================
set -e

echo "🔄 Checking for Azion Mail updates..."
git pull origin main

echo "🐳 Rebuilding and upgrading containers..."
docker compose up -d --build

echo "🗄️ Running database migrations..."
docker compose exec -T web npx prisma db push --accept-data-loss

echo "✅ Upgrade completed successfully!"
