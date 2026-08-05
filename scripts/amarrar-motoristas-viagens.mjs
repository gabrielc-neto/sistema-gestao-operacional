#!/usr/bin/env node
// Amarra motoristas nas viagens importadas usando placa do cavalo como chave.
//
// Estrategia:
//   1) Puxa Firestore: veiculos onde tipo=cavalo (tem campo "motorista" com nome curto)
//   2) Puxa Firestore: motoristas (tem nome completo, cpf, cnh)
//   3) Fuzzy match: "CELSO" → "CELSO LUIZ PONTAROLO", "MAURO SANTOS" → "MAURO CARDOSO DOS SANTOS"
//   4) Constroi mapa placa_normalizada → {motorista_id, nome, cpf, cnh}
//   5) UPDATE viagens do PG onde motorista_id='IMPORT' + placa bate
//
// Uso (dry-run):
//   node scripts/amarrar-motoristas-viagens.mjs
// Apply:
//   node scripts/amarrar-motoristas-viagens.mjs --apply

import { readFileSync } from "fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import pg from "pg";

const APPLY = process.argv.includes("--apply");
const SVC_KEY = new URL("./serviceAccountKey.json", import.meta.url);

// ---- Firebase Admin ----
initializeApp({ credential: cert(JSON.parse(readFileSync(SVC_KEY, "utf8"))) });
const fs = getFirestore();

// ---- PG ----
const pool = new pg.Pool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "pontual",
  user: process.env.DB_USER || "pontual_app",
  password: process.env.DB_PASS || "",
});

// ---- Utils ----
function normPlaca(p) {
  return String(p || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function normNome(n) {
  return String(n || "")
    .toUpperCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")   // remove acentos
    .replace(/[^A-Z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Tokens uteis (>= 3 chars, drop stopwords)
const STOP = new Set(["DA", "DE", "DO", "DAS", "DOS", "E"]);
function tokens(nome) {
  return normNome(nome).split(" ").filter(t => t.length >= 3 && !STOP.has(t));
}

// Score de compatibilidade entre dois nomes:
//   - Retorna quantas tokens do MENOR estao contidas no MAIOR
//   - Penaliza se sobrar token do menor que nao bate
function matchScore(nomeCurto, nomeLongo) {
  const tCurto = tokens(nomeCurto);
  const tLongo = tokens(nomeLongo);
  if (tCurto.length === 0 || tLongo.length === 0) return 0;
  // Todas as tokens do curto precisam existir no longo (subset)
  let bateu = 0;
  for (const t of tCurto) {
    // Match exato OU prefixo/substring (pra pegar erros de digitacao: FENANDO ~ FERNANDO)
    if (tLongo.some(l => l === t || l.startsWith(t) || t.startsWith(l) ||
                          (t.length >= 5 && l.includes(t.slice(0, 5))))) {
      bateu++;
    }
  }
  if (bateu === 0) return 0;
  return bateu / tCurto.length; // 1.0 = todas bateram
}

async function main() {
  console.log(`[amarrar] modo: ${APPLY ? "APPLY" : "DRY-RUN"}`);
  console.log(`[amarrar] PG: ${process.env.DB_NAME || "pontual"} @ ${process.env.DB_HOST || "127.0.0.1"}\n`);

  // 1) Puxa cavalos do Firestore
  console.log("[1] Buscando cavalos no Firestore...");
  const cavaloSnap = await fs.collection("veiculos").where("tipo", "==", "cavalo").get();
  const cavalos = cavaloSnap.docs
    .map(d => ({ id: d.id, placa: d.data().placa, motoristaNome: d.data().motorista || "" }))
    .filter(c => c.motoristaNome && c.motoristaNome !== "PX");
  console.log(`    ${cavalos.length} cavalos com motorista definido`);

  // 2) Puxa motoristas do Firestore
  console.log("[2] Buscando motoristas no Firestore...");
  const motSnap = await fs.collection("motoristas").get();
  const motoristas = motSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`    ${motoristas.length} motoristas cadastrados`);

  // 3) Fuzzy match cavalo.motoristaNome → motorista completo
  console.log("[3] Fuzzy matching...");
  const placaParaMotorista = {}; // { "BBE9594": { id, nome, cpf, cnh } }
  const semMatch = [];
  const ambiguos = [];
  for (const cav of cavalos) {
    const candidatos = motoristas
      .map(m => ({ m, score: matchScore(cav.motoristaNome, m.nome) }))
      .filter(x => x.score >= 0.5)
      .sort((a, b) => b.score - a.score);
    if (candidatos.length === 0) { semMatch.push(cav); continue; }
    // Tiebreaker: se empate no score, prefere quem tem o PRIMEIRO nome identico ao do cavalo
    if (candidatos.length > 1 && candidatos[0].score === candidatos[1].score) {
      const primeiroNomeCav = tokens(cav.motoristaNome)[0];
      const empatados = candidatos.filter(x => x.score === candidatos[0].score);
      const exato = empatados.find(x => tokens(x.m.nome)[0] === primeiroNomeCav);
      if (exato) {
        // desempatou
        candidatos.splice(0, candidatos.length, exato, ...empatados.filter(x => x !== exato));
      } else {
        ambiguos.push({ cav, candidatos: candidatos.slice(0, 3).map(x => x.m.nome) });
        continue;
      }
    }
    const m = candidatos[0].m;
    placaParaMotorista[normPlaca(cav.placa)] = {
      id: m.id, nome: m.nome, cpf: m.cpf || "", cnh: m.cnh || "",
    };
  }
  console.log(`    matched: ${Object.keys(placaParaMotorista).length}`);
  if (semMatch.length) {
    console.log(`    sem match (${semMatch.length}):`, semMatch.slice(0, 5).map(c => `${c.placa}[${c.motoristaNome}]`).join(", "), semMatch.length > 5 ? "..." : "");
  }
  if (ambiguos.length) {
    console.log(`    ambiguos (${ambiguos.length}):`);
    ambiguos.slice(0, 3).forEach(x => console.log(`      ${x.cav.placa}[${x.cav.motoristaNome}] → ${x.candidatos.join(" / ")}`));
  }

  // 4) Preview: quantas viagens tem placa que bate no mapa
  console.log("\n[4] Preview no PG...");
  const total = await pool.query(`SELECT COUNT(*) FROM viagens WHERE motorista_id = 'IMPORT'`);
  console.log(`    viagens com motorista_id='IMPORT': ${total.rows[0].count}`);

  const placasPG = await pool.query(`
    SELECT DISTINCT REGEXP_REPLACE(UPPER(veiculo_placa), '[^A-Z0-9]', '', 'g') AS placa_norm, COUNT(*) AS n
      FROM viagens WHERE motorista_id = 'IMPORT' AND veiculo_placa IS NOT NULL
     GROUP BY placa_norm ORDER BY n DESC
  `);
  const placasComMap = placasPG.rows.filter(r => placaParaMotorista[r.placa_norm]);
  const placasSemMap = placasPG.rows.filter(r => !placaParaMotorista[r.placa_norm]);
  const totalAmarrar = placasComMap.reduce((s, r) => s + Number(r.n), 0);
  console.log(`    placas distintas com IMPORT: ${placasPG.rows.length}`);
  console.log(`    placas COM mapping: ${placasComMap.length} (${totalAmarrar} viagens amarraveis)`);
  console.log(`    placas SEM mapping: ${placasSemMap.length}`);
  if (placasSemMap.length) {
    console.log(`      (top 5 mais frequentes:`, placasSemMap.slice(0, 5).map(r => `${r.placa_norm}(${r.n})`).join(", "), `)`);
  }

  if (!APPLY) {
    console.log("\nDRY-RUN — nada foi gravado. Adicione --apply pra atualizar.");
    await pool.end();
    return;
  }

  // 5) APPLY: UPDATE em lote
  console.log("\n[5] APPLY: atualizando viagens...");
  let updated = 0;
  for (const [placaNorm, mot] of Object.entries(placaParaMotorista)) {
    const r = await pool.query(`
      UPDATE viagens
         SET motorista_id   = $1,
             motorista_nome = $2,
             motorista_cpf  = $3,
             motorista_cnh  = $4,
             atualizado_por = 'AMARRAR-SCRIPT',
             atualizado_em  = NOW()
       WHERE motorista_id = 'IMPORT'
         AND REGEXP_REPLACE(UPPER(veiculo_placa), '[^A-Z0-9]', '', 'g') = $5
    `, [mot.id, mot.nome, mot.cpf, mot.cnh, placaNorm]);
    updated += r.rowCount;
  }
  console.log(`    ${updated} viagens atualizadas.`);
  await pool.end();
}

main().catch(e => { console.error("ERRO:", e); process.exit(1); });
