// Autenticação pelo Supabase Auth.
//
// Expõe EXATAMENTE a mesma interface de services/authVPS.js — onAuthChange,
// getCurrentUser, getToken, isAuthenticated, login, logout, refreshUser,
// trocarSenha. É o que permite ao AuthContext escolher um ou outro por uma
// variável de ambiente, sem que nenhuma tela perceba a diferença.
//
// O que muda por baixo: senha, sessão e refresh deixam de ser código nosso e
// passam a ser do Supabase. O JWT que ele emite é o mesmo que o PostgREST usa
// para aplicar o RLS — ou seja, autenticar aqui é o que libera a leitura dos
// dados. Sem login, o banco não devolve nada (ver as políticas na migração).
//
// O usuário exposto mantém o formato que o app já espera: { uid, id, email,
// nome, setor_id, cargo_id, is_super_admin, ativo } — o `uid` existe porque
// telas herdadas do Firebase ainda leem `user.uid`.

import { supabase } from "./supabase";

const listeners = new Set();
let _user = null;
let _inscrito = false;

/** Linha de `perfis` + conta do Auth → o usuário que o app conhece. */
function montarUsuario(conta, perfil) {
  if (!conta) return null;
  return {
    uid: conta.id,
    id: conta.id,
    email: conta.email || perfil?.email || "",
    nome: perfil?.nome || conta.user_metadata?.nome || conta.email || "",
    setor_id: perfil?.setor_id ?? null,
    cargo_id: perfil?.cargo_id ?? null,
    is_super_admin: !!perfil?.is_super_admin,
    ativo: perfil?.ativo !== false,
  };
}

async function carregarPerfil(conta) {
  if (!conta) return null;
  const { data } = await supabase().from("perfis").select("*").eq("id", conta.id).maybeSingle();
  return montarUsuario(conta, data);
}

function avisar() {
  listeners.forEach((cb) => { try { cb(_user); } catch { /* um listener quebrado não derruba os outros */ } });
}

/**
 * Assina mudanças de sessão.
 *
 * Dispara síncrono com o estado atual (contrato do authVPS: o AuthContext conta
 * com isso para sair do "carregando") e depois a cada login/logout/refresh.
 */
export function onAuthChange(cb) {
  listeners.add(cb);
  try { cb(_user); } catch { /* idem */ }

  if (!_inscrito) {
    _inscrito = true;
    // Sessão já existente (recarregou a página com token válido no storage).
    supabase().auth.getSession().then(async ({ data }) => {
      _user = await carregarPerfil(data?.session?.user || null);
      avisar();
    });
    supabase().auth.onAuthStateChange(async (_evento, sessao) => {
      _user = await carregarPerfil(sessao?.user || null);
      avisar();
    });
  }
  return () => listeners.delete(cb);
}

export function getCurrentUser() { return _user; }
export function isAuthenticated() { return !!_user; }

export async function getToken() {
  const { data } = await supabase().auth.getSession();
  return data?.session?.access_token || null;
}

export async function login(email, senha) {
  const { data, error } = await supabase().auth.signInWithPassword({ email, password: senha });
  if (error) throw new Error(traduzir(error.message));

  const usuario = await carregarPerfil(data.user);
  // Conta desativada não entra — mesma regra do authVPS. Encerrar a sessão logo
  // aqui evita que ela fique válida no navegador até o token vencer.
  if (usuario && usuario.ativo === false) {
    await supabase().auth.signOut();
    throw new Error("Esta conta está desativada. Contate o administrador.");
  }
  _user = usuario;
  avisar();

  // Carimba o último acesso sem travar o login se falhar — é registro, não regra.
  if (usuario) {
    supabase().from("perfis").update({ ultimo_login: new Date().toISOString() })
      .eq("id", usuario.id).then(() => {}, () => {});
  }
  return usuario;
}

export async function logout() {
  await supabase().auth.signOut();
  _user = null;
  avisar();
}

/** Relê o perfil (cargo/setor podem ter mudado enquanto a sessão estava aberta). */
export async function refreshUser() {
  const { data } = await supabase().auth.getSession();
  _user = await carregarPerfil(data?.session?.user || null);
  avisar();
  return _user;
}

export async function trocarSenha(novaSenha) {
  const { error } = await supabase().auth.updateUser({ password: novaSenha });
  if (error) throw new Error(error.message);
  return { ok: true };
}

// As mensagens do Supabase vêm em inglês e vazam detalhe demais para uma tela de
// login. Mensagem única para usuário inexistente e senha errada, como no resto
// do sistema: dizer qual dos dois falhou entrega a lista de e-mails válidos.
function traduzir(msg = "") {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "E-mail ainda não confirmado.";
  if (m.includes("too many requests") || m.includes("rate limit")) {
    return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
  }
  return msg || "Não foi possível entrar.";
}
