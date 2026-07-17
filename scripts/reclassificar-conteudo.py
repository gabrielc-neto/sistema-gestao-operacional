"""
Re-classifica _analise-conteudo.json com regras melhores:
1. Detecção de tipo HIERÁRQUICA (CNH tem prioridade sobre LICENCA_DER)
2. Placas filtradas contra lista de placas conhecidas (pastas)
3. Regex mais preciso pra remover falsos positivos (CPF, RNP, CEP...)
"""
import os, json, sys, io, re
from datetime import date, timedelta

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

VAULT = 'C:/Users/Logistica01/projetos/logistica-ia'
BASE = f'{VAULT}/arquivo/frota-pontual'
HOJE = date.today()

with open(f'{BASE}/_analise-conteudo.json', encoding='utf-8') as f:
    dados = json.load(f)

# --- Coleta placas VÁLIDAS conhecidas ---
def eh_placa(p):
    return bool(re.fullmatch(r'[A-Z]{3}\d[A-Z0-9]\d{2,3}', p) or re.fullmatch(r'[A-Z]{3}\d{4}', p))

placas_conhecidas = set()
for d in os.listdir(BASE):
    if os.path.isdir(os.path.join(BASE, d)) and eh_placa(d):
        placas_conhecidas.add(d)
# Também lê pastas antigas em Motoristas/Veiculos/Desligados se existirem
for cat in ['Motoristas', 'Veiculos', 'Desligados']:
    sub = os.path.join(BASE, cat)
    if os.path.isdir(sub):
        for n in os.listdir(sub):
            if eh_placa(n): placas_conhecidas.add(n)

print(f'📋 Placas válidas conhecidas: {len(placas_conhecidas)}')

# --- Classificação HIERÁRQUICA (prioridade alta primeiro) ---
def classificar_hierarquico(texto):
    upper = texto.upper()
    # 1. CNH — se tem "CARTEIRA NACIONAL DE HABILITAÇÃO", é CNH ponto
    if re.search(r'CARTEIRA NACIONAL DE HABILITA', upper):
        return 'CNH'
    # 2. CRLV — Certificado de Registro e Licenciamento (texto oficial)
    if re.search(r'CERTIFICADO DE REGISTRO E LICENCIAMENTO', upper) or 'CRLV' in upper:
        return 'CRLV'
    # 3. CIPP — Certificado de Inspeção para o Transporte de Produtos Perigosos
    if re.search(r'INSPE[CÇ][AÃ]O PARA (O )?TRANSPORTE DE PRODUTOS PERIGOSOS', upper) or \
       re.search(r'CERTIFICADO.*PRODUTOS PERIGOSOS', upper):
        return 'CIPP'
    # 4. CIV — Certificado de Inspeção Veicular (não confundir com CIPP)
    if re.search(r'CERTIFICADO DE INSPE[CÇ][AÃ]O VEICULAR', upper) or \
       re.search(r'INSPE[CÇ][AÃ]O VEICULAR\b', upper):
        return 'CIV'
    # 5. IPEM — instituto de pesos e medidas / aferição volumétrica
    if re.search(r'INSTITUTO DE PESOS E MEDIDAS', upper) or \
       re.search(r'INMETRO', upper) or \
       re.search(r'AFERI[CÇ][AÃ]O VOLUM', upper) or \
       re.search(r'CAPACIDADE VOLUM', upper) or \
       re.search(r'VERIFICA[CÇ][AÃ]O METROL', upper):
        return 'IPEM'
    # 6. NR35 (antes de MOPP pra não bater em "produtos perigosos" genérico)
    if re.search(r'NR[-\s]?35\b', upper) or 'TRABALHO EM ALTURA' in upper:
        return 'NR35'
    # 7. NR20
    if re.search(r'NR[-\s]?20\b', upper) or 'LÍQUIDOS INFLAM' in upper or 'LIQUIDOS INFLAM' in upper or 'INFLAM[ÁA]VEIS E COMBUST' in upper:
        return 'NR20'
    # 8. NR7 / ASO
    if re.search(r'NR[-\s]?7\b', upper) or 'ATESTADO DE SA[UÚ]DE OCUPACIONAL' in upper or 'ASO ' in upper[:100]:
        return 'NR7'
    # 9. MOPP
    if 'MOVIMENTA' in upper and 'PRODUTOS PERIGOSOS' in upper:
        return 'MOPP'
    if re.search(r'\bMOPP\b', upper):
        return 'MOPP'
    # 10. Cronotacógrafo
    if 'CRONOTAC' in upper or 'TAC[OÓ]GRAFO' in upper or 'AFERI[CÇ][AÃ]O.*TAC' in upper:
        return 'CRONOTACOGRAFO'
    # 11. Licença ambiental
    if 'LICEN[CÇ]A AMBIENT' in upper or 'IBAMA' in upper or 'CETESB' in upper or re.search(r'CADASTRO T[EÉ]CNICO FEDERAL', upper):
        return 'LICENCA_AMB'
    # 12. Licença DER / AET
    if 'AUTORIZA[CÇ][AÃ]O ESPECIAL DE TR[AÂ]NSITO' in upper or 'DEPARTAMENTO DE ESTRADAS' in upper or re.search(r'\bAET\b', upper) or 'DER-SP' in upper or 'DER SP' in upper:
        return 'LICENCA_DER'
    # 13. ANTT / RNTRC
    if 'RNTRC' in upper or 'REGISTRO NACIONAL DE TRANSPORTADORES' in upper:
        return 'ANTT_RNTRC'
    # 14. Seguro
    if 'AP[OÓ]LICE DE SEGURO' in upper or 'SEGURADORA' in upper:
        return 'SEGURO'
    # 15. CIOT
    if re.search(r'\bCIOT\b', upper):
        return 'CIOT'
    # 16. NF Nordica (fabricante tanque)
    if 'NORDICA' in upper or 'RANDON' in upper:
        return 'NORDICA'

    return 'DESCONHECIDO'

# --- Filtro de placas ---
def placas_validas(placas_raw):
    """Filtra só placas conhecidas."""
    return [p for p in placas_raw if p in placas_conhecidas]

# --- Reprocessa cada registro ---
mudancas_tipo = 0
mudancas_placas = 0
for r in dados:
    texto = r.get('texto_sample', '')  # texto extraído (300 chars)
    # Precisa mais texto — vou re-abrir o PDF? Não, o sample tem só 300 chars
    # Se sample tá cortado, tenta detectar do sample mesmo
    tipo_novo = classificar_hierarquico(texto)
    if tipo_novo != r['tipo']:
        r['tipo_antigo'] = r['tipo']
        r['tipo'] = tipo_novo
        mudancas_tipo += 1

    # Placas filtradas
    placas_orig = r.get('placas') or []
    placas_novas = placas_validas(placas_orig)
    if placas_novas != placas_orig:
        r['placas_antigas'] = placas_orig
        r['placas'] = placas_novas
        mudancas_placas += 1

print(f'✅ Tipos re-classificados: {mudancas_tipo}')
print(f'✅ Placas filtradas:       {mudancas_placas}')

# Distribuição por tipo
from collections import Counter
c = Counter(r['tipo'] for r in dados)
print()
print('=== DISTRIBUIÇÃO POR TIPO (após correção) ===')
for t, n in sorted(c.items(), key=lambda x: -x[1]):
    print(f'  {t:15} {n}')

# Salva
with open(f'{BASE}/_analise-conteudo.json', 'w', encoding='utf-8') as f:
    json.dump(dados, f, ensure_ascii=False, indent=2, default=str)
print(f'\n📝 JSON atualizado: {BASE}/_analise-conteudo.json')
