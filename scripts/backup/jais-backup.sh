#!/usr/bin/env bash
set -euo pipefail

# Daily backup for JAIS AI: MySQL dump + Laravel storage + .env files.
# Designed to be run from cron on the application server.
#
# Required env (override with /etc/default/jais-backup or inline):
#   APP_ROOT       Path to deployed jais_ai repo on the server
#   BACKUP_ROOT    Where to write archives (will be created)
#   DB_HOST DB_PORT DB_NAME DB_USER DB_PASS   MySQL credentials
#   RETENTION_DAYS How many days of backups to keep (default 14)
#   S3_BUCKET      Optional s3://bucket/prefix for offsite copy

CONFIG_FILE="${CONFIG_FILE:-/etc/default/jais-backup}"
[[ -f "$CONFIG_FILE" ]] && source "$CONFIG_FILE"

APP_ROOT="${APP_ROOT:?APP_ROOT not set}"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/jais}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:?DB_NAME not set}"
DB_USER="${DB_USER:?DB_USER not set}"
DB_PASS="${DB_PASS:?DB_PASS not set}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
S3_BUCKET="${S3_BUCKET:-}"

TS="$(date +%Y%m%d-%H%M%S)"
WORK_DIR="$BACKUP_ROOT/$TS"
ARCHIVE="$BACKUP_ROOT/jais-backup-$TS.tar.gz"
LOG_FILE="$BACKUP_ROOT/backup.log"

mkdir -p "$WORK_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1
echo "[$(date -Iseconds)] backup start -> $ARCHIVE"

# 1. MySQL dump (single-transaction = consistent on InnoDB without locking).
MYSQL_PWD="$DB_PASS" mysqldump \
  -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" \
  --single-transaction --quick --routines --triggers --events \
  --set-gtid-purged=OFF \
  "$DB_NAME" | gzip -9 > "$WORK_DIR/db-$DB_NAME.sql.gz"

# 2. Laravel storage (uploads, generated PDFs, logs you want to keep).
if [[ -d "$APP_ROOT/api/storage/app" ]]; then
  tar -czf "$WORK_DIR/storage-app.tar.gz" -C "$APP_ROOT/api/storage" app
fi

# 3. Critical config (.env files only — not the whole repo, that's in git).
for env_path in api/.env frontend/.env whatsapp-web/.env; do
  if [[ -f "$APP_ROOT/$env_path" ]]; then
    install -D -m 600 "$APP_ROOT/$env_path" "$WORK_DIR/config/$env_path"
  fi
done

# 4. WhatsApp Web session (so the bot doesn't have to re-pair after restore).
if [[ -d "$APP_ROOT/whatsapp-web/.wwebjs_auth" ]]; then
  tar -czf "$WORK_DIR/wwebjs_auth.tar.gz" -C "$APP_ROOT/whatsapp-web" .wwebjs_auth
fi

# 5. Bundle and remove the working dir.
tar -czf "$ARCHIVE" -C "$BACKUP_ROOT" "$TS"
chmod 600 "$ARCHIVE"
rm -rf "$WORK_DIR"

# 6. Optional offsite copy to S3.
if [[ -n "$S3_BUCKET" ]]; then
  aws s3 cp "$ARCHIVE" "$S3_BUCKET/" --only-show-errors
fi

# 7. Local retention.
find "$BACKUP_ROOT" -maxdepth 1 -name 'jais-backup-*.tar.gz' \
  -type f -mtime "+$RETENTION_DAYS" -delete

echo "[$(date -Iseconds)] backup done   $(du -h "$ARCHIVE" | cut -f1)"
