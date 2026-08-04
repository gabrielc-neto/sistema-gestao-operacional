#!/bin/bash
# Backup nightly do banco `pontual` — rotação de 30 dias.
# Instalar no crontab: 0 3 * * * /var/pontual/backups/backup-nightly.sh
#
# Requer env vars:
#   PGPASSWORD (senha do usuário pontual_app)
# Fonte recomendada no VPS: /etc/default/pontual-backup (chmod 600, owner root)
#   PGPASSWORD=xxxx
set -e

# Carrega env do arquivo protegido, se existir
if [ -f /etc/default/pontual-backup ]; then
    set -a
    . /etc/default/pontual-backup
    set +a
fi

if [ -z "$PGPASSWORD" ]; then
    echo "ERR: defina PGPASSWORD em /etc/default/pontual-backup (chmod 600) ou no ambiente" >&2
    exit 2
fi

BACKUP_DIR=/var/pontual/backups
STAMP=$(date +%Y-%m-%d)
DB=pontual
KEEP_DAYS=30

mkdir -p "$BACKUP_DIR"

# Dump PG (formato custom + compressão gzip)
export PGPASSWORD
pg_dump \
    -h 127.0.0.1 -U pontual_app -d "$DB" -Fc \
    -f "$BACKUP_DIR/pontual-$STAMP.dump"
unset PGPASSWORD

# Backup também dos uploads (rsync incremental)
tar -czf "$BACKUP_DIR/uploads-$STAMP.tar.gz" -C /var/pontual uploads 2>/dev/null || true

# Rotação: apaga backups mais antigos que KEEP_DAYS
find "$BACKUP_DIR" -name "pontual-*.dump" -mtime +$KEEP_DAYS -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "uploads-*.tar.gz" -mtime +$KEEP_DAYS -delete 2>/dev/null || true

# Log
echo "$(date -Iseconds) backup OK — $(ls -1 $BACKUP_DIR/pontual-*.dump 2>/dev/null | wc -l) dumps mantidos" \
    >> "$BACKUP_DIR/backup.log"
