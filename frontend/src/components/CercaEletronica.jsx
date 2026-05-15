import { Polygon, Circle, Tooltip } from "react-leaflet";

const R_TERRA = 6378137;
const toRad = (g) => (g * Math.PI) / 180;

export function haversineMetros(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_TERRA * Math.asin(Math.sqrt(a));
}

// Ray-casting — ponto está dentro do polígono?
export function pontoEmPoligono(lat, lon, pontos) {
  let dentro = false;
  for (let i = 0, j = pontos.length - 1; i < pontos.length; j = i++) {
    const xi = pontos[i][1], yi = pontos[i][0];
    const xj = pontos[j][1], yj = pontos[j][0];
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) dentro = !dentro;
  }
  return dentro;
}

// Suporta cerca circular ({ formato:'circulo', centro:{lat,lng}, raio }) e polígono
export function pontoEmCerca(lat, lng, cerca) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !cerca) return false;
  if (cerca.formato === "circulo") {
    const c = cerca.centro;
    const raio = Number(cerca.raio);
    if (!c || !Number.isFinite(c.lat) || !Number.isFinite(c.lng) || !Number.isFinite(raio)) return false;
    return haversineMetros(lat, lng, c.lat, c.lng) <= raio;
  }
  const pts = cerca.pontos;
  if (!Array.isArray(pts) || pts.length < 3) return false;
  return pontoEmPoligono(lat, lng, pts);
}

export function areaDoPonto(lat, lon, cercas = []) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  for (const c of cercas) {
    if (pontoEmCerca(lat, lon, c)) return c;
  }
  return null;
}

export default function CercaEletronica({ cercas = [] }) {
  return (
    <>
      {cercas.map(c => {
        const cor = c.cor || "#2563eb";
        const style = {
          color: cor,
          weight: 2,
          opacity: 0.9,
          fillColor: cor,
          fillOpacity: 0.15,
          dashArray: "6,4",
        };
        const conteudo = (
          <Tooltip sticky direction="center" opacity={0.95}>
            <div style={{ fontWeight: 700, fontSize: ".82rem", color: cor }}>{c.nome}</div>
          </Tooltip>
        );

        if (c.formato === "circulo" && c.centro && Number.isFinite(c.raio)) {
          return (
            <Circle key={c.id || c.nome} center={[c.centro.lat, c.centro.lng]} radius={c.raio} pathOptions={style}>
              {conteudo}
            </Circle>
          );
        }

        if (Array.isArray(c.pontos) && c.pontos.length >= 3) {
          return (
            <Polygon key={c.id || c.nome} positions={c.pontos} pathOptions={style}>
              {conteudo}
            </Polygon>
          );
        }
        return null;
      })}
    </>
  );
}
