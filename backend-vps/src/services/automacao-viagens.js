// Automacao de status de viagens via eventos de cerca eletronica (SASCAR).
//
// Regra (Wesley 2026-08-05):
//   - ENTRADA na cerca da USINA de origem  → status = 'em_transito'  + data_saida = agora
//   - ENTRADA na cerca do tipo 'Base'      → status = 'concluida'    + data_chegada = agora
//
// Match cerca <-> fornecedor: por NOME (opcao B).
//   Normaliza (upper, sem acento, sem pontuacao) e verifica se nome_cerca
//   CONTEM parte do nome_fantasia OU razao_social do fornecedor.
//   Ex: cerca "COOPCANA - USINA" contém "COOPCANA" (do fantasia "COOPCANA / CPA") → match.
//
// Chamado a cada ciclo do cron SASCAR (2 min).

import { q, q1 } from "../db.js";

function norm(s) {
  return String(s || "")
    .toUpperCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")   // remove acentos
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Retorna tokens uteis (>=4 chars) pra match
function tokens(nome) {
  const STOP = new Set(["USINA", "BASE", "CIA", "LTDA", "COOPERATIVA", "IND"]);
  return norm(nome).split(" ").filter(t => t.length >= 4 && !STOP.has(t));
}

// Encontra cerca cujo nome contem algum token do fornecedor (ou vice-versa)
function encontrarCercaFornecedor(cercas, fornecedor) {
  const tokensForn = [
    ...tokens(fornecedor.nome_fantasia || ""),
    ...tokens(fornecedor.razao_social || ""),
  ];
  if (tokensForn.length === 0) return null;
  for (const c of cercas) {
    const nomeCerca = norm(c.nome || "");
    if (tokensForn.some(t => nomeCerca.includes(t))) return c;
  }
  return null;
}

// ID da viagem que "usa" essa placa AGORA (status programada ou em_transito)
async function viagemAbertaDaPlaca(placa) {
  return q1(`
    SELECT v.*, vi_first.contrato_id AS contrato_principal
      FROM viagens v
      LEFT JOIN LATERAL (
        SELECT vi.contrato_id FROM viagem_itens vi
         WHERE vi.viagem_id = v.id ORDER BY vi.ordem ASC LIMIT 1
      ) vi_first ON TRUE
     WHERE v.status IN ('programada', 'em_transito')
       AND REGEXP_REPLACE(UPPER(v.veiculo_placa), '[^A-Z0-9]', '', 'g')
           = REGEXP_REPLACE(UPPER($1),                    '[^A-Z0-9]', '', 'g')
     ORDER BY COALESCE(v.data_programada, v.criado_em::date) ASC
     LIMIT 1
  `, [placa]);
}

// Chamado ao gravar um evento ENTRADA (dentro do cron do SASCAR)
export async function processarEventoEntrada({ placa, cercaId, cercaNome, cercaTipo, dataPosicao }) {
  const viagem = await viagemAbertaDaPlaca(placa);
  if (!viagem) return { skipped: "sem_viagem_aberta" };

  // Busca contrato principal + fornecedor
  const cRow = viagem.contrato_principal
    ? await q1(`SELECT c.*, f.razao_social, f.nome_fantasia
                  FROM contratos_compra c
                  LEFT JOIN fornecedores f ON f.id = c.fornecedor_id
                 WHERE c.id = $1`, [viagem.contrato_principal])
    : null;

  // Todas cercas (pra match nome ↔ fornecedor)
  const cercasRows = await q(`SELECT id, data FROM documents WHERE collection = 'cercas_eletronicas'`);
  const cercas = cercasRows.map(r => ({ id: r.id, ...r.data }));

  // ==== CASO 1: entrou na cerca de tipo Base → concluida
  if ((cercaTipo || "").toLowerCase() === "base") {
    if (viagem.status === "concluida" || viagem.status === "cancelada") return { skipped: "ja_concluida" };
    await q(`
      UPDATE viagens
         SET status = 'concluida',
             data_chegada = COALESCE(data_chegada, $2::timestamptz),
             atualizado_por = 'AUTOMACAO-CERCA',
             atualizado_em = NOW()
       WHERE id = $1
    `, [viagem.id, dataPosicao || new Date().toISOString()]);
    return { viagemId: viagem.id, acao: "concluida", cerca: cercaNome };
  }

  // ==== CASO 2: entrou na cerca da usina (match por nome com fornecedor) → em_transito
  if (cRow) {
    const cercaMatch = encontrarCercaFornecedor(cercas, cRow);
    if (cercaMatch && cercaMatch.id === cercaId && viagem.status === "programada") {
      await q(`
        UPDATE viagens
           SET status = 'em_transito',
               data_saida = COALESCE(data_saida, $2::timestamptz),
               atualizado_por = 'AUTOMACAO-CERCA',
               atualizado_em = NOW()
         WHERE id = $1
      `, [viagem.id, dataPosicao || new Date().toISOString()]);
      return { viagemId: viagem.id, acao: "em_transito", cerca: cercaNome };
    }
  }

  return { skipped: "sem_regra_aplicavel", placa, cercaNome, cercaTipo };
}
