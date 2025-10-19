#!/bin/sh
set -eu

SOURCE_DIR="/var/www/dist"
TARGET_DIR="/usr/share/nginx/html"

if [ -d "$SOURCE_DIR" ]; then
    mkdir -p "$TARGET_DIR"
    if [ -n "$(ls -A "$TARGET_DIR" 2>/dev/null || true)" ]; then
        find "$TARGET_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
    fi
    cp -a "$SOURCE_DIR"/. "$TARGET_DIR"/
fi
