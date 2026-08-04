// Migração: pega usuários do Firebase Auth + cria em usuarios_auth (PG) com senha temporária.
// Firebase NÃO expõe hash de senha — todos usuários usam senha temporária no primeiro login
// e são forçados a trocar (flag trocar_senha_no_proximo_login=true).
//
// Roda no VPS: cd /var/pontual/backend && node migrar-auth.mjs

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import bcrypt from "bcrypt";
import pg from "pg";
import { readFileSync } from "node:fs";

const SA = "/var/pontual/serviceAccountKey.json";
const DB = { host: "127.0.0.1", port: 5432, database: "pontual",
             user: "pontual_app", password: process.env.DB_PASS };
const SENHA_TEMP = "pontual2025";  // troca no primeiro login

initializeApp({ credential: cert(JSON.parse(readFileSync(SA, "utf8"))) });
const auth = getAuth();
const pgc = new pg.Client(DB);
await pgc.connect();
console.log("[pg] conectado");

const hashTemp = await bcrypt.hash(SENHA_TEMP, 10);
console.log(`[auth] senha temporária: "${SENHA_TEMP}" (todos usuários trocam no primeiro login)`);

// Puxa perfis do PG (collection usuarios) — tem nome, setor, cargo, super_admin
const perfisRows = await pgc.query(`SELECT id, data FROM documents WHERE collection = 'usuarios'`);
const perfilPorUid = new Map();
for (const r of perfisRows.rows) perfilPorUid.set(r.id, r.data);

let pagina = undefined, ok = 0, err = 0, total = 0;
do {
  const res = pagina ? await auth.listUsers(1000, pagina) : await auth.listUsers(1000);
  for (const u of res.users) {
    total++;
    try {
      const perfil = perfilPorUid.get(u.uid) || {};
      await pgc.query(
        `INSERT INTO usuarios_auth
           (firebase_uid, email, senha_hash, nome, setor_id, cargo_id, is_super_admin, ativo, trocar_senha_no_proximo_login)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
         ON CONFLICT (email) DO NOTHING`,
        [u.uid, u.email.toLowerCase(), hashTemp, perfil.nome || u.displayName || null,
         perfil.setor_id || null, perfil.cargo_id || null, !!perfil.is_super_admin, !u.disabled]
      );
      ok++;
    } catch (e) {
      err++;
      console.warn(`[erro] ${u.email}: ${e.message}`);
    }
  }
  pagina = res.pageToken;
} while (pagina);

console.log(`\n=== RESUMO ===`);
console.log(`Total Firebase Auth: ${total}`);
console.log(`Inseridos em usuarios_auth: ${ok}`);
console.log(`Erros/duplicados: ${err}`);
console.log(`\nSenha temporária pra TODOS: ${SENHA_TEMP}`);
console.log(`Cada usuário vai trocar no primeiro login.`);

await pgc.end();
process.exit(0);
