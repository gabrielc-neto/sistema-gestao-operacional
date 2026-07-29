"""
Preenche vencimentos dos PDFs de baixa confiança do preview usando OCR em subprocess
isolado (evita crash geral se um PDF quebrar easyocr).

Fluxo:
1. Lê preview-docs-frota.xlsx
2. Pega linhas com confiança=baixa e motivo contém "sem-texto-nem-ocr"
3. Divide em batches de 15 PDFs
4. Chama subprocess `python ocr-batch.py` por batch
5. Se um batch crashar, próximo continua
6. Atualiza XLSX com dados extraídos
"""
import sys
import subprocess
import json
import re
import os
from pathlib import Path
from datetime import datetime

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import openpyxl

SCRIPT_DIR = Path(__file__).parent
FROTA_DIR = Path("C:/Users/Logistica01/Downloads/frota")
XLSX = SCRIPT_DIR / "preview-docs-frota.xlsx"
BATCH_SIZE = 15

# Reusa regex de data do script principal
DATA_PDF_PATTERNS = [
    re.compile(r"v[aá]lid[oa]?\s*(?:at[eé])?[:\s]*(\d{1,2})[/.\-](\d{1,2})[/.\-](20\d{2})", re.I),
    re.compile(r"vencimento[:\s]*(\d{1,2})[/.\-](\d{1,2})[/.\-](20\d{2})", re.I),
    re.compile(r"venc(?:imento)?\.?\s*(?:em)?[:\s]*(\d{1,2})[/.\-](\d{1,2})[/.\-](20\d{2})", re.I),
    re.compile(r"validade[:\s]*(\d{1,2})[/.\-](\d{1,2})[/.\-](20\d{2})", re.I),
    re.compile(r"pr[oó]xim[oa]\s+(?:inspe[cç][aã]o|afer[ií][cç][aã]o|revis[aã]o)[:\s]*(\d{1,2})[/.\-](\d{1,2})[/.\-](20\d{2})", re.I),
    re.compile(r"exerc[ií]cio[:\s]*(20\d{2})", re.I),
]
DATA_QUALQUER = re.compile(r"(\d{1,2})[/.\-I](\d{1,2})[/.\-I](20\d{2})")

# Mês em texto pt-BR (comum em CIV) — OCR às vezes troca / por I
MESES_TXT = {"JAN":1,"FEV":2,"MAR":3,"ABR":4,"MAI":5,"JUN":6,"JUL":7,"AGO":8,"SET":9,"OUT":10,"NOV":11,"DEZ":12}
DATA_MES_TXT = re.compile(r"(\d{1,2})[/.\-I]?(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)[/.\-I]?(20\d{2})", re.I)
CHASSI_RX = re.compile(r"(?<![A-Z0-9])([A-HJ-NPR-Z0-9]{17})(?![A-Z0-9])")

def procura_data(texto):
    for pat in DATA_PDF_PATTERNS:
        m = pat.search(texto)
        if m:
            g = m.groups()
            try:
                if len(g) == 3:
                    dt = datetime(int(g[2]), int(g[1]), int(g[0])).date()
                    return dt, "regex-especifico"
                elif len(g) == 1:
                    dt = datetime(int(g[0]), 12, 31).date()
                    return dt, "exercicio-ano"
            except ValueError:
                continue
    hoje = datetime.now().date()
    melhor = None
    for m in DATA_QUALQUER.finditer(texto):
        try:
            dt = datetime(int(m.group(3)), int(m.group(2)), int(m.group(1))).date()
            if dt > hoje and (melhor is None or dt > melhor):
                melhor = dt
        except ValueError:
            continue
    # Também tenta mês em texto (JAN/FEV/DEZ/etc — comum em CIV)
    for m in DATA_MES_TXT.finditer(texto):
        try:
            mes = MESES_TXT.get(m.group(2).upper())
            if not mes: continue
            dt = datetime(int(m.group(3)), mes, int(m.group(1))).date()
            if dt > hoje and (melhor is None or dt > melhor):
                melhor = dt
        except ValueError:
            continue
    if melhor:
        return melhor, "data-mais-futura"
    return None, None

def main():
    if not XLSX.exists():
        print(f"[erro] {XLSX} não existe. Rode preview-docs-frota.py primeiro.")
        return 1

    wb = openpyxl.load_workbook(XLSX)
    ws = wb.active

    # Lê todas as linhas e monta lista de PDFs pra OCR
    linhas_por_arquivo = {}  # caminho → índice da row no ws
    a_processar = []
    for i, row in enumerate(ws.iter_rows(min_row=2, values_only=False), start=2):
        pasta = row[0].value
        arquivo = row[1].value
        confianca = row[7].value
        motivo = row[8].value or ""
        if not pasta or not arquivo: continue
        if confianca != "baixa": continue
        if "sem-texto-nem-ocr" not in motivo and "ocr-sem-data" not in motivo:
            continue
        cam = str(FROTA_DIR / pasta / arquivo)
        if not Path(cam).exists(): continue
        linhas_por_arquivo[cam] = i
        a_processar.append(cam)

    total = len(a_processar)
    print(f"[info] {total} PDFs pra processar via OCR (batches de {BATCH_SIZE})", flush=True)

    if total == 0:
        print("[info] nada pra fazer")
        return 0

    atualizados = 0
    with_data = 0
    for start in range(0, total, BATCH_SIZE):
        batch = a_processar[start:start + BATCH_SIZE]
        n = start // BATCH_SIZE + 1
        total_batches = (total + BATCH_SIZE - 1) // BATCH_SIZE
        print(f"[batch {n}/{total_batches}] processando {len(batch)} PDFs...", flush=True)

        # roda subprocess isolado
        try:
            env = os.environ.copy()
            env["PYTHONIOENCODING"] = "utf-8"
            proc = subprocess.Popen(
                [sys.executable, "-u", str(SCRIPT_DIR / "ocr-batch.py")],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding="utf-8",
                errors="replace",
                env=env,
            )
            input_txt = "\n".join(batch)
            out, err = proc.communicate(input=input_txt, timeout=600)  # 10min por batch
        except subprocess.TimeoutExpired:
            print(f"  [timeout] batch {n} — matando e continuando", flush=True)
            try: proc.kill()
            except Exception: pass
            continue
        except Exception as e:
            print(f"  [erro subprocess] {e.__class__.__name__}: {e}", flush=True)
            continue

        # parse resultados
        for line in (out or "").splitlines():
            line = line.strip()
            if not line: continue
            try:
                obj = json.loads(line)
            except Exception:
                continue
            if "__erro__" in obj:
                print(f"  [subprocess erro] {obj['__erro__']}", flush=True)
                continue
            cam = obj.get("caminho")
            texto = obj.get("texto", "")
            if not cam or not texto:
                continue
            row_i = linhas_por_arquivo.get(cam)
            if not row_i: continue

            data, fonte = procura_data(texto)
            if data:
                ws.cell(row=row_i, column=6).value = data.strftime("%Y-%m-%d")  # vencimento
                ws.cell(row=row_i, column=7).value = f"pdf-ocr({fonte})"        # fonte_data
                # promove confiança se placa também tá ok
                placa_atual = ws.cell(row=row_i, column=3).value
                if placa_atual:
                    ws.cell(row=row_i, column=8).value = "media"
                    ws.cell(row=row_i, column=9).value = f"OCR ok — {fonte}"
                with_data += 1
            atualizados += 1

        # salva checkpoint entre batches
        try:
            wb.save(XLSX)
        except Exception as e:
            print(f"  [save-fail] {e}", flush=True)

    print(f"\n[fim] processados {atualizados}, com data extraida {with_data}", flush=True)
    return 0

if __name__ == "__main__":
    sys.exit(main())
