#!/usr/bin/env bash
set -euo pipefail

echo "Node: $(node -v)"
echo "NPM: $(npm -v)"

# Clean potentially stale caches
rm -rf dist node_modules/.vite .vite 2>/dev/null || true

# Install and build
npm ci
npm run build

# Print build artifacts for audit
echo "Built files in dist/:"
find dist -maxdepth 2 -type f | sed 's/^/- /'
