#!/bin/sh
set -euo pipefail

POSTGRES_UID="$(id -u postgres 2>/dev/null || echo 999)"
POSTGRES_GID="$(id -g postgres 2>/dev/null || echo 999)"

log() {
    printf '[volume-init] %s\n' "$1"
}

ensure_dir() {
    path="$1"
    mode="$2"
    owner="$3"
    group="$4"
    mkdir -p "$path"
    chmod "$mode" "$path"
    chown -R "$owner":"$group" "$path"
}

log "Preparing postgres data directory with UID:GID=${POSTGRES_UID}:${POSTGRES_GID}"
ensure_dir "/volumes/postgres_data" 750 "$POSTGRES_UID" "$POSTGRES_GID"
chmod -R 750 /volumes/postgres_data || true

log "Preparing certbot configuration directory"
mkdir -p /volumes/certbot_conf
chown -R root:root /volumes/certbot_conf
chmod -R 700 /volumes/certbot_conf
