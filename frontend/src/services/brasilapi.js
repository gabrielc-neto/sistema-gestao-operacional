// BrasilAPI — https://brasilapi.com.br
// 100% grátis, sem cadastro, sem cartão. Rate limit generoso.
// Cache em memória por sessão (mesma consulta = 1 chamada de rede).

const BASE = "https://brasilapi.com.br/api";

const cache = new Map();
async function get(path) {
  if (cache.has(path)) return cache.get(path);
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const err = new Error(`BrasilAPI ${res.status} ${path}`);
    err.status = res.status;
    throw err;
  }
  const json = await res.json();
  cache.set(path, json);
  return json;
}

// CNPJ (só dígitos) → razão social, endereço, sócios, atividades, IE, situação.
export async function consultarCnpj(cnpj) {
  const digits = String(cnpj || "").replace(/\D/g, "");
  if (digits.length !== 14) throw new Error("CNPJ deve ter 14 dígitos");
  return get(`/cnpj/v1/${digits}`);
}

// CEP → logradouro, bairro, cidade, UF, serviço (v2 tem coordenadas quando disponível).
export async function consultarCep(cep) {
  const digits = String(cep || "").replace(/\D/g, "");
  if (digits.length !== 8) throw new Error("CEP deve ter 8 dígitos");
  return get(`/cep/v2/${digits}`);
}

// Lista de bancos (código FEBRABAN + ISPB + nome).
export async function listarBancos() {
  return get(`/banks/v1`);
}

// DDD → UF + lista de cidades.
export async function consultarDdd(ddd) {
  const d = String(ddd || "").replace(/\D/g, "");
  if (d.length !== 2) throw new Error("DDD deve ter 2 dígitos");
  return get(`/ddd/v1/${d}`);
}

// Feriados nacionais do ano.
export async function feriadosNacionais(ano = new Date().getFullYear()) {
  return get(`/feriados/v1/${ano}`);
}

// Cotação de moeda (USD, EUR, GBP) na data (YYYY-MM-DD). Default hoje.
export async function cotacaoMoeda(moeda = "USD", data = null) {
  const d = data || new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return get(`/cambio/v1/cotacao/${moeda}/${d}`);
}

// FIPE — marcas por tipo (carros | motos | caminhoes).
export async function fipeMarcas(tipo = "caminhoes") {
  return get(`/fipe/marcas/v1/${tipo}`);
}

// FIPE — preço médio por código FIPE (ex "802003-1").
export async function fipePreco(codigoFipe) {
  if (!codigoFipe) throw new Error("codigoFipe obrigatório");
  return get(`/fipe/preco/v1/${codigoFipe}`);
}
