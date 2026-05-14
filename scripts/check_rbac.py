"""Confirma que setores/cargos/permissoes foram criados no Firestore."""
import sys, os
sys.stdout.reconfigure(encoding="utf-8")
import firebase_admin
from firebase_admin import credentials, firestore

SA = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
firebase_admin.initialize_app(credentials.Certificate(SA))
db = firestore.client()

print("=== SETORES ===")
for d in db.collection("setores").stream():
    data = d.to_dict()
    print(f"  {d.id}  {data.get('nome'):15s}  {data.get('status')}")

print("\n=== CARGOS ===")
for d in db.collection("cargos").stream():
    data = d.to_dict()
    nperms = len(data.get('permissoes', []))
    print(f"  {data.get('nome'):20s}  setor={data.get('setor_id')[:8]}...  permissoes={nperms}")

print("\n=== CATALOGO PERMISSOES ===")
total = sum(1 for _ in db.collection("permissoes_catalogo").stream())
print(f"  Total: {total} permissoes no catalogo")
