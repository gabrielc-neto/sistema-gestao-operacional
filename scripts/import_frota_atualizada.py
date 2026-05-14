import sys, os
sys.stdout.reconfigure(encoding="utf-8")
import openpyxl, firebase_admin
from firebase_admin import credentials, firestore

SA = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
if not firebase_admin._apps:
    firebase_admin.initialize_app(credentials.Certificate(SA))
db = firestore.client()

wb = openpyxl.load_workbook("C:/Users/Logistica01/Downloads/PLANILHA FROTA ATUALIZADA.xlsx")
ws = wb.active

ok = 0
for row in ws.iter_rows(min_row=2, values_only=True):
    if not row[2]: continue
    placa_raw = str(row[2]).strip()
    placa = placa_raw.replace("-","").upper()

    motorista = str(row[1]).strip() if row[1] else ""
    modelo    = str(row[3]).strip() if row[3] else ""
    c1        = str(row[5]).replace("-","").upper().strip() if row[5] else ""
    c2        = str(row[6]).replace("-","").upper().strip() if row[6] else ""
    media     = str(row[7]).strip() if row[7] else ""
    cap       = str(row[8]).strip() if row[8] else ""
    bocas     = str(row[9]).strip() if row[9] else ""
    comp      = str(row[10]).strip() if row[10] else ""

    # Detecta fabricante pelo modelo
    m_up = modelo.upper()
    if "VOLVO" in m_up:      fab = "VOLVO"
    elif "DAF" in m_up:      fab = "DAF"
    elif "ACTROS" in m_up:   fab = "MERCEDES-BENZ"
    elif "AXOR" in m_up:     fab = "MERCEDES-BENZ"
    elif "M.BENZ" in m_up:   fab = "MERCEDES-BENZ"
    else:                    fab = ""

    doc = {
        "placa":      placa,
        "motorista":  motorista,
        "modelo":     modelo,
        "fabricante": fab,
        "c1":         c1,
        "c2":         c2,
        "cap":        cap,
        "comp":       comp,
        "bocas":      bocas,
        "media":      media,
        "status":     "disponivel",
        "empresa":    "PONTUAL",
    }

    db.collection("veiculos").document(placa).set(doc, merge=True)
    ok += 1
    print(f"  {placa} | {motorista} | C1:{c1} C2:{c2} | {cap}L | {comp}")

print(f"\nTotal atualizado: {ok} veículos")
