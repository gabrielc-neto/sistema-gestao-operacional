"""
Reclassifica lendo o texto COMPLETO de cada PDF (não só sample).
Não faz OCR — só texto embutido. PDFs escaneados sem texto ficam como estavam.
"""
import os, json, sys, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)

import fitz

VAULT = 'C:/Users/Logistica01/projetos/logistica-ia'
BASE = f'{VAULT}/arquivo/frota-pontual'

def eh_placa(p):
    return bool(re.fullmatch(r'[A-Z]{3}\d[A-Z0-9]\d{2,3}', p) or re.fullmatch(r'[A-Z]{3}\d{4}', p))

# Coleta placas válidas
placas_conhecidas = set()
for root, dirs, _ in os.walk(BASE):
    for d in dirs:
        if eh_placa(d): placas_conhecidas.add(d)
print(f'Placas conhecidas: {len(placas_conhecidas)}')

def classificar(texto):
    upper = texto.upper()
    if re.search(r'CARTEIRA NACIONAL DE HABILITA', upper): return 'CNH'
    if re.search(r'CERTIFICADO DE REGISTRO E LICENCIAMENTO', upper): return 'CRLV'
    if 'CRLV' in upper and 'RENAVAM' in upper: return 'CRLV'
    if re.search(r'INSPE[CÇ][AÃ]O PARA (O )?TRANSPORTE DE PRODUTOS PERIGOSOS', upper): return 'CIPP'
    if re.search(r'CERTIFICADO DE INSPE[CÇ][AÃ]O VEICULAR', upper): return 'CIV'
    if re.search(r'INSPE[CÇ][AÃ]O VEICULAR', upper): return 'CIV'
    if re.search(r'INSTITUTO DE PESOS E MEDIDAS|INMETRO|AFERI[CÇ][AÃ]O VOLUM|CAPACIDADE VOLUM|VERIFICA[CÇ][AÃ]O METROL', upper): return 'IPEM'
    if re.search(r'NR[-\s]?35\b|TRABALHO EM ALTURA', upper): return 'NR35'
    if re.search(r'NR[-\s]?20\b|L[IÍ]QUIDOS INFLAM|INFLAM[AÁ]VEIS E COMBUST', upper): return 'NR20'
    if re.search(r'NR[-\s]?7\b|ATESTADO DE SA[UÚ]DE OCUPACIONAL|\bASO\b', upper): return 'NR7'
    if 'MOVIMENTA' in upper and 'PRODUTOS PERIGOSOS' in upper: return 'MOPP'
    if re.search(r'\bMOPP\b', upper): return 'MOPP'
    if 'CRONOTAC' in upper or 'TAC[OÓ]GRAFO' in upper: return 'CRONOTACOGRAFO'
    if re.search(r'LICEN[CÇ]A AMBIENT|\bIBAMA\b|CETESB|CADASTRO T[EÉ]CNICO FEDERAL', upper): return 'LICENCA_AMB'
    if re.search(r'AUTORIZA[CÇ][AÃ]O ESPECIAL DE TR[AÂ]NSITO|DEPARTAMENTO DE ESTRADAS|\bAET\b|DER[-\s]?SP', upper): return 'LICENCA_DER'
    if 'RNTRC' in upper or 'REGISTRO NACIONAL DE TRANSPORTADORES' in upper: return 'ANTT_RNTRC'
    if re.search(r'AP[OÓ]LICE DE SEGURO', upper): return 'SEGURO'
    if 'NORDICA' in upper or 'RANDON' in upper: return 'NORDICA'
    return 'DESCONHECIDO'

PLACA_RE = re.compile(r'([A-Z]{3}[-\s]?\d[A-Z0-9]\d{2,3})')
def extrair_placas(texto):
    achou = set()
    for m in PLACA_RE.finditer(texto.upper()):
        p = re.sub(r'[^A-Z0-9]', '', m.group(1))
        if p in placas_conhecidas: achou.add(p)
    return list(achou)

# Carrega JSON
with open(f'{BASE}/_analise-conteudo.json', encoding='utf-8') as f:
    dados = json.load(f)

# Reprocessa cada
mudou_tipo = 0
mudou_placa = 0
falha_pdf = 0
i = 0
for r in dados:
    i += 1
    path = r.get('caminho', '')
    if not os.path.isfile(path):
        continue
    try:
        doc = fitz.open(path)
        texto = '\n'.join(p.get_text() or '' for p in doc)
        doc.close()
    except Exception:
        falha_pdf += 1
        continue

    if len(texto.strip()) < 30:
        # PDF sem texto — não mexe (era imagem que já foi OCR antes)
        continue

    tipo_novo = classificar(texto)
    if tipo_novo != r['tipo']:
        r['tipo_antigo'] = r['tipo']
        r['tipo'] = tipo_novo
        mudou_tipo += 1

    placas = extrair_placas(texto)
    if placas != r.get('placas', []):
        r['placas_antigas'] = r.get('placas', [])
        r['placas'] = placas
        mudou_placa += 1

    if i % 50 == 0:
        print(f'  [{i}/{len(dados)}] processados')

print()
print(f'✅ Tipos reclassificados: {mudou_tipo}')
print(f'✅ Placas atualizadas:    {mudou_placa}')
print(f'❌ PDFs que falharam:     {falha_pdf}')

# Distribuição
from collections import Counter
c = Counter(r['tipo'] for r in dados)
print()
print('=== DISTRIBUIÇÃO POR TIPO (final) ===')
for t, n in sorted(c.items(), key=lambda x: -x[1]):
    print(f'  {t:15} {n}')

with open(f'{BASE}/_analise-conteudo.json', 'w', encoding='utf-8') as f:
    json.dump(dados, f, ensure_ascii=False, indent=2, default=str)
print(f'\n📝 JSON salvo')
