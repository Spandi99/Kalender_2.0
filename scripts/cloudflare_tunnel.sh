#!/bin/bash
sudo cloudflared service install
sudo cloudflared tunnel run orgalifer --url http://localhost:80
