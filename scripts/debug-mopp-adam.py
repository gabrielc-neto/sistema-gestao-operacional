"""Roda OCR detalhado no MOPP do Adam pra entender o que o OCR viu."""
import sys, io, warnings
warnings.filterwarnings('ignore')
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import fitz, easyocr
from PIL import Image
import numpy as np

PDF = 'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas/ADAM MOREIRA/sem-data/ADAN MOPP.pdf'
reader = easyocr.Reader(['pt'], gpu=False, verbose=False)

doc = fitz.open(PDF)
print(f'📄 Páginas: {len(doc)}')
for i, page in enumerate(doc):
    print(f'\n{"="*60}')
    print(f'PÁGINA {i+1}')
    print('='*60)
    # DPI 300 pra melhor qualidade
    pix = page.get_pixmap(dpi=300)
    img = Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
    img_np = np.array(img)
    # Modo VERBOSE — mostra cada bloco lido
    resultado = reader.readtext(img_np, detail=1, paragraph=False)
    for bbox, texto, conf in resultado:
        print(f'  [{conf:.2f}] {texto}')
doc.close()
