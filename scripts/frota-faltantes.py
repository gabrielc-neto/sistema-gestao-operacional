"""
Audita cada placa e motorista, listando documentos que ESTÃO FALTANDO.

Regras:
- Cavalo (prefixos: SFL4G, SEF1H, SES9I, AKD5, BBE9, BBD2, RAA0, RYD7, TBX5, FRD7):
    CIV (anual) · CRLV (anual) · CRONO (a cada 2 anos)
- 9 eixos especial (TBX5H14, TBX5H17, BBE9588): + LICENCA_AMB
- Carreta/semirreboque (outras placas):
    CRLV · CIV · CIPP · IPEM
- Motorista ativo (não desligado):
    CNH · MOPP · NR20 · NR35 · NR7 (ASO)
"""
import os, json, sys, io, re
from collections import defaultdict
from datetime import date
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

VAULT = 'C:/Users/Logistica01/projetos/logistica-ia'
BASE = f'{VAULT}/arquivo/frota-pontual'
HOJE = date.today()

with open(f'{BASE}/_analise-conteudo.json', encoding='utf-8') as f:
    dados = json.load(f)

# Prefixos de cavalo Pontual
PREFIXOS_CAVALO = ['SFL4G', 'SEF1H', 'SES9I', 'AKD5', 'BBE9', 'BBD2', 'RAA0', 'RYD7', 'TBX5', 'FRD7']
CAVALOS_9EIXOS = {'TBX5H14', 'TBX5H17', 'BBE9588'}

DOCS_CAVALO = ['CRLV', 'CIV', 'CRONOTACOGRAFO']
DOCS_CAVALO_9EIXOS = DOCS_CAVALO + ['LICENCA_AMB']
DOCS_CARRETA = ['CRLV', 'CIV', 'CIPP', 'IPEM']
DOCS_MOTORISTA = ['CNH', 'MOPP', 'NR20', 'NR35', 'NR7']

def eh_cavalo(placa):
    return any(placa.startswith(p) for p in PREFIXOS_CAVALO)

def status_arquivo(r):
    """Retorna emoji do status."""
    s = r.get('status', 'sem_data')
    if s == 'vencido': return '🔴'
    if s == 'ok': return '✅'
    if s.startswith('venc'): return '⚡'
    return '❓'

# Agrupa dados por pasta_atual (placa ou motorista)
por_dono = defaultdict(list)
for r in dados:
    # pasta_atual está tipo "Veiculos/SFL4G39/CIV xxx.pdf" ou "Veiculos/SFL4G39/vencidos/xxx.pdf"
    partes = r['pasta_atual'].split('/')
    if len(partes) >= 2:
        categoria = partes[0]  # Motoristas, Veiculos, Desligados
        dono = partes[1]       # nome ou placa
        por_dono[(categoria, dono)].append(r)

# Análise
faltas_veiculos = {}
faltas_motoristas = {}

for (cat, dono), docs in sorted(por_dono.items()):
    if cat in ('Veiculos',):
        placa = dono
        if eh_cavalo(placa):
            obrigatorios = DOCS_CAVALO_9EIXOS if placa in CAVALOS_9EIXOS else DOCS_CAVALO
            tipo_vei = '🚛 CAVALO' + (' (9 EIXOS)' if placa in CAVALOS_9EIXOS else '')
        else:
            obrigatorios = DOCS_CARRETA
            tipo_vei = '📦 CARRETA'

        tipos_presentes = set(r['tipo'] for r in docs)
        faltam = [t for t in obrigatorios if t not in tipos_presentes]
        faltas_veiculos[placa] = {
            'tipo_vei': tipo_vei,
            'faltam': faltam,
            'presentes': [(r['tipo'], r.get('vencimento'), r.get('status'), r['arquivo']) for r in docs],
            'obrigatorios': obrigatorios,
        }
    elif cat == 'Motoristas':
        motorista = dono
        tipos_presentes = set(r['tipo'] for r in docs)
        faltam = [t for t in DOCS_MOTORISTA if t not in tipos_presentes]
        faltas_motoristas[motorista] = {
            'faltam': faltam,
            'presentes': [(r['tipo'], r.get('vencimento'), r.get('status'), r['arquivo']) for r in docs],
            'obrigatorios': DOCS_MOTORISTA,
        }

# Sumário console
print('=== VEÍCULOS COM FALTAS ===')
for placa, info in sorted(faltas_veiculos.items()):
    if info['faltam']:
        print(f"  {placa:12} ({info['tipo_vei']}): FALTA {', '.join(info['faltam'])}")
sem_falta_vei = [p for p, i in faltas_veiculos.items() if not i['faltam']]
print(f'\n✅ Veículos completos: {len(sem_falta_vei)} / {len(faltas_veiculos)}')

print('\n=== MOTORISTAS COM FALTAS ===')
for m, info in sorted(faltas_motoristas.items()):
    if info['faltam']:
        print(f"  {m:35}: FALTA {', '.join(info['faltam'])}")
sem_falta_mot = [m for m, i in faltas_motoristas.items() if not i['faltam']]
print(f'\n✅ Motoristas completos: {len(sem_falta_mot)} / {len(faltas_motoristas)}')

# Gera relatório Markdown
DOCS = f'{VAULT}/docs'
os.makedirs(DOCS, exist_ok=True)

def status_txt(status, venc):
    if status == 'vencido': return f'🔴 VENCIDO ({venc})'
    if status == 'ok': return f'✅ OK ({venc})'
    if status and status.startswith('venc'): return f'⚡ {status.replace("_", " ")} ({venc})'
    return '❓ sem data'

def escrever_md(path, titulo, itens_dict, obrig_key='obrigatorios'):
    lines = [f'# {titulo}', '', f'Gerado: {HOJE.isoformat()}', '', '---', '']
    for chave, info in sorted(itens_dict.items()):
        if 'tipo_vei' in info:
            titulo_bloco = f'{info["tipo_vei"]}  ·  {chave}'
        else:
            titulo_bloco = chave
        lines.append(f'\n## {titulo_bloco}\n')
        # Faltantes
        if info['faltam']:
            lines.append(f'**❌ Faltando:** {", ".join(info["faltam"])}\n')
        else:
            lines.append('**✅ Documentação completa**\n')
        # Presentes agrupados por tipo obrigatório
        lines.append('| Tipo obrig. | Status | Arquivo |')
        lines.append('|---|---|---|')
        for t_obrig in info['obrigatorios']:
            docs_desse_tipo = [d for d in info['presentes'] if d[0] == t_obrig]
            if docs_desse_tipo:
                for tipo, venc, status, arq in docs_desse_tipo:
                    lines.append(f'| **{t_obrig}** | {status_txt(status, venc)} | `{arq}` |')
            else:
                lines.append(f'| **{t_obrig}** | ❌ **AUSENTE** | — |')
        # Outros docs (não obrigatórios mas presentes)
        outros = [d for d in info['presentes'] if d[0] not in info['obrigatorios']]
        if outros:
            lines.append('| Extras | | |')
            for tipo, venc, status, arq in outros:
                lines.append(f'| {tipo} | {status_txt(status, venc)} | `{arq}` |')
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    return len(itens_dict)

n1 = escrever_md(f'{DOCS}/frota-FALTANTES-veiculos.md', 'Frota — Documentos por VEÍCULO', faltas_veiculos)
n2 = escrever_md(f'{DOCS}/frota-FALTANTES-motoristas.md', 'Frota — Documentos por MOTORISTA', faltas_motoristas)
print(f'\n📄 {DOCS}/frota-FALTANTES-veiculos.md ({n1} veículos)')
print(f'📄 {DOCS}/frota-FALTANTES-motoristas.md ({n2} motoristas)')
