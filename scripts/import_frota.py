"""
Importa veiculos PONTUAL para Firestore e documentos de motoristas para Firebase Storage.
"""
import sys, os, re, sqlite3
sys.stdout.reconfigure(encoding="utf-8")

SA_FILE    = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
FROTA_DIR  = "C:/Users/Logistica01/Downloads/Frota"
DB_FILE    = "C:/Users/Logistica01/Downloads/pontual_frota.db"
PROJECT    = "pontual-logistica"

import firebase_admin
from firebase_admin import credentials, firestore, storage as fb_storage

if not firebase_admin._apps:
    cred = credentials.Certificate(SA_FILE)
    firebase_admin.initialize_app(cred, {"storageBucket": f"{PROJECT}.firebasestorage.app"})

db     = firestore.client()
bucket = fb_storage.bucket()

# ──────────────────────────────────────────
# 1. IMPORTAR VEICULOS DO SQLITE
# ──────────────────────────────────────────
print("\n=== IMPORTANDO VEICULOS ===")
conn = sqlite3.connect(DB_FILE)
cur  = conn.cursor()
cur.execute("""
    SELECT id_interno, ano_modelo, modelo, placa, fabricante, status
    FROM veiculos WHERE empresa='PONTUAL'
    ORDER BY placa
""")
veiculos = cur.fetchall()
conn.close()

# Tipos reconhecidos de veículo pela placa
def tipo_veiculo(fabricante, modelo):
    fab = (fabricante or "").upper()
    mod = (modelo or "").upper()
    if any(x in mod for x in ["AXOR","ACTROS","NH","FH","VOLVO","SCANIA","DAF","R440"]):
        return "cavalo"
    if "F-250" in mod or "F250" in mod:
        return "utilitario"
    return "cavalo"

ok = 0
for id_interno, ano_modelo, modelo, placa, fabricante, status in veiculos:
    if not placa or len(placa) < 5:
        continue
    placa_clean = re.sub(r'[^A-Z0-9]', '', placa.upper())
    doc = {
        "placa":       placa_clean,
        "fabricante":  fabricante or "",
        "modelo":      modelo or "",
        "ano_modelo":  ano_modelo or "",
        "id_sascar":   id_interno or "",
        "tipo":        tipo_veiculo(fabricante, modelo),
        "status":      "ativo" if status == "Ativa" else "inativo",
        "empresa":     "PONTUAL",
    }
    db.collection("veiculos").document(placa_clean).set(doc, merge=True)
    ok += 1
    print(f"  Veiculo: {placa_clean} — {fabricante} {modelo}")

print(f"\n  Total veiculos importados: {ok}")

# ──────────────────────────────────────────
# 2. IMPORTAR MOTORISTAS E DOCUMENTOS
# ──────────────────────────────────────────
print("\n=== IMPORTANDO MOTORISTAS E DOCUMENTOS ===")

def parse_pasta(nome):
    """Extrai nome do motorista e placas do nome da pasta."""
    # Remove status
    nome = re.sub(r'\(\(.*?\)\)', '', nome).strip()
    # Placa antiga: AAA9999 | Mercosul: AAA9A99
    placas = re.findall(r'[A-Z]{3}[\-]?(?:[0-9]{4}|[0-9][A-Z][0-9]{2})', nome.upper())
    # Nome é o que sobra antes das placas
    nome_motor = nome
    for p in placas:
        nome_motor = nome_motor.replace(p, "").replace(p.replace("-",""), "")
    nome_motor = re.sub(r'[-\s]+$', '', nome_motor).strip()
    return nome_motor, placas

motoristas_importados = 0
docs_enviados = 0

for pasta in sorted(os.listdir(FROTA_DIR)):
    pasta_path = os.path.join(FROTA_DIR, pasta)
    if not os.path.isdir(pasta_path):
        continue

    nome_motor, placas = parse_pasta(pasta)
    desligado = "DESLIGADO" in pasta.upper() or "DESLIGADO" in pasta.upper()

    # Pula pastas que são só veículos (sem nome antes das placas)
    if not nome_motor or len(nome_motor) < 3:
        # Ainda importa documentos do veículo
        for placa in placas:
            placa_clean = re.sub(r'[^A-Z0-9]', '', placa.upper())
            for arq in os.listdir(pasta_path):
                arq_path = os.path.join(pasta_path, arq)
                if not os.path.isfile(arq_path):
                    continue
                storage_path = f"veiculos/{placa_clean}/{arq}"
                blob = bucket.blob(storage_path)
                if not blob.exists():
                    blob.upload_from_filename(arq_path)
                    docs_enviados += 1
                    print(f"  Doc veiculo: {placa_clean}/{arq}")
        continue

    # Cria documento do motorista no Firestore
    motor_id = re.sub(r'[^a-z0-9_]', '_', nome_motor.lower().strip())
    motor_doc = {
        "nome":      nome_motor,
        "placas":    [re.sub(r'[^A-Z0-9]', '', p.upper()) for p in placas],
        "status":    "desligado" if desligado else "ativo",
        "pasta_origem": pasta,
    }
    db.collection("motoristas").document(motor_id).set(motor_doc, merge=True)
    motoristas_importados += 1
    print(f"\n  Motorista: {nome_motor} | Placas: {placas} | {'DESLIGADO' if desligado else 'ATIVO'}")

    # Faz upload dos documentos
    for arq in os.listdir(pasta_path):
        arq_path = os.path.join(pasta_path, arq)
        if not os.path.isfile(arq_path):
            continue
        ext = os.path.splitext(arq)[1].lower()
        if ext not in ['.pdf', '.jpg', '.jpeg', '.png', '.pptx']:
            continue

        # Classifica o documento
        arq_up = arq.upper()
        if "CNH" in arq_up:
            tipo_doc = "CNH"
        elif "MOPP" in arq_up:
            tipo_doc = "MOPP"
        elif "CRLV" in arq_up:
            tipo_doc = "CRLV"
        elif "CIPP" in arq_up:
            tipo_doc = "CIPP"
        elif "CIV" in arq_up:
            tipo_doc = "CIV"
        elif "AFERI" in arq_up:
            tipo_doc = "AFERIÇÃO"
        elif "NR20" in arq_up or "NR 20" in arq_up:
            tipo_doc = "NR20"
        elif "NR35" in arq_up or "NR 35" in arq_up:
            tipo_doc = "NR35"
        else:
            tipo_doc = "OUTROS"

        storage_path = f"motoristas/{motor_id}/{tipo_doc}/{arq}"
        blob = bucket.blob(storage_path)
        if not blob.exists():
            blob.upload_from_filename(arq_path)
            docs_enviados += 1
            print(f"    [{tipo_doc}] {arq}")

print(f"\n{'='*50}")
print(f"Motoristas importados:  {motoristas_importados}")
print(f"Documentos enviados:    {docs_enviados}")
print(f"Veiculos importados:    {ok}")
print("Importacao concluida!")
