#!/bin/bash
# =============================================================================
# Netlify Build Script for Lan Onasis Dashboard
# =============================================================================
# Handles Bun installation and monorepo build for Netlify deployment
# =============================================================================

set -e  # Exit on any error

echo "=== Lan Onasis Dashboard Build ==="
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# -----------------------------------------------------------------------------
# Step 1: Install Bun (Netlify may not have it pre-installed)
# -----------------------------------------------------------------------------
echo ""
echo ">>> Installing Bun..."
if ! command -v bun &> /dev/null; then
    curl -fsSL https://bun.sh/install | bash
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
fi
echo "Bun version: $(bun --version)"

# -----------------------------------------------------------------------------
# Step 2: Install dependencies
# -----------------------------------------------------------------------------
echo ""
echo ">>> Installing dependencies..."
bun install --frozen-lockfile || bun install

# -----------------------------------------------------------------------------
# Step 3: Build the dashboard
# -----------------------------------------------------------------------------
echo ""
echo ">>> Building dashboard..."
bun run build

# -----------------------------------------------------------------------------
# Step 4: Verify build output
# -----------------------------------------------------------------------------
echo ""
echo ">>> Verifying build output..."
if [ -d "dist" ]; then
    echo "Build successful! Contents of dist/:"
    ls -la dist/
else
    echo "ERROR: dist/ directory not found!"
    exit 1
fi

echo ""
echo "=== Build Complete ==="
