#!/bin/bash

# Netlify Build Script for Bun Projects
# This ensures Bun is properly installed and used for the build

set -e

echo "🔧 Setting up Bun for Netlify build..."

# Check if bun is available
if ! command -v bun &> /dev/null; then
    echo "📦 Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
fi

echo "📋 Bun version: $(bun --version)"

# Install dependencies with Bun
echo "📦 Installing dependencies with Bun..."
bun install

# Build the project with Bun
echo "🏗️ Building project with Bun..."
bun run build

echo "✅ Build completed successfully!"