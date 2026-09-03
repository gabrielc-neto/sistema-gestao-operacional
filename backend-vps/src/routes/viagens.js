// Rotas CRUD de viagens (= retiradas de combustivel na usina/distribuidora).
//
// Cada viagem consome 1..N contratos (via viagem_itens) — suporta complemento.
// Regras validadas no POST/PUT:
//   - Soma dos itens <= capacidade do veiculo
//   - Soma por contrato <= saldo do contrato
//   - Itens de produtos diferentes NAO sao permitidos (viagem = 1 produto por vez)
import { Router } from "express";
import { randomUUID } from "crypto";
import multer from "multer";
import fs from "fs/promises";
import path from "path";
import { q, q1, tx } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncH } from "../middleware/error.js";
import { gerarPdfAutorizacao } from "../services/pdf-autorizacao.js";

const UPLOADS_ROOT = process.env.UPLOAD_DIR || "/var/pontual/uploads";
const VIAGENS_DIR  = path.join(UPLOADS_ROOT, "viagens");
const uploadViagem = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const r = Router();
r.use(requireAuth);

function toCamel(row) {
  if (!row) return row;
  return {
    ...row,
    dataProgramada:       row.data_programada,
    dataSaida:            row.data_saida,
    dataChegada:          row.data_chegada,
    veiculoId:            row.veiculo_id,
    veiculoPlaca:         row.veiculo_placa,
    carretaId:            row.carreta_id,
    carretaPlaca:         row.carreta_placa,
    carreta2Id:           row.carreta2_id,
    carreta2Placa:        row.carreta2_placa,
    motoristaId:          row.motorista_id,
    motoristaNome:        row.motorista_nome,
    motoristaCpf:         row.motorista_cpf,
    motoristaCnh:         row.motorista_cnh,
    capacidadeVeiculoLitros: row.capacidade_veiculo_litros != null ? Number(row.capacidade_veiculo_litros) : null,
    origemFornecedorId:   row.origem_fornecedor_id,
    origemNome:           row.origem_nome,
    origemEndereco:       row.origem_endereco,
    origemCidade:         row.origem_cidade,
    origemUf:             row.origem_uf,
    destinoNome:          row.destino_nome,
    destinoEndereco:      row.destino_endereco,
    destinoCidade:        row.destino_cidade,
    destinoUf:            row.destino_uf,
    nfeNumero:            row.nfe_numero,
    nfeChave:             row.nfe_chave,
    nfeDataEmissao:       row.nfe_data_emissao,
    volumeTotalLitros:    Number(row.volume_total_litros || 0),
    kmSaida:              row.km_saida != null ? Number(row.km_saida) : null,
    kmChegada:            row.km_chegada != null ? Number(row.km_chegada) : null,
    custoPedagio:         row.custo_pedagio != null ? Number(row.custo_pedagio) : null,
    custoDiaria:          row.custo_diaria != null ? Number(row.custo_diaria) : null,
    criadoPor:            row.criado_por,
    criadoEm:             row.criado_em,
    atualizadoPor:        row.atualizado_por,
    atualizadoEm:         row.atualizado_em,
  };
}

function pick(body, camel, snake) {
  if (camel in body) return body[camel];
  if (snake in body) return body[snake];
  return undefined;
}

// GET /api/viagens?status=programada&motoristaId=X&veiculoId=Y&de=2026-08-01&ate=2026-08-31
r.get("/", asyncH(async (req, res) => {
  const { status, motoristaId, veiculoId, de, ate, limit = 500 } = req.query;
  const wh = [], params = [];
  if (status)       { params.push(status);       wh.push(`status = $${params.length}`); }
  if (motoristaId)  { params.push(motoristaId);  wh.push(`motorista_id = $${params.length}`); }
  if (veiculoId)    { params.push(veiculoId);    wh.push(`veiculo_id = $${params.length}`); }
  if (de)  { params.push(de);  wh.push(`COALESCE(data_saida::date, data_programada) >= $${params.length}`); }
  if (ate) { params.push(ate); wh.push(`COALESCE(data_saida::date, data_programada) <= $${params.length}`); }
  const where = wh.length ? `WHERE ${wh.join(" AND ")}` : "";
  params.push(Math.min(Number(limit) || 500, 1000));

  const rows = await q(
    `SELECT * FROM viagens ${where}
     ORDER BY data_saida DESC NULLS LAST, data_programada DESC, criado_em DESC
     LIMIT $${params.length}`,
    params
  );
  res.json({ rows: rows.map(toCamel), count: rows.length });
}));

// GET /api/viagens/:id → viagem + itens (com dados do contrato)
r.get("/:id", asyncH(async (req, res) => {
  const row = await q1(`SELECT * FROM viagens WHERE id = $1`, [req.params.id]);
  if (!row) return res.status(404).json({ error: "not_found" });
  const itens = await q(`
    SELECT vi.*, c.numero AS contrato_numero, c.produto, f.razao_social AS fornecedor_nome
      FROM viagem_itens vi
      JOIN contratos_compra c ON c.id = vi.contrato_id
      LEFT JOIN fornecedores f ON f.id = c.fornecedor_id
     WHERE vi.viagem_id = $1
     ORDER BY vi.ordem ASC, vi.criado_em ASC
  `, [req.params.id]);
  const viagem = toCamel(row);
  viagem.itens = itens.map(i => ({
    ...i,
    volumeLitros: Number(i.volume_litros),
    contratoNumero: i.contrato_numero,
    fornecedorNome: i.fornecedor_nome,
  }));
  res.json(viagem);
}));

// POST /api/viagens
// body: { veiculoId, motoristaId, dataProgramada, itens: [{ contratoId, volumeLitros }], ... }
r.post("/", asyncH(async (req, res) => {
  const b = req.body || {};
  const veiculoId    = pick(b, "veiculoId", "veiculo_id");
  const motoristaId  = pick(b, "motoristaId", "motorista_id");
  const itens        = Array.isArray(b.itens) ? b.itens : [];

  if (!veiculoId || !motoristaId || itens.length === 0) {
    return res.status(400).json({
      error: "campos_obrigatorios",
      detail: "veiculoId, motoristaId, itens[]"
    });
  }

  // Valida cada item: contrato existe, saldo suficiente, mesmo produto
  const contratos = [];
  for (const it of itens) {
    if (!it.contratoId || !it.volumeLitros || Number(it.volumeLitros) <= 0) {
      return res.status(400).json({ error: "item_invalido", detail: "contratoId + volumeLitros>0" });
    }
    const c = await q1(`
      SELECT c.*, v.saldo_litros
        FROM contratos_compra c
        LEFT JOIN v_contratos_saldo v ON v.id = c.id
       WHERE c.id = $1
    `, [it.contratoId]);
    if (!c) return res.status(400).json({ error: "contrato_nao_encontrado", detail: it.contratoId });
    if (c.status === "cancelado" || c.status === "esgotado") {
      return res.status(400).json({ error: "contrato_indisponivel", detail: `${c.numero} - ${c.status}` });
    }
    const saldo = Number(c.saldo_litros || 0);
    if (Number(it.volumeLitros) > saldo) {
      return res.status(400).json({
        error: "saldo_insuficiente",
        detail: `Contrato ${c.numero}: saldo ${saldo}L, pedido ${it.volumeLitros}L`
      });
    }
    contratos.push(c);
  }

  // Todos os itens devem ser do mesmo produto
  const produtos = new Set(contratos.map(c => c.produto));
  if (produtos.size > 1) {
    return res.status(400).json({
      error: "produtos_incompativeis",
      detail: "Todos os contratos da viagem devem ser do mesmo produto"
    });
  }

  // Valida capacidade do veiculo (se veiculo existir no banco)
  const veiculo = await q1(
    `SELECT id, placa, capacidade_litros FROM veiculos WHERE id::text = $1 OR placa = $1`,
    [veiculoId]
  ).catch(() => null);
  const total = itens.reduce((s, it) => s + Number(it.volumeLitros), 0);
  if (veiculo?.capacidade_litros && total > Number(veiculo.capacidade_litros)) {
    return res.status(400).json({
      error: "excede_capacidade",
      detail: `Total ${total}L > capacidade ${veiculo.capacidade_litros}L`
    });
  }

  // Denormaliza origem do PRIMEIRO contrato (principal)
  const principal = contratos[0];
  const fornecedor = await q1(
    `SELECT id, razao_social, endereco, cidade, uf FROM fornecedores WHERE id = $1`,
    [principal.fornecedor_id]
  );

  // Transacao: insere viagem + itens
  const viagemId = b.id || randomUUID();
  const final = await tx(async ({ q: qtx }) => {
    await qtx(`
      INSERT INTO viagens (
        id, data_programada, data_saida, data_chegada,
        veiculo_id, veiculo_placa, carreta_id, carreta_placa, carreta2_id, carreta2_placa,
        motorista_id, motorista_nome, motorista_cpf, motorista_cnh,
        capacidade_veiculo_litros,
        origem_fornecedor_id, origem_nome, origem_endereco, origem_cidade, origem_uf,
        destino_nome, destino_endereco, destino_cidade, destino_uf,
        nfe_numero, nfe_chave, nfe_data_emissao,
        km_saida, km_chegada, custo_pedagio, custo_diaria,
        observacoes, status, criado_por
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14,
        $15,
        $16, $17, $18, $19, $20,
        COALESCE($21, 'PONTUAL BRASIL PETROLEO LTDA - Base Araucaria'),
        COALESCE($22, 'Rua Luiz Franceschi, 666 - Thomaz Coelho'),
        COALESCE($23, 'Araucaria'), COALESCE($24, 'PR'),
        $25, $26, $27,
        $28, $29, $30, $31,
        $32, COALESCE($33, 'programada'), $34
      )
      RETURNING *
    `, [
      viagemId,
      pick(b, "dataProgramada", "data_programada") || null,
      pick(b, "dataSaida", "data_saida") || null,
      pick(b, "dataChegada", "data_chegada") || null,
      veiculoId, veiculo?.placa || pick(b, "veiculoPlaca", "veiculo_placa") || null,
      pick(b, "carretaId", "carreta_id") || null,
      pick(b, "carretaPlaca", "carreta_placa") || null,
      pick(b, "carreta2Id", "carreta2_id") || null,
      pick(b, "carreta2Placa", "carreta2_placa") || null,
      motoristaId, pick(b, "motoristaNome", "motorista_nome") || null,
      pick(b, "motoristaCpf", "motorista_cpf") || null,
      pick(b, "motoristaCnh", "motorista_cnh") || null,
      pick(b, "capacidadeVeiculoLitros", "capacidade_veiculo_litros") || veiculo?.capacidade || null,
      principal.fornecedor_id, fornecedor?.razao_social || null,
      fornecedor?.endereco || null, fornecedor?.cidade || null, fornecedor?.uf || null,
      pick(b, "destinoNome", "destino_nome"),
      pick(b, "destinoEndereco", "destino_endereco"),
      pick(b, "destinoCidade", "destino_cidade"),
      pick(b, "destinoUf", "destino_uf"),
      pick(b, "nfeNumero", "nfe_numero") || null,
      pick(b, "nfeChave", "nfe_chave") || null,
      pick(b, "nfeDataEmissao", "nfe_data_emissao") || null,
      pick(b, "kmSaida", "km_saida"),
      pick(b, "kmChegada", "km_chegada"),
      pick(b, "custoPedagio", "custo_pedagio"),
      pick(b, "custoDiaria", "custo_diaria"),
      b.observacoes || null,
      b.status,
      req.user?.nome || req.user?.email || "sistema"
    ]);

    for (let i = 0; i < itens.length; i++) {
      const it = itens[i];
      await qtx(`
        INSERT INTO viagem_itens (id, viagem_id, contrato_id, volume_litros, ordem)
        VALUES ($1, $2, $3, $4, $5)
      `, [randomUUID(), viagemId, it.contratoId, Number(it.volumeLitros), i + 1]);
    }

    // Trigger ja atualizou volume_total_litros — devolve linha final
    const rows = await qtx(`SELECT * FROM viagens WHERE id = $1`, [viagemId]);
    return rows[0];
  });

  res.status(201).json(toCamel(final));
}));

// PUT /api/viagens/:id (nao mexe em itens — pra isso use endpoint /itens)
r.put("/:id", asyncH(async (req, res) => {
  const b = req.body || {};
  const existe = await q1(`SELECT id FROM viagens WHERE id = $1`, [req.params.id]);
  if (!existe) return res.status(404).json({ error: "not_found" });
  const row = await q1(`
    UPDATE viagens SET
      data_programada = $2, data_saida = $3, data_chegada = $4,
      nfe_numero = $5, nfe_chave = $6, nfe_data_emissao = $7,
      km_saida = $8, km_chegada = $9,
      custo_pedagio = $10, custo_diaria = $11,
      observacoes = $12, status = COALESCE($13, status),
      atualizado_por = $14, atualizado_em = NOW()
    WHERE id = $1
    RETURNING *
  `, [
    req.params.id,
    pick(b, "dataProgramada", "data_programada") || null,
    pick(b, "dataSaida", "data_saida") || null,
    pick(b, "dataChegada", "data_chegada") || null,
    pick(b, "nfeNumero", "nfe_numero") || null,
    pick(b, "nfeChave", "nfe_chave") || null,
    pick(b, "nfeDataEmissao", "nfe_data_emissao") || null,
    pick(b, "kmSaida", "km_saida"),
    pick(b, "kmChegada", "km_chegada"),
    pick(b, "custoPedagio", "custo_pedagio"),
    pick(b, "custoDiaria", "custo_diaria"),
    b.observacoes || null,
    b.status,
    req.user?.nome || req.user?.email || "sistema"
  ]);
  res.json(toCamel(row));
}));

// GET /api/viagens/:id/autorizacao-pdf → gera Autorizacao de Carregamento (PDF)
// Numeracao = <numero_contrato_principal>-<seq> (seq = posicao cronologica dentro do contrato)
r.get("/:id/autorizacao-pdf", asyncH(async (req, res) => {
  const viagem = await q1(`SELECT * FROM viagens WHERE id = $1`, [req.params.id]);
  if (!viagem) return res.status(404).json({ error: "not_found" });

  // Contrato principal = primeiro item (ordem=1) OU o de maior volume da viagem
  const itens = await q(`
    SELECT vi.*, c.numero AS contrato_numero, c.produto, c.produto_descricao
      FROM viagem_itens vi
      JOIN contratos_compra c ON c.id = vi.contrato_id
     WHERE vi.viagem_id = $1
     ORDER BY vi.ordem ASC LIMIT 1
  `, [req.params.id]);
  const itemPrincipal = itens[0];
  if (!itemPrincipal) return res.status(400).json({ error: "viagem_sem_itens" });

  // Sequencia da viagem dentro do contrato (ordem cronologica das viagens do mesmo contrato)
  // Usa ROW_NUMBER pra evitar bugs de comparacao de datas com null/tipos mistos
  const seqRow = await q1(`
    WITH ordenadas AS (
      SELECT v.id,
             ROW_NUMBER() OVER (
               ORDER BY COALESCE(v.data_programada, v.criado_em::date), v.criado_em
             ) AS pos
        FROM viagem_itens vi
        JOIN viagens v ON v.id = vi.viagem_id
       WHERE vi.contrato_id = $1
         AND v.status <> 'cancelada'
    )
    SELECT pos FROM ordenadas WHERE id = $2
  `, [itemPrincipal.contrato_id, viagem.id]);
  const seq = Number(seqRow?.pos || 1);

  // Extrai o "numero limpo" do contrato pro rotulo do PDF (evita quebras de linha
  // em contratos com titulo longo tipo "01-07-2025 CONTRATO 97697" → mostra so "97697")
  function limparNumeroContrato(txt) {
    const s = String(txt || "");
    if (s.length <= 15) return s;
    const matches = s.match(/\d{4,}/g);
    return matches && matches.length ? matches[matches.length - 1] : s.slice(-15);
  }
  const numeroContratoLimpo = limparNumeroContrato(itemPrincipal.contrato_numero);

  // Busca nome_fantasia do fornecedor (fica no PDF em vez da razao social longa)
  const fornInfo = await q1(
    `SELECT nome_fantasia FROM fornecedores WHERE id = $1`,
    [viagem.origem_fornecedor_id]
  );

  const dados = {
    dataCarregamento:  viagem.data_programada || viagem.data_saida || viagem.criado_em,
    nAutorizacao:      `${numeroContratoLimpo}-${seq}`,
    numeroContrato:    numeroContratoLimpo,
    usinaNome:         viagem.origem_nome || "",
    usinaNomeFantasia: fornInfo?.nome_fantasia || "",
    motoristaNome:     viagem.motorista_nome || "",
    motoristaCpf:      viagem.motorista_cpf || "",
    motoristaCnh:      viagem.motorista_cnh || "",
    placaCavalo:       viagem.veiculo_placa || "",
    placaCarreta1:     viagem.carreta_placa || "",
    placaCarreta2:     viagem.carreta2_placa || "",
    produto:           itemPrincipal.produto,
    produtoDescricao:  itemPrincipal.produto_descricao,
    capacidadeLitros:  viagem.capacidade_veiculo_litros || viagem.volume_total_litros,
    responsavelNome:   "Rosilda de Lima Ramos",
  };

  const pdf = await gerarPdfAutorizacao(dados);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="autorizacao-${dados.nAutorizacao}.pdf"`);
  res.send(pdf);
}));

// DELETE /api/viagens/:id → cancela (soft)
r.delete("/:id", asyncH(async (req, res) => {
  const row = await q1(
    `UPDATE viagens SET status = 'cancelada', atualizado_em = NOW(), atualizado_por = $2
     WHERE id = $1 RETURNING id`,
    [req.params.id, req.user?.nome || req.user?.email || "sistema"]
  );
  if (!row) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
}));

// ============================================================
// ANEXOS DA VIAGEM (NF-e, comprovantes, fotos)
// ============================================================
// GET /api/viagens/:id/anexos
r.get("/:id/anexos", asyncH(async (req, res) => {
  const rows = await q(
    `SELECT id, tipo, nome_arquivo, caminho, mime_type, tamanho_bytes, criado_por, criado_em
       FROM viagens_anexos WHERE viagem_id = $1 ORDER BY criado_em DESC`,
    [req.params.id]
  );
  res.json({ rows, count: rows.length });
}));

// POST /api/viagens/:id/anexos  (multipart, campo "arquivo", body.tipo)
r.post("/:id/anexos", uploadViagem.single("arquivo"), asyncH(async (req, res) => {
  const viagem = await q1(`SELECT id, numero FROM viagens WHERE id = $1`, [req.params.id]);
  if (!viagem) return res.status(404).json({ error: "viagem_nao_encontrada" });
  if (!req.file) return res.status(400).json({ error: "arquivo_ausente" });

  const tipo = req.body?.tipo || "nf";
  const ano  = new Date().getFullYear();
  const dir  = path.join(VIAGENS_DIR, String(ano));
  await fs.mkdir(dir, { recursive: true });

  const numeroPad = String(viagem.numero).padStart(4, "0");
  const safeOrig  = req.file.originalname.replace(/[^\w.\-]+/g, "_").slice(0, 80);
  const nomeSeguro = `V-${numeroPad}-${Date.now()}-${safeOrig}`;
  const caminho   = path.join(dir, nomeSeguro);
  await fs.writeFile(caminho, req.file.buffer);

  const id = randomUUID();
  const row = await q1(`
    INSERT INTO viagens_anexos (id, viagem_id, tipo, nome_arquivo, caminho, mime_type, tamanho_bytes, criado_por)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [
    id, req.params.id, tipo,
    req.file.originalname, caminho, req.file.mimetype, req.file.size,
    req.user?.nome || req.user?.email || "sistema"
  ]);
  res.status(201).json(row);
}));

// GET /api/viagens/:id/anexos/:anexoId/download  (stream do arquivo)
r.get("/:id/anexos/:anexoId/download", asyncH(async (req, res) => {
  const row = await q1(
    `SELECT nome_arquivo, caminho, mime_type FROM viagens_anexos WHERE id = $1 AND viagem_id = $2`,
    [req.params.anexoId, req.params.id]
  );
  if (!row) return res.status(404).json({ error: "not_found" });
  res.setHeader("Content-Type", row.mime_type || "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${row.nome_arquivo}"`);
  res.sendFile(path.resolve(row.caminho));
}));

// DELETE /api/viagens/:id/anexos/:anexoId
r.delete("/:id/anexos/:anexoId", asyncH(async (req, res) => {
  const row = await q1(
    `DELETE FROM viagens_anexos WHERE id = $1 AND viagem_id = $2 RETURNING caminho`,
    [req.params.anexoId, req.params.id]
  );
  if (!row) return res.status(404).json({ error: "not_found" });
  await fs.unlink(row.caminho).catch(() => {}); // não fatal se arquivo já sumiu
  res.json({ ok: true });
}));

export default r;
