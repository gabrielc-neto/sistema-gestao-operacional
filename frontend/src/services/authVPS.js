// Cliente Auth JWT próprio (VPS) — substitui Firebase Auth.
// Guarda token no localStorage, refresh automático próximo do vencimento.

const BASE = import.meta.env?.VITE_PONTUAL_API_URL || "";
const KEY_TOKEN = "pontual_auth_token";
const KEY_USER  = "pontual_auth_user";

// Estado em memória
let _token = null;
let _user  = null;
const listeners = new Set();

// Carrega da sessão anterior
try {
  _token = localStorage.getItem(KEY_TOKEN);
  const u = localStorage.getItem(KEY_USER);
  if (u) _user = JSON.parse(u);
} catch {}

function persist() {
  try {
    if (_token) localStorage.setItem(KEY_TOKEN, _token); else localStorage.removeItem(KEY_TOKEN);
    if (_user)  localStorage.setItem(KEY_USER, JSON.stringify(_user)); else localStorage.removeItem(KEY_USER);
  } catch {}
  listeners.forEach(cb => { try { cb(_user); } catch {} });
}

export function onAuthChange(cb) {
  listeners.add(cb);
  // Dispara síncrono com estado atual
  try { cb(_user); } catch {}
  return () => listeners.delete(cb);
}

export function getCurrentUser()  { return _user; }
export function getToken()        { return _token; }
export function isAuthenticated() { return !!_token; }

async function req(path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (_token) headers.Authorization = `Bearer ${_token}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body?.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export async function login(email, senha) {
  const { token, user } = await req("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, senha }),
  });
  _token = token;
  _user = user;
  persist();
  return user;
}

export async function logout() {
  _token = null;
  _user = null;
  persist();
}

export async function refreshUser() {
  if (!_token) return null;
  try {
    const { user } = await req("/api/auth/me");
    _user = user;
    persist();
    return user;
  } catch (e) {
    if (e.status === 401) { await logout(); }
    return null;
  }
}

export async function trocarSenha(senhaAtual, novaSenha) {
  await req("/api/auth/trocar-senha", {
    method: "POST",
    body: JSON.stringify({ senhaAtual, novaSenha }),
  });
  // Refresh profile pra atualizar flag trocarSenha=false
  await refreshUser();
}

// Compat com Firebase Auth API (auth.currentUser, auth.currentUser.getIdToken())
export const auth = {
  get currentUser() {
    if (!_user) return null;
    return {
      ..._user,
      uid: _user.id || _user.uid,
      getIdToken: async () => _token,
    };
  },
};
