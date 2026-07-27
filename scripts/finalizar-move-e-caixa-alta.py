"""
1. Completa o move de Veiculos/ e Desligados/ pra raiz (Motoristas já foi)
2. Renomeia TUDO em CAIXA ALTA
"""
import os, sys, io, shutil
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE = 'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual'

def mover_pra_raiz(subdir, marca=''):
    src_dir = os.path.join(BASE, subdir)
    if not os.path.isdir(src_dir): return 0
    movidos = 0
    for sub in list(os.listdir(src_dir)):
        src = os.path.join(src_dir, sub)
        if not os.path.isdir(src): continue
        nome = sub.upper()
        if marca and marca not in nome:
            nome = f'{nome} ({marca})'
        dst = os.path.join(BASE, nome)
        if os.path.exists(dst):
            # mescla
            for item in os.listdir(src):
                s = os.path.join(src, item)
                d = os.path.join(dst, item)
                if os.path.isdir(s) and os.path.isdir(d):
                    for f in os.listdir(s):
                        try:
                            shutil.move(os.path.join(s, f), os.path.join(d, f))
                        except Exception as e:
                            pass
                    try: os.rmdir(s)
                    except: pass
                elif not os.path.exists(d):
                    try: shutil.move(s, d)
                    except: pass
            try: os.rmdir(src)
            except: pass
        else:
            try:
                shutil.move(src, dst)
                movidos += 1
            except Exception as e:
                print(f'  ! falhou: {sub} — {e}')
    try: os.rmdir(src_dir)
    except: pass
    return movidos

print('=== 1. Completar move ===')
n = mover_pra_raiz('Veiculos')
print(f'   Veiculos/ → raiz: {n}')
n = mover_pra_raiz('Desligados', marca='DESLIGADO')
print(f'   Desligados/ → raiz: {n}')

# 2. CAIXA ALTA
print()
print('=== 2. CAIXA ALTA em tudo ===')
renomeados_arq = 0
renomeados_pasta = 0
# Bottom-up
for root, dirs, files in os.walk(BASE, topdown=False):
    for f in files:
        if f.startswith('_'): continue  # não mexe em _vencimentos.json etc
        src = os.path.join(root, f)
        f_up = f.upper()
        if f == f_up: continue
        dst = os.path.join(root, f_up)
        if src.lower() != dst.lower() and os.path.exists(dst):
            stem, ext = os.path.splitext(f_up)
            i = 2
            while os.path.exists(os.path.join(root, f'{stem} ({i}){ext}')):
                i += 1
            dst = os.path.join(root, f'{stem} ({i}){ext}')
        try:
            os.rename(src, dst)
            renomeados_arq += 1
        except: pass
    for d in dirs:
        src = os.path.join(root, d)
        # Só as subpastas vencidos/sem-data (nomes de placa/motorista já em maiúsculo)
        if d.lower() in ('vencidos', 'sem-data'):
            dst = os.path.join(root, d.upper().replace('-', '_'))
            if src.lower() != dst.lower():
                try:
                    os.rename(src, dst)
                    renomeados_pasta += 1
                except: pass
        elif d != d.upper():
            dst = os.path.join(root, d.upper())
            if not os.path.exists(dst):
                try:
                    os.rename(src, dst)
                    renomeados_pasta += 1
                except: pass

print(f'   Arquivos renomeados: {renomeados_arq}')
print(f'   Pastas renomeadas:   {renomeados_pasta}')

# Resumo final
print()
print('=== ESTADO FINAL ===')
raiz = sorted([d for d in os.listdir(BASE) if os.path.isdir(os.path.join(BASE, d))])
print(f'Total pastas na raiz: {len(raiz)}')
print()
print('Amostra:')
for d in raiz[:15]:
    print(f'   {d}')
print('...')
