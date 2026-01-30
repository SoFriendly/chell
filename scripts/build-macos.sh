#!/bin/bash
set -e

# Usage: ./scripts/build-macos.sh [major|minor|patch]
# If bump type provided, version will be incremented before build

# Load environment variables from .env.local if it exists
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# Bump version if argument provided
if [ -n "$1" ]; then
  ./scripts/bump-version.sh "$1"
fi

# Check required environment variables
if [ -z "$APPLE_ID" ] || [ -z "$APPLE_PASSWORD" ] || [ -z "$APPLE_TEAM_ID" ]; then
  echo "Error: Missing Apple signing credentials"
  echo "Please set APPLE_ID, APPLE_PASSWORD, and APPLE_TEAM_ID in .env.local"
  exit 1
fi

# For Tauri signing (auto-update signatures)
if [ -z "$TAURI_SIGNING_PRIVATE_KEY" ]; then
  echo "Warning: TAURI_SIGNING_PRIVATE_KEY not set - updates won't be signed"
fi

echo "Building Chell..."
echo "Apple ID: $APPLE_ID"
echo "Team ID: $APPLE_TEAM_ID"

# Build the app
pnpm tauri build

echo ""
echo "Build complete!"
echo "Artifacts are in: src-tauri/target/release/bundle/"

# List the built artifacts
echo ""
echo "Built files:"
ls -la src-tauri/target/release/bundle/macos/ 2>/dev/null || true
ls -la src-tauri/target/release/bundle/dmg/ 2>/dev/null || true
