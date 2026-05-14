import sys, os, json, requests
sys.stdout.reconfigure(encoding="utf-8")

import google.auth
import google.auth.transport.requests
from google.oauth2 import service_account

SA_FILE    = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
RULES_FILE = os.path.join(os.path.dirname(__file__), "..", "firestore.rules")
PROJECT    = "pontual-logistica"

creds = service_account.Credentials.from_service_account_file(
    SA_FILE,
    scopes=["https://www.googleapis.com/auth/cloud-platform"]
)
creds.refresh(google.auth.transport.requests.Request())
token = creds.token

rules_source = open(RULES_FILE, encoding="utf-8").read()

# 1. Criar ruleset
r = requests.post(
    f"https://firebaserules.googleapis.com/v1/projects/{PROJECT}/rulesets",
    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    json={"source": {"files": [{"name": "firestore.rules", "content": rules_source}]}}
)
r.raise_for_status()
ruleset_name = r.json()["name"]
print(f"Ruleset criado: {ruleset_name}")

# 2. Atualizar release
release_name = f"projects/{PROJECT}/releases/cloud.firestore"
r2 = requests.patch(
    f"https://firebaserules.googleapis.com/v1/{release_name}",
    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    json={"release": {"name": release_name, "rulesetName": ruleset_name}}
)
if r2.status_code == 404:
    r2 = requests.post(
        f"https://firebaserules.googleapis.com/v1/projects/{PROJECT}/releases",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={"name": release_name, "rulesetName": ruleset_name}
    )
r2.raise_for_status()
print("Regras publicadas com sucesso!")
