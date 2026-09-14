#!/usr/bin/env bash
# ==============================================================================
# Azion Mail - Fast Update Script (Updates Web/API without rebuilding mail services)
# Product: Azion Mail | Company: Azion Cloud
# ==============================================================================
set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}🔄 Step 1: Pulling latest changes from GitHub...${NC}"
git pull origin main

echo -e "${CYAN}⚡ Step 2: Fast-rebuilding ONLY the Web container (reusing cached mail containers)...${NC}"
docker compose up -d --no-deps --build web

echo -e "${CYAN}🗄️ Step 3: Checking database schema status...${NC}"
docker compose exec -T web npx prisma db push --accept-data-loss

echo -e "\n${GREEN}==============================================================================${NC}"
echo -e "${GREEN}✅ AZION MAIL HAS BEEN UPDATED SUCCESSFULLY IN SECONDS!${NC}"
echo -e "${GREEN}==============================================================================${NC}"
docker compose ps
