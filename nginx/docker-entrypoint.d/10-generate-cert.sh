#!/bin/sh
set -eux

CERT_DIR="/etc/letsencrypt/live/orgalifer.ch"
FULLCHAIN="$CERT_DIR/fullchain.pem"
PRIVKEY="$CERT_DIR/privkey.pem"
ORIGIN_CERT_DIR="/etc/cloudflared"
ORIGIN_CERT="$ORIGIN_CERT_DIR/cert.pem"
ORIGIN_KEY="$ORIGIN_CERT_DIR/cert.key"

mkdir -p "$CERT_DIR"

echo "[nginx] Checking for Cloudflare origin certificate in $ORIGIN_CERT_DIR"
if [ -f "$ORIGIN_CERT" ] && [ -f "$ORIGIN_KEY" ]; then
    echo "[nginx] Installing Cloudflare origin certificate for orgalifer.ch"
    cp "$ORIGIN_CERT" "$FULLCHAIN"
    cp "$ORIGIN_KEY" "$PRIVKEY"
    chmod 600 "$FULLCHAIN" "$PRIVKEY"
elif [ ! -s "$FULLCHAIN" ] || [ ! -s "$PRIVKEY" ]; then
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
