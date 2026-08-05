#!/usr/bin/env node
// Importa motoristas + veiculos do Firestore pra tabela `documents` do PG local.
// Usado no ambiente de teste local pra popular o dropdown do frontend.

import { readFileSync } from "fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import pg from "pg";

initializeApp({ credential: cert(JSON.parse(readFileSync(new URL("./serviceAccountKey.json", import.meta.url), "utf8"))) });
const fs = getFirestore();

const pool = new pg.Pool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "pontual",
  user: process.env.DB_USER || "pontual_app",
  password: process.env.DB_PASS || "",
});

async function importar(colecao) {
  const snap = await fs.collection(colecao).get();
  console.log(`[${colecao}] ${snap.size} docs no Firestore`);
  for (const d of snap.docs) {
    await pool.query(`
      INSERT INTO documents (id, collection, data)
      VALUES ($1, $2, $3)
      ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
    `, [d.id, colecao, JSON.stringify(d.data())]);
  }
  console.log(`[${colecao}] OK, upserted ${snap.size}`);
}

for (const c of ["motoristas", "veiculos"]) {
  await importar(c);
}
await pool.end();
