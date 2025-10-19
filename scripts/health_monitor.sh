#!/bin/sh
set -eu

BACKEND_URL="${BACKEND_URL:-http://backend:8000/health/extended}"
FRONTEND_URL="${FRONTEND_URL:-https://orgalifer.ch/health}"
BACKEND_SERVICE="${BACKEND_SERVICE:-backend}"
NGINX_SERVICE="${NGINX_SERVICE:-nginx}"
SLEEP_SECONDS="${SLEEP_SECONDS:-120}"

log() {
    printf '[health-monitor] %s\n' "$1"
}

restart_service() {
    service_name="$1"
    ids="$(docker ps --filter "label=com.docker.compose.service=${service_name}" --format '{{.ID}}')"
    if [ -z "$ids" ]; then
        log "No running container found for compose service '${service_name}'"
        return
    fi
    for id in $ids; do
        docker restart "$id" >/dev/null 2>&1 && \
            log "Restarted container ${id} for service '${service_name}'"
    done
}

while true; do
    if ! curl -fs "$BACKEND_URL" >/dev/null 2>&1; then
        log "Backend unhealthy — restarting compose service '${BACKEND_SERVICE}'"
        restart_service "$BACKEND_SERVICE"
    fi

    if ! curl -fsSk "$FRONTEND_URL" >/dev/null 2>&1; then
        log "Nginx unhealthy — restarting compose service '${NGINX_SERVICE}'"
        restart_service "$NGINX_SERVICE"
    fi

    sleep "$SLEEP_SECONDS"
done
