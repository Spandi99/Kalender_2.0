#!/bin/bash
set -e

echo "🧱 Rebuilding frontend image..."
docker compose build --no-cache frontend
docker compose up -d frontend
echo "✅ Frontend rebuild complete."
