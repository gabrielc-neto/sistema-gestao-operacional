# Frota Pontual — Export neutro

Dados prontos pra importar em qualquer banco (não depende de Firebase).

## Arquivos aqui

- **`frota-vencimentos.json`** (237 KB) — dataset completo
- **`frota-vencimentos.csv`** — planilha (Excel, separador `;`)
- **`frota-vencimentos.sql`** — CREATE TABLE + 477 INSERTs (MySQL/PostgreSQL)

## Uso — Hostinger (MySQL padrão)

```bash
# 1) Cria banco no hPanel
# 2) Importa via phpMyAdmin ou linha de comando:
mysql -h <host> -u <user> -p <db> < frota-vencimentos.sql
```

## Uso — PostgreSQL

```bash
psql -h <host> -U <user> -d <db> -f frota-vencimentos.sql
# Ajustar apenas: AUTO_INCREMENT → SERIAL, BOOLEAN default TRUE ok
```

## Uso — Firestore (se decidir manter)

Import via script Node:
```js
const admin = require('firebase-admin');
const dados = require('./frota-vencimentos.json');
const db = admin.firestore();
for (const r of dados) {
  await db.collection('frota_vencimentos_documentos').add(r);
}
```

## PDFs anexos

Os PDFs originais continuam no HD em:
`C:\Users\Logistica01\projetos\logistica-ia\arquivo\frota-pontual\`

Pra referenciar num sistema web:
- Upload pra Storage (S3/Firebase Storage/FTP Hostinger)
- Guardar URL no campo `pdf_url` da tabela (ainda não criado — adicionar quando definir onde vai hospedar)
