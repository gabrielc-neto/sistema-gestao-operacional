// Base de praças de pedágio ANTT (federais) — 269 praças ativas
// Fonte praças: https://dados.antt.gov.br/dataset/praca-de-pedagio
// Fonte tarifas: https://dados.antt.gov.br/dataset/tarifa-de-pedagio
// Atualizar 6/6 meses: baixar CSV novo e re-converter pra JSON

import base from "../data/pedagios-antt.json";
import { distanciaHaversine } from "./geocoding";

export const PEDAGIOS = base.pedagios;
export const PEDAGIOS_META = { fonte: base.fonte, atualizado: base.atualizado, total: base.total };

// Tarifa base (Categoria 1 — auto/2 eixos) média por concessionária federal — 2026.
// Padrão ANTT: caminhão paga tarifaBase × nº de eixos. Ex: bitrem 7 eixos numa
// praça de R$ 12,50 (auto) = R$ 87,50.
// Dados aproximados baseados em CSV vigente da ANTT. Ajustar quando houver reajuste.
export const TARIFAS_BASE = {
  "AUTOPISTA FLUMINENSE":   11.90,
  "AUTOPISTA LITORAL SUL":  13.20,
  "AUTOPISTA PLANALTO SUL": 12.50,
  "AUTOPISTA REGIS BITTENCOURT": 15.80,
  "AUTOPISTA FERNAO DIAS":  9.70,
  "ARTERIS FERNAO DIAS":    9.70,
  "ARTERIS PLANALTO SUL":   12.50,
  "ARTERIS LITORAL SUL":    13.20,
  "ARTERIS REGIS BITTENCOURT": 15.80,
  "ARTERIS FLUMINENSE":     11.90,
  "ARTERIS VIAS DO PARANÁ": 10.40,
  "ECO101":                 14.60,
  "ECO050":                 15.30,
  "ECO135":                 11.20,
  "ECO SUL":                8.90,
  "ECOPISTAS":              12.40,
  "ECOVIAS":                20.50,
  "ECORODOVIAS":            15.00,
  "CCR MSVIA":              7.30,
  "CCR RODONORTE":          9.80,
  "CCR RODOANEL":           18.50,
  "CCR AUTOBAN":            22.10,
  "CCR VIA LAGOS":          19.80,
  "CCR NOVADUTRA":          14.90,
  "CCR VIA OESTE":          21.30,
  "CCR PONTE":              6.80,
  "CONCEBRA":               10.10,
  "CONCEPA":                8.20,
  "CONCER":                 13.70,
  "TRIUNFO CONCEPA":        8.20,
  "TRIUNFO":                12.00,
  "VIA 040":                14.30,
  "VIA BRASIL":             8.60,
  "VIABAHIA":               12.90,
  "VIAPAULISTA":            13.50,
  "ROTA DO OESTE":          10.90,
  "ROTA DOS COQUEIROS":     9.50,
  "MSVIA":                  7.30,
  "RUMO":                   10.00,
  "PAR-045":                8.00,
};
export const TARIFA_PADRAO = 11.00; // fallback pra concessionária sem tabela

/**
 * Mapeia tipo de veículo Pontual → nº de eixos (padrão ANTT).
 * Ajustar se sua frota tiver configurações diferentes.
 */
export const EIXOS_POR_TIPO = {
  simples:   2,   // truck rodagem simples
  toco:      2,
  truck:     3,
  bitruck:   4,
  carreta:   5,   // cavalo 3 eixos + carreta 2 eixos
  bitrem:    7,   // cavalo 3 + 2 semirreboques 2 eixos = 7 (varia com engate)
  rodotrem: 9,   // cavalo 3 + 3 semirreboques ou combinação de 9 eixos
  vanderleia:6,
};

export function eixosDoVeiculo(veiculo) {
  if (!veiculo) return 2;
  if (Number.isFinite(veiculo.eixos)) return veiculo.eixos;
  const tipo = String(veiculo.tipo || "").toLowerCase();
  return EIXOS_POR_TIPO[tipo] || 2;
}

/**
 * Tarifa base da praça em R$ (Categoria 1). Usa TARIFAS_BASE por concessionária
 * ou TARIFA_PADRAO como fallback.
 */
export function tarifaBaseDaPraca(praca) {
  const c = String(praca?.concessionaria || "").toUpperCase().trim();
  if (TARIFAS_BASE[c]) return TARIFAS_BASE[c];
  // Match parcial (ex: "ARTERIS FERNAO DIAS SA" contém "ARTERIS FERNAO DIAS")
  for (const chave of Object.keys(TARIFAS_BASE)) {
    if (c.includes(chave) || chave.includes(c)) return TARIFAS_BASE[chave];
  }
  return TARIFA_PADRAO;
}

/**
 * Custo do pedágio na praça pra um veículo de N eixos (padrão ANTT).
 * @param {object} praca
 * @param {number} eixos  ex: 7 pra bitrem
 * @returns {number} R$
 */
export function custoPedagio(praca, eixos = 2) {
  return tarifaBaseDaPraca(praca) * Math.max(2, Number(eixos) || 2);
}

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

/**
 * Resumo de pedágios pra uma rota com custo já calculado.
 * @param {Array<[lng,lat]>} coords  Traçado (GeoJSON OSRM)
 * @param {object} opts
 *   veiculo | eixos   — { tipo:'bitrem' } ou eixos:7
 *   bufferKm          — default 1
 *   ida_volta         — bool (dobra custo). Default false.
 * @returns {{
 *   pracas: Array<{praca, concessionaria, rodovia, uf, km, tarifaBase, custo, eixos}>,
 *   totalPracas: number,
 *   totalCusto:  number,
 *   porConcessionaria: Record<string,{qtd,total}>,
 *   porUf:            Record<string,{qtd,total}>,
 * }}
 */
export function resumoPedagiosRota(coords, { veiculo, eixos, bufferKm = 1.0, ida_volta = false } = {}) {
  const n = eixos ?? eixosDoVeiculo(veiculo);
  const pracas = pedagiosNaRota(coords, bufferKm).map(p => {
    const tarifaBase = tarifaBaseDaPraca(p);
    const custo = tarifaBase * n * (ida_volta ? 2 : 1);
    return { ...p, tarifaBase, custo, eixos: n };
  });
  const porConcessionaria = {};
  const porUf = {};
  let totalCusto = 0;
  for (const p of pracas) {
    totalCusto += p.custo;
    (porConcessionaria[p.concessionaria] ||= { qtd: 0, total: 0 });
    porConcessionaria[p.concessionaria].qtd += 1;
    porConcessionaria[p.concessionaria].total += p.custo;
    (porUf[p.uf] ||= { qtd: 0, total: 0 });
    porUf[p.uf].qtd += 1;
    porUf[p.uf].total += p.custo;
  }
  return { pracas, totalPracas: pracas.length, totalCusto, porConcessionaria, porUf };
}
