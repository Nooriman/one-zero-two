#!/usr/bin/env bash
# Nightly encrypted database backup. Run from cron; see deploy/README.md.
set -euo pipefail
cd "$(dirname "$0")"
set -a; source .env; set +a

dir="${BACKUP_DIR:-/var/backups/one-zero-two}"
mkdir -p "$dir"
file="$dir/onezerotwo-$(date +%F-%H%M).sql.gz.gpg"
# Don't leave a partial file behind if any step fails.
trap 'rm -f "$file"' ERR

docker compose exec -T db pg_dump -U onezerotwo -d onezerotwo \
  | gzip \
  | gpg --batch --yes --pinentry-mode loopback --passphrase-file "$BACKUP_PASSPHRASE_FILE" \
        --symmetric --cipher-algo AES256 -o "$file"

if [ -n "${BACKUP_S3_URI:-}" ]; then
  aws s3 cp --only-show-errors "$file" "${BACKUP_S3_URI%/}/"
fi

# Keep two weeks of local copies.
find "$dir" -name 'onezerotwo-*.gpg' -mtime +14 -delete
echo "Backup written: $file"
