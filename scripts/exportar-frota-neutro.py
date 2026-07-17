"""
Exporta _vencimentos.json em 3 formatos neutros pra qualquer banco:
- JSON (já tem)
- CSV (Excel-friendly)
- SQL (MySQL/PostgreSQL — CREATE TABLE + INSERTs)

Roda quando quiser. Sem tocar em Firebase.
"""
import os, json, sys, io, csv
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

VAULT = 'C:/Users/Logistica01/projetos/logistica-ia'
BASE = f'{VAULT}/arquivo/frota-pontual'
OUT = f'{VAULT}/docs/frota-exportacao'
os.makedirs(OUT, exist_ok=True)

with open(f'{BASE}/_vencimentos.json', encoding='utf-8') as f:
    dados = json.load(f)

# --- CSV ---
csv_path = f'{OUT}/frota-vencimentos.csv'
with open(csv_path, 'w', encoding='utf-8', newline='') as f:
    w = csv.writer(f, delimiter=';')
    w.writerow(['categoria', 'dono', 'tipo', 'arquivo', 'emissao', 'vencimento', 'status', 'dias_ate_vencer', 'caminho', 'ocr'])
    for r in dados:
        w.writerow([
            r.get('categoria'),
            r.get('dono'),
            r.get('tipo'),
            r.get('arquivo'),
            r.get('emissao') or '',
            r.get('vencimento') or '',
            r.get('status'),
            r.get('dias_ate_vencer') if r.get('dias_ate_vencer') is not None else '',
            r.get('caminho_novo') or r.get('caminho'),
            'S' if r.get('ocr') else 'N',
        ])
print(f'✅ CSV: {csv_path}  ({len(dados)} linhas)')

# --- SQL (MySQL/PostgreSQL agnóstico) ---
sql_path = f'{OUT}/frota-vencimentos.sql'
def esc(s):
    if s is None or s == '': return 'NULL'
    return "'" + str(s).replace("'", "''") + "'"

with open(sql_path, 'w', encoding='utf-8') as f:
    f.write("""-- Frota Pontual — vencimentos de documentos
-- Gerado automaticamente. Compatível MySQL 8+ e PostgreSQL 13+.

DROP TABLE IF EXISTS frota_vencimentos_documentos;

CREATE TABLE frota_vencimentos_documentos (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  categoria         VARCHAR(20)  NOT NULL,     -- motorista | veiculo | desligado
  dono              VARCHAR(120) NOT NULL,     -- nome do motorista ou placa
  tipo              VARCHAR(30)  NOT NULL,     -- CIV | CIPP | CRLV | CNH | ...
  arquivo           VARCHAR(255) NOT NULL,
  emissao           DATE         NULL,
  vencimento        DATE         NULL,
  status            VARCHAR(30)  NOT NULL,     -- vencido | ok | vencendo_30d | sem_data | ...
  dias_ate_vencer   INT          NULL,
  caminho_local     TEXT         NULL,
  extraido_via_ocr  BOOLEAN      NOT NULL DEFAULT FALSE,
  atualizado_em     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_dono (dono),
  INDEX idx_tipo (tipo),
  INDEX idx_status (status),
  INDEX idx_vencimento (vencimento)
);

-- --- INSERTs ---
""")
    for r in dados:
        f.write(f"""INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ({esc(r.get('categoria'))}, {esc(r.get('dono'))}, {esc(r.get('tipo'))},
       {esc(r.get('arquivo'))}, {esc(r.get('emissao'))}, {esc(r.get('vencimento'))},
       {esc(r.get('status'))}, {r.get('dias_ate_vencer') if r.get('dias_ate_vencer') is not None else 'NULL'},
       {esc(r.get('caminho_novo') or r.get('caminho'))}, {'TRUE' if r.get('ocr') else 'FALSE'});
""")

print(f'✅ SQL: {sql_path}  ({len(dados)} INSERTs)')

# --- README explicando os arquivos ---
readme = f'{OUT}/README.md'
with open(readme, 'w', encoding='utf-8') as f:
    f.write(f"""# Frota Pontual — Export neutro

Dados prontos pra importar em qualquer banco (não depende de Firebase).

## Arquivos aqui

- **`frota-vencimentos.json`** ({os.path.getsize(f'{BASE}/_vencimentos.json')//1024} KB) — dataset completo
- **`frota-vencimentos.csv`** — planilha (Excel, separador `;`)
- **`frota-vencimentos.sql`** — CREATE TABLE + {len(dados)} INSERTs (MySQL/PostgreSQL)

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
for (const r of dados) {{
  await db.collection('frota_vencimentos_documentos').add(r);
}}
```

## PDFs anexos

Os PDFs originais continuam no HD em:
`C:\\Users\\Logistica01\\projetos\\logistica-ia\\arquivo\\frota-pontual\\`

Pra referenciar num sistema web:
- Upload pra Storage (S3/Firebase Storage/FTP Hostinger)
- Guardar URL no campo `pdf_url` da tabela (ainda não criado — adicionar quando definir onde vai hospedar)
""")
print(f'✅ README: {readme}')
