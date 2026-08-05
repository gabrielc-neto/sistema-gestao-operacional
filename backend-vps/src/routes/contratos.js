// Rotas CRUD de contratos_compra + upload do PDF + parse automatico.
//
// Endpoints:
//   GET    /api/contratos                  → lista com saldo (via view v_contratos_saldo)
//   GET    /api/contratos/:id              → detalhe + itens
//   GET    /api/contratos/:id/viagens      → viagens que consumiram deste contrato
//   POST   /api/contratos                  → cria
//   PUT    /api/contratos/:id              → atualiza
//   DELETE /api/contratos/:id              → cancela (soft)
//   POST   /api/contratos/parse-pdf        → upload PDF → devolve JSON de campos detectados
//   POST   /api/contratos/:id/anexos       → salva PDF anexo no contrato
//   GET    /api/contratos/sugerir-complemento?contratoId=X&capacidadeLitros=38000
//                                           → lista contratos ativos mesmo produto/fornecedor
//                                             com saldo suficiente pra completar
import { Router } from "express";
import { randomUUID } from "crypto";
import multer from "multer";
import fs from "fs/promises";
import path from "path";
import { q, q1 } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncH } from "../middleware/error.js";
import { parseContratoPdf } from "../services/contrato-parser.js";

const r = Router();
r.use(requireAuth);

const UPLOADS_ROOT = process.env.UPLOAD_DIR || process.env.UPLOADS_DIR || "/var/pontual/uploads";
const CONTRATOS_DIR = path.join(UPLOADS_ROOT, "contratos");

// multer em memoria (arquivo pequeno, PDF)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

function toCamel(row) {
  if (!row) return row;
  return {
    ...row,
    dataContrato:          row.data_contrato,
    operadorFornecedor:    row.operador_fornecedor,
    tipoFormulario:        row.tipo_formulario,
    fornecedorId:          row.fornecedor_id,
    compradorRazaoSocial:  row.comprador_razao_social,
    compradorCnpj:         row.comprador_cnpj,
    produtoDescricao:      row.produto_descricao,
    volumeTotalLitros:     Number(row.volume_total_litros),
    volumeRetiradoLitros:  row.volume_retirado_litros != null ? Number(row.volume_retirado_litros) : null,
    saldoLitros:           row.saldo_litros != null ? Number(row.saldo_litros) : null,
    percentualRetirado:    row.percentual_retirado != null ? Number(row.percentual_retirado) : null,
    precoPorM3:            Number(row.preco_por_m3),
    icmsPorM3:             row.icms_por_m3 != null ? Number(row.icms_por_m3) : null,
    valorTotal:            Number(row.valor_total),
    dataPagamento:         row.data_pagamento,
    formaPagamento:        row.forma_pagamento,
    condicoesRetirada:     row.condicoes_retirada,
    localRetiradaNome:     row.local_retirada_nome,
    localRetiradaEndereco: row.local_retirada_endereco,
    indiceReferencia:      row.indice_referencia,
    contratoPaiId:         row.contrato_pai_id,
    criadoPor:             row.criado_por,
    criadoEm:              row.criado_em,
    atualizadoPor:         row.atualizado_por,
    atualizadoEm:          row.atualizado_em,
  };
}

function pick(body, camel, snake) {
  if (camel in body) return body[camel];
  if (snake in body) return body[snake];
  return undefined;
}

// GET /api/contratos?produto=ETANOL_ANIDRO&status=ativo&fornecedorId=X
r.get("/", asyncH(async (req, res) => {
  const { produto, status, fornecedorId, busca, limit = 500 } = req.query;
  const wh = [], params = [];
  if (produto)      { params.push(produto);      wh.push(`c.produto = $${params.length}`); }
  if (status)       { params.push(status);       wh.push(`c.status  = $${params.length}`); }
  if (fornecedorId) { params.push(fornecedorId); wh.push(`c.fornecedor_id = $${params.length}`); }
  if (busca) {
    params.push(`%${busca}%`);
    wh.push(`(c.numero ILIKE $${params.length})`);
  }
  const where = wh.length ? `WHERE ${wh.join(" AND ")}` : "";
  params.push(Math.min(Number(limit) || 500, 1000));

  // JOIN com a view de saldo pra devolver ja com percentual/saldo calculados
  const rows = await q(`
    SELECT c.*,
           v.volume_retirado_litros,
           v.saldo_litros,
           v.percentual_retirado,
           f.razao_social AS fornecedor_razao_social,
           f.cnpj         AS fornecedor_cnpj
    FROM contratos_compra c
    LEFT JOIN v_contratos_saldo v ON v.id = c.id
    LEFT JOIN fornecedores f      ON f.id = c.fornecedor_id
    ${where}
    ORDER BY c.data_contrato DESC, c.criado_em DESC
    LIMIT $${params.length}
  `, params);
  res.json({ rows: rows.map(toCamel), count: rows.length });
}));

// GET /api/contratos/sugerir-complemento
r.get("/sugerir-complemento", asyncH(async (req, res) => {
  const { contratoId, capacidadeLitros } = req.query;
  if (!contratoId || !capacidadeLitros) {
    return res.status(400).json({ error: "params_obrigatorios", detail: "contratoId, capacidadeLitros" });
  }
  const principal = await q1(
    `SELECT c.*, v.saldo_litros
       FROM contratos_compra c
       LEFT JOIN v_contratos_saldo v ON v.id = c.id
      WHERE c.id = $1`,
    [contratoId]
  );
  if (!principal) return res.status(404).json({ error: "contrato_nao_encontrado" });

  const cap = Number(capacidadeLitros);
  const saldoPrincipal = Number(principal.saldo_litros || 0);
  const falta = Math.max(0, cap - saldoPrincipal);

  if (falta <= 0) {
    return res.json({ precisaComplemento: false, saldoPrincipal, faltaLitros: 0, sugestoes: [] });
  }

  // Contratos ativos MESMO FORNECEDOR e MESMO PRODUTO (regra Wesley 2026-08-05:
  // complemento eh sempre da mesma usina — ex: Coopcana com 8m3 + Coopcana +30m3
  // negociados pra fechar carga do bitrem)
  const sugestoes = await q(`
    SELECT c.*, v.saldo_litros
      FROM contratos_compra c
      JOIN v_contratos_saldo v ON v.id = c.id
     WHERE c.id <> $1
       AND c.produto       = $2
       AND c.fornecedor_id = $3
       AND c.status = 'ativo'
       AND v.saldo_litros > 0
     ORDER BY v.saldo_litros DESC
     LIMIT 10
  `, [contratoId, principal.produto, principal.fornecedor_id]);

  res.json({
    precisaComplemento: true,
    saldoPrincipal,
    faltaLitros: falta,
    sugestoes: sugestoes.map(toCamel),
  });
}));

// POST /api/contratos/parse-pdf → upload sem salvar contrato ainda
r.post("/parse-pdf", upload.single("pdf"), asyncH(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "arquivo_ausente", detail: "campo pdf" });
  const resultado = await parseContratoPdf(req.file.buffer);
  res.json(resultado);
}));

// GET /api/contratos/:id
r.get("/:id", asyncH(async (req, res) => {
  const row = await q1(`
    SELECT c.*,
           v.volume_retirado_litros,
           v.saldo_litros,
           v.percentual_retirado,
           f.razao_social AS fornecedor_razao_social,
           f.cnpj         AS fornecedor_cnpj
    FROM contratos_compra c
    LEFT JOIN v_contratos_saldo v ON v.id = c.id
    LEFT JOIN fornecedores f      ON f.id = c.fornecedor_id
    WHERE c.id = $1
  `, [req.params.id]);
  if (!row) return res.status(404).json({ error: "not_found" });

  const anexos = await q(
    `SELECT id, tipo, nome_arquivo, caminho, mime_type, tamanho_bytes, metodo_extracao, criado_em
       FROM contratos_anexos WHERE contrato_id = $1 ORDER BY criado_em DESC`,
    [req.params.id]
  );
  const contrato = toCamel(row);
  contrato.anexos = anexos;
  res.json(contrato);
}));

// GET /api/contratos/:id/viagens
// Wesley 2026-08-05: viagens canceladas nao aparecem na timeline do contrato
// (ficam so no historico global /viagens filtrando por Cancelada).
r.get("/:id/viagens", asyncH(async (req, res) => {
  const rows = await q(`
    SELECT v.id, v.numero, v.data_programada, v.data_saida, v.data_chegada,
           v.veiculo_placa, v.carreta_placa, v.motorista_nome,
           v.volume_total_litros, v.status, vi.volume_litros AS volume_desse_contrato
      FROM viagem_itens vi
      JOIN viagens v ON v.id = vi.viagem_id
     WHERE vi.contrato_id = $1
       AND v.status <> 'cancelada'
     ORDER BY v.data_saida DESC NULLS LAST, v.criado_em DESC
  `, [req.params.id]);
  res.json({ rows });
}));

// POST /api/contratos
r.post("/", asyncH(async (req, res) => {
  const b = req.body || {};
  const numero      = b.numero;
  const fornecedorId = pick(b, "fornecedorId", "fornecedor_id");
  const produto     = b.produto;
  const volumeLitros = pick(b, "volumeTotalLitros", "volume_total_litros");

  if (!numero || !fornecedorId || !produto || !volumeLitros) {
    return res.status(400).json({
      error: "campos_obrigatorios",
      detail: "numero, fornecedorId, produto, volumeTotalLitros"
    });
  }

  const id = b.id || randomUUID();
  const row = await q1(`
    INSERT INTO contratos_compra (
      id, numero, protocolo, data_contrato, operador_fornecedor, tipo_formulario,
      fornecedor_id, comprador_razao_social, comprador_cnpj,
      produto, produto_descricao, volume_total_litros,
      preco_por_m3, icms_por_m3, valor_total, data_pagamento, forma_pagamento,
      modalidade, condicoes_retirada, local_retirada_nome, local_retirada_endereco,
      safra, indice_referencia, observacoes, contrato_pai_id, status, criado_por
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, COALESCE($8, 'PONTUAL BRASIL PETROLEO LTDA'), COALESCE($9, '02.886.685/0001-40'),
      $10, $11, $12,
      $13, COALESCE($14, 0), $15, $16, $17,
      $18, $19, $20, $21,
      $22, $23, $24, $25, COALESCE($26, 'ativo'), $27
    )
    RETURNING *
  `, [
    id, numero, b.protocolo || null,
    pick(b, "dataContrato", "data_contrato") || new Date().toISOString().slice(0,10),
    pick(b, "operadorFornecedor", "operador_fornecedor") || null,
    pick(b, "tipoFormulario", "tipo_formulario") || null,
    fornecedorId,
    pick(b, "compradorRazaoSocial", "comprador_razao_social") || null,
    pick(b, "compradorCnpj", "comprador_cnpj") || null,
    produto,
    pick(b, "produtoDescricao", "produto_descricao") || null,
    volumeLitros,
    pick(b, "precoPorM3", "preco_por_m3") || 0,
    pick(b, "icmsPorM3", "icms_por_m3"),
    pick(b, "valorTotal", "valor_total") || 0,
    pick(b, "dataPagamento", "data_pagamento") || null,
    pick(b, "formaPagamento", "forma_pagamento") || null,
    b.modalidade || null,
    pick(b, "condicoesRetirada", "condicoes_retirada") || null,
    pick(b, "localRetiradaNome", "local_retirada_nome") || null,
    pick(b, "localRetiradaEndereco", "local_retirada_endereco") || null,
    b.safra || null,
    pick(b, "indiceReferencia", "indice_referencia") || null,
    b.observacoes || null,
    pick(b, "contratoPaiId", "contrato_pai_id") || null,
    b.status,
    req.user?.nome || req.user?.email || "sistema"
  ]);
  res.status(201).json(toCamel(row));
}));

// PUT /api/contratos/:id
r.put("/:id", asyncH(async (req, res) => {
  const b = req.body || {};
  const existe = await q1(`SELECT id FROM contratos_compra WHERE id = $1`, [req.params.id]);
  if (!existe) return res.status(404).json({ error: "not_found" });

  const row = await q1(`
    UPDATE contratos_compra SET
      numero               = COALESCE($2, numero),
      protocolo            = COALESCE($3, protocolo),
      data_contrato        = COALESCE($4, data_contrato),
      operador_fornecedor  = $5,
      tipo_formulario      = $6,
      fornecedor_id        = COALESCE($7, fornecedor_id),
      produto              = COALESCE($8, produto),
      produto_descricao    = $9,
      volume_total_litros  = COALESCE($10, volume_total_litros),
      preco_por_m3         = COALESCE($11, preco_por_m3),
      icms_por_m3          = COALESCE($12, icms_por_m3),
      valor_total          = COALESCE($13, valor_total),
      data_pagamento       = $14,
      forma_pagamento      = $15,
      modalidade           = $16,
      condicoes_retirada   = $17,
      local_retirada_nome  = $18,
      local_retirada_endereco = $19,
      safra                = $20,
      indice_referencia    = $21,
      observacoes          = $22,
      contrato_pai_id      = $23,
      status               = COALESCE($24, status),
      atualizado_por       = $25,
      atualizado_em        = NOW()
    WHERE id = $1
    RETURNING *
  `, [
    req.params.id,
    b.numero, b.protocolo,
    pick(b, "dataContrato", "data_contrato"),
    pick(b, "operadorFornecedor", "operador_fornecedor") || null,
    pick(b, "tipoFormulario", "tipo_formulario") || null,
    pick(b, "fornecedorId", "fornecedor_id"),
    b.produto,
    pick(b, "produtoDescricao", "produto_descricao") || null,
    pick(b, "volumeTotalLitros", "volume_total_litros"),
    pick(b, "precoPorM3", "preco_por_m3"),
    pick(b, "icmsPorM3", "icms_por_m3"),
    pick(b, "valorTotal", "valor_total"),
    pick(b, "dataPagamento", "data_pagamento") || null,
    pick(b, "formaPagamento", "forma_pagamento") || null,
    b.modalidade || null,
    pick(b, "condicoesRetirada", "condicoes_retirada") || null,
    pick(b, "localRetiradaNome", "local_retirada_nome") || null,
    pick(b, "localRetiradaEndereco", "local_retirada_endereco") || null,
    b.safra || null,
    pick(b, "indiceReferencia", "indice_referencia") || null,
    b.observacoes || null,
    pick(b, "contratoPaiId", "contrato_pai_id") || null,
    b.status,
    req.user?.nome || req.user?.email || "sistema"
  ]);
  res.json(toCamel(row));
}));

// DELETE /api/contratos/:id → cancela (soft)
r.delete("/:id", asyncH(async (req, res) => {
  const row = await q1(
    `UPDATE contratos_compra SET status = 'cancelado', atualizado_em = NOW(), atualizado_por = $2
     WHERE id = $1 RETURNING id`,
    [req.params.id, req.user?.nome || req.user?.email || "sistema"]
  );
  if (!row) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
}));

// POST /api/contratos/:id/anexos (upload PDF do contrato ja salvo)
r.post("/:id/anexos", upload.single("pdf"), asyncH(async (req, res) => {
  const contrato = await q1(`SELECT id, numero FROM contratos_compra WHERE id = $1`, [req.params.id]);
  if (!contrato) return res.status(404).json({ error: "contrato_nao_encontrado" });
  if (!req.file) return res.status(400).json({ error: "arquivo_ausente" });

  const ano = new Date().getFullYear();
  const dir = path.join(CONTRATOS_DIR, String(ano));
  await fs.mkdir(dir, { recursive: true });

  const nomeSeguro = `${contrato.numero}-${Date.now()}.pdf`;
  const caminho = path.join(dir, nomeSeguro);
  await fs.writeFile(caminho, req.file.buffer);

  // Tenta parsear (mesmo processo do endpoint parse-pdf) e salvar o JSON
  let parsed = null;
  let metodo = "manual";
  try {
    parsed = await parseContratoPdf(req.file.buffer);
    metodo = parsed?.metodo || "manual";
  } catch { /* segue sem parse */ }

  const id = randomUUID();
  const row = await q1(`
    INSERT INTO contratos_anexos (
      id, contrato_id, tipo, nome_arquivo, caminho, mime_type, tamanho_bytes,
      texto_extraido, dados_extraidos, metodo_extracao, criado_por
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `, [
    id, req.params.id, req.body.tipo || "contrato",
    req.file.originalname, caminho, req.file.mimetype, req.file.size,
    parsed?.textoExtraido || null,
    parsed ? JSON.stringify({ fornecedor: parsed.fornecedor, contrato: parsed.contrato }) : null,
    metodo,
    req.user?.nome || req.user?.email || "sistema"
  ]);
  res.status(201).json(row);
}));

// GET /api/contratos/:id/anexos/:anexoId/download → stream do arquivo
r.get("/:id/anexos/:anexoId/download", asyncH(async (req, res) => {
  const row = await q1(
    `SELECT nome_arquivo, caminho, mime_type FROM contratos_anexos
      WHERE id = $1 AND contrato_id = $2`,
    [req.params.anexoId, req.params.id]
  );
  if (!row) return res.status(404).json({ error: "not_found" });
  res.setHeader("Content-Type", row.mime_type || "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${row.nome_arquivo}"`);
  res.sendFile(path.resolve(row.caminho));
}));

// DELETE /api/contratos/:id/anexos/:anexoId
r.delete("/:id/anexos/:anexoId", asyncH(async (req, res) => {
  const row = await q1(
    `DELETE FROM contratos_anexos WHERE id = $1 AND contrato_id = $2 RETURNING caminho`,
    [req.params.anexoId, req.params.id]
  );
  if (!row) return res.status(404).json({ error: "not_found" });
  await fs.unlink(row.caminho).catch(() => {});
  res.json({ ok: true });
}));

export default r;
