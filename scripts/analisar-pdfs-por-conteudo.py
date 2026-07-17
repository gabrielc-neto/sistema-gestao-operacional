"""
Análise CORRETA — abre cada PDF, lê o CONTEÚDO real e identifica:
- TIPO real (CRLV, CIV, CIPP, IPEM, CNH, MOPP, NR20, NR35...) por palavras-chave
- PLACA real (do texto do PDF, não do nome)
- DATA de emissão e vencimento real
- FLAG se nome do arquivo não bate com o tipo real

Roda OCR se o PDF for escaneado (texto vazio).
"""
import os, re, sys, io, json, warnings
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

# TIPO por palavras-chave no CONTEÚDO
TIPOS_KEYWORDS = [
    ('CRLV',       ['CERTIFICADO DE REGISTRO E LICENCIAMENTO', 'REGISTRO E LICENCIAMENTO', 'EXERCICIO', 'EXERCÍCIO', 'RENAVAM', 'DENATRAN']),
    ('CIPP',       ['CERTIFICADO DE INSPEÇÃO PARA O TRANSPORTE DE PRODUTOS PERIGOSOS', 'INSPEÇÃO PARA O TRANSPORTE', 'PRODUTOS PERIGOSOS']),
    ('CIV',        ['CERTIFICADO DE INSPEÇÃO VEICULAR', 'INSPEÇÃO VEICULAR']),
    ('IPEM',       ['INSTITUTO DE PESOS E MEDIDAS', 'INMETRO', 'AFERIÇÃO', 'AFERICAO', 'CAPACIDADE VOLUMÉTRICA', 'VERIFICAÇÃO METROLÓGICA']),
    ('CNH',        ['CARTEIRA NACIONAL DE HABILITAÇÃO', 'HABILITAÇÃO', 'DETRAN']),
    ('MOPP',       ['MOVIMENTAÇÃO OPERACIONAL', 'PRODUTOS PERIGOSOS', 'MOPP', 'CARGA DE PRODUTOS PERIGOSOS']),
    ('NR20',       ['NR-20', 'NR 20', 'LÍQUIDOS INFLAMÁVEIS', 'INFLAMAVEIS E COMBUSTIVEIS']),
    ('NR35',       ['NR-35', 'NR 35', 'TRABALHO EM ALTURA']),
    ('NR7',        ['NR-7', 'NR 7', 'ASO', 'ATESTADO DE SAÚDE OCUPACIONAL']),
    ('LICENCA_AMB',['LICENÇA DE OPERAÇÃO', 'LICENÇA AMBIENTAL', 'IBAMA', 'CETESB', 'IAP', 'CADASTRO TÉCNICO']),
    ('LICENCA_DER',['DER', 'DEPARTAMENTO DE ESTRADAS DE RODAGEM', 'AET', 'AUTORIZAÇÃO ESPECIAL DE TRÂNSITO']),
    ('ANTT_RNTRC', ['REGISTRO NACIONAL DE TRANSPORTADORES', 'RNTRC', 'ANTT']),
    ('SEGURO',     ['APÓLICE DE SEGURO', 'APOLICE', 'SEGURADORA', 'PRÊMIO', 'SUCUMBÊNCIA']),
    ('CIOT',       ['CIOT', 'CÓDIGO IDENTIFICADOR']),
    ('NORDICA',    ['NORDICA', 'RANDON', 'FABRICADOR', 'TANQUE COM']),
]

PLACA_RE = re.compile(r'([A-Z]{3}[-\s]?\d[A-Z0-9]\d{2,3})')
DATA_RE = re.compile(r'(\d{2})[/\-\.\s](\d{2})[/\-\.\s](\d{4})')
EXERCICIO_RE = re.compile(r'EXERC[IÍ]CIO[:\s]*(\d{4})', re.I)
VALIDADE_RE = re.compile(r'(?:VALIDADE|V[AÁ]LIDO\s+AT[EÉ]|VENC(?:IMENTO)?|EXPIRA|APROVADO\s+AT[EÉ]|VIGENCIA|VIGÊNCIA)[:\s]*(\d{2}[/\-\s]\d{2}[/\-\s]\d{4})', re.I)
EMISSAO_RE = re.compile(r'(?:EMISS[ÃA]O|EMITIDO(?:\s+EM)?|DATA(?:\s+DE)?|DE\s+EMISS[ÃA]O)[:\s]*(\d{2}[/\-\s]\d{2}[/\-\s]\d{4})', re.I)

def parse_data(s):
    if not s: return None
    m = DATA_RE.search(s)
    if not m: return None
    try:
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if y < 2015 or y > 2035: return None
        return date(y, mo, d)
    except: return None

def clean_placa(p):
    return re.sub(r'[^A-Z0-9]', '', p.upper())

def valida_placa(p):
    return bool(re.fullmatch(r'[A-Z]{3}\d[A-Z0-9]\d{2,3}', p) or re.fullmatch(r'[A-Z]{3}\d{4}', p))

def status_de(v):
    if not v: return 'sem_data'
    dias = (v - HOJE).days
    if dias < 0: return 'vencido'
    if dias <= 30: return 'vencendo_30d'
    if dias <= 90: return 'vencendo_90d'
    return 'ok'

# Extrai texto - primeiro tenta texto embutido, se vazio usa OCR
_ocr_reader = None
def get_ocr():
    global _ocr_reader
    if _ocr_reader is None:
        print('   [carregando easyocr...]')
        _ocr_reader = easyocr.Reader(['pt'], gpu=False, verbose=False)
    return _ocr_reader

def texto_pdf(path):
    try:
        doc = fitz.open(path)
        texto = '\n'.join(p.get_text() or '' for p in doc)
        # Se texto muito curto, roda OCR na página 1
        if len(texto.strip()) < 50:
            reader = get_ocr()
            for p in doc:
                pix = p.get_pixmap(dpi=250)
                img = Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
                r = reader.readtext(np.array(img), detail=0, paragraph=True)
                texto += '\n' + '\n'.join(r)
        doc.close()
        return texto
    except Exception as e:
        return ''

def identificar_tipo(texto):
    upper = texto.upper()
    # Prioriza matches mais específicos primeiro
    scores = {}
    for tipo, kws in TIPOS_KEYWORDS:
        hits = sum(1 for kw in kws if kw.upper() in upper)
        if hits > 0:
            scores[tipo] = hits
    if not scores: return 'DESCONHECIDO'
    return max(scores.items(), key=lambda x: x[1])[0]

def extrair_placas(texto):
    return [clean_placa(m.group(1)) for m in PLACA_RE.finditer(texto.upper()) if valida_placa(clean_placa(m.group(1)))]

def analisar_pdf(path):
    texto = texto_pdf(path)
    if not texto.strip():
        return None
    tipo = identificar_tipo(texto)
    placas = list(dict.fromkeys(extrair_placas(texto)))

    upper = texto.upper()
    emissao = None
    vencimento = None

    if tipo == 'CRLV':
        m = EXERCICIO_RE.search(upper)
        if m: vencimento = date(int(m.group(1)), 12, 31)
        e = EMISSAO_RE.search(upper)
        emissao = parse_data(e.group(1)) if e else None
    elif tipo == 'NORDICA':
        # NF Nordica: emissão + 365 dias
        e = EMISSAO_RE.search(upper) or DATA_RE.search(texto)
        if e:
            emissao = parse_data(e.group(1) if hasattr(e, 'group') else e.group(0))
        if emissao:
            vencimento = emissao + timedelta(days=365)
    else:
        v = VALIDADE_RE.search(upper)
        if v: vencimento = parse_data(v.group(1))
        e = EMISSAO_RE.search(upper)
        if e: emissao = parse_data(e.group(1))
        if not vencimento:
            datas = []
            for d_, mo, y in DATA_RE.findall(texto):
                try:
                    dv = date(int(y), int(mo), int(d_))
                    if 2015 <= dv.year <= 2035: datas.append(dv)
                except: pass
            if datas: vencimento = max(datas)

    return {
        'tipo': tipo,
        'placas': placas,
        'emissao': emissao.isoformat() if emissao else None,
        'vencimento': vencimento.isoformat() if vencimento else None,
        'status': status_de(vencimento),
        'texto_sample': texto[:300],
    }

# Percorre TODOS os PDFs
resultados = []
i = 0
total_pdfs = sum(1 for root, _, files in os.walk(BASE) for f in files if f.lower().endswith('.pdf'))
print(f'Total de PDFs a analisar: {total_pdfs}')
print()

for root, dirs, files in os.walk(BASE):
    for f in files:
        if not f.lower().endswith('.pdf'): continue
        i += 1
        path = os.path.join(root, f)
        pasta_atual = os.path.relpath(path, BASE).replace('\\', '/')
        r = analisar_pdf(path)
        if not r:
            print(f'  [{i:4}/{total_pdfs}] ❌ vazio: {f[:50]}')
            continue

        # Detecta erro de classificação
        tipo_nome = None
        fn_up = f.upper()
        for t, _ in TIPOS_KEYWORDS:
            if t == 'CRLV' and re.search(r'CRLV|CLRV', fn_up): tipo_nome = 'CRLV'; break
            elif t == 'CIPP' and re.search(r'\bCIPP\b', fn_up): tipo_nome = 'CIPP'; break
            elif t == 'CIV' and re.search(r'\bCIV\b', fn_up): tipo_nome = 'CIV'; break
            elif t == 'IPEM' and re.search(r'IPEM|AFERI', fn_up): tipo_nome = 'IPEM'; break
        conflito_nome = tipo_nome and tipo_nome != r['tipo']

        flag = '⚠️ NOME≠CONTEÚDO' if conflito_nome else ''
        s = '🔴' if r['status']=='vencido' else '✅' if r['status']=='ok' else '?'
        print(f'  [{i:4}/{total_pdfs}] {s} {r["tipo"]:12} placas={r["placas"] or "-"} venc={r["vencimento"] or "?"} {flag} · {f[:40]}')

        r['arquivo'] = f
        r['caminho'] = path
        r['pasta_atual'] = pasta_atual
        r['tipo_nome_arquivo'] = tipo_nome
        r['conflito_nome_conteudo'] = conflito_nome
        resultados.append(r)

# Salva
with open(f'{BASE}/_analise-conteudo.json', 'w', encoding='utf-8') as f:
    json.dump(resultados, f, ensure_ascii=False, indent=2, default=str)

# Sumário
from collections import Counter
por_tipo = Counter(r['tipo'] for r in resultados)
conflitos = [r for r in resultados if r['conflito_nome_conteudo']]

print()
print('='*60)
print(f'ANÁLISE CONCLUÍDA — {len(resultados)} PDFs lidos')
print('='*60)
print()
print('Distribuição por tipo (do CONTEÚDO):')
for t, n in sorted(por_tipo.items(), key=lambda x: -x[1]):
    print(f'  {t:15} {n}')
print()
print(f'Conflitos nome-vs-conteúdo: {len(conflitos)}')
for c in conflitos[:20]:
    print(f'  nome sugere {c["tipo_nome_arquivo"]} · conteúdo é {c["tipo"]} · {c["arquivo"][:50]}')
