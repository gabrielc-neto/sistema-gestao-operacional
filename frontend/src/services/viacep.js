// ViaCEP — https://viacep.com.br
// Fallback quando BrasilAPI cai. Também 100% grátis, sem cadastro.

const BASE = "https://viacep.com.br/ws";
const cache = new Map();

// CEP → { cep, logradouro, bairro, localidade (cidade), uf, ddd, ibge }
export async function consultarCep(cep) {
  const digits = String(cep || "").replace(/\D/g, "");
  if (digits.length !== 8) throw new Error("CEP deve ter 8 dígitos");
  if (cache.has(digits)) return cache.get(digits);
  const res = await fetch(`${BASE}/${digits}/json/`);
  if (!res.ok) throw new Error(`ViaCEP ${res.status}`);
  const json = await res.json();
  if (json.erro) throw new Error(`CEP ${digits} não encontrado`);
  cache.set(digits, json);
  return json;
}

// Busca reversa: UF + cidade + logradouro parcial → lista de CEPs correspondentes.
export async function buscarLogradouro(uf, cidade, logradouro) {
  if (!uf || !cidade || !logradouro || logradouro.length < 3) return [];
  const url = `${BASE}/${uf}/${encodeURIComponent(cidade)}/${encodeURIComponent(logradouro)}/json/`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json) ? json : [];
}
