// Base de praças de pedágio ANTT (federais) — 269 praças ativas
// Fonte praças: https://dados.antt.gov.br/dataset/praca-de-pedagio
// Fonte tarifas: https://dados.antt.gov.br/dataset/tarifa-de-pedagio
// Atualizar 6/6 meses: baixar CSV novo e re-converter pra JSON

import base from "../data/pedagios-antt.json";
import { distanciaHaversine } from "./geocoding";

export const PEDAGIOS = base.pedagios;
export const PEDAGIOS_META = { fonte: base.fonte, atualizado: base.atualizado, total: base.total };

// Tarifa base (Categoria 1 — auto/2 eixos) média por concessionária — 2026.
// Padrão ANTT: caminhão paga tarifaBase × nº de eixos. Ex: bitrem 7 eixos numa
// praça de R$ 3,00 (auto) = R$ 21,00.
//
// Foco Paraná (operação Pontual): as 6 concessionárias dos "Novos Caminhos do PR"
// (leilão 2023-2024, modelo pela MENOR tarifa) têm valores muito abaixo do
// padrão nacional — muitas iniciaram em R$ 2-4. Antes existiam Rodonorte/
// Ecovia/Viapar (Anel de Integração), mas essas concessões venceram em 2021.
export const TARIFAS_BASE = {
  // === NOVOS CAMINHOS DO PARANÁ (federais ANTT, ativas desde 2024) ===
  "EPR IGUAÇU":              2.30,   // Lote 2 — BR-277 oeste (Cascavel↔Foz)
  "EPR PARANÁ":              3.20,   // Lote 3 — BR-277 centro
  "LITORAL PIONEIRO":        3.50,   // Lote 1 — BR-277 leste + BR-116 sul
  "EPR LITORAL PIONEIRO":    3.50,
  "VIA ARAUCÁRIA":           2.90,   // Lote 6 — BR-476 + BR-373 (região Pontual)
  "VIA CAMPO":               3.10,   // Lote 6 — parte oeste
  "PRVIAS":                  3.00,   // BR-369 / BR-153 (norte/noroeste PR)
  "NOVA 116 PARANÁ":         3.40,   // BR-116 sul

  // === PASSAGEM POR PR (concessões antigas ainda ativas na divisa) ===
  "AUTOPISTA LITORAL SUL":  13.20,   // BR-376 rumo SC (litoral)
  "AUTOPISTA PLANALTO SUL": 12.50,   // BR-116 rumo SC (planalto)
  "AUTOPISTA REGIS BITTENCOURT": 15.80, // BR-116 rumo SP
  "ARTERIS LITORAL SUL":    13.20,
  "ARTERIS PLANALTO SUL":   12.50,
  "ARTERIS REGIS BITTENCOURT": 15.80,

  // === Outras (rota rara pra Pontual, mantidas se sair do PR) ===
  "ECO050":                 15.30, "ECO101": 14.60, "ECO135": 11.20,
  "ECO SUL":                8.90,  "ECOPISTAS": 12.40, "ECOVIAS": 20.50, "ECORODOVIAS": 15.00,
  "CCR MSVIA":              7.30,  "CCR AUTOBAN": 22.10, "CCR NOVADUTRA": 14.90,
  "CCR VIA OESTE":          21.30, "CCR RODOANEL": 18.50, "CCR PONTE": 6.80,
  "CONCEBRA":               10.10, "CONCEPA": 8.20, "CONCER": 13.70,
  "VIA 040":                14.30, "VIA BRASIL": 8.60,
  "AUTOPISTA FLUMINENSE":   11.90, "AUTOPISTA FERNAO DIAS": 9.70,
  "ROTA DO OESTE":          10.90, "MSVIA": 7.30,
};
// Fallback conservador (média Novos Caminhos PR ~R$ 3,00)
export const TARIFA_PADRAO = 3.00;

/**
 * Configurações reais da frota Pontual: TODOS os cavalos são 3 eixos
 * (trucado/traçado). O total de eixos vem do cavalo + semirreboque atrelado.
 *
 *   carreta   = cavalo 3 + carreta 2 eixos          = 5 eixos
 *   bitrem    = cavalo 3 + 2 semirreboques (2+2)    = 7 eixos
 *   rodotrem  = cavalo 3 + combinação 6 eixos       = 9 eixos
 *
 * Cavalo desatrelado ("só cabeça") não roda cliente = 3 eixos apenas por
 * completude (usado se sistema precisar computar cavalo em manobra).
 */
export const EIXOS_POR_TIPO = {
  cavalo:    3,   // trucado/traçado desatrelado (referência)
  trucado:   3,
  tracado:   3,
  carreta:   5,   // cavalo 3 + carreta 2
  simples:   5,   // alias — "carreta simples"
  bitrem:    7,   // cavalo 3 + 2+2
  rodotrem:  9,   // cavalo 3 + 3+3
  vanderleia:6,   // exceção rara
};

export function eixosDoVeiculo(veiculo) {
  if (!veiculo) return 5;   // default Pontual = carreta simples (5 eixos)
  if (Number.isFinite(veiculo.eixos)) return veiculo.eixos;
  const tipo = String(veiculo.tipo || "").toLowerCase();
  return EIXOS_POR_TIPO[tipo] || 5;
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
export function custoPedagio(praca, eixos = 5) {
  return tarifaBaseDaPraca(praca) * Math.max(2, Number(eixos) || 5);
}

/**
 * Filtra pedágios só do Paraná — atalho pra operação Pontual.
 * Inclui praças na divisa (BR-376 Autopista Litoral Sul, BR-116 Planalto Sul)
 * que ficam em SC mas afetam viagem que sai do PR.
 */
export function pedagiosPr() {
  return PEDAGIOS.filter(p => p.uf === "PR");
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
