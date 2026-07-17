"""
V2 — usa placas EXTRAÍDAS DO CONTEÚDO do PDF (não das pastas).
Agrupa por placa/motorista real. Detecta motorista pelo nome de pasta (sem placa).

Regras:
- Cavalo (prefixos: SFL4G, SEF1H, SES9I, AKD5, BBE9, BBD2, RAA0, RYD7, TBX5, FRD7):
    CIV · CRLV · CRONOTACOGRAFO
- 9 eixos: TBX5H14, TBX5H17, BBE9588 → + LICENCA_AMB
- Carreta: CRLV · CIV · CIPP · IPEM
- Motorista: CNH · MOPP · NR20 · NR35 · NR7
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

# Placas oficiais Pontual (só essas contam — filtra falsos positivos)
PREFIXOS_CAVALO = ['SFL4G', 'SEF1H', 'SES9I', 'AKD5', 'BBE9', 'BBD2', 'RAA0', 'RYD7', 'TBX5', 'FRD7']
CAVALOS_9EIXOS = {'TBX5H14', 'TBX5H17', 'BBE9588'}

# Descobre TODAS as placas válidas (das pastas da raiz que têm padrão de placa)
todas_pastas = [d for d in os.listdir(BASE) if os.path.isdir(os.path.join(BASE, d))]
def eh_placa_valida(p):
    return bool(re.fullmatch(r'[A-Z]{3}\d[A-Z0-9]\d{2,3}', p) or re.fullmatch(r'[A-Z]{3}\d{4}', p))
placas_conhecidas = set(p for p in todas_pastas if eh_placa_valida(p))
print(f'📋 Placas conhecidas (pastas): {len(placas_conhecidas)}')

def eh_cavalo(placa):
    return any(placa.startswith(p) for p in PREFIXOS_CAVALO)

def limpa_placa(p):
    return re.sub(r'[^A-Z0-9]', '', p.upper())

# Motoristas = pastas na raiz que NÃO são placa e não são "Controles"
motoristas_pastas = [d for d in todas_pastas
                     if not eh_placa_valida(d)
                     and d not in ('Controles', 'Motoristas', 'Veiculos', 'Desligados')
                     and 'DESLIGADO' not in d.upper()]
desligados_pastas = [d for d in todas_pastas if 'DESLIGADO' in d.upper()]
print(f'📋 Motoristas ativos (pastas): {len(motoristas_pastas)}')
print(f'📋 Motoristas desligados: {len(desligados_pastas)}')

# Também considera Motoristas/ e Desligados/ se ainda existirem
for cat in ['Motoristas', 'Desligados']:
    sub = os.path.join(BASE, cat)
    if os.path.isdir(sub):
        for n in os.listdir(sub):
            if os.path.isdir(os.path.join(sub, n)):
                if cat == 'Motoristas' and 'DESLIGADO' not in n.upper():
                    motoristas_pastas.append(n)
                else:
                    desligados_pastas.append(n)

# Deduplica
motoristas_pastas = list(set(motoristas_pastas))
desligados_pastas = list(set(desligados_pastas))
print(f'📋 Motoristas (final): {len(motoristas_pastas)} ativos + {len(desligados_pastas)} desligados')

# === CLASSIFICA CADA DOC ===
docs_por_placa = defaultdict(list)
docs_por_motorista = defaultdict(list)
docs_orfaos = []  # não associados

TIPOS_DE_VEICULO = {'CRLV', 'CIV', 'CIPP', 'IPEM', 'CRONOTACOGRAFO', 'LICENCA_AMB', 'LICENCA_DER', 'ANTT_RNTRC', 'SEGURO', 'NORDICA'}
TIPOS_DE_MOTORISTA = {'CNH', 'MOPP', 'NR20', 'NR35', 'NR7'}

for r in dados:
    tipo = r['tipo']
    placas_texto = [p for p in (r.get('placas') or []) if p in placas_conhecidas]
    pasta = r.get('pasta_atual', '').split('/')[0]

    # 1. Se é doc de motorista, tenta associar pela PASTA
    if tipo in TIPOS_DE_MOTORISTA:
        # Pasta é motorista?
        if pasta in motoristas_pastas or pasta in desligados_pastas:
            docs_por_motorista[pasta].append(r)
        else:
            # Talvez pasta seja placa — busca por partes do nome do arquivo
            nome_no_arq = r['arquivo'].upper().replace('.PDF', '')
            achou = False
            for m in motoristas_pastas + desligados_pastas:
                # pega primeira palavra do nome do motorista
                primeira_palavra = m.split()[0].upper() if m.split() else ''
                if primeira_palavra and primeira_palavra in nome_no_arq:
                    docs_por_motorista[m].append(r)
                    achou = True
                    break
            if not achou:
                docs_orfaos.append(r)
        continue

    # 2. Doc de veículo — placa vem do CONTEÚDO ou da pasta
    if placas_texto:
        # Usa primeira placa válida do texto
        docs_por_placa[placas_texto[0]].append(r)
    elif pasta in placas_conhecidas:
        docs_por_placa[pasta].append(r)
    else:
        docs_orfaos.append(r)

# === CALCULA FALTAS ===
DOCS_CAVALO = ['CRLV', 'CIV', 'CRONOTACOGRAFO']
DOCS_CAVALO_9E = DOCS_CAVALO + ['LICENCA_AMB']
DOCS_CARRETA = ['CRLV', 'CIV', 'CIPP', 'IPEM']
DOCS_MOTORISTA = ['CNH', 'MOPP', 'NR20', 'NR35', 'NR7']

def status_txt(s, v):
    if s == 'vencido': return f'🔴 VENCIDO ({v})'
    if s == 'ok': return f'✅ OK ({v})'
    if s and s.startswith('venc'): return f'⚡ {s} ({v})'
    return '❓ sem data'

# Relatório VEÍCULOS
lines_v = ['# Frota — Documentos por VEÍCULO (baseado em conteúdo real)', '', f'Gerado: {HOJE.isoformat()}', '', '---', '']
completos_v = 0
faltas_totais_v = 0
for placa in sorted(placas_conhecidas):
    docs = docs_por_placa.get(placa, [])
    if eh_cavalo(placa):
        obrig = DOCS_CAVALO_9E if placa in CAVALOS_9EIXOS else DOCS_CAVALO
        tipo_txt = '🚛 CAVALO' + (' (9 EIXOS)' if placa in CAVALOS_9EIXOS else '')
    else:
        obrig = DOCS_CARRETA
        tipo_txt = '📦 CARRETA'
    tipos_presentes = set(d['tipo'] for d in docs)
    faltam = [t for t in obrig if t not in tipos_presentes]
    if not faltam: completos_v += 1
    faltas_totais_v += len(faltam)

    lines_v.append(f'\n## {tipo_txt} — {placa}\n')
    if faltam:
        lines_v.append(f'**❌ Faltando:** {", ".join(faltam)}\n')
    else:
        lines_v.append('**✅ Documentação completa**\n')
    lines_v.append('| Doc obrig. | Status | Arquivo |')
    lines_v.append('|---|---|---|')
    for t in obrig:
        matches = [d for d in docs if d['tipo'] == t]
        if matches:
            for d in matches:
                lines_v.append(f'| **{t}** | {status_txt(d.get("status"), d.get("vencimento"))} | `{d["arquivo"]}` |')
        else:
            lines_v.append(f'| **{t}** | ❌ AUSENTE | — |')
    outros = [d for d in docs if d['tipo'] not in obrig]
    if outros:
        lines_v.append('| _extras_ | | |')
        for d in outros:
            lines_v.append(f'| {d["tipo"]} | {status_txt(d.get("status"), d.get("vencimento"))} | `{d["arquivo"]}` |')

with open(f'{VAULT}/docs/frota-FALTANTES-veiculos.md', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines_v))

# Relatório MOTORISTAS
lines_m = ['# Frota — Documentos por MOTORISTA', '', f'Gerado: {HOJE.isoformat()}', '', '---', '']
completos_m = 0
faltas_totais_m = 0
for m in sorted(motoristas_pastas):
    docs = docs_por_motorista.get(m, [])
    tipos_presentes = set(d['tipo'] for d in docs)
    faltam = [t for t in DOCS_MOTORISTA if t not in tipos_presentes]
    if not faltam: completos_m += 1
    faltas_totais_m += len(faltam)

    lines_m.append(f'\n## 👤 {m}\n')
    if faltam:
        lines_m.append(f'**❌ Faltando:** {", ".join(faltam)}\n')
    else:
        lines_m.append('**✅ Completo**\n')
    lines_m.append('| Doc obrig. | Status | Arquivo |')
    lines_m.append('|---|---|---|')
    for t in DOCS_MOTORISTA:
        matches = [d for d in docs if d['tipo'] == t]
        if matches:
            for d in matches:
                lines_m.append(f'| **{t}** | {status_txt(d.get("status"), d.get("vencimento"))} | `{d["arquivo"]}` |')
        else:
            lines_m.append(f'| **{t}** | ❌ AUSENTE | — |')

with open(f'{VAULT}/docs/frota-FALTANTES-motoristas.md', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines_m))

# Sumário console
print()
print(f'✅ Veículos completos:    {completos_v} / {len(placas_conhecidas)}')
print(f'   Total docs faltando:   {faltas_totais_v}')
print(f'✅ Motoristas completos:  {completos_m} / {len(motoristas_pastas)}')
print(f'   Total docs faltando:   {faltas_totais_m}')
print(f'❓ Docs órfãos (sem associação): {len(docs_orfaos)}')
print()
print('=== VEÍCULOS COM MAIS FALTAS ===')
for placa in sorted(placas_conhecidas):
    docs = docs_por_placa.get(placa, [])
    obrig = DOCS_CAVALO_9E if placa in CAVALOS_9EIXOS else (DOCS_CAVALO if eh_cavalo(placa) else DOCS_CARRETA)
    tipos_p = set(d['tipo'] for d in docs)
    faltam = [t for t in obrig if t not in tipos_p]
    if faltam:
        print(f'  {placa:12} FALTA {",".join(faltam)}')
print()
print('=== MOTORISTAS COM MAIS FALTAS ===')
for m in sorted(motoristas_pastas):
    docs = docs_por_motorista.get(m, [])
    tipos_p = set(d['tipo'] for d in docs)
    faltam = [t for t in DOCS_MOTORISTA if t not in tipos_p]
    if faltam:
        print(f'  {m[:35]:35} FALTA {",".join(faltam)}')
