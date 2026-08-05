#!/usr/bin/env node
// Importa "Planilha de saldos Usinas Segundo Semestre.xlsx" pro banco Pontual.
//
// Cria fornecedores (17 usinas), contratos_compra (N por aba), viagens + viagem_itens.
// Formato da planilha: cada aba = 1 usina. Blocos empilhados de:
//   Contrato <numero>       SALDO   <volume_inicial>
//   Data | Placa | 1a carreta | 2a carreta | NF | Quantidade | Saldo
//   <data> | <cavalo> | <c1> | <c2> | <nfe> | <qtd_litros> | <saldo_pos>
//
// Uso:
//   DRY-RUN (default, so imprime):
//     node scripts/importar-planilha-usinas.mjs <caminho.xlsx>
//
//   APLICAR de verdade:
//     node scripts/importar-planilha-usinas.mjs <caminho.xlsx> --apply
//
// Env necessario:
//   DB_HOST DB_PORT DB_NAME DB_USER DB_PASS  (ou usa defaults do config.js do backend)
//
// Idempotencia:
//   Fornecedor identificado por cnpj (placeholder "IMPORT-<slug>") — recria se rodar de novo? NAO.
//   Contrato identificado por (numero, fornecedor_id) — pula duplicado.
//   Viagem identificada por (nfe_numero, data, placa_cavalo, contrato) — pula duplicado.

import { readFileSync } from "fs";
import { randomUUID } from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import ExcelJS from "exceljs";
import pg from "pg";

// ============================================================
// Config
// ============================================================
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ENV = path.join(__dirname, "..", "backend-vps", ".env");

// Carrega .env do backend se existir (fallback)
try {
  const dot = readFileSync(DEFAULT_ENV, "utf8");
  for (const line of dot.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch {}

const args = process.argv.slice(2);
const arquivo = args.find(a => !a.startsWith("--"));
const APPLY   = args.includes("--apply");

if (!arquivo) {
  console.error("Uso: node scripts/importar-planilha-usinas.mjs <caminho.xlsx> [--apply]");
  process.exit(2);
}

const pool = new pg.Pool({
  host:     process.env.DB_HOST     || "127.0.0.1",
  port:     Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME     || "pontual",
  user:     process.env.DB_USER     || "pontual_app",
  password: process.env.DB_PASS     || "",
});

// ============================================================
// Deducao de produto pelo nome da aba/cabecalho
// ============================================================
function deduzirProduto(abaNome, contextoTexto) {
  const t = (abaNome + " " + (contextoTexto || "")).toUpperCase();
  if (t.includes("BE8"))                                return "BIODIESEL_BE8";
  if (t.includes("BIODIESEL") || t.includes("POTENCIAL") || t.includes("COCAMAR")) return "BIODIESEL";
  if (t.includes("ANIDRO"))                             return "ETANOL_ANIDRO";
  if (t.includes("HIDRATADO"))                          return "ETANOL_HIDRATADO";
  if (t.includes("COOPCANA") || t.includes("CPA") || t.includes("RAIZEN") || t.includes("ALTO ALEGRE")) return "ETANOL_ANIDRO";
  if (t.includes("S10"))                                return "DIESEL_S10";
  if (t.includes("S500"))                               return "DIESEL_S500";
  if (t.includes("GASOLINA"))                           return "GASOLINA";
  return "OUTRO";
}

function slug(s) {
  return String(s || "").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function cnpjPlaceholder(nome) {
  return `IMPORT-${slug(nome)}`.slice(0, 20);
}

function normalizarNumeroContrato(txt) {
  return String(txt || "")
    .replace(/^Contrato\s*/i, "")
    .replace(/\s+SALDO\s*$/i, "")
    .trim();
}

// ============================================================
// Parser de uma aba (retorna: fornecedor + [{contrato, retiradas}])
// ============================================================
// A planilha do Wesley tem 5+ layouts diferentes por usina. Estrategia:
//   - Detectar HEADER DE CONTRATO: qualquer linha com "SALDO" (em qualquer coluna)
//     e um numero valido a seguir → o texto da coluna A vira o "numero do contrato"
//     (pode ser "40001803 OV" ou "01-07-2025 CONTRATO" ou "NF 96260 08/07/2025")
//   - Detectar HEADER DE RETIRADA: linha com "Data" na col A → aprender indices
//     das colunas (Placa, 1a carreta, 2a carreta, NF, Quantidade) pelo texto
//   - Ler retiradas ate proxima linha vazia longa OU proximo header
function parseAba(ws, abaNome) {
  const contratos = [];
  let contratoAtual = null;
  let contextoProduto = "";
  // Mapa dinamico de colunas (indice 0-based da linha)
  let colMap = { data: 0, placa: 1, carreta1: 2, carreta2: 3, nfe: 4, quantidade: 5 };

  const rows = [];
  ws.eachRow({ includeEmpty: true }, (row) => {
    const vals = [];
    for (let c = 1; c <= Math.max(15, ws.columnCount); c++) {
      vals.push(row.getCell(c).value);
    }
    rows.push(vals);
  });

  // Helpers
  const isEmpty = (v) => v == null || (typeof v === "string" && v.trim() === "");
  const isNum   = (v) => v != null && Number.isFinite(Number(v));
  const asStr   = (v) => String(v ?? "").trim();

  // Procura celula com "SALDO" e retorna o proximo valor numerico depois dela
  function encontrarSaldoInicial(r) {
    for (let i = 0; i < r.length; i++) {
      if (/SALDO/i.test(asStr(r[i]))) {
        // volume pode ser proxima celula ou depois
        for (let j = i + 1; j < Math.min(r.length, i + 4); j++) {
          if (isNum(r[j])) return Number(r[j]);
        }
      }
    }
    return null;
  }

  // Aprende mapa de colunas a partir de uma linha "Data | Placa | ..."
  function aprenderColunas(r) {
    const map = {};
    for (let i = 0; i < r.length; i++) {
      const t = asStr(r[i]).toUpperCase();
      if (!t) continue;
      if (/^DATA/.test(t))                                   map.data = i;
      else if (/^PLACA$/.test(t) || /^PLACA\b/.test(t) && !/CARRETA/.test(t)) map.placa = i;
      else if (/1[aª°]?\s*CARRETA/.test(t))                  map.carreta1 = i;
      else if (/2[aª°]?\s*CARRETA/.test(t))                  map.carreta2 = i;
      else if (/^NF$/.test(t) && map.nfe == null)            map.nfe = i;
      else if (/^QUANTIDADE/.test(t) || /^QTD/.test(t))      map.quantidade = i;
    }
    // Fallback: se nao aprendeu, mantem o anterior
    return {
      data:       map.data       ?? colMap.data,
      placa:      map.placa      ?? colMap.placa,
      carreta1:   map.carreta1   ?? colMap.carreta1,
      carreta2:   map.carreta2   ?? colMap.carreta2,
      nfe:        map.nfe        ?? colMap.nfe,
      quantidade: map.quantidade ?? colMap.quantidade,
    };
  }

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const cellA = asStr(r[0]);

    // Linha vazia — pula
    if (!cellA && r.slice(1).every(isEmpty)) continue;

    // Contexto de produto: linha tipo "BIODIESEL POTENCIAL" / "SAARA S10" / "SMALL GASOLINA CAT"
    // (linha com so texto, sem numeros, sem "Data"/"Contrato"/"SALDO")
    if (cellA && !/Data\b|SALDO|CONTRATO/i.test(cellA) &&
        /^[A-Z\s0-9\-]+$/.test(cellA) &&
        r.slice(1).every(isEmpty)) {
      contextoProduto = cellA;
      continue;
    }

    // Header de retirada: primeira celula = "Data"
    if (/^Data\b/i.test(cellA)) {
      colMap = aprenderColunas(r);
      continue;
    }

    // Header de contrato: qualquer linha com "SALDO" + numero valido depois
    const volumeInicial = encontrarSaldoInicial(r);
    if (volumeInicial != null && volumeInicial > 0 && cellA) {
      const numero = normalizarNumeroContrato(cellA);
      const existente = contratos.find(c => c.numero === numero);
      if (existente) {
        contratoAtual = existente;
      } else {
        contratoAtual = {
          numero,
          produto: deduzirProduto(abaNome, contextoProduto),
          volumeInicialLitros: volumeInicial,
          contextoProduto,
          retiradas: [],
        };
        contratos.push(contratoAtual);
      }
      continue;
    }

    // Linha de retirada
    if (!contratoAtual) continue;
    const cellData = r[colMap.data];
    if (!(cellData instanceof Date)) continue;

    const placaCav  = asStr(r[colMap.placa])    || null;
    const placaCar1 = asStr(r[colMap.carreta1]) || null;
    const placaCar2 = asStr(r[colMap.carreta2]) || null;
    const nfe       = r[colMap.nfe] != null ? asStr(r[colMap.nfe]) : null;
    const qtd       = Number(r[colMap.quantidade]);

    if (!Number.isFinite(qtd) || qtd <= 0) continue;
    if (!placaCav) continue;

    contratoAtual.retiradas.push({
      data: cellData, placaCavalo: placaCav,
      placaCarreta1: placaCar1, placaCarreta2: placaCar2,
      nfe, volumeLitros: qtd,
    });
  }

  return {
    fornecedor: {
      razaoSocial: abaNome.trim().toUpperCase(),
      cnpj:        cnpjPlaceholder(abaNome),
    },
    contratos,
  };
}

// ============================================================
// Persistencia
// ============================================================
async function upsertFornecedor(client, forn) {
  const existente = await client.query(
    `SELECT id FROM fornecedores WHERE cnpj = $1 OR razao_social = $2 LIMIT 1`,
    [forn.cnpj, forn.razaoSocial]
  );
  if (existente.rows[0]) return existente.rows[0].id;
  const id = randomUUID();
  await client.query(`
    INSERT INTO fornecedores (id, razao_social, cnpj, ativo, criado_por)
    VALUES ($1, $2, $3, TRUE, 'IMPORT-PLANILHA')
  `, [id, forn.razaoSocial, forn.cnpj]);
  return id;
}

async function upsertContrato(client, fornId, c) {
  const existente = await client.query(
    `SELECT id FROM contratos_compra WHERE numero = $1 AND fornecedor_id = $2`,
    [c.numero, fornId]
  );
  if (existente.rows[0]) return { id: existente.rows[0].id, jaExistia: true };

  const id = randomUUID();
  await client.query(`
    INSERT INTO contratos_compra (
      id, numero, data_contrato, fornecedor_id, produto,
      volume_total_litros, preco_por_m3, valor_total, status,
      observacoes, criado_por
    ) VALUES (
      $1, $2, CURRENT_DATE, $3, $4, $5, 0, 0, 'ativo',
      $6, 'IMPORT-PLANILHA'
    )
  `, [id, c.numero, fornId, c.produto, c.volumeInicialLitros,
      `Importado da planilha "Saldos Usinas". Produto detectado por contexto: ${c.contextoProduto || "-"}`]);
  return { id, jaExistia: false };
}

async function insertViagemComRetirada(client, contratoId, fornId, ret, abaNome) {
  // Evita duplicar se rodar 2x — chave logica: nfe + data + placa_cavalo
  const dup = await client.query(`
    SELECT vi.id FROM viagem_itens vi
    JOIN viagens v ON v.id = vi.viagem_id
    WHERE vi.contrato_id = $1
      AND v.veiculo_placa = $2
      AND v.nfe_numero    = $3
      AND v.data_programada = $4::date
    LIMIT 1
  `, [contratoId, ret.placaCavalo, ret.nfe, ret.data]);
  if (dup.rows[0]) return { pulou: true };

  const viagemId = randomUUID();
  const dataStr  = ret.data.toISOString().slice(0, 10);
  await client.query(`
    INSERT INTO viagens (
      id, data_programada,
      veiculo_id, veiculo_placa,
      carreta_id,  carreta_placa,
      carreta2_id, carreta2_placa,
      motorista_id, motorista_nome,
      origem_fornecedor_id, origem_nome,
      nfe_numero, status, criado_por
    ) VALUES (
      $1, $2::date,
      $3, $3,
      $4, $4,
      $5, $5,
      'IMPORT', 'IMPORTADO PLANILHA',
      $6, $7,
      $8, 'concluida', 'IMPORT-PLANILHA'
    )
  `, [
    viagemId, dataStr,
    ret.placaCavalo,
    ret.placaCarreta1 || null,
    ret.placaCarreta2 || null,
    fornId, abaNome,
    ret.nfe,
  ]);
  await client.query(`
    INSERT INTO viagem_itens (id, viagem_id, contrato_id, volume_litros, ordem)
    VALUES ($1, $2, $3, $4, 1)
  `, [randomUUID(), viagemId, contratoId, ret.volumeLitros]);
  return { pulou: false };
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log(`[import] arquivo: ${arquivo}`);
  console.log(`[import] modo:    ${APPLY ? "APPLY (grava no banco)" : "DRY-RUN (nao grava)"}`);
  console.log(`[import] banco:   ${process.env.DB_NAME || "pontual"} @ ${process.env.DB_HOST || "127.0.0.1"}:${process.env.DB_PORT || "5432"}\n`);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(arquivo);

  const abas = [];
  wb.eachSheet(ws => abas.push(ws));

  const relatorio = [];
  const stats = { fornecedores: 0, contratos: 0, contratosSkip: 0, viagens: 0, viagensSkip: 0 };

  for (const ws of abas) {
    const parsed = parseAba(ws, ws.name);
    const nContratos = parsed.contratos.length;
    const nRet = parsed.contratos.reduce((s, c) => s + c.retiradas.length, 0);
    relatorio.push(`  aba "${ws.name}": ${nContratos} contratos, ${nRet} retiradas`);
    if (nContratos === 0) continue;

    if (!APPLY) continue;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const fornId = await upsertFornecedor(client, parsed.fornecedor);
      stats.fornecedores++;

      for (const c of parsed.contratos) {
        const { id: cId, jaExistia } = await upsertContrato(client, fornId, c);
        if (jaExistia) stats.contratosSkip++;
        else stats.contratos++;

        for (const ret of c.retiradas) {
          const { pulou } = await insertViagemComRetirada(client, cId, fornId, ret, ws.name);
          if (pulou) stats.viagensSkip++;
          else stats.viagens++;
        }
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      console.error(`\n[ERRO na aba "${ws.name}"]`, e.message);
    } finally {
      client.release();
    }
  }

  console.log("\n=== RELATORIO POR ABA ===");
  relatorio.forEach(l => console.log(l));

  console.log("\n=== TOTAIS ===");
  console.log(JSON.stringify(stats, null, 2));

  if (!APPLY) {
    console.log("\nDRY-RUN — nada foi gravado. Adicione --apply pra rodar de verdade.");
  } else {
    console.log("\nImportacao concluida.");
  }

  await pool.end();
}

main().catch(e => { console.error("ERRO FATAL:", e); process.exit(1); });
