// Migração Firestore → PostgreSQL — coleção `veiculos`.
// Roda no VPS: `node migrate-veiculos.mjs`

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import pg from "pg";
import { readFileSync } from "node:fs";

const SA = process.env.SA_PATH || "/var/pontual/serviceAccountKey.json";
const DB = { host: "127.0.0.1", port: 5432, database: "pontual",
             user: "pontual_app", password: process.env.DB_PASS };

initializeApp({ credential: cert(JSON.parse(readFileSync(SA, "utf8"))) });
const fs = getFirestore();
const pgc = new pg.Client(DB);
await pgc.connect();
console.log("[pg] conectado");

const snap = await fs.collection("veiculos").get();
console.log(`[fs] ${snap.size} veiculos no Firestore`);

let ok = 0, err = 0;
for (const doc of snap.docs) {
  try {
    const d = doc.data();
    const placa = String(d.placa || doc.id).trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!placa) { err++; continue; }
    await pgc.query(
      `INSERT INTO veiculos
         (legacy_id, placa, empresa, tipo, marca, modelo, cor, ano_fab, ano_mod, chassi, renavam, tara,
          capacidade, eixos, combustivel, status, c1, c2, c3, motorista_id, motorista_nome,
          odometro_km, odometro_data, crlv_vencimento, civ_vencimento, cipp_vencimento,
          bloqueio, extras, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30)
       ON CONFLICT (placa) DO NOTHING`,
      [doc.id, placa, d.empresa || "PONTUAL", d.tipo || null, d.marca || null, d.modelo || null,
       d.cor || null, d.ano_fab || d.anoFab || null, d.ano_mod || d.anoMod || null,
       d.chassi || null, d.renavam || null, d.tara || null,
       d.capacidade || null, d.eixos || null, d.combustivel || null, d.status || "ativo",
       d.c1 || null, d.c2 || null, d.c3 || null,
       d.motorista_id || d.motoristaId || null, d.motorista_nome || d.motoristaNome || null,
       d.odometro_km || d.odometroKm || null, d.odometro_data || d.odometroData || null,
       d.crlv_vencimento || d.crlvVenc || null, d.civ_vencimento || d.civVenc || null, d.cipp_vencimento || d.cippVenc || null,
       JSON.stringify(d.bloqueio || {}),
       JSON.stringify(Object.fromEntries(Object.entries(d).filter(([k]) =>
         !["placa","empresa","tipo","marca","modelo","cor","ano_fab","ano_mod","anoFab","anoMod",
           "chassi","renavam","tara","capacidade","eixos","combustivel","status",
           "c1","c2","c3","motorista_id","motoristaId","motorista_nome","motoristaNome",
           "odometro_km","odometroKm","odometro_data","odometroData",
           "crlv_vencimento","crlvVenc","civ_vencimento","civVenc","cipp_vencimento","cippVenc",
           "bloqueio","createdAt","updatedAt"].includes(k)
       ))),
       d.createdAt || new Date().toISOString(), d.updatedAt || new Date().toISOString()]
    );
    ok++;
  } catch (e) { err++; console.warn(`[erro] ${doc.id}:`, e.message); }
}

console.log(`[pg] ${ok} inseridos, ${err} erros de ${snap.size} total`);
await pgc.end();
process.exit(0);
