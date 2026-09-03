#!/usr/bin/env node
/**
 * Seed admin user no PostgreSQL (backend-vps).
 * Uso:
 *   node scripts/seed_admin_pg.js --email admin@pontual.com --senha 'minhasenha123' --nome 'Admin Pontual'
 * Ou defina variáveis de ambiente ADMIN_EMAIL, ADMIN_SENHA, ADMIN_NOME.
 */
import pg from 'pg';
import bcrypt from 'bcrypt';
import { config } from '../backend-vps/src/config.js';

const args = process.argv.slice(2);
const getArg = (name, envName) => {
  const i = args.indexOf(`--${name}`);
  if (i !== -1 && args[i + 1]) return args[i + 1];
  return process.env[envName];
};

const email = (getArg('email', 'ADMIN_EMAIL') || 'admin@pontual.com').toLowerCase().trim();
const senha = getArg('senha', 'ADMIN_SENHA');
const nome = getArg('nome', 'ADMIN_NOME') || 'Admin Pontual';

if (!senha) {
  console.error('ERRO: defina --senha ou ADMIN_SENHA');
  process.exit(1);
}
if (senha.length < 6) {
  console.error('ERRO: senha deve ter pelo menos 6 caracteres');
  process.exit(1);
}

const pool = new pg.Pool(config.db);

async function main() {
  const hash = await bcrypt.hash(senha, 10);

  const existing = await pool.query('SELECT id, email FROM usuarios_auth WHERE email = $1', [email]);
  if (existing.rows.length) {
    const uid = existing.rows[0].id;
    console.log(`Usuário já existe: ${email} (id=${uid})`);
    await pool.query(
      'UPDATE usuarios_auth SET senha_hash = $1, is_super_admin = true, ativo = true WHERE id = $2',
      [hash, uid]
    );
    console.log('Senha atualizada e super_admin garantido.');
  } else {
    const result = await pool.query(
      `INSERT INTO usuarios_auth (email, senha_hash, nome, is_super_admin, ativo)
       VALUES ($1, $2, $3, true, true) RETURNING id`,
      [email, hash, nome]
    );
    console.log(`Admin criado: ${email} (id=${result.rows[0].id})`);
  }

  await pool.end();
  console.log('\nPronto. Use estas credenciais no frontend:');
  console.log(`  Email: ${email}`);
  console.log(`  Senha: ${senha}`);
}

main().catch(e => {
  console.error('ERRO:', e.message);
  process.exit(1);
});