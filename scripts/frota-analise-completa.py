"""
Análise completa da frota com todas as regras:
- CIV oficial prevalece sobre NF Nordica
- NF Nordica = CIV provisório por 12 meses
- IPEM tem data emissão + vencimento no PDF
- Todos os docs têm validade

Ação: separa docs VENCIDOS em subpasta `vencidos/` dentro de cada placa/motorista.
"""
import os, re, sys, io, json, shutil
from datetime import date, timedelta
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import pypdf

VAULT = 'C:/Users/Logistica01/projetos/logistica-ia'
BASE = f'{VAULT}/arquivo/frota-pontual'
HOJE = date.today()

# --- Tipos ---
TIPOS = [
    ('NF_NORDICA',    [r'nordica']),   # NF Nordica — CIV provisório
    ('CRLV',          [r'crlv', r'clrv', r'licenciam']),
    ('CIV',           [r'\bciv\b', r'inspecao.veic', r'inspeção veicular']),
    ('CIPP',          [r'\bcipp\b', r'produto.perigos', r'inspecao.*produto']),
    ('IPEM',          [r'\bipem\b', r'aferi']),
    ('CRONOTACOGRAFO',[r'crono', r'tacog', r'tacóg']),
    ('CNH',           [r'\bcnh\b', r'habilita']),
    ('MOPP',          [r'\bmopp\b']),
    ('NR20',          [r'nr[\s\-]?20']),
    ('NR35',          [r'nr[\s\-]?35']),
    ('NR7',           [r'nr[\s\-]?7\b', r'aso']),
    ('LICENCA_AMB',   [r'lic.*amb', r'ibama', r'iap', r'cadastro.*ambient']),
    ('LICENCA_DER',   [r'lic.*der', r'der.*sp']),
    ('ANTT_RNTRC',    [r'rntrc', r'antt']),
    ('SEGURO',        [r'seguro', r'apolice', r'apólice']),
    ('CIOT',          [r'\bciot\b']),
    ('NF_MANUT',      [r'^nf\s+\d', r'^nf[_-]?\d', r'nota fiscal']),  # NF manutenção — não é doc de vencimento
]

def detectar_tipo(fname):
    fn = fname.lower()
    for tipo, patterns in TIPOS:
        if any(re.search(p, fn) for p in patterns):
            return tipo
    return 'OUTROS'

# --- Regex ---
DATA_RE = re.compile(r'(\d{2})[/\-\.](\d{2})[/\-\.](\d{4})')
EXERCICIO_RE = re.compile(r'EXERC[IÍ]CIO[:\s]*(\d{4})', re.I)
VALIDADE_RE = re.compile(r'(?:VALIDADE|V[AÁ]LIDO\s+AT[ÉE]|VENC(?:IMENTO)?|EXPIRA|APROVADO\s+AT[ÉE])[:\s]*(\d{2}[/\-]\d{2}[/\-]\d{4})', re.I)
EMISSAO_RE  = re.compile(r'(?:EMISS[ÃA]O|EMITIDO(?:\s+EM)?|DATA(?:\s+DE)?)[:\s]*(\d{2}[/\-]\d{2}[/\-]\d{4})', re.I)
# IPEM tem "DATA APROVAÇÃO" + "DATA VENCIMENTO" ou "APROV" + "VALIDADE"

def parse_data(s):
    if not s: return None
    m = DATA_RE.search(s)
    if not m: return None
    try:
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        return date(y, mo, d)
    except: return None

def extrair_texto(pdf_path):
    try:
        reader = pypdf.PdfReader(pdf_path)
        return '\n'.join(p.extract_text() or '' for p in reader.pages)
    except: return ''

def status_de(vencimento):
    if not vencimento: return 'sem_data'
    dias = (vencimento - HOJE).days
    if dias < 0: return 'vencido'
    if dias <= 30: return 'vencendo_30d'
    if dias <= 90: return 'vencendo_90d'
    return 'ok'

# --- Analisa cada PDF ---
def analisar(path, categoria, dono):
    tipo = detectar_tipo(os.path.basename(path))

    # NF de manutenção — ignora (não é doc de vencimento)
    if tipo == 'NF_MANUT':
        return None

    texto = extrair_texto(path)
    upper = texto.upper()

    emissao = None
    vencimento = None

    if tipo == 'CRLV':
        m = EXERCICIO_RE.search(upper)
        if m:
            vencimento = date(int(m.group(1)), 12, 31)
        e = EMISSAO_RE.search(upper)
        emissao = parse_data(e.group(1)) if e else None

    elif tipo == 'NF_NORDICA':
        # NF Nordica = CIV provisório 12 meses
        # Data emissão está no PDF; se não achar, usar mtime do arquivo
        e = EMISSAO_RE.search(upper) or DATA_RE.search(texto)
        if e:
            emissao = parse_data(e.group(1) if hasattr(e, 'group') else e.group(0))
        if not emissao:
            emissao = date.fromtimestamp(os.path.getmtime(path))
        if emissao:
            vencimento = emissao + timedelta(days=365)

    else:
        v = VALIDADE_RE.search(upper)
        if v: vencimento = parse_data(v.group(1))
        e = EMISSAO_RE.search(upper)
        if e: emissao = parse_data(e.group(1))
        # Se ainda sem vencimento, pega a maior data do texto
        if not vencimento and texto:
            datas = []
            for d_, mo, y in DATA_RE.findall(texto):
                try: datas.append(date(int(y), int(mo), int(d_)))
                except: pass
            if datas: vencimento = max(datas)

    return {
        'arquivo': os.path.basename(path),
        'caminho': path,
        'tipo': tipo,
        'categoria': categoria,
        'dono': dono,
        'emissao': emissao.isoformat() if emissao else None,
        'vencimento': vencimento.isoformat() if vencimento else None,
        'status': status_de(vencimento),
        'dias_ate_vencer': (vencimento - HOJE).days if vencimento else None,
    }

# --- Coleta ---
resultados = []
for cat in ['Motoristas', 'Veiculos', 'Desligados']:
    base = f'{BASE}/{cat}'
    if not os.path.isdir(base): continue
    for dono in sorted(os.listdir(base)):
        dono_path = os.path.join(base, dono)
        if not os.path.isdir(dono_path): continue
        # NÃO entra em subpasta 'vencidos/' (já processados)
        for fn in os.listdir(dono_path):
            if not fn.lower().endswith('.pdf'): continue
            fp = os.path.join(dono_path, fn)
            r = analisar(fp, cat.lower(), dono)
            if r: resultados.append(r)

print(f'✅ Analisados {len(resultados)} PDFs (NFs manutenção descartadas)')

# --- Aplica regra: CIV oficial prevalece sobre NF_NORDICA no mesmo veículo ---
por_veiculo = {}
for r in resultados:
    if r['categoria'] == 'veiculo':
        por_veiculo.setdefault(r['dono'], []).append(r)

for placa, docs in por_veiculo.items():
    tem_civ_valido = any(d['tipo'] == 'CIV' and d['status'] in ('ok', 'vencendo_30d', 'vencendo_90d') for d in docs)
    if tem_civ_valido:
        # Marca NF Nordica como "SUPERSEDED" — perde relevância
        for d in docs:
            if d['tipo'] == 'NF_NORDICA':
                d['status'] = 'superseded_by_civ'

# --- Move vencidos pra subpasta ---
movidos = 0
for r in resultados:
    if r['status'] != 'vencido': continue
    src = r['caminho']
    dst_dir = os.path.join(os.path.dirname(src), 'vencidos')
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
        print(f'! erro movendo {src}: {e}')

print(f'📦 Movidos pra pasta vencidos/: {movidos}')

# --- Estatísticas ---
por_status = {}
for r in resultados:
    por_status[r['status']] = por_status.get(r['status'], 0) + 1
print()
print('=== STATUS FINAL ===')
for s in ['vencido', 'vencendo_30d', 'vencendo_90d', 'ok', 'superseded_by_civ', 'sem_data']:
    if s in por_status:
        print(f'  {s:22} {por_status[s]}')

# --- Salva JSON e relatórios ---
with open(f'{BASE}/_vencimentos.json', 'w', encoding='utf-8') as f:
    json.dump(resultados, f, ensure_ascii=False, indent=2, default=str)

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
        if r['dias_ate_vencer'] is not None:
            d = r['dias_ate_vencer']
            d_txt = f' · **VENCIDO há {-d}d**' if d < 0 else f' · vence em {d}d'
        lines.append(f"- **{r['tipo']}** · emit {r['emissao'] or '?'} · venc {r['vencimento'] or '?'}{d_txt} · `{r['arquivo']}`")
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    return len(itens)

n1 = relatorio(f'{DOCS}/frota-VENCIMENTOS-COMPLETO.md', 'Frota — Todos os documentos', lambda r: True)
n2 = relatorio(f'{DOCS}/frota-VENCIDOS.md', 'Frota — VENCIDOS (crítico)', lambda r: r['status'] == 'vencido')
n3 = relatorio(f'{DOCS}/frota-VENCENDO-30d.md', 'Frota — Vencendo em 30 dias', lambda r: r['status'] == 'vencendo_30d')
n4 = relatorio(f'{DOCS}/frota-SEM-DATA.md', 'Frota — Sem data extraída (requer OCR ou revisão manual)', lambda r: r['status'] == 'sem_data')

print()
print(f'📄 frota-VENCIMENTOS-COMPLETO.md ({n1})')
print(f'📄 frota-VENCIDOS.md ({n2})')
print(f'📄 frota-VENCENDO-30d.md ({n3})')
print(f'📄 frota-SEM-DATA.md ({n4})')
