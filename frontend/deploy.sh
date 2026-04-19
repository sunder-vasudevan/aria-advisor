#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔨 Building..."
cd "$SCRIPT_DIR"
npm run build

echo "🚀 Deploying to Vercel..."
cd "$REPO_ROOT"
DEPLOY_OUTPUT=$(vercel --prod --yes 2>&1)
echo "$DEPLOY_OUTPUT"

URL=$(echo "$DEPLOY_OUTPUT" | grep "Production:" | grep -oE "https://[^ ]+")

if [ -z "$URL" ]; then
  echo "❌ Could not extract deployment URL. Alias manually."
  exit 1
fi

echo "🔗 Aliasing $URL → aria-advisor.vercel.app..."
vercel alias set "$URL" aria-advisor.vercel.app

echo "✅ Live: https://aria-advisor.vercel.app"
