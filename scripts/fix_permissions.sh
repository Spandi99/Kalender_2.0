#!/usr/bin/env sh
set -eu

TARGET_DIR="${TARGET_DIR:-./frontend/dist}"
TARGET_UID="${TARGET_UID:-1000}"
TARGET_GID="${TARGET_GID:-1000}"

if [ ! -d "${TARGET_DIR}" ]; then
  echo "[fix_permissions] Target directory '${TARGET_DIR}' not found; skipping permission fix."
  exit 0
fi

echo "[fix_permissions] Adjusting ownership to ${TARGET_UID}:${TARGET_GID} for ${TARGET_DIR}..."
if ! chown -R "${TARGET_UID}:${TARGET_GID}" "${TARGET_DIR}" 2>/dev/null; then
  echo "[fix_permissions] chown requires elevated privileges; retrying without recursion."
  chown "${TARGET_UID}:${TARGET_GID}" "${TARGET_DIR}" 2>/dev/null || true
fi

echo "[fix_permissions] Setting permissions to 755 for ${TARGET_DIR}..."
chmod -R 755 "${TARGET_DIR}" 2>/dev/null || chmod 755 "${TARGET_DIR}" 2>/dev/null || true

echo "[fix_permissions] Permission adjustments completed."
