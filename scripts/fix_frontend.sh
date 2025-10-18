#!/bin/bash
set -e

echo "Rebuilding and fixing permissions..."
cd "$(dirname "$0")/../frontend"
npm install
npm run build
cd ..
chmod -R 755 ./frontend/dist
chown -R 101:101 ./frontend/dist

echo "✅ Frontend built & permissions fixed."
