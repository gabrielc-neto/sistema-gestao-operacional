#!/bin/bash
# Backup completo Pontual: PG + uploads -> Google Drive via rclone
# Rodar diariamente 2h AM via cron
set -euo pipefail

# Carrega credenciais do backend (silencioso, nunca imprime)
set -a
source /var/pontual/backend/.env
set +a

TS=$(date +%Y-%m-%d-%H%M%S)
BDIR=/var/pontual/backups/full
mkdir -p "$BDIR"

echo "[$TS] iniciando backup Pontual"

# 1) Dump PG
export PGPASSWORD="$DB_PASS"
pg_dump -h "${DB_HOST:-127.0.0.1}" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" \
  --clean --if-exists --no-owner --no-privileges \
  -f "$BDIR/pg-$TS.sql"
echo "  ok pg_dump"

# 2) Tar uploads
tar czf "$BDIR/uploads-$TS.tar.gz" -C /var/pontual/uploads .
echo "  ok tar uploads"

# 3) Bundle final
tar czf "$BDIR/pontual-full-$TS.tar.gz" -C "$BDIR" "pg-$TS.sql" "uploads-$TS.tar.gz"
rm -f "$BDIR/pg-$TS.sql" "$BDIR/uploads-$TS.tar.gz"
SIZE=$(du -h "$BDIR/pontual-full-$TS.tar.gz" | cut -f1)
echo "  ok bundle ($SIZE)"

# 4) Upload GDrive - diario
rclone copy "$BDIR/pontual-full-$TS.tar.gz" gdrive:pontual-backups/diario --stats-one-line 2>&1 | tail -3
echo "  ok upload diario"

# 5) Se dia 1 do mes, tambem em mensal
if [ "$(date +%d)" = "01" ]; then
  rclone copy "$BDIR/pontual-full-$TS.tar.gz" gdrive:pontual-backups/mensal --stats-one-line 2>&1 | tail -3
  echo "  ok upload mensal"
fi

# 6) Retencao local: 7 dias
find "$BDIR" -name "pontual-full-*.tar.gz" -mtime +7 -delete

# 7) Retencao Drive: 30 dias diario + 400 dias (~13 meses) mensal
rclone delete gdrive:pontual-backups/diario --min-age 30d 2>&1 | tail -2 || true
rclone delete gdrive:pontual-backups/mensal --min-age 400d 2>&1 | tail -2 || true

echo "[$TS] backup completo"
