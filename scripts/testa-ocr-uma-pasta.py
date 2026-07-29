"""Testa OCR em uma pasta só pra ver se easyocr funciona no ambiente."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

PASTA_TESTE = Path("C:/Users/Logistica01/Downloads/frota/BBE-9593")

print("[1/4] Carregando pypdf, fitz, easyocr...")
from pypdf import PdfReader
import fitz
import easyocr

print("[2/4] Inicializando easyocr...")
reader = easyocr.Reader(['pt'], gpu=False, verbose=False)
print("      OK")

print(f"[3/4] Testando pasta {PASTA_TESTE.name}")
for arq in PASTA_TESTE.iterdir():
    if not arq.is_file() or arq.suffix.lower() != ".pdf": continue
    print(f"\n=== {arq.name}")

    # 1) tenta pypdf
    try:
        rd = PdfReader(str(arq))
        txt = ""
        for pg in rd.pages[:2]:
            try: txt += pg.extract_text() or ""
            except: pass
        print(f"  pypdf: {len(txt)} chars")
    except Exception as e:
        print(f"  pypdf ERRO: {e.__class__.__name__}")

    # 2) tenta fitz render + OCR
    try:
        doc = fitz.open(str(arq))
        print(f"  fitz páginas: {len(doc)}")
        for i in range(min(1, len(doc))):
            pix = doc[i].get_pixmap(dpi=150)
            png_bytes = pix.tobytes("png")
            print(f"  página {i+1}: {len(png_bytes)} bytes → OCR...")
            res = reader.readtext(png_bytes, detail=0, paragraph=True)
            texto = " | ".join(res)[:200]
            print(f"    texto: {texto}")
        doc.close()
    except Exception as e:
        import traceback
        print(f"  fitz/ocr ERRO: {e.__class__.__name__}: {e}")
        traceback.print_exc()

print("\n[4/4] Fim")
