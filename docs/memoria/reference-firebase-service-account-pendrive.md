---
name: reference-firebase-service-account-pendrive
description: "Chave service account do Firebase pontual-logistica fica nos backups do pendrive D:, path scripts/serviceAccountKey.json — usar com GOOGLE_APPLICATION_CREDENTIALS pra deploy sem `firebase login`"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 5ea08958-1f02-42f6-ba92-d591d7f7a51f
---

Deploy Firebase Hosting sem `firebase login`: usar service account key salvo nos backups do pendrive.

**Path recorrente:** `/d/Backup-Logistica-YYYY-MM-DD/projetos/logistica-ia/scripts/serviceAccountKey.json` (ou variantes: `/d/Backup-Logistica-*/logistica-ia/scripts/...`, `/d/backup-logistica-ia/*/scripts/...`).

**Comando testado:**
```bash
cd C:/Users/Logistica01/projetos/logistica-ia
GOOGLE_APPLICATION_CREDENTIALS="/d/Backup-Logistica-2026-06-30/projetos/logistica-ia/scripts/serviceAccountKey.json" \
  firebase deploy --only hosting --project pontual-logistica
```

**Projeto:** pontual-logistica → https://pontual-logistica.web.app

Ver [[project-pendrive-backup]] pra layout geral do D:.
