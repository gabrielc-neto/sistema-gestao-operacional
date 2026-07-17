"""
Reprocessa OCR em TODAS as páginas dos MOPP/NR20/NR35/NR7/CNH que estão em sem-data/.
Muitos são escaneados frente/verso — data pode estar na p2 ou depois.
"""
import os, re, sys, io, json, shutil, warnings
warnings.filterwarnings('ignore')
from datetime import date, timedelta
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)

import fitz
import easyocr
from PIL import Image
import numpy as np

VAULT = 'C:/Users/Logistica01/projetos/logistica-ia'
BASE = f'{VAULT}/arquivo/frota-pontual'
HOJE = date.today()

TIPOS_ALVO = {'MOPP', 'NR20', 'NR35', 'NR7', 'CNH', 'CIV', 'CIPP', 'IPEM'}

with open(f'{BASE}/_vencimentos.json', encoding='utf-8') as f:
    resultados = json.load(f)

# Só os que estão sem_data (que foram movidos pra sem-data/)
candidatos = [r for r in resultados if r.get('status') == 'sem_data' and r['tipo'] in TIPOS_ALVO]
print(f'📊 {len(candidatos)} candidatos (MOPP/NR/CNH/CIV/CIPP/IPEM sem data)')

if not candidatos:
    print('nada pra fazer')
    sys.exit(0)

print('⏳ Carregando easyocr...')
reader = easyocr.Reader(['pt'], gpu=False, verbose=False)
print('✅ ok\n')

DATA_RE = re.compile(r'(\d{2})[/\-\.\s](\d{2})[/\-\.\s](\d{4})')
VALIDADE_RE = re.compile(r'(?:VALIDADE|V[AÁ]LIDO\s+AT[EÉ]|VENC(?:IMENTO)?|EXPIRA|APROVADO\s+AT[EÉ])[:\s]*(\d{2}[/\-\s]\d{2}[/\-\s]\d{4})', re.I)

def parse_data(s):
    if not s: return None
    m = DATA_RE.search(s)
    if not m: return None
    try:
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if y < 2015 or y > 2035: return None
        return date(y, mo, d)
    except: return None

def status_de(v):
    if not v: return 'sem_data'
    dias = (v - HOJE).days
    if dias < 0: return 'vencido'
    if dias <= 30: return 'vencendo_30d'
    if dias <= 90: return 'vencendo_90d'
    return 'ok'

def ocr_todas_paginas(pdf_path):
    """Roda OCR em TODAS as páginas — retorna texto concatenado."""
    try:
        # Precisa achar o arquivo — pode estar em sem-data/
        if not os.path.isfile(pdf_path):
            # Tenta caminho_novo
            return ''
        doc = fitz.open(pdf_path)
        textos = []
        for page in doc:
            pix = page.get_pixmap(dpi=200)
            img = Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
            img_np = np.array(img)
            r = reader.readtext(img_np, detail=0, paragraph=True)
            textos.append('\n'.join(r))
        doc.close()
        return '\n'.join(textos)
    except Exception as e:
        return ''

atualizados = 0
com_data = 0
for i, r in enumerate(candidatos, 1):
    # Pode estar em sem-data/
    caminho_atual = r.get('caminho_novo') or r['caminho']
    if not os.path.isfile(caminho_atual):
        # Tenta no sem-data/
        alt = os.path.join(os.path.dirname(r['caminho']), 'sem-data', os.path.basename(r['caminho']))
        if os.path.isfile(alt):
            caminho_atual = alt
        else:
            continue

    texto = ocr_todas_paginas(caminho_atual)
    if not texto:
        continue

    upper = texto.upper()
    vencimento = None
    v = VALIDADE_RE.search(upper)
    if v: vencimento = parse_data(v.group(1))
    if not vencimento:
        datas = []
        for d_, mo, y in DATA_RE.findall(texto):
            try:
                dv = date(int(y), int(mo), int(d_))
                if 2015 <= dv.year <= 2035: datas.append(dv)
            except: pass
        # Para MOPP/NR: pega maior data (é o vencimento em geral)
        if datas: vencimento = max(datas)

    for orig in resultados:
        if orig['caminho'] == r['caminho']:
            atualizados += 1
            if vencimento:
                orig['vencimento'] = vencimento.isoformat()
                orig['status'] = status_de(vencimento)
                orig['dias_ate_vencer'] = (vencimento - HOJE).days
                orig['ocr_multipagina'] = True
                orig['caminho_atual'] = caminho_atual
                com_data += 1
                s = '🔴' if orig['status']=='vencido' else '✅' if orig['status']=='ok' else '⚡'
                print(f'  [{i:3}/{len(candidatos)}] {s} {orig["status"]:12} venc {vencimento} · {r["arquivo"][:45]}')

                # Move do sem-data/ pra local certo
                pai = os.path.dirname(os.path.dirname(caminho_atual))  # sai de sem-data/
                if orig['status'] == 'vencido':
                    novo_dir = os.path.join(pai, 'vencidos')
                else:
                    novo_dir = pai  # vai pra pasta principal (vigente)
                os.makedirs(novo_dir, exist_ok=True)
                novo = os.path.join(novo_dir, os.path.basename(caminho_atual))
                if os.path.exists(novo):
                    stem, ext = os.path.splitext(os.path.basename(caminho_atual))
                    j = 2
                    while os.path.exists(os.path.join(novo_dir, f'{stem} ({j}){ext}')):
                        j += 1
                    novo = os.path.join(novo_dir, f'{stem} ({j}){ext}')
                try:
                    shutil.move(caminho_atual, novo)
                    orig['caminho_novo'] = novo
                except: pass
            break

# Salva
with open(f'{BASE}/_vencimentos.json', 'w', encoding='utf-8') as f:
    json.dump(resultados, f, ensure_ascii=False, indent=2, default=str)

print(f'\n✅ OCR multi-página: {atualizados} processados · {com_data} com data extraída')

# Estado
from collections import Counter
por_status = Counter(r.get('status', '?') for r in resultados)
print()
print('=== ESTADO FINAL ===')
for s in ['vencido', 'vencendo_30d', 'vencendo_90d', 'ok', 'sem_data', 'superseded_by_civ']:
    if s in por_status:
        print(f'  {s:22} {por_status[s]}')

# Regenera relatórios
DOCS = f'{VAULT}/docs'
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
        tags = []
        if r.get('ocr'): tags.append('OCR')
        if r.get('ocr_multipagina'): tags.append('multipág')
        tag_txt = f' [{" ".join(tags)}]' if tags else ''
        lines.append(f"- **{r['tipo']}**{tag_txt} · emit {r.get('emissao') or '?'} · venc {r.get('vencimento') or '?'}{d_txt} · `{r['arquivo']}`")
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    return len(itens)

relatorio(f'{DOCS}/frota-VENCIMENTOS-COMPLETO.md', 'Frota — Todos', lambda r: True)
relatorio(f'{DOCS}/frota-VENCIDOS.md', 'Frota — VENCIDOS', lambda r: r.get('status') == 'vencido')
relatorio(f'{DOCS}/frota-VENCENDO-30d.md', 'Frota — Vencendo em 30d', lambda r: r.get('status') == 'vencendo_30d')
relatorio(f'{DOCS}/frota-SEM-DATA.md', 'Frota — Sem data', lambda r: r.get('status') == 'sem_data')

print('📄 relatórios atualizados')
