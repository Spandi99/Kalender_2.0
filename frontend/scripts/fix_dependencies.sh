#!/bin/bash
set -e

echo "🔍 Checking frontend dependencies..."
cd "$(dirname "$0")/.."

# 1. Aktualisiere npm & lockfile
npm install -g npm@latest
npm install --legacy-peer-deps

# 2. Stelle sicher, dass kritische UI-Module installiert sind
npm install framer-motion@10.18.0 react-circular-progressbar@2.2.0 \
            react-router-dom@6.30.1 @emotion/is-prop-valid@0.8.8 \
            @emotion/memoize@0.7.4 @remix-run/router@1.23.0 \
            react-router@6.30.1 --legacy-peer-deps

# 3. Lockfile regenerieren
rm -f package-lock.json
npm install --legacy-peer-deps

echo "✅ Dependencies fixed and lockfile regenerated."
