"""
Unifica tudo em frota-pontual/ (sem Motoristas/Veiculos/Desligados)
+ renomeia arquivos e pastas pra CAIXA ALTA.
"""
import os, sys, io, shutil
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE = 'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual'

# 1) Move tudo de Motoristas/, Veiculos/, Desligados/ pra raiz
categorias = ['Motoristas', 'Veiculos', 'Desligados']
movidos_pastas = 0
for cat in categorias:
    src_dir = os.path.join(BASE, cat)
    if not os.path.isdir(src_dir): continue
    for sub in list(os.listdir(src_dir)):
        src = os.path.join(src_dir, sub)
        if not os.path.isdir(src): continue
        # Marca desligados
        nome_novo = sub.upper()
        if cat == 'Desligados' and 'DESLIGADO' not in nome_novo:
            nome_novo = f'{nome_novo} (DESLIGADO)'
        dst = os.path.join(BASE, nome_novo)
        # Se já existe no destino, mescla o conteúdo
        if os.path.exists(dst):
            for item in os.listdir(src):
                s = os.path.join(src, item)
                d = os.path.join(dst, item)
                if os.path.exists(d):
                    if os.path.isdir(s):
                        # mescla subpasta
                        for f in os.listdir(s):
                            shutil.move(os.path.join(s, f), os.path.join(d, f))
                        os.rmdir(s)
                    else:
                        stem, ext = os.path.splitext(item)
                        i = 2
                        while os.path.exists(os.path.join(dst, f'{stem} ({i}){ext}')):
                            i += 1
                        shutil.move(s, os.path.join(dst, f'{stem} ({i}){ext}'))
                else:
                    shutil.move(s, d)
            os.rmdir(src) if not os.listdir(src) else None
        else:
            shutil.move(src, dst)
            movidos_pastas += 1
    # Remove categoria vazia
    try: os.rmdir(src_dir)
    except: pass

print(f'✅ Pastas movidas pra raiz: {movidos_pastas}')

# 2) Renomeia TUDO em CAIXA ALTA (arquivos + pastas)
renomeados = 0
# Anda de baixo pra cima pra renomear arquivos antes de pastas
for root, dirs, files in os.walk(BASE, topdown=False):
    for f in files:
        if f.startswith('.') or f.startswith('_'): continue
        src = os.path.join(root, f)
        f_upper = f.upper()
        if f == f_upper: continue
        dst = os.path.join(root, f_upper)
        if os.path.exists(dst) and dst != src:
            # colisão (case-insensitive) — sufixa
            stem, ext = os.path.splitext(f_upper)
            i = 2
            while os.path.exists(os.path.join(root, f'{stem} ({i}){ext}')):
                i += 1
            dst = os.path.join(root, f'{stem} ({i}){ext}')
        try:
            os.rename(src, dst)
            renomeados += 1
        except: pass
    for d in dirs:
        # Só maiusculiza subpastas vencidos/sem-data
        if d.lower() in ('vencidos', 'sem-data'):
            src = os.path.join(root, d)
            dst = os.path.join(root, d.upper().replace('-', '_'))
            if src != dst and not os.path.exists(dst):
                try:
                    os.rename(src, dst)
                    renomeados += 1
                except: pass

print(f'✅ Arquivos/pastas renomeados p/ CAIXA ALTA: {renomeados}')

# 3) Resumo
raiz = sorted([d for d in os.listdir(BASE) if os.path.isdir(os.path.join(BASE, d))])
print()
print(f'📁 TOTAL pastas na raiz: {len(raiz)}')
print()
print('Amostra (10 primeiras):')
for d in raiz[:10]:
    itens = os.listdir(os.path.join(BASE, d))
    print(f'   {d}  ({len(itens)} itens)')
print(f'...')
print()
print('Estrutura de uma pasta exemplo:')
if raiz:
    exemplo = raiz[0]
    for item in os.listdir(os.path.join(BASE, exemplo)):
        print(f'   {exemplo}/{item}')
