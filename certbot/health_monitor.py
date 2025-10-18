#!/usr/bin/env python3
import datetime
import os
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


def reload_nginx() -> None:
    log("🔄 Reloading Nginx due to health issue...")
    subprocess.run(["nginx", "-s", "reload"], check=False)


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
