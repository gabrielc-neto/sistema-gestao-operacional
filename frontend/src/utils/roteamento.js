/**
 * Roteamento de caminhão com perfil hazmat (carga perigosa).
 * Endpoints públicos sem chave:
 *   - Nominatim   — geocodificação (autocomplete + 1-shot)
 *   - Valhalla    — rota truck + hazmat (preferido)
 *   - OSRM        — fallback (perfil carro, sem hazmat)
 *
 * Toda a Pontual transporta combustível/produto perigoso, então
 * a chamada padrão é Valhalla com `costing_options.truck.hazmat: true`.
 *
 * Reaproveitado do protótipo Desktop/teste_rota.html (já validado).
 */

/** Decodifica polyline Valhalla (precision 1e6). */
function decodePolyline6(str) {
  let index = 0, lat = 0, lng = 0;
  const coords = [];
  while (index < str.length) {
    let b, shift = 0, result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    coords.push([lat / 1e6, lng / 1e6]);
  }
  return coords;
}

/** Autocomplete: até 6 sugestões de endereços no Brasil. */
export async function buscarSugestoes(query) {
  const q = (query || "").trim();
  if (q.length < 3) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&countrycodes=br&q=${encodeURIComponent(q)}`;
  const r = await fetch(url, { headers: { "Accept-Language": "pt-BR" } });
  if (!r.ok) return [];
  const j = await r.json();
  return j.map(x => ({
    label: x.display_name,
    cep: (x.address && x.address.postcode) || "",
    lat: parseFloat(x.lat),
    lng: parseFloat(x.lon),
  }));
}

/** Geocodifica um único endereço (busca a melhor opção). */
export async function geocodificar(query) {
  const q = (query || "").trim();
  if (!q) throw new Error("Endereço vazio");
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`;
  const r = await fetch(url, { headers: { "Accept-Language": "pt-BR" } });
  const j = await r.json();
  if (!j.length) throw new Error(`Endereço não encontrado: "${q}"`);
  return { lat: parseFloat(j[0].lat), lng: parseFloat(j[0].lon), nome: j[0].display_name };
}

async function rotaValhalla(origem, destino) {
  const url = "https://valhalla1.openstreetmap.de/route";
  const body = {
    locations: [
      { lat: origem.lat, lon: origem.lng },
      { lat: destino.lat, lon: destino.lng },
    ],
    costing: "truck",
    costing_options: { truck: { hazmat: true } },
    directions_options: { units: "kilometers" },
  };
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Valhalla ${r.status}`);
  const j = await r.json();
  const coords = j.trip.legs.flatMap(l => decodePolyline6(l.shape));
  return {
    coords,
    dist: j.trip.summary.length * 1000, // metros
    dur:  j.trip.summary.time,           // segundos
    perfil: "caminhão + hazmat (Valhalla)",
  };
}

async function rotaOSRM(origem, destino) {
  const url = `https://router.project-osrm.org/route/v1/driving/${origem.lng},${origem.lat};${destino.lng},${destino.lat}?overview=full&geometries=geojson`;
  const r = await fetch(url);
  const j = await r.json();
  if (j.code !== "Ok" || !j.routes.length) throw new Error("OSRM não achou rota");
  const f = j.routes[0];
  return {
    coords: f.geometry.coordinates.map(c => [c[1], c[0]]),
    dist: f.distance,
    dur:  f.duration,
    perfil: "carro (OSRM fallback)",
  };
}

/**
 * Rota de caminhão com hazmat (Valhalla). Cai pra OSRM (carro) se Valhalla falhar.
 * @param {{lat:number,lng:number}} origem
 * @param {{lat:number,lng:number}} destino
 * @returns {{coords:[number,number][], dist:number, dur:number, perfil:string}}
 */
export async function calcularRotaCaminhao(origem, destino) {
  try {
    return await rotaValhalla(origem, destino);
  } catch (e) {
    console.warn("Valhalla falhou, usando fallback OSRM:", e.message);
    return await rotaOSRM(origem, destino);
  }
}

/** Formata distância em metros pra "X,Y km" ou "X m". */
export function fmtDistancia(metros) {
  if (metros == null) return "—";
  if (metros < 1000) return `${Math.round(metros)} m`;
  return `${(metros / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
}

/** Formata duração em segundos pra "Xh Ymin" ou "Y min". */
export function fmtDuracao(segundos) {
  if (segundos == null) return "—";
  const total = Math.round(segundos / 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h <= 0) return `${m} min`;
  return `${h}h ${String(m).padStart(2, "0")}min`;
}
