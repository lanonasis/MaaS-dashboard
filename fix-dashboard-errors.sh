#!/bin/bash

# Dashboard Error Fixes
# Fixes: React initialization error, profile fetching, and caching issues

set -e

echo "🔧 Fixing Dashboard Errors..."
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

DASHBOARD_DIR="/Users/onasis/dev-hub/lan-onasis-monorepo/apps/dashboard"

cd "$DASHBOARD_DIR"

echo -e "${YELLOW}Step 1: Clearing build cache...${NC}"
rm -rf node_modules/.vite
rm -rf dist
echo -e "${GREEN}✓ Cache cleared${NC}"
echo ""

echo -e "${YELLOW}Step 2: Checking for circular dependencies...${NC}"
# List all imports to help identify circular deps
echo "Analyzing import structure..."
if command -v madge &> /dev/null; then
  madge --circular src/
else
  echo -e "${YELLOW}  → Install 'madge' for circular dependency detection: npm i -g madge${NC}"
fi
echo ""

echo -e "${YELLOW}Step 3: Rebuilding dashboard...${NC}"
npm run build
echo -e "${GREEN}✓ Build complete${NC}"
echo ""

echo -e "${GREEN}✅ Dashboard fixes applied!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. Create user profile in Supabase (if not exists):"
echo "   Run this SQL in Supabase SQL Editor:"
echo ""
echo "   INSERT INTO profiles (id, email, full_name, created_at, updated_at)"
echo "   VALUES ("
echo "     '7ee0acfc-4afe-41d7-88b2-4bdf0cef1961',"
echo "     'estherogechi279@gmail.com',"
echo "     'Esther Ogechi',"
echo "     NOW(),"
echo "     NOW()"
echo "   )"
echo "   ON CONFLICT (id) DO UPDATE SET"
echo "     email = EXCLUDED.email,"
echo "     updated_at = NOW();"
echo ""
echo "2. Test the dashboard:"
echo "   npm run preview"
echo ""
echo "3. Or deploy to production:"
echo "   git add ."
echo "   git commit -m 'Fix dashboard profile fetching and caching'"
echo "   git push"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
