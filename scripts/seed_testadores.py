"""
Cria cargo Testador (so dashboard.ver) + 3 usuarios de teste no Firebase Auth + Firestore.
Idempotente: pode rodar de novo sem duplicar.
"""
import sys, os
sys.stdout.reconfigure(encoding="utf-8")

SERVICE_ACCOUNT = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")

SETOR_NOME = "Comercial"
CARGO_NOME = "Testador"
CARGO_PERMISSOES = ["dashboard.ver"]

USUARIOS = [
    {"email": "teste1@pontual.local", "senha": "Teste@2026", "nome": "Testador 1"},
    {"email": "teste2@pontual.local", "senha": "Teste@2026", "nome": "Testador 2"},
    {"email": "teste3@pontual.local", "senha": "Teste@2026", "nome": "Testador 3"},
]

try:
    import firebase_admin
    from firebase_admin import credentials, auth, firestore
except ImportError:
    os.system(f"{sys.executable} -m pip install firebase-admin")
    import firebase_admin
    from firebase_admin import credentials, auth, firestore

if not os.path.exists(SERVICE_ACCOUNT):
    print(f"ERRO: {SERVICE_ACCOUNT} nao encontrado.")
    sys.exit(1)

cred = credentials.Certificate(SERVICE_ACCOUNT)
firebase_admin.initialize_app(cred)
db = firestore.client()

# 1) Pega setor Comercial
setor_ref = None
for doc in db.collection("setores").where("nome", "==", SETOR_NOME).stream():
    setor_ref = doc.reference
    break
if not setor_ref:
    print(f"Setor '{SETOR_NOME}' nao encontrado. Rode seed_rbac.py primeiro.")
    sys.exit(1)
print(f"Setor: {SETOR_NOME}  ID: {setor_ref.id}")

# 2) Cria/atualiza cargo Testador
cargo_ref = None
for doc in db.collection("cargos").where("setor_id", "==", setor_ref.id).where("nome", "==", CARGO_NOME).stream():
    cargo_ref = doc.reference
    break
if cargo_ref:
    cargo_ref.update({"permissoes": CARGO_PERMISSOES, "nivel": 1, "ativo": True})
    print(f"Cargo atualizado: {CARGO_NOME}  ID: {cargo_ref.id}")
else:
    cargo_ref = db.collection("cargos").document()
    cargo_ref.set({
        "setor_id": setor_ref.id,
        "nome": CARGO_NOME,
        "nivel": 1,
        "permissoes": CARGO_PERMISSOES,
        "ativo": True,
    })
    print(f"Cargo criado: {CARGO_NOME}  ID: {cargo_ref.id}")

# 3) Cria usuarios
for u in USUARIOS:
    try:
        user = auth.create_user(email=u["email"], password=u["senha"])
        print(f"Auth criado: {u['email']}  UID: {user.uid}")
    except Exception as e:
        msg = str(e)
        if "EMAIL_EXISTS" in msg or "email-already-exists" in msg:
            user = auth.get_user_by_email(u["email"])
            try:
                auth.update_user(user.uid, password=u["senha"])
            except Exception:
                pass
            print(f"Auth ja existia: {u['email']}  UID: {user.uid} (senha resetada)")
        else:
            print(f"ERRO Auth {u['email']}: {e}")
            continue

    db.collection("usuarios").document(user.uid).set({
        "nome":            u["nome"],
        "email":           u["email"],
        "setor_id":        setor_ref.id,
        "cargo_id":        cargo_ref.id,
        "is_super_admin":  False,
        "ativo":           True,
    }, merge=True)
    print(f"Firestore OK: {u['email']}")

print("\nOK. Testadores prontos.")
print(f"Cargo permissoes: {CARGO_PERMISSOES}")
print("Passar aos testadores:")
for u in USUARIOS:
    print(f"  {u['email']}  senha: {u['senha']}")
