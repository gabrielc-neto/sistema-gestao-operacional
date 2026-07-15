import os, re, glob, sys, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

V = 'C:/Users/Logistica01/projetos/logistica-ia'
os.chdir(V)

files = {}
for root, dirs, fnames in os.walk(V):
    if any(x in root for x in ['/node_modules', '/.git', 'downloads-pontual', 'pendrive-completo', '/experimentos', '/frontend', '/functions', 'CLAUDE CODE + OBSIDIAN']):
        continue
    for fn in fnames:
        if fn.endswith('.md'):
            base = fn[:-3]
            rel = os.path.relpath(os.path.join(root, fn), V).replace(os.sep, '/')
            files[base] = rel

mem_arquivos = sorted(f for f in files if 'memoria/' in files[f] and f not in ('MEMORY', 'README'))
convs = sorted(f for f in files if 'conversas-claude/' in files[f])
print(f'Coletados: {len(files)} arquivos .md, {len(mem_arquivos)} memorias, {len(convs)} conversas')

# INDICE — adiciona seções massivas
indice_path = f'{V}/INDICE.md'
with open(indice_path, encoding='utf-8') as fp:
    indice_c = fp.read()

extras = []
if 'Todas as memorias' not in indice_c:
    extras.append('\n## Todas as memorias\n')
    grupos = {'user': [], 'project': [], 'feedback': [], 'reference': []}
    for m in mem_arquivos:
        matched = False
        for pref in grupos:
            if m.startswith(pref):
                grupos[pref].append(m)
                matched = True
                break
        if not matched:
            grupos['project'].append(m)
    labels = {'user':'Usuario','project':'Projeto','feedback':'Feedback','reference':'Referencia'}
    for k in ['user','project','feedback','reference']:
        if grupos[k]:
            extras.append(f'\n### {labels[k]} ({len(grupos[k])})')
            extras.append('')
            for m in grupos[k]:
                extras.append(f'- [[{m}]]')
    extras.append('')

if 'Todas as conversas' not in indice_c:
    extras.append('\n## Todas as conversas Claude\n')
    for c in convs:
        titulo_curto = c[:20]
        extras.append(f'- [[{c}|{titulo_curto}]]')
    extras.append('')

if extras:
    with open(indice_path, 'a', encoding='utf-8') as out:
        out.write('\n'.join(extras))
    print(f'INDICE.md ganhou {len(mem_arquivos)} memorias + {len(convs)} conversas')

# Cross-links dentro de cada categoria
count = 0
for prefixo in ['project', 'feedback', 'reference']:
    grupo = [f for f in mem_arquivos if f.startswith(prefixo)]
    if len(grupo) < 2: continue
    for f in grupo[:40]:
        path = f'{V}/{files[f]}'
        try:
            c = open(path, encoding='utf-8').read()
        except: continue
        if 'Mesma categoria' in c: continue
        outros = [x for x in grupo if x != f][:5]
        if not outros: continue
        with open(path, 'a', encoding='utf-8') as out:
            out.write(f'\n\n## Mesma categoria ({prefixo})\n\n')
            out.write(' | '.join(f'[[{x}]]' for x in outros) + '\n')
        count += 1
print(f'{count} memorias ganharam links "Mesma categoria"')

# Mede grafo final
total_links = 0
for f_key, rel in files.items():
    try:
        c = open(f'{V}/{rel}', encoding='utf-8', errors='ignore').read()
        total_links += len(re.findall(r'\[\[[^\]]+\]\]', c))
    except: pass
print(f'\nRESULTADO:')
print(f'  Nodes:    {len(files)}')
print(f'  Links:    {total_links}')
print(f'  Media:    {total_links/max(1,len(files)):.1f} links/arquivo')
