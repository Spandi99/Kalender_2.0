#!/usr/bin/env python3
import datetime
import os
import shlex
import ssl
import subprocess
from typing import Final

import requests

DOMAIN: Final[str] = "orgalifer.ch"
CERT_PATH: Final[str] = f"/etc/letsencrypt/live/{DOMAIN}/fullchain.pem"
BACKEND_HEALTH: Final[str] = "https://orgalifer.ch/api/health"


def log(message: str) -> None:
    print(f"[{datetime.datetime.now().isoformat()}] {message}", flush=True)


def check_cert_validity() -> bool:
    try:
        ssl.get_server_certificate((DOMAIN, 443))
    except Exception as exc:  # pragma: no cover - diagnostics only
        log(f"⚠️ SSL certificate check failed: {exc}")
        return False
    else:
        log("✅ SSL certificate fetched successfully.")
        return True


def check_backend_health() -> bool:
    try:
        response = requests.get(BACKEND_HEALTH, timeout=5, verify=False)
    except Exception as exc:  # pragma: no cover - diagnostics only
        log(f"⚠️ Backend health check failed: {exc}")
        return False

    if response.status_code == 200:
        log("✅ Backend health OK.")
        return True

    log(f"⚠️ Backend unhealthy: {response.status_code}")
    return False


DEFAULT_RELOAD_COMMAND: Final[tuple[str, ...]] = (
    "docker",
    "exec",
    "kalender-nginx",
    "nginx",
    "-s",
    "reload",
)


def _resolve_reload_command() -> tuple[str, ...]:
    configured = os.environ.get("NGINX_RELOAD_COMMAND")
    if configured:
        parts = tuple(shlex.split(configured))
        if parts:
            return parts
        log("⚠️ NGINX_RELOAD_COMMAND provided but empty, falling back to default.")
    return DEFAULT_RELOAD_COMMAND


def reload_nginx() -> None:
    command = _resolve_reload_command()
    log(f"🔄 Reloading Nginx due to health issue using: {' '.join(command)}")
    try:
        result = subprocess.run(command, check=False, capture_output=True, text=True)
    except FileNotFoundError as exc:
        log(f"❌ Failed to reload Nginx (command not found): {exc}")
        return

    if result.returncode != 0:
        log(
            "❌ Nginx reload command failed: "
            f"{result.returncode}; stdout={result.stdout.strip()!r}; "
            f"stderr={result.stderr.strip()!r}"
        )
    else:
        if result.stdout.strip():
            log(f"ℹ️ Nginx reload output: {result.stdout.strip()}")
        if result.stderr.strip():
            log(f"ℹ️ Nginx reload stderr: {result.stderr.strip()}")
        log("✅ Nginx reload command succeeded.")


if not os.path.exists(CERT_PATH):
    log("❌ No certificate found, generating self-signed fallback...")
    os.makedirs(os.path.dirname(CERT_PATH), exist_ok=True)
    subprocess.run(
        [
            "openssl",
            "req",
            "-x509",
            "-nodes",
            "-newkey",
            "rsa:2048",
            "-days",
            "3",
            "-keyout",
            f"/etc/letsencrypt/live/{DOMAIN}/privkey.pem",
            "-out",
            CERT_PATH,
            "-subj",
            f"/CN={DOMAIN}",
        ],
        check=False,
    )
else:
    log("✅ Certificate exists, validating health...")

healthy = check_cert_validity() and check_backend_health()
if not healthy:
    reload_nginx()
else:
    log("💚 System healthy.")
