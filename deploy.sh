#!/bin/bash
set -e

MSG="${1:-deploy update}"

echo "📦 Staging changes..."
git add -A

if git diff --cached --quiet; then
  echo "⚠️  No changes to commit"
else
  git commit -m "$MSG

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
  echo "✅ Committed: $MSG"
fi

echo "🚀 Pushing to GitHub..."
git push origin HEAD:main

echo "🔄 Deploying to server..."
ssh root@164.92.220.189 "cd /var/www/forex-expo/forex-expo-ue5 && git pull && pm2 restart all"

echo "✅ Deployed to http://164.92.220.189"
