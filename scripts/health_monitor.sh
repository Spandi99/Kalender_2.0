#!/bin/sh
set -eu

BACKEND_URL="${BACKEND_URL:-http://kalender-backend:8000/health/extended}"
FRONTEND_URL="${FRONTEND_URL:-https://orgalifer.ch}"
BACKEND_CONTAINER="${BACKEND_CONTAINER:-kalender-backend}"
NGINX_CONTAINER="${NGINX_CONTAINER:-kalender-nginx}"
SLEEP_SECONDS="${SLEEP_SECONDS:-120}"

log() {
    printf '[health-monitor] %s\n' "$1"
}

while true; do
    if ! curl -fs "$BACKEND_URL" >/dev/null 2>&1; then
        log "Backend unhealthy — restarting ${BACKEND_CONTAINER}"
        docker restart "$BACKEND_CONTAINER"
    fi

    if ! curl -fsSk "$FRONTEND_URL" >/dev/null 2>&1; then
        log "Nginx unhealthy — restarting ${NGINX_CONTAINER}"
        docker restart "$NGINX_CONTAINER"
    fi

    sleep "$SLEEP_SECONDS"
done
