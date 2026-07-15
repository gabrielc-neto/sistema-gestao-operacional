// ANP — Preços médios de combustíveis por município (dados.gov.br).
// A ANP publica semanalmente CSV com pesquisa de preços em ~500 municípios.
// Não há endpoint JSON oficial; a estratégia usada aqui é:
//   1) buscar CSV atual via CKAN (dados.gov.br) — API oficial
//   2) parse leve em memória (papa-less), com cache diário
//
// Docs CKAN: https://dados.gov.br/api/publico/conjuntos-dados/serie-historica-de-precos-de-combustiveis-e-de-glp
// Se o link mudar, atualize `CKAN_PACKAGE_ID` abaixo.

const CKAN_BASE = "https://dados.gov.br/api/3/action";
const PACKAGE_ID = "serie-historica-de-precos-de-combustiveis-e-de-glp";

let cacheMeta = null;    // { atualizadoEm, resources: [{url, name}] }
let cachePrecos = null;  // Map<`${uf}|${municipio}|${combustivel}`, {media, min, max, coleta}>

// Retorna URL do CSV mais recente da série histórica (últimos 2 anos costumam ser o resource mais novo).
async function urlCsvMaisRecente() {
  if (cacheMeta) return cacheMeta;
  const res = await fetch(`${CKAN_BASE}/package_show?id=${PACKAGE_ID}`);
  if (!res.ok) throw new Error(`CKAN ANP ${res.status}`);
  const json = await res.json();
  const resources = (json.result?.resources || [])
    .filter(r => (r.format || "").toUpperCase() === "CSV")
    .sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0));
  if (!resources.length) throw new Error("Nenhum CSV disponível no dataset ANP");
  cacheMeta = { atualizadoEm: resources[0].created, resources };
  return cacheMeta;
}

// Parse CSV ANP → Map. Colunas típicas: Regiao, UF, Municipio, Produto, Valor de Venda, Data da Coleta.
function parseCsvAnp(csv) {
  const linhas = csv.split(/\r?\n/);
  if (!linhas.length) return new Map();
  const cabecalho = linhas[0].split(";").map(s => s.trim().toLowerCase());
  const iUf   = cabecalho.findIndex(c => c === "estado - sigla" || c === "uf");
  const iMun  = cabecalho.findIndex(c => c.startsWith("municipio"));
  const iProd = cabecalho.findIndex(c => c === "produto");
  const iVal  = cabecalho.findIndex(c => c.startsWith("valor de venda"));
  const iData = cabecalho.findIndex(c => c.startsWith("data da coleta"));
  if (iUf < 0 || iMun < 0 || iProd < 0 || iVal < 0) return new Map();

  const acc = new Map();
  for (let i = 1; i < linhas.length; i++) {
    const cols = linhas[i].split(";");
    if (cols.length < cabecalho.length) continue;
    const uf   = cols[iUf].trim().toUpperCase();
    const mun  = cols[iMun].trim().toUpperCase();
    const prod = cols[iProd].trim().toUpperCase();
    const val  = Number(cols[iVal].replace(",", "."));
    const dt   = cols[iData]?.trim() || "";
    if (!Number.isFinite(val)) continue;
    const key = `${uf}|${mun}|${prod}`;
    const bucket = acc.get(key) || { soma: 0, n: 0, min: Infinity, max: -Infinity, coleta: dt };
    bucket.soma += val;
    bucket.n   += 1;
    bucket.min  = Math.min(bucket.min, val);
    bucket.max  = Math.max(bucket.max, val);
    if (dt > bucket.coleta) bucket.coleta = dt;
    acc.set(key, bucket);
  }
  const final = new Map();
  for (const [k, b] of acc) final.set(k, { media: b.soma / b.n, min: b.min, max: b.max, coleta: b.coleta, amostras: b.n });
  return final;
}

// Carrega (uma vez) os preços do CSV atual. Custa uma request grande (~10-20MB).
export async function carregarPrecos() {
  if (cachePrecos) return cachePrecos;
  const { resources } = await urlCsvMaisRecente();
  const res = await fetch(resources[0].url);
  if (!res.ok) throw new Error(`ANP CSV ${res.status}`);
  const csv = await res.text();
  cachePrecos = parseCsvAnp(csv);
  return cachePrecos;
}

// Consulta preço médio local. `combustivel` aceita: 'DIESEL S10', 'DIESEL S500', 'GASOLINA', 'ETANOL'.
export async function precoLocal({ uf, municipio, combustivel = "DIESEL S10" } = {}) {
  if (!uf || !municipio) throw new Error("uf/municipio obrigatórios");
  const mapa = await carregarPrecos();
  const key = `${uf.toUpperCase()}|${municipio.toUpperCase()}|${combustivel.toUpperCase()}`;
  return mapa.get(key) || null;
}

// Compara seu preço vs média ANP. Retorna delta em R$/L e %.
export async function compararComMercado({ uf, municipio, combustivel, precoSeu } = {}) {
  const mercado = await precoLocal({ uf, municipio, combustivel });
  if (!mercado) return { ok: false, motivo: "sem dados ANP pra esse município" };
  const delta = precoSeu - mercado.media;
  const deltaPct = (delta / mercado.media) * 100;
  return {
    ok: true,
    precoSeu,
    mercado,
    delta,
    deltaPct,
    diagnostico: delta < -0.05 ? "abaixo do mercado" : delta > 0.05 ? "acima do mercado" : "no mercado",
  };
}
