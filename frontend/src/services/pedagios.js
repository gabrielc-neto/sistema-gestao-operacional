// Base de praças de pedágio ANTT (federais) — 269 praças ativas
// Fonte: https://dados.antt.gov.br/dataset/praca-de-pedagio
// Atualizar 6/6 meses: baixar CSV novo e re-converter pra JSON

import base from "../data/pedagios-antt.json";
import { distanciaHaversine } from "./geocoding";

export const PEDAGIOS = base.pedagios;
export const PEDAGIOS_META = { fonte: base.fonte, atualizado: base.atualizado, total: base.total };

/**
 * Encontra praças de pedágio próximas ao traçado de uma rota (dentro de bufferKm).
 * @param {Array<[lng,lat]>} coords  Traçado da rota (GeoJSON LineString OSRM)
 * @param {number} bufferKm          Raio de tolerância (default 1 km)
 * @returns {Array} Praças encontradas com distância à rota
 */
export function pedagiosNaRota(coords, bufferKm = 1.0) {
  if (!Array.isArray(coords) || coords.length < 2) return [];

  // Otimização: reduz densidade do traçado (1 ponto a cada N)
  const step = Math.max(1, Math.floor(coords.length / 500));
  const pontosRota = coords.filter((_, i) => i % step === 0);

  const encontrados = [];
  for (const p of PEDAGIOS) {
    let menorDist = Infinity;
    for (const [lng, lat] of pontosRota) {
      const d = distanciaHaversine(p.lat, p.lng, lat, lng);
      if (d < menorDist) menorDist = d;
      if (menorDist < 0.05) break; // suficientemente próximo, para
    }
    if (menorDist <= bufferKm) {
      encontrados.push({ ...p, distanciaKm: Number(menorDist.toFixed(2)) });
    }
  }
  encontrados.sort((a, b) => a.distanciaKm - b.distanciaKm);
  return encontrados;
}
