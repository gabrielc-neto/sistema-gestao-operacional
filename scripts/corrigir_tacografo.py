"""
Corrige registros de tacógrafo:
1. Deleta todos os registros tacógrafo existentes (placas de carreta — errados)
2. Cria 38 registros tacógrafo com placas dos cavalos (sem data)
Executar uma única vez.
"""
import sys, os, re
sys.stdout.reconfigure(encoding="utf-8")

SERVICE_ACCOUNT = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")

import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate(SERVICE_ACCOUNT)
firebase_admin.initialize_app(cred)
db = firestore.client()

def norm(p):
    return re.sub(r"[^A-Z0-9]", "", (p or "").upper())

# ── 1. Deletar todos os registros tacógrafo existentes ────────────────────
col = db.collection("manutencoes")
docs_taco = col.where("tipo", "==", "tacografo").stream()

deletados = 0
for d in docs_taco:
    col.document(d.id).delete()
    print(f"  Deletado: {d.id}")
    deletados += 1

print(f"\n✓ Deletados: {deletados} registros incorretos")

# ── 2. Buscar cavalos ativos no Firestore ─────────────────────────────────
veiculos = db.collection("veiculos").stream()
cavalos = []
for v in veiculos:
    data = v.to_dict()
    if data.get("tipo") != "carreta" and data.get("status") != "inativo":
        placa = norm(data.get("placa", ""))
        if placa:
            cavalos.append(placa)

cavalos = sorted(set(cavalos))
print(f"\n  Cavalos encontrados: {len(cavalos)}")

# ── 3. Criar registro tacógrafo para cada cavalo ──────────────────────────
criados = 0
for placa in cavalos:
    doc_id = f"{placa}__tacografo"
    ref = col.document(doc_id)
    if not ref.get().exists:
        ref.set({ "placa": placa, "tipo": "tacografo" })
        print(f"  Criado: {doc_id}")
        criados += 1
    else:
        print(f"  Já existe: {doc_id}")

print(f"\n✓ Criados: {criados} registros (cavalos)")
print(f"✓ Total cavalos: {len(cavalos)}")
