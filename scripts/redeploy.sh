#!/bin/bash
set -e

echo "🧱 Building and restarting stack..."
docker compose down -v
docker compose build --no-cache
docker compose up -d
sleep 5
echo "✅ Checking API health..."
curl -I http://localhost:8000/api/health || true
curl -I http://orgalifer.ch/api/health || true
