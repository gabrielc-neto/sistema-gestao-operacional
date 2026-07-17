import json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

V = 'C:/Users/Logistica01/projetos/logistica-ia'
d = json.load(open(f'{V}/arquivo/frota-pontual/_vencimentos.json', encoding='utf-8'))

venc = [r for r in d if r['status'] == 'vencido']
venc.sort(key=lambda r: r['dias_ate_vencer'])

print('=== TOP 25 MAIS URGENTES (vencidos há mais tempo) ===')
for r in venc[:25]:
    dias = -r['dias_ate_vencer']
    dono = r['dono'][:32]
    arq = r['arquivo'][:45]
    print(f"  {r['vencimento']}  ({dias:4}d)  {r['tipo']:8} · {dono:32} · {arq}")

print()
print('=== 412 SEM DATA — por tipo ===')
sem = [r for r in d if r['status'] == 'sem_data']
por_tipo = {}
for r in sem:
    por_tipo[r['tipo']] = por_tipo.get(r['tipo'], 0) + 1
for t, n in sorted(por_tipo.items(), key=lambda x: -x[1]):
    print(f'  {t:15} {n}')
