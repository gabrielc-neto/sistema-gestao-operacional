// Serviços de geocoding e roteamento — 100% grátis, sem cadastro
//   • Nominatim (OpenStreetMap): endereço ↔ coordenadas
//   • OSRM público: distância / tempo entre 2 pontos
//   • Photon (Komoot, sem cadastro): busca fuzzy alternativa

// Rate limit polido do Nominatim: 1 req/segundo. Não abuse (fair use).
// Se usar em produção pesada, hospede o próprio Nominatim.

const NOMINATIM_URL = "https://nominatim.openstreetmap.org";
const OSRM_URL      = "https://router.project-osrm.org";
const PHOTON_URL    = "https://photon.komoot.io";

// Cache local por sessão (endereços/coords repetidos não custam nova chamada)
const cacheEndereco = new Map();
const cacheReverso  = new Map();
const cacheRota     = new Map();
const cachePhoton   = new Map();
const cacheCnpjGeo  = new Map();

// User-Agent identificado — Nominatim exige (senão pode banir)
const USER_AGENT = "PontualLogistica/1.0 (contato@pontualpetroleo.com.br)";

/**
 * Busca endereço → coordenadas + endereço estruturado.
 * @param {string} query  ex: "Rua Luiz Franceschi 666, Araucária, PR"
 * @returns {Promise<{lat, lng, display, tipo, importance, endereco}[]>}
 */
export async function buscarEndereco(query) {
  const q = (query || "").trim();
  if (q.length < 4) return [];
  if (cacheEndereco.has(q)) return cacheEndereco.get(q);

  const url = `${NOMINATIM_URL}/search?format=json&addressdetails=1&limit=5&countrycodes=br&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { "Accept-Language": "pt-BR", "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const json = await res.json();

  const out = json.map(r => ({
    lat: Number(r.lat),
    lng: Number(r.lon),
    display: r.display_name,
    tipo: r.type,
    importance: r.importance,
    endereco: {
      logradouro: r.address?.road || "",
      numero:     r.address?.house_number || "",
      bairro:     r.address?.suburb || r.address?.neighbourhood || "",
      cidade:     r.address?.city || r.address?.town || r.address?.village || r.address?.municipality || "",
      uf:         r.address?.state_code?.toUpperCase() || (r.address?.state || "").slice(0, 2).toUpperCase(),
      cep:        r.address?.postcode || "",
      pais:       r.address?.country || "",
    },
  }));
  cacheEndereco.set(q, out);
  return out;
}

/**
 * Reverso: coordenadas → endereço.
 * @param {number} lat
 * @param {number} lng
 */
export async function reverseGeocoding(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  if (cacheReverso.has(key)) return cacheReverso.get(key);

  const url = `${NOMINATIM_URL}/reverse?format=json&addressdetails=1&lat=${lat}&lon=${lng}`;
  const res = await fetch(url, { headers: { "Accept-Language": "pt-BR", "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Nominatim reverse HTTP ${res.status}`);
  const r = await res.json();

  const out = r?.display_name ? {
    display: r.display_name,
    endereco: {
      logradouro: r.address?.road || "",
      numero:     r.address?.house_number || "",
      bairro:     r.address?.suburb || r.address?.neighbourhood || "",
      cidade:     r.address?.city || r.address?.town || r.address?.village || r.address?.municipality || "",
      uf:         r.address?.state_code?.toUpperCase() || (r.address?.state || "").slice(0, 2).toUpperCase(),
      cep:        r.address?.postcode || "",
    },
  } : null;
  cacheReverso.set(key, out);
  return out;
}

/**
 * Calcula rota entre 2 pontos (ou mais). Retorna distância em km e tempo em min.
 * @param {Array<[lng,lat]>} coords  Array de [lng, lat] — no mínimo 2 pontos
 * @param {'driving'|'foot'|'bike'} profile
 */
export async function calcularRota(coords, profile = "driving") {
  if (!Array.isArray(coords) || coords.length < 2) throw new Error("Mínimo 2 pontos");
  const chave = JSON.stringify({ coords, profile });
  if (cacheRota.has(chave)) return cacheRota.get(chave);

  const path = coords.map(([lng, lat]) => `${lng},${lat}`).join(";");
  const url  = `${OSRM_URL}/route/v1/${profile}/${path}?overview=full&geometries=geojson&steps=false`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
  const json = await res.json();
  if (json.code !== "Ok" || !json.routes?.length) throw new Error(`OSRM: ${json.code || "sem rota"}`);

  const r = json.routes[0];
  const out = {
    distanciaKm:  r.distance / 1000,
    duracaoMin:   r.duration / 60,
    geometry:     r.geometry,      // GeoJSON LineString pra desenhar no mapa
    coords:       r.geometry.coordinates,  // [[lng,lat], ...]
  };
  cacheRota.set(chave, out);
  return out;
}

/**
 * Utilitário — distância em linha reta (Haversine) em km.
 * Muito rápido, sem chamada externa. Usa quando não precisa da rota real.
 */
export function distanciaHaversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Photon (Komoot) — geocoder alternativo baseado em OSM.
 * Mais tolerante que Nominatim pra busca fuzzy de nomes/POIs.
 * Sem cadastro, sem key, sem rate limit prático.
 * @param {string} query
 * @param {object} opts  { limit=5, lat, lng }  (lat/lng viés geográfico opcional)
 */
export async function buscarPhoton(query, { limit = 5, lat, lng } = {}) {
  const q = (query || "").trim();
  if (q.length < 3) return [];
  const key = `${q}|${lat ?? ""}|${lng ?? ""}|${limit}`;
  if (cachePhoton.has(key)) return cachePhoton.get(key);

  const params = new URLSearchParams({ q, limit, lang: "pt" });
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    params.set("lat", lat); params.set("lon", lng);
  }
  const res = await fetch(`${PHOTON_URL}/api/?${params}`);
  if (!res.ok) throw new Error(`Photon HTTP ${res.status}`);
  const json = await res.json();

  const out = (json.features || []).map(f => {
    const p = f.properties || {};
    const [lng2, lat2] = f.geometry?.coordinates || [null, null];
    return {
      lat: lat2, lng: lng2,
      display: [p.name, p.street, p.housenumber, p.city, p.state].filter(Boolean).join(", "),
      tipo: p.osm_value || p.type || "photon",
      endereco: {
        logradouro: p.street || "",
        numero:     p.housenumber || "",
        bairro:     p.district || "",
        cidade:     p.city || p.county || "",
        uf:         (p.state || "").slice(0, 2).toUpperCase(),
        cep:        p.postcode || "",
        pais:       p.country || "",
      },
    };
  });
  cachePhoton.set(key, out);
  return out;
}

/**
 * Combo: CNPJ → razão social + endereço (BrasilAPI) → coordenada (Nominatim).
 * Resolve QUALQUER empresa brasileira em ~2 chamadas grátis, sem cadastro.
 * @param {string} cnpj  Com ou sem máscara (14 dígitos)
 * @returns {Promise<{
 *   cnpj, razaoSocial, nomeFantasia, situacao, endereco, lat, lng, display, fonte
 * }|null>}
 */
export async function geocodePorCnpj(cnpj) {
  const digits = String(cnpj || "").replace(/\D/g, "");
  if (digits.length !== 14) throw new Error("CNPJ deve ter 14 dígitos");
  if (cacheCnpjGeo.has(digits)) return cacheCnpjGeo.get(digits);

  // 1) BrasilAPI — razão + endereço
  const r = await (await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`)).json();
  if (!r?.cnpj) return null;

  const endereco = {
    logradouro: r.logradouro || "",
    numero:     r.numero || "",
    complemento:r.complemento || "",
    bairro:     r.bairro || "",
    cidade:     r.municipio || "",
    uf:         r.uf || "",
    cep:        r.cep || "",
  };

  // 2) Nominatim — endereço formatado → coord
  const partes = ["Rua", endereco.logradouro, endereco.numero, endereco.cidade, endereco.uf]
    .filter(Boolean).join(" ");
  let lat = null, lng = null, display = "";
  try {
    const geo = await buscarEndereco(partes);
    if (geo[0]) { lat = geo[0].lat; lng = geo[0].lng; display = geo[0].display; }
  } catch { /* silencia — pode retornar sem coord se Nominatim falhar */ }

  // 3) Fallback: se sem coord, tenta pelo CEP via reverso Photon (mais tolerante)
  if ((!lat || !lng) && endereco.cep) {
    try {
      const alt = await buscarPhoton(`${endereco.cep} ${endereco.cidade} ${endereco.uf}`, { limit: 1 });
      if (alt[0]) { lat = alt[0].lat; lng = alt[0].lng; display = alt[0].display; }
    } catch { /* silencia */ }
  }

  const out = {
    cnpj: r.cnpj,
    razaoSocial:  r.razao_social || "",
    nomeFantasia: r.nome_fantasia || "",
    situacao:     r.descricao_situacao_cadastral || "",
    endereco, lat, lng, display,
    fonte: lat && lng ? "brasilapi+nominatim" : "brasilapi",
  };
  cacheCnpjGeo.set(digits, out);
  return out;
}
