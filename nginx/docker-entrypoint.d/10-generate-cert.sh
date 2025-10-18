#!/bin/sh
set -eu

CERT_DIR="/etc/letsencrypt/live/orgalifer.ch"
FULLCHAIN="$CERT_DIR/fullchain.pem"
PRIVKEY="$CERT_DIR/privkey.pem"

mkdir -p "$CERT_DIR"

if [ ! -s "$FULLCHAIN" ] || [ ! -s "$PRIVKEY" ]; then
    echo "[nginx] Generating dummy TLS certificate for orgalifer.ch"
    openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
        -keyout "$PRIVKEY" \
        -out "$FULLCHAIN" \
        -subj "/CN=orgalifer.ch"
fi

CONF_DIR="/etc/nginx/conf.d"
if [ -d "$CONF_DIR" ]; then
    find "$CONF_DIR" -type f ! -name '.keep' -delete
fi
