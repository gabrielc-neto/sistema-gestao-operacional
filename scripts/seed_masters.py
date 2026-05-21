"""
Cria contas Master no Firebase Auth + Firestore.
Rodar UMA VEZ após baixar serviceAccountKey.json.
Apagar este arquivo depois de executar.
"""
import sys, os, json
sys.stdout.reconfigure(encoding="utf-8")

SERVICE_ACCOUNT = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")

# Senhas/e-mails NÃO ficam no código (vão parar no Git). Vêm da variável de
# ambiente MASTERS_JSON. Exemplo (PowerShell), antes de rodar:
#   $env:MASTERS_JSON='[{"email":"x@y.com","senha":"SENHA","nome":"Wesley"}]'
_raw = os.environ.get("MASTERS_JSON")
if not _raw:
    print("ERRO: defina a variável de ambiente MASTERS_JSON antes de rodar.")
    print('Ex (PowerShell): $env:MASTERS_JSON=\'[{"email":"x@y.com","senha":"...","nome":"Wesley"}]\'')
    sys.exit(1)
try:
    MASTERS = json.loads(_raw)
except json.JSONDecodeError as e:
    print(f"ERRO: MASTERS_JSON inválido: {e}")
    sys.exit(1)

try:
    import firebase_admin
    from firebase_admin import credentials, auth, firestore
except ImportError:
    print("Instalando firebase-admin...")
    os.system(f"{sys.executable} -m pip install firebase-admin")
    import firebase_admin
    from firebase_admin import credentials, auth, firestore

if not os.path.exists(SERVICE_ACCOUNT):
    print(f"ERRO: {SERVICE_ACCOUNT} nao encontrado.")
    print("Baixe em: Firebase Console > Configuracoes > Contas de servico > Gerar nova chave privada")
    sys.exit(1)

cred = credentials.Certificate(SERVICE_ACCOUNT)
firebase_admin.initialize_app(cred)
db = firestore.client()

for m in MASTERS:
    try:
        user = auth.create_user(email=m["email"], password=m["senha"])
    except Exception as e:
        if "EMAIL_EXISTS" in str(e) or "email-already-exists" in str(e):
            user = auth.get_user_by_email(m["email"])
            print(f"Auth ja existe: {m['email']}  UID: {user.uid}")
        else:
            print(f"ERRO Auth {m['email']}: {e}")
            continue
    try:
        db.collection("usuarios").document(user.uid).set({
            "nome":   m["nome"],
            "email":  m["email"],
            "role":   "master",
            "ativo":  True,
        })
        print(f"Firestore OK: {m['email']}  UID: {user.uid}")
    except Exception as e:
        print(f"ERRO Firestore {m['email']}: {e}")

print("\nPronto. Pode apagar este arquivo e serviceAccountKey.json.")
