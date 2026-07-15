// Sincronização de abastecimentos da API CTA Smart (bomba do pátio Pontual).
// Fluxo:
//   1. GET https://ctasmart.com.br:8443/SvWebSincronizaAbastecimentos?token=...
//   2. Parse XML → array de abastecimentos
//   3. Sanitiza datas (bug ano 0018 → 2018) e valores (vírgula → ponto)
//   4. Batch upsert no Firestore em `abastecimentos_cta/{id}`
//   5. Se ficou algo novo, atualiza `config/cta_meta` com timestamp/estatísticas
//
// Rate limit da API: 1 requisição a cada 60 segundos por token.

import { XMLParser } from 'fast-xml-parser';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const CTA_ENDPOINT = 'https://ctasmart.com.br:8443/SvWebSincronizaAbastecimentos';
const COL          = 'abastecimentos_cta';
const META_DOC     = 'config/cta_meta';
const BATCH_SIZE   = 400;

// "24/10/0018" → "2018-10-24" (ISO). Ano < 100 = +2000. Ano vazio/inválido = null.
function parseDataBR(dataStr, horaStr) {
  if (!dataStr) return null;
  const md = String(dataStr).match(/^(\d{2})\/(\d{2})\/(\d+)$/);
  if (!md) return null;
  let ano = Number(md[3]);
  if (ano < 100) ano += 2000;                    // bug CTA: 0018 → 2018
  else if (ano < 1000) ano += 2000;              // caso muito raro
  if (ano < 2000 || ano > 2100) return null;      // sanidade
  const mes = md[2], dia = md[1];
  const hora = horaStr && /^\d{2}:\d{2}(:\d{2})?$/.test(String(horaStr)) ? String(horaStr) : '00:00:00';
  return `${ano}-${mes}-${dia}T${hora.length === 5 ? hora + ':00' : hora}-03:00`;
}

function num(v) {
  if (v == null || v === '') return null;
  const s = String(v).replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function txt(v) {
  if (v == null) return '';
  if (typeof v === 'object') return '';
  return String(v).trim();
}

function normalizarPlaca(p) {
  return String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Extrai UM abastecimento do XML parseado pro schema Firestore.
function extrairAbastecimento(a) {
  const idCta = txt(a.ID);
  if (!idCta) return null;

  const dataInicio = parseDataBR(txt(a.DATA_INICIO), txt(a.HORA_INICIO));
  const dataFim    = parseDataBR(txt(a.DATA_FIM),    txt(a.HORA_FIM));

  const veic = a.VEICULO || {};
  const mot  = a.MOTORISTA || {};
  const posto= a.POSTO || {};
  const frent= a.FRENTISTA || {};
  const tel  = a.TELEMETRIA || {};
  const comb = a.COMBUSTIVEL || {};
  const emp  = a.EMPRESA || {};

  return {
    ctaId:              idCta,
    sequencial:         txt(a.SEQUENCIAL),
    dataInicio,
    dataFim,
    volumeL:            num(a.VOLUME_FIXED) ?? num(a.VOLUME),
    odometro:           num(a.ODOMETRO),
    distancia:          num(a.DISTANCIA),
    mediaKmL:           num(a.MEDIA_KILOMETRO_LITRO),
    horimetro:          num(a.HORIMETRO),
    horasTrabalhadas:   num(a.HORAS_TRABALHADAS),
    mediaLh:            num(a.MEDIA_LITRO_HORA),
    custoTotal:         num(a.CUSTO),
    custoUnitario:      num(a.CUSTO_UNITARIO),
    encerrante:         num(a.ENCERRANTE_FIXED) ?? num(a.ENCERRANTE),
    encerranteEletronica: num(a.ENCERRANTE_ELETRONICA_FIXED) ?? num(a.ENCERRANTE_ELETRONICA),
    produtoCategoriaId: txt(a.PRODUTO_CATEGORIA_ID),
    completo:           String(txt(a.COMPLETO)).toLowerCase() === 'true',
    chaveNfe:           txt(a.CHAVE_NFE),
    lote:               txt(a.LOTE),

    veiculo: {
      placa:     txt(veic.PLACA),
      placaNorm: normalizarPlaca(veic.PLACA),
      frota:     txt(veic.FROTA),
      nome:      txt(veic.NOME),
      ctaId:     txt(veic.ID),
      modelo:    txt(veic.MODELO),
      categoria: txt(veic.CATEGORIA),
      volumeMax: num(veic.VOLUME_MAX),
    },
    motorista: {
      nome:  txt(mot.NOME),
      cpf:   txt(mot.CPF),
      cnh:   txt(mot.CNH),
      ctaId: txt(mot.ID),
    },
    posto: {
      nome:     txt(posto.NOME),
      cnpj:     txt(posto.CNPJ),
      uf:       txt(posto.UF),
      comercial:String(txt(posto.POSTO_COMERCIAL)).toLowerCase() === 'true',
      ctaId:    txt(posto.ID),
    },
    frentista: { nome: txt(frent.NOME), ctaId: txt(frent.ID) },
    combustivel: {
      codigo:    txt(comb.CODIGO),
      descricao: txt(comb.DESCRICAO),
    },
    telemetria: {
      dataHora:  parseDataBR(txt(tel.DATA_HORA).split(' ')[0], txt(tel.DATA_HORA).split(' ')[1]),
      latitude:  num(tel.LATITUDE),
      longitude: num(tel.LONGITUDE),
    },
    empresa: { codigo: txt(emp.CODIGO), nome: txt(emp.NOME), uf: txt(emp.UF) },
    origem:  txt(a.ORIGEM),
  };
}

// Extrai array (aceita 0, 1 ou N)
function arr(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

// dataInicio/dataFim: string "DD/MM/YYYY" (formato exigido pela API).
// Se ambos iguais, retorna só os abastecimentos daquele dia — paginação limpa.
export async function sincronizarCtaAgora({ token, dryRun = false, confirmar = true, dataInicio = null, dataFim = null } = {}) {
  if (!token) throw new Error('token obrigatório');
  const db = getFirestore();
  const inicioMs = Date.now();

  if (!dataInicio) {
    const d = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    dataInicio = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  }

  const params = [`token=${encodeURIComponent(token)}`, `data_inicio=${encodeURIComponent(dataInicio)}`];
  if (dataFim)   params.push(`data_fim=${encodeURIComponent(dataFim)}`);
  if (confirmar) params.push('confirmar=true');
  const url = `${CTA_ENDPOINT}?${params.join('&')}`;

  // Retry 3× com backoff pra sobreviver a ECONNRESET / ETIMEDOUT / EAI_AGAIN etc
  let res, xml, lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      res = await fetch(url);
      if (!res.ok) throw new Error(`CTA HTTP ${res.status}`);
      xml = await res.text();
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
      const code = e?.cause?.code || e?.code || '';
      const transient = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED', 'EAI_AGAIN', 'UND_ERR_SOCKET'].includes(code);
      if (!transient || attempt === 3) throw e;
      const delay = 5000 * attempt;
      console.warn(`[cta] tentativa ${attempt} falhou (${code}); retry em ${delay/1000}s…`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  if (lastErr) throw lastErr;

  const parser = new XMLParser({
    ignoreAttributes:  true,
    trimValues:        true,
    parseTagValue:     false,
    parseAttributeValue: false,
  });
  const parsed = parser.parse(xml);
  const root = parsed?.CTAPLUS || {};
  const status = root.STATUS || {};
  const codigo = txt(status.CODIGO);
  const mensagem = txt(status.MENSAGEM);

  if (codigo !== '001') {
    return {
      ok: false,
      rateLimited: codigo === '017',
      codigo,
      mensagem,
      stats: { recebidos: 0, novos: 0, atualizados: 0, iguais: 0 },
      duracaoMs: Date.now() - inicioMs,
    };
  }

  const lista = arr(root.ABASTECIMENTOS?.ABASTECIMENTO);
  const stats = { recebidos: lista.length, novos: 0, atualizados: 0, iguais: 0, invalidos: 0, batches: 0, terceiros: 0 };

  // Carrega placas da frota — só sincroniza abastecimento de placa cadastrada.
  // Terceiros/agregados não devem entrar no relatório operacional.
  const frotaPlacas = new Set();
  const frotaSnap = await db.collection('veiculos').select('placa').get();
  frotaSnap.forEach(d => {
    const p = normalizarPlaca(d.data()?.placa || '');
    if (p) frotaPlacas.add(p);
  });

  // Delta — evita write desnecessário quando nada mudou.
  const existentes = new Map();
  if (!dryRun && lista.length) {
    const ids = lista.map(x => txt(x.ID)).filter(Boolean);
    // Firestore aceita até 30 ids por whereIn; chunks
    for (let i = 0; i < ids.length; i += 30) {
      const chunk = ids.slice(i, i + 30);
      const snap = await db.collection(COL).where('ctaId', 'in', chunk).get();
      snap.forEach(d => existentes.set(d.data().ctaId, d.data()));
    }
  }

  let batch = db.batch();
  let batchCount = 0;

  async function commitBatch() {
    if (batchCount === 0) return;
    if (!dryRun) await batch.commit();
    stats.batches += 1;
    batch = db.batch();
    batchCount = 0;
  }

  for (const raw of lista) {
    const abast = extrairAbastecimento(raw);
    if (!abast) { stats.invalidos += 1; continue; }
    // Filtra terceiros — só grava abastecimento cuja placa está na frota
    if (frotaPlacas.size > 0 && !frotaPlacas.has(abast.veiculo.placaNorm)) {
      stats.terceiros += 1;
      continue;
    }
    const existente = existentes.get(abast.ctaId);
    // Comparação rasa: volumeL + custoTotal + placa + dataInicio (suficiente pra detectar mudança)
    const igual = existente
      && existente.volumeL === abast.volumeL
      && existente.custoTotal === abast.custoTotal
      && existente.veiculo?.placa === abast.veiculo.placa
      && existente.dataInicio === abast.dataInicio;
    if (igual) { stats.iguais += 1; continue; }

    if (existente) stats.atualizados += 1;
    else stats.novos += 1;

    const ref = db.collection(COL).doc(abast.ctaId);
    batch.set(ref, {
      ...abast,
      sincronizadoEm: FieldValue.serverTimestamp(),
    }, { merge: true });
    batchCount += 1;
    if (batchCount >= BATCH_SIZE) await commitBatch();
  }
  await commitBatch();

  if (!dryRun) {
    await db.doc(META_DOC).set({
      ultimaSincronizacaoEm: FieldValue.serverTimestamp(),
      ultimaSincronizacaoStats: stats,
      ultimaSincronizacaoDuracaoMs: Date.now() - inicioMs,
    }, { merge: true });
  }

  return { ok: true, codigo, mensagem, stats, duracaoMs: Date.now() - inicioMs };
}
