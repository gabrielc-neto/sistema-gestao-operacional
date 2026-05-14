"""
Migra registros de manutenção com tipo='calibragem' para tipo='tacografo'.
Executar uma única vez.
"""
import sys, os
sys.stdout.reconfigure(encoding="utf-8")

SERVICE_ACCOUNT = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")

import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate(SERVICE_ACCOUNT)
firebase_admin.initialize_app(cred)
db = firestore.client()

col = db.collection("manutencoes")
docs = col.where("tipo", "==", "calibragem").stream()

migrados = 0
for doc in docs:
    data = doc.to_dict()
    placa = data.get("placa", "?")
    col.document(doc.id).update({"tipo": "tacografo"})
    print(f"  Migrado: {doc.id}  placa={placa}")
    migrados += 1

print(f"\nTotal migrado: {migrados} registro(s)")
