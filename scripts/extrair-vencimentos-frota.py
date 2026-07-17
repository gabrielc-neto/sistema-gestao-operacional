"""
Fase 4: extrai texto de cada PDF da arquivo/frota-pontual/ e detecta:
- tipo de doc (CRLV, CIV, CIPP, CNH, cronotacógrafo, IPEM, MOPP, NR20, NR35, licença ambiental)
- data emissão / vencimento
- placa (do nome da pasta OU do texto)
- proprietário / motorista

Saída: JSON + Markdown (relatório completo + só vencidos).
"""
import os, re, sys, io, json
from datetime import datetime, date
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import pypdf

VAULT = 'C:/Users/Logistica01/projetos/logistica-ia'
BASE = f'{VAULT}/arquivo/frota-pontual'
HOJE = date.today()

# Detecta tipo pelo nome do arquivo
TIPOS = [
    ('CRLV',          [r'crlv', r'licenciam']),
    ('CIV',           [r'\bciv\b', r'inspecao.veic', r'inspeção veicular']),
    ('CIPP',          [r'\bcipp\b', r'produto.perigos', r'inspecao.*produto']),
    ('IPEM',          [r'\bipem\b', r'aferi']),
    ('CRONOTACOGRAFO',[r'crono', r'tacog', r'tacóg', r'\btac\b']),
    ('CNH',           [r'\bcnh\b', r'habilita']),
    ('MOPP',          [r'\bmopp\b']),
    ('NR20',          [r'nr[\s\-]?20']),
    ('NR35',          [r'nr[\s\-]?35']),
    ('NR7',           [r'nr[\s\-]?7\b', r'aso']),
    ('LICENCA_AMB',   [r'lic.*amb', r'ibama', r'iap', r'cr[_\s]?ambiental']),
    ('ANTT_RNTRC',    [r'rntrc', r'antt']),
    ('SEGURO',        [r'seguro', r'apolice', r'apólice']),
    ('CIOT',          [r'\bciot\b']),
]

def detectar_tipo(fname):
    fn = fname.lower()
    for tipo, patterns in TIPOS:
        if any(re.search(p, fn) for p in patterns):
            return tipo
    return 'OUTROS'

# Regex de datas
DATA_RE = re.compile(r'(\d{2})[/\-\.](\d{2})[/\-\.](\d{4})')
DATA_ISO_RE = re.compile(r'(\d{4})[/\-](\d{2})[/\-](\d{2})')
EXERCICIO_RE = re.compile(r'EXERC[IÍ]CIO[:\s]*(\d{4})', re.I)
VALIDADE_RE = re.compile(r'(?:VALIDADE|V[AÁ]LIDO\s+AT[ÉE]|VENC(?:IMENTO)?|EXPIRA)[:\s]*(\d{2}[/\-]\d{2}[/\-]\d{4})', re.I)
EMISSAO_RE  = re.compile(r'(?:EMISS[ÃA]O|EMITIDO|DATA)[:\s]*(\d{2}[/\-]\d{2}[/\-]\d{4})', re.I)

def extrair_texto(pdf_path):
    try:
        reader = pypdf.PdfReader(pdf_path)
        return '\n'.join(p.extract_text() or '' for p in reader.pages)
    except Exception as e:
        return ''

def parse_data(s):
    m = DATA_RE.search(s)
    if not m: return None
    try:
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        return date(y, mo, d)
    except: return None

def status(vencimento):
    if not vencimento: return 'sem_data'
    dias = (vencimento - HOJE).days
    if dias < 0: return 'vencido'
    if dias <= 30: return 'vencendo_30d'
    if dias <= 90: return 'vencendo_90d'
    return 'ok'

def analisar_pdf(path, categoria, dono):
    """categoria: 'motorista' | 'veiculo' | 'desligado'"""
    tipo = detectar_tipo(os.path.basename(path))
    texto = extrair_texto(path)
    upper = texto.upper()

    emissao = None
    vencimento = None

    if tipo == 'CRLV':
        # CRLV usa "EXERCÍCIO YYYY" — vale até 31/12 daquele ano
        m = EXERCICIO_RE.search(upper)
        if m:
            ano = int(m.group(1))
            vencimento = date(ano, 12, 31)
        e = EMISSAO_RE.search(upper)
        if e: emissao = parse_data(e.group(1))
    else:
        v = VALIDADE_RE.search(upper)
        if v: vencimento = parse_data(v.group(1))
        e = EMISSAO_RE.search(upper)
        if e: emissao = parse_data(e.group(1))
        # Se ainda não achou vencimento, tenta pegar a última data do texto
        if not vencimento:
            datas = DATA_RE.findall(texto)
            if datas:
                # Ordena por ano crescente, pega a maior
                candidatas = []
                for d, mo, y in datas:
                    try:
                        candidatas.append(date(int(y), int(mo), int(d)))
                    except: pass
                if candidatas:
                    vencimento = max(candidatas)

    return {
        'arquivo': os.path.basename(path),
        'caminho': path.replace(VAULT, '').replace('\\', '/'),
        'tipo': tipo,
        'categoria': categoria,
        'dono': dono,
        'emissao': emissao.isoformat() if emissao else None,
        'vencimento': vencimento.isoformat() if vencimento else None,
        'status': status(vencimento),
        'dias_ate_vencer': (vencimento - HOJE).days if vencimento else None,
    }

# Percorre estrutura
resultados = []
for cat in ['Motoristas', 'Veiculos', 'Desligados']:
    base = f'{BASE}/{cat}'
    if not os.path.isdir(base): continue
    for dono in sorted(os.listdir(base)):
        dono_path = os.path.join(base, dono)
        if not os.path.isdir(dono_path): continue
        for fn in os.listdir(dono_path):
            if not fn.lower().endswith('.pdf'): continue
            fp = os.path.join(dono_path, fn)
            r = analisar_pdf(fp, cat.lower(), dono)
            resultados.append(r)

print(f'✅ Analisados {len(resultados)} PDFs')
print()

# Estatísticas por status
por_status = {}
for r in resultados:
    por_status[r['status']] = por_status.get(r['status'], 0) + 1
print('=== POR STATUS ===')
for s, n in sorted(por_status.items(), key=lambda x: -x[1]):
    print(f'  {s:20} {n}')

# Estatísticas por tipo
por_tipo = {}
for r in resultados:
    por_tipo[r['tipo']] = por_tipo.get(r['tipo'], 0) + 1
print()
print('=== POR TIPO ===')
for t, n in sorted(por_tipo.items(), key=lambda x: -x[1]):
    print(f'  {t:20} {n}')

# Salva JSON
with open(f'{BASE}/_vencimentos.json', 'w', encoding='utf-8') as f:
    json.dump(resultados, f, ensure_ascii=False, indent=2, default=str)
print(f'\n📝 JSON: {BASE}/_vencimentos.json')

# Gera relatório MARKDOWN
def escrever_md(path, titulo, filtro=None):
    filtrados = [r for r in resultados if not filtro or filtro(r)]
    filtrados.sort(key=lambda r: (r['categoria'], r['dono'], r['tipo']))
    lines = [f'# {titulo}', '', f'Gerado em: {HOJE.isoformat()}', f'Total: {len(filtrados)} documentos', '', '---', '']
    dono_atual = None
    for r in filtrados:
        chave = f"{r['categoria']}/{r['dono']}"
        if chave != dono_atual:
            dono_atual = chave
            lines.append(f'\n## {r["categoria"].upper()}: {r["dono"]}\n')
        emissao = r['emissao'] or '?'
        venc = r['vencimento'] or '?'
        dias = r['dias_ate_vencer']
        if dias is not None:
            if dias < 0: dias_txt = f'**⚠️ vencido há {-dias} dias**'
            elif dias <= 30: dias_txt = f'⚡ vence em {dias} dias'
            elif dias <= 90: dias_txt = f'próximo ({dias} dias)'
            else: dias_txt = f'ok ({dias} dias)'
        else:
            dias_txt = '?'
        lines.append(f'- **{r["tipo"]}** · emissão {emissao} · venc {venc} · {dias_txt} · `{r["arquivo"]}`')
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f'📄 {path}')

DOC = f'{VAULT}/docs'
os.makedirs(DOC, exist_ok=True)
escrever_md(f'{DOC}/frota-VENCIMENTOS-COMPLETO.md', 'Frota Pontual — Todos vencimentos')
escrever_md(f'{DOC}/frota-VENCIDOS.md', 'Frota Pontual — VENCIDOS (URGENTE)', lambda r: r['status'] == 'vencido')
escrever_md(f'{DOC}/frota-VENCENDO-30d.md', 'Frota Pontual — Vencendo em 30 dias', lambda r: r['status'] == 'vencendo_30d')
