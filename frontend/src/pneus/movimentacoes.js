// Helpers de movimentação de pneus.
// Toda operação grava um log em `pneu_movimentacoes` + atualiza o doc do pneu.
// Fluxos: instalar, remover, rodízio.
// Adaptado pra VPS via genericDataSource (com fallback Firestore via flag).

import {
  get as dsGet,
  insert as dsInsert,
  patch as dsPatch,
} from "../services/genericDataSource";

const MOVS = "pneu_movimentacoes";

function agoraIso() { return new Date().toISOString(); }

export async function instalarPneu({ pneu, veiculo, posicao, km, autor, obs = "" }) {
  if (!pneu?.id)       throw new Error("Pneu inválido");
  if (!veiculo?.placa) throw new Error("Veículo sem placa");
  if (!posicao)        throw new Error("Posição obrigatória");
  const kmNum = Number(km) || 0;

  const posicaoAtual = {
    veiculoPlaca: String(veiculo.placa).toUpperCase(),
    veiculoId: veiculo.id || null,
    posicao,
    dataInstalacao: agoraIso(),
    kmInstalacao: kmNum,
  };

  // Confere status atual (sem runTransaction — aceita race raro)
  const atual = await dsGet("pneus", pneu.id);
  if (!atual) throw new Error("Pneu não encontrado");
  if (atual.status !== "estoque") {
    throw new Error(`Pneu não está em estoque (status atual: ${atual.status}).`);
  }

  await dsPatch("pneus", pneu.id, {
    status: "em_uso",
    posicaoAtual,
    ultimaMovimentacao: agoraIso(),
  });

  await dsInsert(MOVS, {
    tipo: "instalacao",
    pneuId: pneu.id,
    fogo: pneu.fogo || "",
    veiculoPlaca: posicaoAtual.veiculoPlaca,
    veiculoId: posicaoAtual.veiculoId,
    posicao, km: kmNum, obs,
    autor: autor || null,
    data: agoraIso(),
  });

  return posicaoAtual;
}

export async function removerPneu({ pneu, motivo, destino = "estoque", km, sulcoFinal, autor, obs = "" }) {
  if (!pneu?.id) throw new Error("Pneu inválido");
  if (!pneu.posicaoAtual?.veiculoPlaca) throw new Error("Pneu não está em uso em nenhum veículo");
  if (!["estoque", "recapagem", "sucata"].includes(destino)) throw new Error("Destino inválido");
  const kmNum = Number(km) || 0;
  const kmInst = Number(pneu.posicaoAtual.kmInstalacao) || 0;
  const kmRodadosNesta = Math.max(0, kmNum - kmInst);

  const historicoPos = pneu.historicoPosicoes || [];
  historicoPos.push({
    ...pneu.posicaoAtual,
    dataRemocao: agoraIso(),
    kmRemocao: kmNum,
    kmRodados: kmRodadosNesta,
    motivo,
    sulcoFinal: sulcoFinal != null ? Number(sulcoFinal) : null,
  });

  const patch = {
    status: destino,
    posicaoAtual: null,
    historicoPosicoes: historicoPos,
    kmRodadosTotal: (Number(pneu.kmRodadosTotal) || 0) + kmRodadosNesta,
    ultimaMovimentacao: agoraIso(),
  };
  if (sulcoFinal != null) patch.sulcoAtual = Number(sulcoFinal);

  await dsPatch("pneus", pneu.id, patch);

  await dsInsert(MOVS, {
    tipo: "remocao",
    pneuId: pneu.id,
    fogo: pneu.fogo || "",
    veiculoPlaca: pneu.posicaoAtual.veiculoPlaca,
    veiculoId: pneu.posicaoAtual.veiculoId || null,
    posicao: pneu.posicaoAtual.posicao,
    km: kmNum, kmRodados: kmRodadosNesta,
    motivo, destino,
    sulcoFinal: sulcoFinal != null ? Number(sulcoFinal) : null,
    obs, autor: autor || null, data: agoraIso(),
  });

  return { destino, kmRodados: kmRodadosNesta };
}

export async function rodizioPneu({ pneuA, pneuB, novaPosicaoA, novaPosicaoB, km, autor, obs = "" }) {
  if (!pneuA?.id) throw new Error("Pneu A obrigatório");
  if (!pneuA.posicaoAtual) throw new Error("Pneu A não está instalado");
  const veiculoPlaca = pneuA.posicaoAtual.veiculoPlaca;
  const kmNum = Number(km) || 0;

  if (pneuB && pneuB.posicaoAtual?.veiculoPlaca !== veiculoPlaca) {
    throw new Error("Rodízio precisa ser entre pneus do MESMO veículo");
  }

  const nowIso = agoraIso();

  await dsPatch("pneus", pneuA.id, {
    posicaoAtual: {
      ...pneuA.posicaoAtual,
      posicao: novaPosicaoA,
      dataInstalacao: nowIso,
      kmInstalacao: kmNum,
    },
    ultimaMovimentacao: nowIso,
  });

  if (pneuB?.id) {
    await dsPatch("pneus", pneuB.id, {
      posicaoAtual: {
        ...pneuB.posicaoAtual,
        posicao: novaPosicaoB,
        dataInstalacao: nowIso,
        kmInstalacao: kmNum,
      },
      ultimaMovimentacao: nowIso,
    });
  }

  await dsInsert(MOVS, {
    tipo: "rodizio",
    veiculoPlaca, km: kmNum,
    pneuAId: pneuA.id, fogoA: pneuA.fogo || "",
    posOriginalA: pneuA.posicaoAtual.posicao, novaPosicaoA,
    pneuBId: pneuB?.id || null, fogoB: pneuB?.fogo || "",
    posOriginalB: pneuB?.posicaoAtual?.posicao || null, novaPosicaoB: novaPosicaoB || null,
    obs, autor: autor || null, data: nowIso,
  });
}

export function pneusDoVeiculo(pneus, placa) {
  const alvo = String(placa || "").toUpperCase();
  const mapa = {};
  for (const p of pneus) {
    if (p.status !== "em_uso") continue;
    const pl = String(p.posicaoAtual?.veiculoPlaca || "").toUpperCase();
    if (pl !== alvo) continue;
    mapa[p.posicaoAtual.posicao] = p;
  }
  return mapa;
}
