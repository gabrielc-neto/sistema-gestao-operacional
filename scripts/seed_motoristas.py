import sys, os, re
sys.stdout.reconfigure(encoding="utf-8")
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime

SA = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
if not firebase_admin._apps:
    firebase_admin.initialize_app(credentials.Certificate(SA))
db = firestore.client()

def to_id(nome):
    return re.sub(r"[^a-z0-9_]", "", nome.lower().replace(" ", "_"))

# Busca todos os veículos
veiculos = db.collection("veiculos").stream()

motoristas = {}
for v in veiculos:
    d = v.to_dict()
    nome = (d.get("motorista") or "").strip().upper()
    if not nome or nome in ("", "NONE", "-"):
        continue
    if nome not in motoristas:
        motoristas[nome] = to_id(nome)

print(f"Motoristas encontrados nos veículos: {len(motoristas)}\n")

agora = datetime.utcnow().isoformat()
ok = 0
skip = 0

for nome, doc_id in sorted(motoristas.items()):
    ref = db.collection("motoristas").document(doc_id)
    snap = ref.get()

    if snap.exists:
        print(f"  [SKIP] {nome} (já existe)")
        skip += 1
        continue

    ref.set({
        "nome":      nome,
        "cnh":       "",
        "cat":       "E",
        "tel":       "",
        "status":    "ativo",
        "obs":       "",
        "createdAt": agora,
        "updatedAt": agora,
    })
    print(f"  [OK]   {nome}")
    ok += 1

print(f"\nCriados: {ok} | Já existiam: {skip}")
