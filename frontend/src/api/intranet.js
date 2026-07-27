// Cliente da API da intranet (PHP + PostgreSQL, na VPS).
//
// DUAS PORTAS, DUAS SESSÕES — não confundir:
//   PORTAL (/sistemas)        → palavra-chave individual, expira a cada 3 meses
//   CONFIGURAÇÕES (/intranet) → usuário e senha de administrador
//
// Os tokens são separados de propósito: um token do portal não abre o painel.
// Quem decide qualquer coisa é o servidor — aqui só guardamos e mandamos.
//
// Em produção a SPA é servida pela raiz do web-homol e a API vive em
// /intranet-api do mesmo host: mesma origem, sem CORS. Em dev, o proxy do Vite
// encaminha para lá (ver vite.config.js).

const BASE = "/intranet-api";

const K_PORTAL = "intranet_portal";
const K_ADMIN = "intranet_admin";

export const tokenPortal = () => sessionStorage.getItem(K_PORTAL);
export const tokenAdmin = () => sessionStorage.getItem(K_ADMIN);
export const guardarPortal = (t) => sessionStorage.setItem(K_PORTAL, t);
export const guardarAdmin = (t) => sessionStorage.setItem(K_ADMIN, t);
export const limparPortal = () => sessionStorage.removeItem(K_PORTAL);
export const limparAdmin = () => sessionStorage.removeItem(K_ADMIN);

async function post(corpo) {
  let r;
  try {
    r = await fetch(`${BASE}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });
  } catch {
    // Rede fora, DNS, servidor caído — o fetch rejeita antes de haver resposta.
    throw new Error("Não foi possível falar com o servidor. Verifique sua conexão.");
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.erro || `Erro ${r.status}`);
  return j;
}

/** Links ativos, sem sessão. Usado só como fallback — o normal é vir do `entrar`. */
export async function linksPublicos() {
  const r = await fetch(`${BASE}/?acao=publico`);
  if (!r.ok) throw new Error("Não foi possível carregar os sistemas.");
  return (await r.json()).links || [];
}

/** Portal: valida a palavra-chave e devolve { token, nome, links }. */
export const entrarNoPortal = (keyword, coords) => post({ acao: "entrar", dados: { keyword, coords } });

/** Portal: relê nome e links com a sessão (após um F5). */
export const relerPortal = () => post({ acao: "portal", token: tokenPortal() });

/** Configurações: usuário e senha → { token, admin }. */
export const logarAdmin = (usuario, senha, coords) => post({ acao: "login", dados: { usuario, senha, coords } });

/** Qualquer ação do painel. O servidor confere o token e o nível. */
export const api = (acao, dados) => post({ acao, token: tokenAdmin(), dados });

/**
 * Validação de certificado — SEM sessão, de propósito.
 *
 * É a única chamada daqui que traz dado de dentro sem nenhum token. Quem confere
 * um certificado está fora da empresa (cliente, órgão, outra transportadora) e
 * não tem palavra-chave nem conta; exigir login tornaria o validador inútil.
 * Quem protege é o código, que só está no documento, e a trava por IP no servidor.
 */
export const validarCertificado = (codigo) => post({ acao: "validarCertificado", dados: { codigo } });

/**
 * Localização de quem está entrando, sem travar a entrada.
 *
 * Quem negar a permissão (ou usar aparelho sem GPS) entra do mesmo jeito, e o
 * acesso fica registrado como "negada" — bloquear por isto trancaria gente para
 * fora por configuração de navegador. E a coordenada vem daqui, do cliente: é
 * forjável, então vale como conveniência. Quem sustenta a auditoria é o IP, que
 * o servidor observa sozinho.
 */
export function pedirLocalizacao() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    const desiste = setTimeout(() => resolve(null), 8000);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        clearTimeout(desiste);
        resolve({ lat: p.coords.latitude, lng: p.coords.longitude, precisao: p.coords.accuracy });
      },
      () => { clearTimeout(desiste); resolve(null); },
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 60000 },
    );
  });
}
