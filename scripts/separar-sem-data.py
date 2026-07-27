"""
Após OCR, move PDFs com status='sem_data' pra subpasta `sem-data/`
dentro de cada placa/motorista.

Estrutura final:
  Veiculos/SFL4G39/
    vigente.pdf              ← docs OK
    vencidos/                ← docs com vencimento < hoje (comprovado)
    sem-data/                ← docs onde OCR não conseguiu ler data (revisar manual)
"""
import os, json, shutil, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

VAULT = 'C:/Users/Logistica01/projetos/logistica-ia'
BASE = f'{VAULT}/arquivo/frota-pontual'

with open(f'{BASE}/_vencimentos.json', encoding='utf-8') as f:
    resultados = json.load(f)

movidos = 0
for r in resultados:
    if r.get('status') != 'sem_data': continue
    src = r['caminho']
    if not os.path.isfile(src):
        # Talvez já foi movido — pula
        continue
    dst_dir = os.path.join(os.path.dirname(src), 'sem-data')
    os.makedirs(dst_dir, exist_ok=True)
    dst = os.path.join(dst_dir, os.path.basename(src))
    if os.path.exists(dst):
        stem, ext = os.path.splitext(os.path.basename(src))
        i = 2
        while os.path.exists(os.path.join(dst_dir, f'{stem} ({i}){ext}')):
            i += 1
        dst = os.path.join(dst_dir, f'{stem} ({i}){ext}')
    try:
        shutil.move(src, dst)
        r['caminho_novo'] = dst
        movidos += 1
    except Exception as e:
        print(f'! erro {src}: {e}')

with open(f'{BASE}/_vencimentos.json', 'w', encoding='utf-8') as f:
    json.dump(resultados, f, ensure_ascii=False, indent=2, default=str)

print(f'📦 Movidos pra sem-data/: {movidos}')

# Contagem final
from collections import Counter
por_status = Counter(r.get('status', '?') for r in resultados)
print()
print('=== ESTADO FINAL ===')
for s, n in sorted(por_status.items(), key=lambda x: -x[1]):
    print(f'  {s:22} {n}')

# Regenera relatorios
from datetime import date
HOJE = date.today()
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
        ocr_tag = ' [OCR]' if r.get('ocr') else ''
        lines.append(f"- **{r['tipo']}**{ocr_tag} · emit {r.get('emissao') or '?'} · venc {r.get('vencimento') or '?'}{d_txt} · `{r['arquivo']}`")
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    return len(itens)

relatorio(f'{DOCS}/frota-VENCIMENTOS-COMPLETO.md', 'Frota — Todos', lambda r: True)
relatorio(f'{DOCS}/frota-VENCIDOS.md', 'Frota — VENCIDOS', lambda r: r.get('status') == 'vencido')
relatorio(f'{DOCS}/frota-SEM-DATA.md', 'Frota — Sem data (revisar manual)', lambda r: r.get('status') == 'sem_data')
relatorio(f'{DOCS}/frota-VENCENDO-30d.md', 'Frota — Vencendo em 30d', lambda r: r.get('status') == 'vencendo_30d')

print('📄 relatórios atualizados')
