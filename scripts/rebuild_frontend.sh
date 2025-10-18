#!/bin/bash
set -e

echo "🧱 Rebuilding frontend image..."
docker compose stop frontend >/dev/null 2>&1 || true
docker compose rm -f frontend >/dev/null 2>&1 || true
docker compose build --no-cache frontend
docker compose up -d frontend
echo "✅ Frontend rebuild complete."
docker logs -f kalender-frontend --tail=20
