#!/usr/bin/env bash
set -euo pipefail

SOURCE_ROOT="${SOURCE_ROOT:-/var/www/jais_ai}"
BACKUP_ROOT="${BACKUP_ROOT:-/home/ubuntu/backups/source_code}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="$(date +%F_%H%M%S)"
ARCHIVE_NAME="jais_ai_source_${STAMP}.tar.gz"
ARCHIVE_PATH="${BACKUP_ROOT}/${ARCHIVE_NAME}"

mkdir -p "${BACKUP_ROOT}"

echo "[INFO] Source root: ${SOURCE_ROOT}"
echo "[INFO] Backup file: ${ARCHIVE_PATH}"

tar \
  --exclude='frontend/node_modules' \
  --exclude='frontend/build' \
  --exclude='api/vendor' \
  --exclude='api/storage/app' \
  --exclude='api/storage/logs' \
  --exclude='api/storage/framework/cache/*' \
  --exclude='api/storage/framework/sessions/*' \
  --exclude='api/storage/framework/views/*' \
  --exclude='api/bootstrap/cache/*' \
  --exclude='whatsapp-web/node_modules' \
  --exclude='whatsapp-web/.wwebjs_auth' \
  --exclude='whatsapp-web/.wwebjs_cache' \
  --exclude='whatsapp-web/chrome-profile' \
  --exclude='whatsapp-web/session' \
  --exclude='.tmp' \
  --exclude='*.log' \
  -czf "${ARCHIVE_PATH}" \
  -C "$(dirname "${SOURCE_ROOT}")" \
  "$(basename "${SOURCE_ROOT}")"

echo "[INFO] Backup selesai: ${ARCHIVE_PATH}"

find "${BACKUP_ROOT}" -maxdepth 1 -type f -name 'jais_ai_source_*.tar.gz' -mtime +"${RETENTION_DAYS}" -print -delete

echo "[INFO] Retention cleanup selesai (>${RETENTION_DAYS} hari)."
