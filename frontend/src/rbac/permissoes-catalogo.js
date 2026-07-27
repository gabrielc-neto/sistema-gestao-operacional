// Catálogo central de permissões do sistema.
// Cada permissão segue o padrão `<modulo>.<acao>`.
// É o catálogo "fonte da verdade" que alimenta:
//   - o seed do Firestore (coleção `permissoes_catalogo`)
//   - a tela de gerenciamento de permissões do cargo
//   - validações no front (botões, menus, rotas)
//
// Para adicionar nova permissão: registre aqui e rode o seed.

export const MODULOS = [
  { id: "dashboard",   label: "Dashboard" },
  { id: "frota",       label: "Frota" },
  { id: "motoristas",  label: "Motoristas" },
  { id: "atrelamento", label: "Atrelamento" },
  { id: "oc",          label: "Ordens de Carregamento" },
  { id: "manutencao",  label: "Manutenção" },
  { id: "compras",     label: "Compras" },
  { id: "ferias",      label: "Férias" },
  { id: "historico",   label: "Histórico" },
  { id: "relatorios",  label: "Relatórios" },
  { id: "financeiro",  label: "Financeiro" },
  { id: "usuarios",    label: "Usuários" },
  { id: "setores",     label: "Setores" },
  { id: "cargos",      label: "Cargos" },
  { id: "permissoes",  label: "Permissões" },
];

export const ACOES = ["ver", "criar", "editar", "excluir"];

// Catálogo completo: gera permissões `modulo.acao` para todos os módulos.
// Casos especiais (ex: `relatorios.exportar`) ficam listados no `EXTRAS`.
const EXTRAS = [
  { nome: "relatorios.exportar", descricao: "Exportar relatórios em PDF/Excel", modulo: "relatorios", acao: "exportar" },
  { nome: "financeiro.aprovar",  descricao: "Aprovar lançamentos financeiros", modulo: "financeiro", acao: "aprovar"  },
  { nome: "oc.aprovar",          descricao: "Aprovar ordens de carregamento",  modulo: "oc",         acao: "aprovar"  },
  { nome: "historico.exportar",  descricao: "Exportar histórico de auditoria", modulo: "historico",  acao: "exportar" },
  // Compras — fluxo de propostas de gastos
  { nome: "compras.ver_todos",        descricao: "Ver propostas de todos os setores",         modulo: "compras", acao: "ver_todos"        },
  { nome: "compras.aprovar_diretoria",descricao: "Validar propostas (Diretoria Executiva)",   modulo: "compras", acao: "aprovar_diretoria"},
  { nome: "compras.aprovar_super",    descricao: "Validar propostas (Superintendência)",      modulo: "compras", acao: "aprovar_super"    },
  { nome: "compras.convidar",         descricao: "Adicionar aprovadores externos por link",   modulo: "compras", acao: "convidar"         },
  { nome: "compras.registrar",        descricao: "Registrar valores comprados por setor",     modulo: "compras", acao: "registrar"        },
  { nome: "compras.dashboard",        descricao: "Ver dashboard de excedentes",               modulo: "compras", acao: "dashboard"        },
  // O módulo "intranet" saiu daqui: configurar o portal deixou de ser assunto do
  // Gestão Operacional e virou o painel em /intranet, com privilégios próprios,
  // por palavra-chave, fora do RBAC deste sistema.
  //
  // Sobra conhecida: a string "intranet.configurar" continua dentro do array
  // permissoes[] dos cargos que a tinham — o seed_rbac.py só cria, nunca remove, e
  // temPermissao é um includes() que não valida contra este catálogo. Não quebra
  // nada (ninguém mais consulta essa permissão); limpar exige editar os cargos.
];

function rotulo(modulo, acao) {
  const m = MODULOS.find(x => x.id === modulo)?.label || modulo;
  const verbo = { ver: "Visualizar", criar: "Criar", editar: "Editar", excluir: "Excluir" }[acao] || acao;
  return `${verbo} ${m}`;
}

export const PERMISSOES = (() => {
  const lista = [];
  for (const m of MODULOS) {
    for (const a of ACOES) {
      lista.push({
        nome: `${m.id}.${a}`,
        descricao: rotulo(m.id, a),
        modulo: m.id,
        acao: a,
      });
    }
  }
  return [...lista, ...EXTRAS];
})();

// Lookup por nome.
export const PERMISSOES_MAP = Object.fromEntries(PERMISSOES.map(p => [p.nome, p]));

// Agrupado por módulo (útil para renderizar a tela de gerenciamento).
export const PERMISSOES_POR_MODULO = MODULOS.map(m => ({
  modulo: m,
  itens: PERMISSOES.filter(p => p.modulo === m.id),
}));

// Permissão especial: rotas/menus que aceitam qualquer permissão do módulo.
export function permissoesDoModulo(modulo) {
  return PERMISSOES.filter(p => p.modulo === modulo).map(p => p.nome);
}
