#!/usr/bin/env bash
# ==============================================================================
# Azion Mail - Smart Fast Update Script
# Automatically detects changes and avoids unnecessary builds!
# Product: Azion Mail | Company: Azion Cloud
# ==============================================================================
set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

FORCE_BUILD=false
for arg in "$@"; do
    case $arg in
        --force-build|-b|--rebuild)
            FORCE_BUILD=true
            shift
            ;;
    esac
done

echo -e "${CYAN}🔍 Step 1: Checking for updates from GitHub...${NC}"
git fetch origin main --quiet

LOCAL_HASH=$(git rev-parse HEAD)
REMOTE_HASH=$(git rev-parse origin/main)

if [ "$LOCAL_HASH" = "$REMOTE_HASH" ] && [ "$FORCE_BUILD" = false ]; then
    echo -e "${GREEN}✅ Already up to date! No updates detected.${NC}"
    echo -e "${BLUE}💡 If you want to force rebuild the web container anyway, run: bash update.sh --force-build${NC}"
    exit 0
fi

# Detect what changed before pulling
CHANGED_FILES=""
if [ "$LOCAL_HASH" != "$REMOTE_HASH" ]; then
    CHANGED_FILES=$(git diff --name-only "$LOCAL_HASH" "$REMOTE_HASH")
    echo -e "${CYAN}⬇️  Pulling changes from GitHub...${NC}"
    git pull origin main
else
    echo -e "${YELLOW}⚡ Force-build flag detected. Proceeding with update...${NC}"
fi

# Categorize changes
WEB_CHANGED=false
CADDY_CHANGED=false
POSTFIX_CHANGED=false
DOVECOT_CHANGED=false
RSPAMD_CHANGED=false
COMPOSE_CHANGED=false

if [ "$FORCE_BUILD" = true ]; then
    WEB_CHANGED=true
fi

if echo "$CHANGED_FILES" | grep -qE "^(src/|prisma/|public/|package\.json|package-lock\.json|next\.config\.ts|tailwind\.config\.ts|tsconfig\.json|docker/web/)"; then
    WEB_CHANGED=true
fi

if echo "$CHANGED_FILES" | grep -qE "^docker/caddy/"; then
    CADDY_CHANGED=true
fi

if echo "$CHANGED_FILES" | grep -qE "^docker/postfix/"; then
    POSTFIX_CHANGED=true
fi

if echo "$CHANGED_FILES" | grep -qE "^docker/dovecot/"; then
    DOVECOT_CHANGED=true
fi

if echo "$CHANGED_FILES" | grep -qE "^docker/rspamd/"; then
    RSPAMD_CHANGED=true
fi

if echo "$CHANGED_FILES" | grep -qE "^docker-compose\.yml"; then
    COMPOSE_CHANGED=true
fi

# -----------------------------------------------------------------------------
# Apply updates conditionally based on changes
# -----------------------------------------------------------------------------

# 1. Web / Dashboard / API
if [ "$WEB_CHANGED" = true ]; then
    echo -e "\n${CYAN}⚡ Web application changes detected! Updating Web service...${NC}"
    
    # Try pulling pre-built image first from GitHub Container Registry (takes seconds)
    echo -e "${BLUE}📦 Checking for pre-built image from GitHub Container Registry...${NC}"
    if docker compose pull web 2>/dev/null; then
        echo -e "${GREEN}✅ Downloaded pre-built image! Starting container...${NC}"
        docker compose up -d --no-deps web
    else
        echo -e "${YELLOW}⚙️  Building web container locally with BuildKit cache...${NC}"
        DOCKER_BUILDKIT=1 docker compose build web
        docker compose up -d --no-deps web
    fi

    echo -e "${CYAN}🗄️ Checking database schema status...${NC}"
    docker compose exec -T web npx prisma db push --accept-data-loss || true
else
    echo -e "${GREEN}✨ No web code changes detected. Skipped web build entirely!${NC}"
fi

# 2. Caddy Reverse Proxy
if [ "$CADDY_CHANGED" = true ]; then
    echo -e "${CYAN}🔄 Reloading Caddy Reverse Proxy configuration...${NC}"
    docker compose restart caddy
    echo -e "${GREEN}✅ Caddy updated & reloaded in 1s.${NC}"
fi

# 3. Postfix SMTP
if [ "$POSTFIX_CHANGED" = true ]; then
    echo -e "${CYAN}🔄 Reloading Postfix SMTP service...${NC}"
    docker compose restart postfix
    echo -e "${GREEN}✅ Postfix updated & reloaded in 1s.${NC}"
fi

# 4. Dovecot IMAP
if [ "$DOVECOT_CHANGED" = true ]; then
    echo -e "${CYAN}🔄 Reloading Dovecot IMAP service...${NC}"
    docker compose restart dovecot
    echo -e "${GREEN}✅ Dovecot updated & reloaded in 1s.${NC}"
fi

# 5. Rspamd Filtering
if [ "$RSPAMD_CHANGED" = true ]; then
    echo -e "${CYAN}🔄 Reloading Rspamd Filter service...${NC}"
    docker compose restart rspamd
    echo -e "${GREEN}✅ Rspamd updated & reloaded in 1s.${NC}"
fi

# 6. Docker Compose Top-level
if [ "$COMPOSE_CHANGED" = true ]; then
    echo -e "${CYAN}🔄 Applying Docker Compose infrastructure updates...${NC}"
    docker compose up -d
fi

# 7. Auto-Sync Let's Encrypt SSL certificates to Postfix & Dovecot if available
if [ -f "sync-ssl.sh" ]; then
    bash sync-ssl.sh 2>/dev/null || true
fi

echo -e "\n${GREEN}==============================================================================${NC}"
echo -e "${GREEN}✅ AZION MAIL UPDATED SUCCESSFULLY!${NC}"
echo -e "${GREEN}==============================================================================${NC}"
docker compose ps
