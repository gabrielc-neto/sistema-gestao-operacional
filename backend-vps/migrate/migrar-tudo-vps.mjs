// Migração em lote: TODAS as coleções restantes → tabela `documents` do PG.
// Roda no VPS: cd /var/pontual/backend && node migrate-tudo.mjs

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import pg from "pg";
import { readFileSync } from "node:fs";

const SA = "/var/pontual/serviceAccountKey.json";
const DB = { host: "127.0.0.1", port: 5432, database: "pontual",
             user: "pontual_app", password: process.env.DB_PASS || "GrCkanrD2zwmkhz8RVh98CIY" };

// Coleções a migrar (as ja migradas com schema proprio ficam de fora)
const COLECOES = [
  "motoristas", "cargos", "setores", "usuarios", "permissoes_catalogo",
  "cercas_eletronicas", "cercas_eventos",
  "checklists_mensais",
  "compras_setor", "propostas_compra", "requisicoes_compra",
  "estoque_itens", "estoque_movimentacoes",
  "ferias",
  "itens_manutencao",
  "multas",
  "ordens_carregamento",
  "atrelamentos",
  "pneus", "pneu_compras", "pneu_inspecoes", "pneu_recapagens",
  "cta_abastecimentos", "abastecimentos_cta",
  "vistorias",
  "motoristas_classificacao", "motoristas_desligados",
];

initializeApp({ credential: cert(JSON.parse(readFileSync(SA, "utf8"))) });
const fs = getFirestore();
const pgc = new pg.Client(DB);
await pgc.connect();
console.log(`[pg] conectado — migrando ${COLECOES.length} coleções`);

const results = {};
for (const nome of COLECOES) {
  try {
    const snap = await fs.collection(nome).get();
    const total = snap.size;
    if (total === 0) { results[nome] = { total: 0, ok: 0, err: 0 }; console.log(`  ${nome}: vazio`); continue; }

    let ok = 0, err = 0;
    for (const doc of snap.docs) {
      try {
        await pgc.query(
          `INSERT INTO documents (collection, id, data) VALUES ($1, $2, $3)
           ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data`,
          [nome, doc.id, JSON.stringify(doc.data())]
        );
        ok++;
      } catch (e) { err++; }
    }
    results[nome] = { total, ok, err };
    console.log(`  ${nome}: ${ok}/${total} ok${err ? ` (${err} erros)` : ""}`);
  } catch (e) {
    results[nome] = { total: "-", ok: "-", err: e.message };
    console.warn(`  ${nome}: FALHOU (${e.message})`);
  }
}

console.log("\n=== RESUMO ===");
console.table(results);
await pgc.end();
process.exit(0);
