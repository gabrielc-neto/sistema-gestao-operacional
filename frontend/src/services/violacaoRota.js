// Detector de violação de rota — compara posição SASCAR atual vs traçado planejado.
// Um veículo é considerado "fora da rota" quando sua posição atual está a mais de
// `toleranciaKm` do ponto mais próximo do traçado (default 3 km).
//
// Uso típico: gestor cria/salva uma rota planejada, sistema periodicamente compara
// a última posição SASCAR do veículo com o traçado. Se violar, alerta.

import { distanciaHaversine } from "./geocoding";

/**
 * @param {Array<[lng,lat]>} traçado  Coords GeoJSON (LineString) da rota planejada
 * @param {number} posLat            Latitude atual do veículo
 * @param {number} posLng            Longitude atual
 * @param {number} toleranciaKm      Raio de tolerância (default 3 km)
 */
export function analisarViolacao(tracado, posLat, posLng, toleranciaKm = 3.0) {
  if (!Array.isArray(tracado) || tracado.length < 2) return null;
  if (!Number.isFinite(posLat) || !Number.isFinite(posLng)) return null;

  let menorDist = Infinity;
  let indiceMaisProximo = 0;
  // Amostra pontos do traçado (evita comparar com todos se for muito denso)
  const step = Math.max(1, Math.floor(tracado.length / 800));
  for (let i = 0; i < tracado.length; i += step) {
    const [lng, lat] = tracado[i];
    const d = distanciaHaversine(posLat, posLng, lat, lng);
    if (d < menorDist) { menorDist = d; indiceMaisProximo = i; }
  }

  const violando = menorDist > toleranciaKm;
  return {
    distanciaKm:   Number(menorDist.toFixed(3)),
    violando,
    toleranciaKm,
    indiceMaisProximo,
    // % de progresso na rota
    progressoPct:  Number(((indiceMaisProximo / tracado.length) * 100).toFixed(1)),
  };
}

/**
 * Analisa violações em lote — passa lista de veículos + rota → devolve quem tá fora
 */
export function violacoesEmLote(tracado, veiculosComPosicao, toleranciaKm = 3.0) {
  const out = [];
  for (const v of veiculosComPosicao) {
    if (!v.lat || !v.lng) continue;
    const r = analisarViolacao(tracado, v.lat, v.lng, toleranciaKm);
    if (!r) continue;
    out.push({ ...v, ...r });
  }
  return out.sort((a, b) => Number(b.violando) - Number(a.violando) || a.distanciaKm - b.distanciaKm);
}
