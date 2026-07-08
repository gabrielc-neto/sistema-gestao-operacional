"""
Seed inicial do RBAC: setores, cargos, permissoes_catalogo.

Rodar UMA VEZ apos baixar serviceAccountKey.json (gerar em
Firebase Console > Configuracoes > Contas de servico).

Uso:
    python scripts/seed_rbac.py

O script eh idempotente: pode ser rodado de novo sem duplicar dados.
"""
import sys, os
sys.stdout.reconfigure(encoding="utf-8")

SERVICE_ACCOUNT = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")

# ---------------------------------------------------------------
# Catalogo de permissoes (deve espelhar frontend/src/rbac/permissoes-catalogo.js)
# ---------------------------------------------------------------
MODULOS = [
    ("dashboard",   "Dashboard"),
    ("frota",       "Frota"),
    ("motoristas",  "Motoristas"),
    ("atrelamento", "Atrelamento"),
    ("oc",          "Ordens de Carregamento"),
    ("manutencao",  "Manutencao"),
    ("compras",     "Compras"),
    ("ferias",      "Ferias"),
    ("historico",   "Historico"),
    ("relatorios",  "Relatorios"),
    ("financeiro",  "Financeiro"),
    ("usuarios",    "Usuarios"),
    ("setores",     "Setores"),
    ("cargos",      "Cargos"),
    ("permissoes",  "Permissoes"),
]
ACOES = ["ver", "criar", "editar", "excluir"]
VERBO = {"ver": "Visualizar", "criar": "Criar", "editar": "Editar", "excluir": "Excluir"}
EXTRAS = [
    ("relatorios.exportar", "Exportar relatorios em PDF/Excel", "relatorios", "exportar"),
    ("financeiro.aprovar",  "Aprovar lancamentos financeiros",  "financeiro", "aprovar"),
    ("oc.aprovar",          "Aprovar ordens de carregamento",   "oc",         "aprovar"),
    ("historico.exportar",  "Exportar historico de auditoria",  "historico",  "exportar"),
    ("compras.ver_todos",         "Ver propostas de todos os setores",       "compras", "ver_todos"),
    ("compras.aprovar_diretoria", "Validar propostas (Diretoria Executiva)", "compras", "aprovar_diretoria"),
    ("compras.aprovar_super",     "Validar propostas (Superintendencia)",    "compras", "aprovar_super"),
    ("compras.convidar",          "Adicionar aprovadores externos por link", "compras", "convidar"),
    ("compras.registrar",         "Registrar valores comprados por setor",   "compras", "registrar"),
    ("compras.dashboard",         "Ver dashboard de excedentes",             "compras", "dashboard"),
]

def build_permissoes():
    lista = []
    for mid, mlabel in MODULOS:
        for acao in ACOES:
            lista.append({
                "nome": f"{mid}.{acao}",
                "descricao": f"{VERBO[acao]} {mlabel}",
                "modulo": mid,
                "acao": acao,
            })
    for nome, desc, mod, acao in EXTRAS:
        lista.append({"nome": nome, "descricao": desc, "modulo": mod, "acao": acao})
    return lista

# ---------------------------------------------------------------
# Setores e cargos iniciais (exemplos do txt original)
# ---------------------------------------------------------------
SETORES = [
    {"nome": "Logistica",   "descricao": "Operacao logistica e despacho"},
    {"nome": "Operacao",    "descricao": "Operacao de campo"},
    {"nome": "RH",          "descricao": "Recursos humanos"},
    {"nome": "Financeiro",  "descricao": "Financeiro e cobranca"},
    {"nome": "Comercial",   "descricao": "Vendas e relacionamento com cliente"},
    {"nome": "Faturamento", "descricao": "Emissao de notas e conciliacao"},
    {"nome": "Diretoria",        "descricao": "Diretoria Executiva"},
    {"nome": "Superintendencia", "descricao": "Superintendencia"},
    {"nome": "Compras",          "descricao": "Setor de compras e suprimentos"},
]

# Templates de permissoes por tipo de cargo
PERM_GESTOR = [
    # Tudo da operacao + admin parcial
    *[f"{m}.{a}" for m, _ in MODULOS for a in ACOES
      if m in ("dashboard","frota","motoristas","atrelamento","oc","manutencao","ferias","historico","relatorios")],
    "relatorios.exportar", "oc.aprovar",
    # Compras: gestor cria/edita/ve propostas do PROPRIO setor (sem ver_todos)
    "compras.ver", "compras.criar", "compras.editar",
]

# ---- Cargos do fluxo de Compras ----
PERM_DIRETORIA = [
    "dashboard.ver", "historico.ver",
    "compras.ver", "compras.ver_todos",
    "compras.aprovar_diretoria", "compras.convidar", "compras.dashboard",
]
PERM_SUPERINTENDENCIA = [
    "dashboard.ver", "historico.ver",
    "compras.ver", "compras.ver_todos",
    "compras.aprovar_super", "compras.convidar", "compras.dashboard",
]
PERM_COMPRAS = [
    "dashboard.ver", "relatorios.ver",
    "compras.ver", "compras.ver_todos",
    "compras.registrar", "compras.dashboard",
]
PERM_SUPERVISOR = [
    *[f"{m}.{a}" for m, _ in MODULOS for a in ("ver","criar","editar")
      if m in ("dashboard","frota","motoristas","atrelamento","oc","manutencao","ferias","historico","relatorios")],
]
PERM_ASSISTENTE = [
    *[f"{m}.ver"    for m, _ in MODULOS
      if m in ("dashboard","frota","motoristas","atrelamento","oc","ferias","historico","relatorios")],
    "oc.criar", "oc.editar",
]
PERM_FINANCEIRO = [
    "dashboard.ver",
    *[f"financeiro.{a}" for a in ACOES],
    "financeiro.aprovar",
    "relatorios.ver", "relatorios.exportar",
    "historico.ver",
]
PERM_RH = [
    "dashboard.ver",
    *[f"motoristas.{a}" for a in ACOES],
    *[f"ferias.{a}"     for a in ACOES],
    "historico.ver",
    "relatorios.ver",
]
PERM_COMERCIAL = [
    "dashboard.ver",
    "oc.ver", "relatorios.ver",
]
PERM_FATURAMENTO = [
    "dashboard.ver",
    "oc.ver", "oc.editar", "oc.aprovar",
    "relatorios.ver", "relatorios.exportar",
    "historico.ver",
]
PERM_MOTORISTA = [
    "dashboard.ver",
]

CARGOS = [
    # Logistica
    {"setor": "Logistica", "nome": "Gestor",       "nivel": 5, "permissoes": PERM_GESTOR},
    {"setor": "Logistica", "nome": "Supervisor",   "nivel": 4, "permissoes": PERM_SUPERVISOR},
    {"setor": "Logistica", "nome": "Assistente",   "nivel": 2, "permissoes": PERM_ASSISTENTE},
    # Operacao
    {"setor": "Operacao",  "nome": "Gestor",       "nivel": 5, "permissoes": PERM_GESTOR},
    {"setor": "Operacao",  "nome": "Coordenador",  "nivel": 4, "permissoes": PERM_SUPERVISOR},
    {"setor": "Operacao",  "nome": "Operador",     "nivel": 2, "permissoes": PERM_ASSISTENTE},
    # RH
    {"setor": "RH",        "nome": "Gestor",       "nivel": 5, "permissoes": PERM_RH + ["usuarios.ver"]},
    {"setor": "RH",        "nome": "Analista",     "nivel": 3, "permissoes": PERM_RH},
    # Financeiro
    {"setor": "Financeiro","nome": "Gestor",       "nivel": 5, "permissoes": PERM_FINANCEIRO},
    {"setor": "Financeiro","nome": "Analista",     "nivel": 3, "permissoes": [p for p in PERM_FINANCEIRO if not p.endswith(".excluir") and p != "financeiro.aprovar"]},
    # Comercial
    {"setor": "Comercial", "nome": "Vendedor",     "nivel": 3, "permissoes": PERM_COMERCIAL},
    # Faturamento
    {"setor": "Faturamento","nome": "Analista",    "nivel": 3, "permissoes": PERM_FATURAMENTO},
    # Diretoria Executiva — valida propostas (instancia 1)
    {"setor": "Diretoria",        "nome": "Diretor Executivo", "nivel": 6, "permissoes": PERM_DIRETORIA},
    # Superintendencia — valida propostas (instancia 2)
    {"setor": "Superintendencia", "nome": "Superintendente",   "nivel": 6, "permissoes": PERM_SUPERINTENDENCIA},
    # Compras — registra valores comprados
    {"setor": "Compras",          "nome": "Gestor de Compras", "nivel": 5, "permissoes": PERM_COMPRAS},
    {"setor": "Compras",          "nome": "Analista de Compras","nivel": 3, "permissoes": PERM_COMPRAS},
]

# ---------------------------------------------------------------
# Setup Firebase Admin
# ---------------------------------------------------------------
try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    print("Instalando firebase-admin...")
    os.system(f"{sys.executable} -m pip install firebase-admin")
    import firebase_admin
    from firebase_admin import credentials, firestore

if not os.path.exists(SERVICE_ACCOUNT):
    print(f"ERRO: {SERVICE_ACCOUNT} nao encontrado.")
    print("Baixe em: Firebase Console > Configuracoes > Contas de servico > Gerar nova chave privada")
    sys.exit(1)

cred = credentials.Certificate(SERVICE_ACCOUNT)
firebase_admin.initialize_app(cred)
db = firestore.client()
SERVER_TS = firestore.SERVER_TIMESTAMP

# ---------------------------------------------------------------
# 1) Catalogo de permissoes (id = nome.da.permissao)
# ---------------------------------------------------------------
print("\n[1/3] Seed do catalogo de permissoes...")
permissoes = build_permissoes()
for p in permissoes:
    ref = db.collection("permissoes_catalogo").document(p["nome"])
    if not ref.get().exists:
        ref.set({**p, "created_at": SERVER_TS})
        print(f"  + {p['nome']}")
    else:
        print(f"  = {p['nome']} (ja existe)")
print(f"Total: {len(permissoes)} permissoes")

# ---------------------------------------------------------------
# 2) Setores (id auto, lookup por nome)
# ---------------------------------------------------------------
print("\n[2/3] Seed de setores...")
setores_existentes = {d.to_dict()["nome"]: d.id for d in db.collection("setores").stream()}
setores_map = dict(setores_existentes)  # nome -> id

for setor in SETORES:
    if setor["nome"] in setores_existentes:
        print(f"  = Setor '{setor['nome']}' ja existe -> {setores_existentes[setor['nome']]}")
        continue
    ref = db.collection("setores").document()
    ref.set({
        "nome":       setor["nome"],
        "descricao":  setor["descricao"],
        "status":     "ativo",
        "created_at": SERVER_TS,
        "updated_at": SERVER_TS,
    })
    setores_map[setor["nome"]] = ref.id
    print(f"  + Setor '{setor['nome']}' criado -> {ref.id}")

# ---------------------------------------------------------------
# 3) Cargos (id auto, lookup por nome+setor)
# ---------------------------------------------------------------
print("\n[3/3] Seed de cargos...")
cargos_existentes = {}
for d in db.collection("cargos").stream():
    data = d.to_dict()
    key = f"{data.get('setor_id')}::{data.get('nome')}"
    cargos_existentes[key] = d.id

for cargo in CARGOS:
    setor_id = setores_map.get(cargo["setor"])
    if not setor_id:
        print(f"  ! Pulando '{cargo['nome']}': setor '{cargo['setor']}' nao encontrado")
        continue
    key = f"{setor_id}::{cargo['nome']}"
    if key in cargos_existentes:
        # Atualiza apenas permissoes (mantem o resto)
        db.collection("cargos").document(cargos_existentes[key]).update({
            "permissoes": cargo["permissoes"],
            "updated_at": SERVER_TS,
        })
        print(f"  = Cargo '{cargo['setor']} / {cargo['nome']}' atualizado (permissoes)")
        continue
    ref = db.collection("cargos").document()
    ref.set({
        "setor_id":   setor_id,
        "nome":       cargo["nome"],
        "nivel":      cargo["nivel"],
        "descricao":  "",
        "status":     "ativo",
        "permissoes": cargo["permissoes"],
        "created_at": SERVER_TS,
        "updated_at": SERVER_TS,
    })
    print(f"  + Cargo '{cargo['setor']} / {cargo['nome']}' criado -> {ref.id}")

print("\nPronto! Seed do RBAC concluido com sucesso.")
print("\nProximos passos:")
print("  1. Edite usuarios em /usuarios e atribua Setor + Cargo")
print("  2. Marque pelo menos um usuario como is_super_admin = true")
print("  3. Ajuste permissoes dos cargos em /admin/cargos")
