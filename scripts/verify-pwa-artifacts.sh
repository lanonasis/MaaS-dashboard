#!/usr/bin/env bash
set -e

echo "Verifying PWA build artifacts..."

test -f dist/manifest.json || (echo "dist/manifest.json missing" && exit 1)
test -f dist/sw.js || (echo "dist/sw.js missing" && exit 1)
test -f dist/workbox-*.js || (echo "dist/workbox-*.js missing" && exit 1)
grep -q "precacheAndRoute" dist/sw.js || (echo "sw.js missing precacheAndRoute" && exit 1)

# Ensure no private API/auth paths accidentally entered the precache manifest
# (grep the sw.js source for URL strings that contain private route segments)
if grep -oP '(?<=url:")[^"]+' dist/sw.js | grep -E "^(api/|auth/|oauth/|mcp/|device/|.*callback.*|.*authorize.*)"; then
  echo "sw.js appears to cache private routes"
  exit 1
fi

echo "PWA artifacts OK"
