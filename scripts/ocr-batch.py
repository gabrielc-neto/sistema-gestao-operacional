"""
Subprocess de OCR isolado: carrega easyocr uma vez, processa lista de PDFs, sai.
Entrada: caminhos via stdin (um por linha)
Saída: JSON por linha {"caminho": "...", "texto": "..."}

Uso:
  python ocr-batch.py < lista_pdfs.txt
"""
import sys
import json
import gc
from pathlib import Path

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

try:
    import fitz
    import easyocr
except ImportError as e:
    print(json.dumps({"__erro__": f"import: {e}"}), flush=True)
    sys.exit(1)

reader = easyocr.Reader(['pt'], gpu=False, verbose=False)

for line in sys.stdin:
    caminho = line.strip()
    if not caminho: continue
    p = Path(caminho)
    if not p.exists():
        print(json.dumps({"caminho": caminho, "texto": "", "erro": "nao-existe"}), flush=True)
        continue

    texto = ""
    doc = None
    try:
        try:
            doc = fitz.open(caminho)
            paginas = min(1, len(doc))
            for i in range(paginas):
                pix = doc[i].get_pixmap(dpi=150)
                png_bytes = pix.tobytes("png")
                del pix
                try:
                    res = reader.readtext(png_bytes, detail=0, paragraph=True)
                    texto += "\n".join(res) + "\n"
                except Exception as e:
                    print(json.dumps({"caminho": caminho, "texto": "", "erro": f"ocr:{e.__class__.__name__}"}), flush=True)
                    texto = None
                    break
                del png_bytes
        except Exception:
            # jpeg com extensão .pdf
            try:
                with open(caminho, "rb") as f:
                    img_bytes = f.read()
                if len(img_bytes) < 15_000_000:
                    res = reader.readtext(img_bytes, detail=0, paragraph=True)
                    texto = "\n".join(res)
                del img_bytes
            except Exception as e:
                print(json.dumps({"caminho": caminho, "texto": "", "erro": f"img:{e.__class__.__name__}"}), flush=True)
                continue

        if texto is not None:
            print(json.dumps({"caminho": caminho, "texto": texto or ""}), flush=True)
    finally:
        try:
            if doc is not None: doc.close()
        except Exception: pass
        gc.collect()

sys.exit(0)
