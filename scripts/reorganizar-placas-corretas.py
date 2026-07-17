"""
Corrige distribuição errada de arquivos entre placas.
Para CADA arquivo em Veiculos/*/:
1. Extrai placa do NOME DO ARQUIVO (prioridade)
2. Se tem placa no nome → move pra Veiculos/PLACA_DO_ARQUIVO/ (criando pasta se precisar)
3. Se não tem → mantém onde está (fallback)
Preserva subpastas (vencidos/, sem-data/).
"""
import os, re, sys, io, shutil, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

V = 'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos'
PLACA_RE = re.compile(r'([A-Z]{3}[-\s_]?\d[A-Z]?\d{2,3})')

def clean_placa(p):
    return re.sub(r'[^A-Z0-9]', '', p.upper())

def placa_do_arquivo(fname):
    """Extrai a PRIMEIRA placa válida do nome. None se não achar."""
    for m in PLACA_RE.finditer(fname.upper()):
        p = clean_placa(m.group(1))
        # Placa válida: 3 letras + 4 dígitos OU Mercosul (3+1+letra/digito+3)
        if re.fullmatch(r'[A-Z]{3}\d[A-Z0-9]\d{2,3}', p) or re.fullmatch(r'[A-Z]{3}\d{4}', p):
            return p
    return None

# Percorre TODOS os arquivos em Veiculos/*/
movidos = 0
mantidos = 0
sem_placa = 0

for placa_pasta in sorted(os.listdir(V)):
    pasta_atual = os.path.join(V, placa_pasta)
    if not os.path.isdir(pasta_atual): continue

    # Percorre raiz + subpastas (vencidos/, sem-data/)
    for root, dirs, files in os.walk(pasta_atual):
        # Subpasta relativa (ex: 'vencidos', 'sem-data', '.')
        subpasta = os.path.relpath(root, pasta_atual)
        for f in files:
            if not f.lower().endswith('.pdf'): continue

            placa_correta = placa_do_arquivo(f)
            if not placa_correta:
                sem_placa += 1
                continue

            if placa_correta == placa_pasta:
                # já está no lugar certo
                mantidos += 1
                continue

            # Move pra pasta correta, preservando subpasta (raiz/vencidos/sem-data)
            src = os.path.join(root, f)
            if subpasta == '.':
                dst_dir = os.path.join(V, placa_correta)
            else:
                dst_dir = os.path.join(V, placa_correta, subpasta)
            os.makedirs(dst_dir, exist_ok=True)
            dst = os.path.join(dst_dir, f)
            if os.path.exists(dst):
                stem, ext = os.path.splitext(f)
                i = 2
                while os.path.exists(os.path.join(dst_dir, f'{stem} ({i}){ext}')):
                    i += 1
                dst = os.path.join(dst_dir, f'{stem} ({i}){ext}')
            try:
                shutil.move(src, dst)
                movidos += 1
            except Exception as e:
                print(f'  ! erro {src}: {e}')

print(f'✅ Movidos pra pasta correta: {movidos}')
print(f'   Mantidos (já corretos):    {mantidos}')
print(f'   Sem placa no nome:         {sem_placa}')

# Remove pastas vazias
removidas = 0
for placa_pasta in list(os.listdir(V)):
    pasta = os.path.join(V, placa_pasta)
    if not os.path.isdir(pasta): continue
    # Remove subpastas vazias primeiro (vencidos/, sem-data/)
    for sub in ['vencidos', 'sem-data']:
        subp = os.path.join(pasta, sub)
        if os.path.isdir(subp) and not os.listdir(subp):
            os.rmdir(subp)
    # Remove pasta principal se vazia
    if not os.listdir(pasta):
        os.rmdir(pasta)
        removidas += 1
        print(f'   removida pasta vazia: {placa_pasta}')

print(f'   Pastas vazias removidas:   {removidas}')

# Contagem final
print()
print('=== ESTADO FINAL Veiculos/ ===')
placas = sorted(os.listdir(V))
print(f'   Total placas: {len(placas)}')
for p in placas:
    raiz = len([f for f in os.listdir(os.path.join(V, p)) if os.path.isfile(os.path.join(V, p, f))])
    venc = len(os.listdir(os.path.join(V, p, 'vencidos'))) if os.path.isdir(os.path.join(V, p, 'vencidos')) else 0
    sd = len(os.listdir(os.path.join(V, p, 'sem-data'))) if os.path.isdir(os.path.join(V, p, 'sem-data')) else 0
    total = raiz + venc + sd
    if total > 0:
        print(f'   {p:12} raiz={raiz:3}  vencidos={venc:3}  sem-data={sd:3}  total={total}')
