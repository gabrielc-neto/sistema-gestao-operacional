// Versão pra rodar DIRETO no VPS (sem túnel SSH — pg conecta local em 127.0.0.1:5432).
// Uploada esse arquivo + serviceAccountKey.json pro VPS e roda lá.

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import pg from "pg";
import { readFileSync } from "node:fs";

const SERVICE_ACCOUNT = process.env.SA_PATH || "/var/pontual/serviceAccountKey.json";
const DB = {
  host: "127.0.0.1", port: 5432, database: "pontual",
  user: "pontual_app", password: process.env.DB_PASS,
};

// Firestore
const sa = JSON.parse(readFileSync(SERVICE_ACCOUNT, "utf8"));
initializeApp({ credential: cert(sa) });
const db = getFirestore();
console.log(`[fs] conectado no projeto ${sa.project_id}`);

// PG direto (sem túnel)
const pgClient = new pg.Client(DB);
await pgClient.connect();
console.log("[pg] conectado no banco pontual");

async function migrar(nomeColecao, transformador) {
  console.log(`\n=== ${nomeColecao} ===`);
  const snap = await db.collection(nomeColecao).get();
  console.log(`[fs] ${snap.size} docs`);
  let ok = 0, err = 0;
  for (const doc of snap.docs) {
    try {
      const { sql, params } = transformador(doc.id, doc.data());
      await pgClient.query(sql, params);
      ok++;
    } catch (e) {
      err++;
      console.warn(`[erro] ${doc.id}:`, e.message);
    }
  }
  console.log(`[pg] ${ok} inseridos, ${err} erros`);
  return { total: snap.size, ok, err };
}

function tManutencoes(id, d) {
  return {
    sql: `INSERT INTO manutencoes
      (legacy_id, placa, tipo, label, grupo, venc, data_realiz, agendamento, local, numero_doc, km_atual, km_prox, resp, obs, anexos, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      ON CONFLICT (legacy_id) DO NOTHING`,
    params: [id, d.placa || "", d.tipo || "", d.label || "", d.grupo || null,
      d.venc || null, d.data_realiz || null, d.agendamento || null,
      d.local || null, d.numero_doc || null, d.km_atual || null, d.km_prox || null,
      d.resp || null, d.obs || null, JSON.stringify(d.anexos || []),
      d.createdAt || new Date().toISOString(), d.updatedAt || new Date().toISOString()],
  };
}

function tOrdensServico(id, d) {
  return {
    sql: `INSERT INTO ordens_servico
      (legacy_id, numero, placa, status, solicitante, responsavel, descricao_problema, descricao_servico,
       km_abertura, km_conclusao, data_abertura, data_conclusao, itens, fotos, assinaturas, custo_total, obs, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      ON CONFLICT (legacy_id) DO NOTHING`,
    params: [id, d.numero || id, d.placa || "", d.status || "aberta",
      d.solicitante || null, d.responsavel || null,
      d.descricao_problema || null, d.descricao_servico || null,
      d.km_abertura ?? null, d.km_conclusao ?? null,
      d.data_abertura || d.createdAt || new Date().toISOString(),
      d.data_conclusao || null,
      JSON.stringify(d.itens || []), JSON.stringify(d.fotos || []),
      JSON.stringify(d.assinaturas || {}),
      Number(d.custo_total || d.custoTotal) || 0, d.obs || null,
      d.createdAt || new Date().toISOString(), d.updatedAt || new Date().toISOString()],
  };
}

function tLancamentosOs(id, d) {
  return {
    sql: `INSERT INTO lancamentos_os
      (legacy_id, numero, os_numero, fornecedor, cnpj, nf_numero, nf_serie, nf_chave,
       valor_total, itens, anexos, data_emissao, data_pagamento, obs, created_at, editado_em)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      ON CONFLICT (legacy_id) DO NOTHING`,
    params: [id, d.numero || id, d.os_numero || d.osNumero || null,
      d.fornecedor || null, d.cnpj || null,
      d.nf_numero || d.nfNumero || null, d.nf_serie || d.nfSerie || null, d.nf_chave || d.nfChave || null,
      Number(d.valor_total || d.valorTotal) || 0,
      JSON.stringify(d.itens || []), JSON.stringify(d.anexos || []),
      d.data_emissao || d.dataEmissao || null, d.data_pagamento || d.dataPagamento || null,
      d.obs || null,
      d.createdAt || new Date().toISOString(),
      d.editadoEm || d.updatedAt || new Date().toISOString()],
  };
}

function tTiposCustom(id, d) {
  return {
    sql: `INSERT INTO tipos_manutencao_custom
      (legacy_id, slug, label, grupo, km_intervalo, dias_intervalo, ativo, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (slug) DO NOTHING`,
    params: [id, d.slug || id, d.label || id, d.grupo || null,
      d.km_intervalo || d.kmIntervalo || null,
      d.dias_intervalo || d.diasIntervalo || null,
      d.ativo !== false,
      d.createdAt || new Date().toISOString(), d.updatedAt || new Date().toISOString()],
  };
}

const results = {};
results.manutencoes            = await migrar("manutencoes",             tManutencoes);
results.ordens_servico         = await migrar("ordens_servico",          tOrdensServico);
results.lancamentos_os         = await migrar("lancamentos_os",          tLancamentosOs);
results.tipos_manutencao_custom = await migrar("tipos_manutencao_custom", tTiposCustom);

console.log("\n=== RESUMO ===");
console.table(results);

await pgClient.end();
process.exit(0);
