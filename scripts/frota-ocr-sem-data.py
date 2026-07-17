"""
OCR nos PDFs 'sem_data' — usa pymupdf (fitz) pra converter PDF→imagem + easyocr.
Foca só em docs relevantes (CRLV, CIV, CIPP, IPEM, CNH, MOPP, NR).
"""
import os, re, sys, io, json, shutil, warnings
warnings.filterwarnings('ignore')
from datetime import date, timedelta

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)

import fitz  # pymupdf
import easyocr
from PIL import Image
import numpy as np

VAULT = 'C:/Users/Logistica01/projetos/logistica-ia'
BASE = f'{VAULT}/arquivo/frota-pontual'
HOJE = date.today()

TIPOS_INTERESSA = {'CRLV', 'CIV', 'CIPP', 'IPEM', 'CNH', 'MOPP', 'NR20', 'NR35', 'NR7', 'LICENCA_AMB', 'LICENCA_DER', 'CRONOTACOGRAFO', 'ANTT_RNTRC'}

# Carrega JSON
with open(f'{BASE}/_vencimentos.json', encoding='utf-8') as f:
    resultados = json.load(f)

candidatos = [r for r in resultados if r['status'] == 'sem_data' and r['tipo'] in TIPOS_INTERESSA]
print(f'📊 {len(candidatos)} PDFs candidatos a OCR (de {len(resultados)} totais)')

if not candidatos:
    print('Nada pra fazer.')
    sys.exit(0)

print('⏳ Carregando modelo easyocr (baixa ~1GB na 1ª vez)...')
reader = easyocr.Reader(['pt'], gpu=False, verbose=False)
print('✅ Modelo carregado.\n')

DATA_RE = re.compile(r'(\d{2})[/\-\.\s](\d{2})[/\-\.\s](\d{4})')
EXERCICIO_RE = re.compile(r'EXERC[IÍ]CIO[:\s]*(\d{4})', re.I)
VALIDADE_RE = re.compile(r'(?:VALIDADE|V[AÁ]LIDO\s+AT[EÉ]|VENC(?:IMENTO)?|EXPIRA|APROVADO\s+AT[EÉ])[:\s]*(\d{2}[/\-\s]\d{2}[/\-\s]\d{4})', re.I)

def parse_data(s):
    if not s: return None
    m = DATA_RE.search(s)
    if not m: return None
    try:
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if y < 2000 or y > 2100: return None
        return date(y, mo, d)
    except: return None

def status_de(v):
    if not v: return 'sem_data'
    dias = (v - HOJE).days
    if dias < 0: return 'vencido'
    if dias <= 30: return 'vencendo_30d'
    if dias <= 90: return 'vencendo_90d'
    return 'ok'

def ocr_primeira_pagina(pdf_path):
    """Renderiza página 1 do PDF como imagem, roda OCR, retorna texto."""
    try:
        doc = fitz.open(pdf_path)
        if len(doc) == 0: return ''
        page = doc[0]
        # Aumenta resolução pra 200dpi pra OCR ficar melhor
        pix = page.get_pixmap(dpi=200)
        img = Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
        img_np = np.array(img)
        doc.close()
        resultado = reader.readtext(img_np, detail=0, paragraph=True)
        return '\n'.join(resultado)
    except Exception as e:
        return ''

# Processa
atualizados = 0
com_data = 0
for i, r in enumerate(candidatos, 1):
    texto = ocr_primeira_pagina(r['caminho'])
    if not texto:
        print(f'  [{i:3}/{len(candidatos)}] ❌ OCR falhou: {r["arquivo"][:50]}')
        continue

    upper = texto.upper()
    vencimento = None
    emissao = None

    if r['tipo'] == 'CRLV':
        m = EXERCICIO_RE.search(upper)
        if m:
            vencimento = date(int(m.group(1)), 12, 31)
    else:
        v = VALIDADE_RE.search(upper)
        if v: vencimento = parse_data(v.group(1))
        if not vencimento:
            # Pega maior data do texto
            datas = []
            for d_, mo, y in DATA_RE.findall(texto):
                try:
                    d_val = date(int(y), int(mo), int(d_))
                    if 2015 <= d_val.year <= 2035: datas.append(d_val)
                except: pass
            if datas: vencimento = max(datas)

    # Atualiza no JSON
    for orig in resultados:
        if orig['caminho'] == r['caminho']:
            if vencimento:
                orig['vencimento'] = vencimento.isoformat()
                orig['status'] = status_de(vencimento)
                orig['dias_ate_vencer'] = (vencimento - HOJE).days
                orig['ocr'] = True
                com_data += 1
                simbolo = '🔴' if orig['status'] == 'vencido' else '✅'
                print(f'  [{i:3}/{len(candidatos)}] {simbolo} {orig["status"]:12} venc {vencimento} · {r["arquivo"][:50]}')
            else:
                orig['ocr'] = True
                orig['ocr_sem_data'] = True
                print(f'  [{i:3}/{len(candidatos)}] ⚠️  OCR ok, sem data legível: {r["arquivo"][:50]}')
            atualizados += 1
            break

# Salva JSON atualizado
with open(f'{BASE}/_vencimentos.json', 'w', encoding='utf-8') as f:
    json.dump(resultados, f, ensure_ascii=False, indent=2, default=str)

print(f'\n✅ OCR concluído')
print(f'   Processados: {atualizados}')
print(f'   Com data extraída: {com_data}')

# Move os novos vencidos pra subpasta vencidos/
movidos = 0
for r in resultados:
    if r.get('status') != 'vencido' or r.get('caminho_novo'): continue
    src = r['caminho']
    if not os.path.isfile(src): continue
    dst_dir = os.path.join(os.path.dirname(src), 'vencidos')
    os.makedirs(dst_dir, exist_ok=True)
    dst = os.path.join(dst_dir, os.path.basename(src))
    if os.path.exists(dst):
        stem, ext = os.path.splitext(os.path.basename(src))
        j = 2
        while os.path.exists(os.path.join(dst_dir, f'{stem} ({j}){ext}')):
            j += 1
        dst = os.path.join(dst_dir, f'{stem} ({j}){ext}')
    try:
        shutil.move(src, dst)
        r['caminho_novo'] = dst
        movidos += 1
    except: pass

print(f'📦 Novos vencidos movidos pra vencidos/: {movidos}')

# Re-salva JSON
with open(f'{BASE}/_vencimentos.json', 'w', encoding='utf-8') as f:
    json.dump(resultados, f, ensure_ascii=False, indent=2, default=str)

# Regera relatórios
def relatorio(path, titulo, filtro):
    itens = [r for r in resultados if filtro(r)]
    itens.sort(key=lambda r: (r['categoria'], r['dono'], r['tipo']))
    lines = [f'# {titulo}', '', f'Gerado: {HOJE.isoformat()} · Total: {len(itens)}', '', '---', '']
    dono_atual = None
    for r in itens:
        chave = f"{r['categoria']}/{r['dono']}"
        if chave != dono_atual:
            dono_atual = chave
            lines.append(f'\n## {chave}\n')
        d_txt = ''
        if r.get('dias_ate_vencer') is not None:
            d = r['dias_ate_vencer']
            d_txt = f' · **VENCIDO há {-d}d**' if d < 0 else f' · vence em {d}d'
        ocr_tag = ' [OCR]' if r.get('ocr') else ''
        lines.append(f"- **{r['tipo']}**{ocr_tag} · emit {r.get('emissao') or '?'} · venc {r.get('vencimento') or '?'}{d_txt} · `{r['arquivo']}`")
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    return len(itens)

DOCS = f'{VAULT}/docs'
n1 = relatorio(f'{DOCS}/frota-VENCIMENTOS-COMPLETO.md', 'Frota — Todos os documentos', lambda r: True)
n2 = relatorio(f'{DOCS}/frota-VENCIDOS.md', 'Frota — VENCIDOS (crítico)', lambda r: r.get('status') == 'vencido')
n3 = relatorio(f'{DOCS}/frota-VENCENDO-30d.md', 'Frota — Vencendo em 30 dias', lambda r: r.get('status') == 'vencendo_30d')
n4 = relatorio(f'{DOCS}/frota-SEM-DATA.md', 'Frota — Ainda sem data (mesmo com OCR)', lambda r: r.get('status') == 'sem_data')

print(f'\n📄 Relatórios: completo({n1}) · vencidos({n2}) · 30d({n3}) · sem-data({n4})')
