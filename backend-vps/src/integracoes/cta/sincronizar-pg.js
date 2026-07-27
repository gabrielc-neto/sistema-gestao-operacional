// CTA Smart sincronizador — versão PostgreSQL (adaptada do Firebase original).
// Grava em documents.abastecimentos_cta

import { XMLParser } from "fast-xml-parser";
import { q, q1 } from "../../db.js";

const CTA_ENDPOINT = "https://ctasmart.com.br:8443/SvWebSincronizaAbastecimentos";
const CTA_INFORMA_ENDPOINT = "https://ctasmart.com.br:8443/SvWebInformaSincronismoAbastecimentos";
const COL = "abastecimentos_cta";

// Avança a fila da API CTA marcando registros como processados.
// Deve ser chamado após consumir SvWebSincronizaAbastecimentos com sucesso.
// Sem isso, a fila NUNCA avança e sempre recebemos os mesmos 100 registros antigos.
async function informarSincronismo({ token, ids, status = "SUCESSO" }) {
  if (!ids || ids.length === 0) return { ok: true, informados: 0 };
  const url = `${CTA_INFORMA_ENDPOINT}?token=${encodeURIComponent(token)}&formato=json`;
  const body = { abastecimentos: ids.map(id => ({ id: String(id), status, motivo_erro: "" })) };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const txtResp = await res.text();
  if (!res.ok) return { ok: false, erro: `HTTP ${res.status}: ${txtResp.slice(0, 200)}` };
  return { ok: true, informados: ids.length, response: txtResp.slice(0, 300) };
}

function parseDataBR(dataStr, horaStr) {
  if (!dataStr) return null;
  const md = String(dataStr).match(/^(\d{2})\/(\d{2})\/(\d+)$/);
  if (!md) return null;
  let ano = Number(md[3]);
  if (ano < 100) ano += 2000;
  else if (ano < 1000) ano += 2000;
  if (ano < 2000 || ano > 2100) return null;
  const mes = md[2], dia = md[1];
  const hora = horaStr && /^\d{2}:\d{2}(:\d{2})?$/.test(String(horaStr)) ? String(horaStr) : "00:00:00";
  return `${ano}-${mes}-${dia}T${hora.length === 5 ? hora + ":00" : hora}-03:00`;
}
function num(v) { if (v == null || v === "") return null; const n = Number(String(v).replace(/\./g, "").replace(",", ".")); return Number.isFinite(n) ? n : null; }
function txt(v) { if (v == null) return ""; if (typeof v === "object") return ""; return String(v).trim(); }
function normalizarPlaca(p) { return String(p || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
function arr(v) { if (v == null) return []; return Array.isArray(v) ? v : [v]; }

function extrairAbastecimento(a) {
  const idCta = txt(a.ID);
  if (!idCta) return null;
  const veic = a.VEICULO || {}, mot = a.MOTORISTA || {}, posto = a.POSTO || {}, frent = a.FRENTISTA || {}, tel = a.TELEMETRIA || {}, comb = a.COMBUSTIVEL || {}, emp = a.EMPRESA || {};
  return {
    ctaId: idCta, sequencial: txt(a.SEQUENCIAL),
    dataInicio: parseDataBR(txt(a.DATA_INICIO), txt(a.HORA_INICIO)),
    dataFim:    parseDataBR(txt(a.DATA_FIM),    txt(a.HORA_FIM)),
    volumeL: num(a.VOLUME_FIXED) ?? num(a.VOLUME),
    odometro: num(a.ODOMETRO), distancia: num(a.DISTANCIA),
    mediaKmL: num(a.MEDIA_KILOMETRO_LITRO), horimetro: num(a.HORIMETRO),
    horasTrabalhadas: num(a.HORAS_TRABALHADAS), mediaLh: num(a.MEDIA_LITRO_HORA),
    custoTotal: num(a.CUSTO), custoUnitario: num(a.CUSTO_UNITARIO),
    encerrante: num(a.ENCERRANTE_FIXED) ?? num(a.ENCERRANTE),
    encerranteEletronica: num(a.ENCERRANTE_ELETRONICA_FIXED) ?? num(a.ENCERRANTE_ELETRONICA),
    produtoCategoriaId: txt(a.PRODUTO_CATEGORIA_ID),
    completo: String(txt(a.COMPLETO)).toLowerCase() === "true",
    chaveNfe: txt(a.CHAVE_NFE), lote: txt(a.LOTE),
    veiculo: { placa: txt(veic.PLACA), placaNorm: normalizarPlaca(veic.PLACA), frota: txt(veic.FROTA), nome: txt(veic.NOME), ctaId: txt(veic.ID), modelo: txt(veic.MODELO), categoria: txt(veic.CATEGORIA), volumeMax: num(veic.VOLUME_MAX) },
    motorista: { nome: txt(mot.NOME), cpf: txt(mot.CPF), cnh: txt(mot.CNH), ctaId: txt(mot.ID) },
    posto: { nome: txt(posto.NOME), cnpj: txt(posto.CNPJ), uf: txt(posto.UF), comercial: String(txt(posto.POSTO_COMERCIAL)).toLowerCase() === "true", ctaId: txt(posto.ID) },
    frentista: { nome: txt(frent.NOME), ctaId: txt(frent.ID) },
    combustivel: { codigo: txt(comb.CODIGO), descricao: txt(comb.DESCRICAO) },
    telemetria: { dataHora: parseDataBR(txt(tel.DATA_HORA).split(" ")[0], txt(tel.DATA_HORA).split(" ")[1]), latitude: num(tel.LATITUDE), longitude: num(tel.LONGITUDE) },
    empresa: { codigo: txt(emp.CODIGO), nome: txt(emp.NOME), uf: txt(emp.UF) },
    origem: txt(a.ORIGEM),
  };
}

export async function sincronizarCtaAgora({ token, dryRun = false, avancarFila = true, dataInicio = null, dataFim = null } = {}) {
  if (!token) throw new Error("token obrigatório");
  const inicioMs = Date.now();

  if (!dataInicio) {
    const d = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    dataInicio = `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
  }
  // NOTA: parâmetro `confirmar` NÃO existe na API CTA (era bug antigo). Pra avançar
  // a fila, chamar SvWebInformaSincronismoAbastecimentos depois de processar.
  const params = [`token=${encodeURIComponent(token)}`, `data_inicio=${encodeURIComponent(dataInicio)}`];
  if (dataFim) params.push(`data_fim=${encodeURIComponent(dataFim)}`);
  const url = `${CTA_ENDPOINT}?${params.join("&")}`;

  let xml, lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`CTA HTTP ${res.status}`);
      xml = await res.text();
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
      const code = e?.cause?.code || e?.code || "";
      const transient = ["ECONNRESET","ETIMEDOUT","ENOTFOUND","ECONNREFUSED","EAI_AGAIN","UND_ERR_SOCKET"].includes(code);
      if (!transient || attempt === 3) throw e;
      await new Promise(r => setTimeout(r, 5000 * attempt));
    }
  }
  if (lastErr) throw lastErr;

  const parser = new XMLParser({ ignoreAttributes: true, trimValues: true, parseTagValue: false, parseAttributeValue: false });
  const parsed = parser.parse(xml);
  const root = parsed?.CTAPLUS || {};
  const status = root.STATUS || {};
  const codigo = txt(status.CODIGO);
  const mensagem = txt(status.MENSAGEM);

  if (codigo !== "001") {
    return { ok: false, rateLimited: codigo === "017", codigo, mensagem, stats: { recebidos: 0, novos: 0 }, duracaoMs: Date.now() - inicioMs };
  }

  const lista = arr(root.ABASTECIMENTOS?.ABASTECIMENTO);
  const stats = { recebidos: lista.length, novos: 0, atualizados: 0, iguais: 0, invalidos: 0, terceiros: 0, avancados: 0 };
  const idsParaAvancar = []; // IDs a informar como SUCESSO (avança fila)

  // Placas da frota (só sincroniza abastecimento de placa cadastrada)
  const frotaPlacas = new Set();
  try {
    const rowsV = await q(`SELECT placa FROM veiculos`);
    for (const r of rowsV) { const p = normalizarPlaca(r.placa || ""); if (p) frotaPlacas.add(p); }
  } catch (e) { console.warn("[cta] frota vazia:", e.message); }

  for (const raw of lista) {
    const abast = extrairAbastecimento(raw);
    if (!abast) { stats.invalidos++; continue; }
    // Terceiros também precisam avançar na fila (pra não travar) — marca SUCESSO mesmo sem gravar
    if (frotaPlacas.size > 0 && !frotaPlacas.has(abast.veiculo.placaNorm)) {
      stats.terceiros++;
      idsParaAvancar.push(abast.ctaId);
      continue;
    }

    // Detecta existente
    let existente = null;
    try {
      const row = await q1(`SELECT data FROM documents WHERE collection = $1 AND id = $2`, [COL, abast.ctaId]);
      if (row) existente = row.data;
    } catch { /* ok */ }

    const igual = existente
      && existente.volumeL === abast.volumeL
      && existente.custoTotal === abast.custoTotal
      && existente.veiculo?.placa === abast.veiculo.placa
      && existente.dataInicio === abast.dataInicio;

    if (igual) {
      stats.iguais++;
      idsParaAvancar.push(abast.ctaId); // já processado, pode remover da fila
      continue;
    }

    if (existente) stats.atualizados++; else stats.novos++;

    if (!dryRun) {
      await q1(
        `INSERT INTO documents (collection, id, data) VALUES ($1, $2, $3)
         ON CONFLICT (collection, id) DO UPDATE SET data = documents.data || EXCLUDED.data`,
        [COL, abast.ctaId, JSON.stringify({ ...abast, sincronizadoEm: new Date().toISOString() })]
      );
      idsParaAvancar.push(abast.ctaId);
    }
  }

  // AVANÇA A FILA — sem isso, próximo request pega os mesmos 100 registros de novo
  let infoResult = null;
  if (avancarFila && !dryRun && idsParaAvancar.length > 0) {
    // Aguarda 62s pra respeitar rate limit (1 req/60s por endpoint por token)
    await new Promise(r => setTimeout(r, 62000));
    infoResult = await informarSincronismo({ token, ids: idsParaAvancar, status: "SUCESSO" });
    if (infoResult.ok) stats.avancados = infoResult.informados;
    else console.warn("[cta] falha ao avançar fila:", infoResult.erro);
  }

  return { ok: true, codigo, mensagem, stats, avancoFila: infoResult, duracaoMs: Date.now() - inicioMs };
}
