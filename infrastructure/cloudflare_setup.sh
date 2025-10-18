#!/bin/bash
set -e

# Cloudflare Tunnel installieren (falls nicht vorhanden)
if ! command -v cloudflared &> /dev/null; then
  echo "Installing Cloudflare Tunnel..."
  curl -fsSL https://pkg.cloudflare.com/install.sh | sudo bash
  sudo apt install -y cloudflared
fi

echo "Authenticating with Cloudflare..."
sudo cloudflared tunnel login

# Tunnel erstellen und Domain binden
sudo cloudflared tunnel create orgalifer
sudo cloudflared tunnel route dns orgalifer orgalifer.ch

# Tunnel starten
sudo cloudflared tunnel run orgalifer --url http://nginx:80
