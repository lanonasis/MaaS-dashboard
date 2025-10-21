#!/usr/bin/env bash
set -euo pipefail

echo "Node: $(node -v)"
echo "Bun: $(bun --version 2>/dev/null || echo 'installing...')"

# Install Bun if missing
if ! command -v bun &> /dev/null; then
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
fi

# Clean potentially stale caches
rm -rf dist node_modules/.vite .vite 2>/dev/null || true

# Install and build
bun install
bun run build

# Print build artifacts for audit
echo "Built files in dist/:"
find dist -maxdepth 2 -type f | sed 's/^/- /'
