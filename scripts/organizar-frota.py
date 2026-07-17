"""
Reorganiza arquivo/downloads-pontual/Documentos Frota/Frota/ em estrutura por
motorista + veículos, extraindo placas do nome da pasta.

Fase 1-3: cria estrutura + copia arquivos (não move — preserva original).
Fase 4-5 rodam separado depois.
"""
import os, re, shutil, sys, io, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

VAULT = 'C:/Users/Logistica01/projetos/logistica-ia'
SRC = f'{VAULT}/arquivo/downloads-pontual/Documentos Frota/Frota'
DST = f'{VAULT}/arquivo/frota-pontual'

# Regras de negócio
PULAR = ['SAVEIROS', 'VENDA', 'FOLGUISTA']  # se nome CONTÉM essas palavras, pula
DESLIGADO_MARCADORES = ['((DESLIGADO', '((DESLIGADO))', 'DESLIGADO']

# Regex placa formato Mercosul (AAA1A11) ou antigo (AAA-1111 / AAA1111)
PLACA_RE = re.compile(r'([A-Z]{3}[-\s]?\d[A-Z]?\d{2,3})', re.IGNORECASE)

def clean_placa(p):
    return re.sub(r'[^A-Z0-9]', '', p.upper())

def parse_pasta(nome):
    """
    Extrai motorista + placas do nome da pasta.
    Ex: 'WEBERSON PELIGRINI SFL4G39-ATR7723' → ('WEBERSON PELIGRINI', ['SFL4G39','ATR7723'])
    """
    original = nome
    n_upper = nome.upper()

    # Pula lixo
    for p in PULAR:
        if p in n_upper:
            return None  # sinaliza pra pular

    # Detecta desligado
    desligado = any(m in n_upper for m in DESLIGADO_MARCADORES)
    if desligado:
        nome = re.sub(r'\(\(DESLIGADO.*?\)\)', '', nome, flags=re.IGNORECASE).strip()

    # Coleta placas do nome
    placas = [clean_placa(m.group(1)) for m in PLACA_RE.finditer(nome)]
    # Filtra placas válidas (7 caracteres: 3 letras + 4 dígitos, ou Mercosul)
    placas = [p for p in placas if re.fullmatch(r'[A-Z]{3}\d[A-Z0-9]\d{2,3}', p) or re.fullmatch(r'[A-Z]{3}\d{4}', p)]
    placas = list(dict.fromkeys(placas))  # dedupe preservando ordem

    # Remove placas do nome pra ficar só o motorista
    motorista = nome
    for p in placas:
        # Remove padrões tipo "SFL4G39-ATR7723" ou "SEF1H37 AWA6090"
        motorista = re.sub(r'[A-Z]{3}[-\s]?\d[A-Z]?\d{2,3}', '', motorista, flags=re.IGNORECASE)
    motorista = re.sub(r'[\s\-]+', ' ', motorista).strip()

    # Casos especiais
    if 'MOTORISTA OPERACIONAL' in n_upper or 'MOTORISTA PX' in n_upper:
        return {'tipo': 'desligado', 'motorista': original, 'placas': [], 'original': original}

    if 'CARRETA' in n_upper and not motorista.replace('CARRETA','').replace('TANQUE','').replace('RESERVA','').strip():
        # É só carreta, sem motorista
        return {'tipo': 'veiculo_avulso', 'motorista': None, 'placas': placas, 'original': original, 'label': motorista}

    if not motorista:
        return {'tipo': 'veiculo_avulso', 'motorista': None, 'placas': placas, 'original': original}

    return {
        'tipo': 'desligado' if desligado else 'ativo',
        'motorista': motorista,
        'placas': placas,
        'original': original,
    }

# Classifica todas as pastas
pastas = sorted(os.listdir(SRC))
resumo = {'ativo': [], 'desligado': [], 'veiculo_avulso': [], 'pulado': []}
for nome in pastas:
    if not os.path.isdir(os.path.join(SRC, nome)): continue
    r = parse_pasta(nome)
    if r is None:
        resumo['pulado'].append(nome)
        continue
    resumo[r['tipo']].append(r)

# Relatório
print(f"📦 SRC: {SRC}")
print(f"📁 Ativas:         {len(resumo['ativo'])}")
print(f"🚫 Desligadas:     {len(resumo['desligado'])}")
print(f"🚛 Veículos avulsos: {len(resumo['veiculo_avulso'])}")
print(f"⏭  Puladas (SAVEIROS/VENDA/FOLGUISTA): {len(resumo['pulado'])}")
print()

# Prova de vida — 5 exemplos
print("=== AMOSTRA ATIVOS ===")
for r in resumo['ativo'][:8]:
    print(f"  {r['motorista']:35} → placas {r['placas']}")
print()
print("=== DESLIGADOS ===")
for r in resumo['desligado']:
    print(f"  {r['motorista']} (original: {r['original']})")
print()
print("=== VEICULOS AVULSOS ===")
for r in resumo['veiculo_avulso']:
    print(f"  {r['original']} → placas {r['placas']}")
print()
print("=== PULADOS ===")
for n in resumo['pulado']:
    print(f"  {n}")

# Cria estrutura
os.makedirs(f'{DST}/Motoristas', exist_ok=True)
os.makedirs(f'{DST}/Veiculos', exist_ok=True)
os.makedirs(f'{DST}/Desligados', exist_ok=True)
os.makedirs(f'{DST}/Controles', exist_ok=True)

# COPIA arquivos (não move, preserva original em arquivo/downloads-pontual/)
copied_motorista = 0
copied_veiculo = 0

def safe_copy(src, dst_dir):
    """Copia arquivo pra dst_dir. Se arquivo já existir, sufixa (2), (3)..."""
    os.makedirs(dst_dir, exist_ok=True)
    base = os.path.basename(src)
    dst = os.path.join(dst_dir, base)
    if os.path.exists(dst):
        stem, ext = os.path.splitext(base)
        i = 2
        while os.path.exists(os.path.join(dst_dir, f'{stem} ({i}){ext}')):
            i += 1
        dst = os.path.join(dst_dir, f'{stem} ({i}){ext}')
    try:
        shutil.copy2(src, dst)
        return True
    except Exception as e:
        print(f'  ! erro copiando {base}: {e}')
        return False

# Classifica cada arquivo — MOPP/NR20/NR35/CNH → motorista, resto → veículo
def eh_doc_motorista(fn):
    fn_l = fn.lower()
    return any(t in fn_l for t in ['cnh', 'mopp', 'nr20', 'nr-20', 'nr 20', 'nr35', 'nr-35', 'nr 35', 'aso', 'nr7'])

for grupo in ['ativo', 'desligado', 'veiculo_avulso']:
    for r in resumo[grupo]:
        src_dir = os.path.join(SRC, r['original'])
        if not os.path.isdir(src_dir): continue
        # Destino baseado no tipo
        if grupo == 'desligado':
            dst_motorista = f'{DST}/Desligados/{r["motorista"] or r["original"]}'
        elif r.get('motorista'):
            dst_motorista = f'{DST}/Motoristas/{r["motorista"]}'
        else:
            dst_motorista = None

        for fn in os.listdir(src_dir):
            fp = os.path.join(src_dir, fn)
            if not os.path.isfile(fp): continue
            if fn.lower() in ('thumbs.db', 'desktop.ini'): continue

            if eh_doc_motorista(fn) and dst_motorista:
                safe_copy(fp, dst_motorista)
                copied_motorista += 1
            else:
                # Vai pro veículo — usa primeira placa
                for placa in r['placas']:
                    safe_copy(fp, f'{DST}/Veiculos/{placa}')
                    copied_veiculo += 1
                    break  # só a primeira placa; se quiser, remover break

print()
print(f"✅ Copiado pra Motoristas/: {copied_motorista} arquivos")
print(f"✅ Copiado pra Veiculos/:   {copied_veiculo} arquivos")

# Salva JSON com o parsing pra fase 4 usar
with open(f'{DST}/_frota-parse.json', 'w', encoding='utf-8') as f:
    json.dump(resumo, f, ensure_ascii=False, indent=2, default=str)
print(f'\n📝 Parse salvo: {DST}/_frota-parse.json')
