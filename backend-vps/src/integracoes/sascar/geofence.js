// Geofence helpers — detecção de ponto dentro de cerca.
// Suporta dois formatos:
//   - { formato: 'circulo', centro: { lat, lng }, raio: <metros> }
//   - { formato: 'poligono', pontos: [[lat, lng], ...] }  (default p/ cercas legadas sem formato)

const R_TERRA = 6378137; // raio da Terra em metros (WGS84)

function toRad(g) { return (g * Math.PI) / 180; }

// Distância haversine em metros entre dois pontos lat/lng
export function haversineMetros(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_TERRA * Math.asin(Math.sqrt(a));
}

// Ray-casting: ponto está dentro do polígono fechado?
function pontoEmPoligono(lat, lng, pontos) {
  let dentro = false;
  for (let i = 0, j = pontos.length - 1; i < pontos.length; j = i++) {
    const xi = pontos[i][1], yi = pontos[i][0];
    const xj = pontos[j][1], yj = pontos[j][0];
    const intersect =
      ((yi > lat) !== (yj > lat)) &&
      (lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi);
    if (intersect) dentro = !dentro;
  }
  return dentro;
}

// Decide se (lat, lng) está dentro da cerca, qualquer formato suportado.
export function pontoEmCerca(lat, lng, cerca) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !cerca) return false;

  if (cerca.formato === 'circulo') {
    const c = cerca.centro;
    const raio = Number(cerca.raio);
    if (!c || !Number.isFinite(c.lat) || !Number.isFinite(c.lng) || !Number.isFinite(raio)) return false;
    return haversineMetros(lat, lng, c.lat, c.lng) <= raio;
  }

  // Default: polígono (formato ausente também cai aqui — compat com cercas legadas)
  const pts = cerca.pontos;
  if (!Array.isArray(pts) || pts.length < 3) return false;
  return pontoEmPoligono(lat, lng, pts);
}

// IDs das cercas que contêm o ponto. Ordem estável (mesma ordem da entrada).
export function cercasContendoPonto(lat, lng, cercas) {
  const dentro = [];
  for (const c of cercas || []) {
    if (pontoEmCerca(lat, lng, c)) dentro.push(c.id);
  }
  return dentro;
}
