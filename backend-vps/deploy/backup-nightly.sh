#!/bin/bash
# Backup nightly do banco `pontual` — rotação de 30 dias.
# Instalar no crontab: 0 3 * * * /var/pontual/backups/backup-nightly.sh
set -e

BACKUP_DIR=/var/pontual/backups
STAMP=$(date +%Y-%m-%d)
DB=pontual
KEEP_DAYS=30

mkdir -p "$BACKUP_DIR"

# Dump PG (formato custom + compressão gzip)
PGPASSWORD='GrCkanrD2zwmkhz8RVh98CIY' pg_dump \
    -h 127.0.0.1 -U pontual_app -d "$DB" -Fc \
    -f "$BACKUP_DIR/pontual-$STAMP.dump"

# Backup também dos uploads (rsync incremental)
tar -czf "$BACKUP_DIR/uploads-$STAMP.tar.gz" -C /var/pontual uploads 2>/dev/null || true

# Rotação: apaga backups mais antigos que KEEP_DAYS
find "$BACKUP_DIR" -name "pontual-*.dump" -mtime +$KEEP_DAYS -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "uploads-*.tar.gz" -mtime +$KEEP_DAYS -delete 2>/dev/null || true

# Log
echo "$(date -Iseconds) backup OK — $(ls -1 $BACKUP_DIR/pontual-*.dump 2>/dev/null | wc -l) dumps mantidos" \
    >> "$BACKUP_DIR/backup.log"
