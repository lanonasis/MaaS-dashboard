#!/bin/bash
# =============================================================================
# Netlify Build Script for Lan Onasis Dashboard
# =============================================================================
# Handles Bun installation and build for Netlify deployment (and for local
# `netlify build` / `netlify deploy --prod` runs via the CLI).
# =============================================================================

set -euo pipefail

# bun.lock is "lockfileVersion": 2, which only Bun >= 1.4 can parse. Older Bun
# reports `Unknown lockfile version`, silently ignores the lockfile, and then
# fails --frozen-lockfile with the misleading "lockfile had changes". Keep this
# in sync with the bun-version used by .github/workflows/ci.yml.
REQUIRED_BUN_VERSION="1.4.2"

echo "=== Lan Onasis Dashboard Build ==="
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# -----------------------------------------------------------------------------
# Step 1: Ensure Bun >= $REQUIRED_BUN_VERSION
# -----------------------------------------------------------------------------
# Installed into a build-local directory rather than $HOME/.bun so this never
# overwrites a developer's globally installed Bun when run from the CLI.
echo ""
echo ">>> Checking Bun..."

bun_is_older_than_required() {
    local have="$1"
    [ "$have" = "$REQUIRED_BUN_VERSION" ] && return 1
    [ "$(printf '%s\n%s\n' "$have" "$REQUIRED_BUN_VERSION" | sort -V | head -1)" = "$have" ]
}

install_pinned_bun() {
    export BUN_INSTALL="${BUN_INSTALL_DIR:-$PWD/.bun-pinned}"
    if [ ! -x "$BUN_INSTALL/bin/bun" ]; then
        echo "Installing Bun v$REQUIRED_BUN_VERSION into $BUN_INSTALL ..."
        curl -fsSL https://bun.sh/install | bash -s "bun-v$REQUIRED_BUN_VERSION"
    fi
    export PATH="$BUN_INSTALL/bin:$PATH"
}

if ! command -v bun >/dev/null 2>&1; then
    echo "No Bun on PATH."
    install_pinned_bun
elif bun_is_older_than_required "$(bun --version)"; then
    echo "Bun $(bun --version) is older than the required $REQUIRED_BUN_VERSION (bun.lock is lockfileVersion 2)."
    install_pinned_bun
fi

echo "Bun version: $(bun --version)"

# -----------------------------------------------------------------------------
# Step 2: Install dependencies
# -----------------------------------------------------------------------------
# Deliberately no `|| bun install` fallback: an unfrozen fallback would resolve
# fresh dependency versions that nothing has tested and ship them to production.
# A lockfile mismatch must fail the build.
echo ""
echo ">>> Installing dependencies..."
bun install --frozen-lockfile

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
