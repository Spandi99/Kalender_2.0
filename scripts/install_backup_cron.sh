#!/usr/bin/env bash
set -euo pipefail

BACKUP_SCRIPT="/home/spandi/Kalender_2/scripts/backup_db.py"
PYTHON_BIN="/usr/bin/python3"
CRON_SCHEDULE="0 2 * * *"

if ! command -v crontab >/dev/null 2>&1; then
  echo "crontab command not available; please install cron first." >&2
  exit 1
fi

tmpfile=$(mktemp)

if crontab -l >/dev/null 2>&1; then
  crontab -l >"$tmpfile"
fi

if grep -Fq "$BACKUP_SCRIPT" "$tmpfile"; then
  echo "Cron entry already present."
else
  echo "$CRON_SCHEDULE $PYTHON_BIN $BACKUP_SCRIPT" >>"$tmpfile"
  crontab "$tmpfile"
  echo "Cron entry installed: $CRON_SCHEDULE $PYTHON_BIN $BACKUP_SCRIPT"
fi

rm -f "$tmpfile"
