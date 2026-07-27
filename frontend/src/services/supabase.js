// Cliente Supabase e a chave que decide qual backend o app usa.
//
// O sistema tem DOIS backends possíveis para os mesmos dados:
//
//   "vps"      → Express + PostgreSQL na VPS (o que está no ar hoje)
//   "supabase" → Supabase (PostgREST + Auth) sobre o MESMO schema
//
// Quem escolhe é VITE_DATA_BACKEND. A troca é uma variável de ambiente, e não um
// deploy diferente, de propósito: dá para virar a chave, conferir, e voltar em
// segundos se algo não bater — sem isso, migrar seria uma aposta de mão única.
//
// O schema do Supabase é cópia fiel do da VPS (supabase/migrations/), então as
// duas pontas leem e escrevem o mesmo formato. É isso que torna a chave possível.

import { createClient } from "@supabase/supabase-js";

const URL = import.meta.env?.VITE_SUPABASE_URL || "";
const ANON = import.meta.env?.VITE_SUPABASE_ANON_KEY || "";

/** "supabase" | "vps" — default vps, que é o que está em produção. */
export const BACKEND =
  (import.meta.env?.VITE_DATA_BACKEND || "vps").toLowerCase() === "supabase" ? "supabase" : "vps";

export const usandoSupabase = () => BACKEND === "supabase";

// Cliente único. Criar mais de um faz o supabase-js reclamar (GoTrue duplicado)
// e cada instância manteria a sua própria sessão.
let _cliente = null;

export function supabase() {
  if (_cliente) return _cliente;
  if (!URL || !ANON) {
    throw new Error(
      "Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY " +
      "(ou volte VITE_DATA_BACKEND para 'vps')."
    );
  }
  _cliente = createClient(URL, ANON, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // O app é uma SPA com rotas próprias; deixar o supabase-js mexer na URL
      // atrapalharia o roteador.
      detectSessionInUrl: false,
    },
  });
  return _cliente;
}

/**
 * Traduz o nome do recurso do app para a tabela do Supabase.
 *
 * O app pede "collections/motoristas", "veiculos", "manutencoes",
 * "ordens-servico", "lancamentos-os". Os três primeiros formatos vêm de épocas
 * diferentes da migração; aqui viram tabela + filtro de coleção quando for o caso.
 *
 * Devolve { tabela, colecao } — colecao != null significa que a linha mora em
 * `documents` e precisa do filtro `collection = ...`.
 */
export function resolverRecurso(recurso) {
  const limpo = String(recurso || "").replace(/^\/+|\/+$/g, "");
  if (limpo.startsWith("collections/")) {
    return { tabela: "documents", colecao: limpo.slice("collections/".length) };
  }
  // Recursos com tabela própria. O hífen do endpoint REST vira underscore.
  return { tabela: limpo.replace(/-/g, "_"), colecao: null };
}
