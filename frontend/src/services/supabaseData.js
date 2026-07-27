// Tradução das chamadas do app para o Supabase.
//
// O app fala o dialeto da API da VPS (list/get/create/update/remove sobre
// "collections/<nome>" e sobre tabelas próprias). Este arquivo traduz isso para
// PostgREST, devolvendo EXATAMENTE o mesmo formato — é o que permite virar a
// chave VITE_DATA_BACKEND sem tocar em nenhuma tela.
//
// Duas famílias de recurso, com regras diferentes:
//
//   collections/<nome> → linha em `documents`, com o documento dentro de `data`
//                        (JSONB). Filtro, ordenação e merge acontecem sobre o
//                        JSON, não sobre colunas.
//   veiculos, manutencoes, ordens-servico, lancamentos-os → tabela própria,
//                        colunas de verdade.

import { supabase, resolverRecurso } from "./supabase";

/** Erro no mesmo formato que o cliente da VPS produz (tem .status). */
function erro(msg, status) {
  const e = new Error(msg);
  e.status = status;
  return e;
}

function conferir({ data, error }, ondeStatus) {
  if (error) throw erro(error.message || "Falha no Supabase", ondeStatus ?? 500);
  return data;
}

/** Linha de `documents` → { id, ...data }, como a API da VPS devolve. */
function achatar(row) {
  if (!row) return null;
  return {
    id: row.id,
    ...(row.data || {}),
    createdAt: row.data?.createdAt || row.created_at,
    updatedAt: row.data?.updatedAt || row.updated_at,
  };
}

export async function list(recurso, query = {}) {
  const { tabela, colecao } = resolverRecurso(recurso);
  const { orderBy, order, limit, ...resto } = query;
  const asc = String(order || "asc").toLowerCase() !== "desc";
  const teto = Math.min(Number(limit) || 5000, 20000);

  let q = supabase().from(tabela).select("*");

  if (colecao !== null) {
    q = q.eq("collection", colecao);
    // Filtros chegam como "where.placa": ABC-1234 — o mesmo formato de query
    // string que a rota da VPS entende. Aqui viram filtro sobre o JSON.
    for (const [chave, valor] of Object.entries(resto)) {
      if (!chave.startsWith("where.") || valor == null || valor === "") continue;
      q = q.eq(`data->>${chave.slice(6)}`, String(valor));
    }
    // Ordenar por campo do JSON. Sem orderBy a VPS ordena por id — repetimos,
    // senão a ordem das listas mudaria só por trocar de backend.
    q = orderBy ? q.order(`data->>${orderBy}`, { ascending: asc }) : q.order("id", { ascending: true });
  } else {
    for (const [chave, valor] of Object.entries(resto)) {
      if (valor == null || valor === "") continue;
      q = q.eq(chave.startsWith("where.") ? chave.slice(6) : chave, valor);
    }
    if (orderBy) q = q.order(orderBy, { ascending: asc });
  }

  const linhas = conferir(await q.limit(teto)) || [];
  return colecao !== null ? linhas.map(achatar) : linhas;
}

export async function get(recurso, id) {
  const { tabela, colecao } = resolverRecurso(recurso);
  let q = supabase().from(tabela).select("*").eq("id", id);
  if (colecao !== null) q = q.eq("collection", colecao);

  // maybeSingle: "não achou" volta null em vez de erro — a VPS responde 404, e
  // quem chama já trata isso.
  const linha = conferir(await q.maybeSingle());
  if (!linha) throw erro("not_found", 404);
  return colecao !== null ? achatar(linha) : linha;
}

export async function create(recurso, payload) {
  const { tabela, colecao } = resolverRecurso(recurso);

  if (colecao !== null) {
    // id opcional: sem ele, a VPS sorteia um UUID. Mesmo comportamento aqui.
    const id = payload?.id || crypto.randomUUID();
    // O merge roda no banco, numa instrução só (ver documento_merge na migração).
    const data = conferir(await supabase().rpc("documento_merge", {
      p_colecao: colecao, p_id: String(id), p_patch: payload || {}, p_substituir: false,
    }));
    return data;
  }

  const linha = conferir(await supabase().from(tabela).insert(payload).select().single());
  return linha;
}

export async function update(recurso, id, patch) {
  const { tabela, colecao } = resolverRecurso(recurso);

  if (colecao !== null) {
    const data = conferir(await supabase().rpc("documento_merge", {
      p_colecao: colecao, p_id: String(id), p_patch: patch || {}, p_substituir: false,
    }));
    return data;
  }

  const linha = conferir(await supabase().from(tabela).update(patch).eq("id", id).select().maybeSingle());
  if (!linha) throw erro("not_found", 404);
  return linha;
}

export async function remove(recurso, id) {
  const { tabela, colecao } = resolverRecurso(recurso);
  let q = supabase().from(tabela).delete().eq("id", id);
  if (colecao !== null) q = q.eq("collection", colecao);
  conferir(await q);
  return { ok: true };
}
