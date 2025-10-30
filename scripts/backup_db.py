#!/usr/bin/env python3
"""Create rolling database backups for the Orgalifer calendar."""
from __future__ import annotations

import datetime as _dt
import os
import subprocess
import sys
from pathlib import Path
from zoneinfo import ZoneInfo

PROJECT_ROOT = Path(__file__).resolve().parents[1]
COMPOSE_FILE = PROJECT_ROOT / "docker-compose.yml"
BACKUP_DIR = Path("/home/spandi/kalender_backups")
RETENTION_DAYS = 7
LOCAL_TZ = ZoneInfo("Europe/Zurich")

POSTGRES_USER = os.environ.get("POSTGRES_USER", "postgres")
POSTGRES_DB = os.environ.get("POSTGRES_DB", "calendar_xp")
POSTGRES_PASSWORD = os.environ.get("POSTGRES_PASSWORD")


def _find_compose_command() -> list[str]:
    candidates: tuple[list[str], ...] = ("docker compose".split(), ["docker-compose"])
    for candidate in candidates:
        try:
            subprocess.run(
                [*candidate, "version"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=True,
            )
        except (FileNotFoundError, subprocess.CalledProcessError):
            continue
        return candidate
    raise RuntimeError("Unable to locate docker compose executable")


def _build_backup_command() -> list[str]:
    compose_cmd = _find_compose_command()
    container_cmd: list[str] = ["pg_dump", "-U", POSTGRES_USER, POSTGRES_DB]
    if POSTGRES_PASSWORD:
        container_cmd = ["env", f"PGPASSWORD={POSTGRES_PASSWORD}", *container_cmd]
    return [*compose_cmd, "-f", str(COMPOSE_FILE), "exec", "-T", "db", *container_cmd]


def _rotate_backups(directory: Path, retention: int) -> None:
    backups = sorted(directory.glob("backup-*.sql"))
    if len(backups) <= retention:
        return
    for old_backup in backups[:-retention]:
        try:
            old_backup.unlink(missing_ok=True)
        except OSError:
            continue


def main() -> int:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    today = _dt.datetime.now(tz=LOCAL_TZ).date().isoformat()
    backup_path = BACKUP_DIR / f"backup-{today}.sql"

    command = _build_backup_command()

    try:
        with backup_path.open("w", encoding="utf-8") as handle:
            subprocess.run(command, stdout=handle, check=True)
    except (subprocess.CalledProcessError, OSError) as exc:
        if backup_path.exists():
            backup_path.unlink(missing_ok=True)
        print(f"Backup failed: {exc}", file=sys.stderr)
        return 1

    _rotate_backups(BACKUP_DIR, RETENTION_DAYS)
    print(f"Backup created at {backup_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
