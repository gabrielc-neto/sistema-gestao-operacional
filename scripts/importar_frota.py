"""
Importa registros da frota extraídos de PDFs para o Firestore.
- Cria docs que não existem (com campos disponíveis)
- NÃO sobrescreve campos já preenchidos
- Pula registros sem placa e NORDICA NF-e (não são NR-20)
"""
import sys, os, re, json
sys.stdout.reconfigure(encoding="utf-8")

SERVICE_ACCOUNT = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
DADOS_JSON      = os.path.join(os.path.dirname(__file__), "dados_frota_extraidos.json")

import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate(SERVICE_ACCOUNT)
firebase_admin.initialize_app(cred)
db = firestore.client()
col = db.collection("manutencoes")

def norm_placa(p):
    return re.sub(r"[^A-Z0-9]", "", (p or "").upper())

with open(DADOS_JSON, encoding="utf-8") as f:
    registros = json.load(f)

criados   = 0
existente = 0
pulados   = 0
vistos    = set()  # dedup placa+tipo

for r in registros:
    placa = r.get("placa")
    tipo  = r.get("tipo_documento")
    obs   = r.get("obs") or ""

    # Pula sem placa
    if not placa:
        pulados += 1
        continue

    # Pula NORDICA NF-e (não são certificados NR-20)
    if "NF-e NORDICA" in obs or "NORDICA VEICULOS" in obs:
        pulados += 1
        continue

    placa_norm = norm_placa(placa)
    if not placa_norm:
        pulados += 1
        continue

    doc_id = f"{placa_norm}__{tipo}"

    # Dedup: mesma placa+tipo — mantém primeiro
    if doc_id in vistos:
        pulados += 1
        continue
    vistos.add(doc_id)

    ref  = col.document(doc_id)
    snap = ref.get()

    if snap.exists:
        # Doc já existe — preenche apenas campos nulos
        atual = snap.to_dict()
        update = {}
        for campo in ("data_realiz", "venc", "numero_doc", "resp"):
            novo_val = r.get(campo)
            if novo_val and not atual.get(campo):
                update[campo] = novo_val
        # Adiciona obs se não tiver
        if obs and not atual.get("obs"):
            update["obs"] = obs
        if update:
            ref.update(update)
            print(f"  Atualizado: {doc_id}  campos={list(update.keys())}")
        else:
            print(f"  Já completo: {doc_id}")
        existente += 1
    else:
        # Cria novo doc apenas com campos não-nulos
        payload = {
            "placa": placa_norm,
            "tipo":  tipo,
        }
        for campo in ("data_realiz", "venc", "numero_doc", "resp", "obs"):
            val = r.get(campo)
            if val:
                payload[campo] = val
        ref.set(payload)
        print(f"  Criado: {doc_id}")
        criados += 1

print(f"\n✓ Criados:    {criados}")
print(f"✓ Atualizados/existentes: {existente}")
print(f"✗ Pulados:    {pulados}")
