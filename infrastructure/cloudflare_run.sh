#!/usr/bin/env bash
set -euo pipefail

sudo cloudflared service install
sudo cloudflared tunnel run orgalifer --url http://localhost:80
