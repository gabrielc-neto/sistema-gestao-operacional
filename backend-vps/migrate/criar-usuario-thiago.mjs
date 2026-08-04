// Cria usuário Thiago em usuarios_auth (PROD ou HOMOL conforme env DB_NAME)
import bcrypt from "bcrypt";
import pg from "pg";

const DB = {
  host: "127.0.0.1",
  port: 5432,
  database: process.env.DB_NAME || "pontual",
  user: process.env.DB_USER || "pontual_app",
  password: process.env.DB_PASS,
};

const CARGO_ID = "126f1ba0-dbb4-475b-88ef-9b881647cbaa"; // Analista de Logística (criado antes)
const SETOR_ID = "YV05Q0aIxHSoH5ZV6ptZ";                  // Logistica

const c = new pg.Client(DB);
await c.connect();
console.log(`[pg] conectado em ${DB.database}`);

const hash = await bcrypt.hash("pontual2025", 10);

const r = await c.query(
  `INSERT INTO usuarios_auth
     (email, senha_hash, nome, setor_id, cargo_id, is_super_admin, ativo, trocar_senha_no_proximo_login)
   VALUES ($1, $2, $3, $4, $5, false, true, true)
   ON CONFLICT (email) DO UPDATE SET
     senha_hash = EXCLUDED.senha_hash,
     nome = EXCLUDED.nome,
     setor_id = EXCLUDED.setor_id,
     cargo_id = EXCLUDED.cargo_id,
     ativo = true,
     trocar_senha_no_proximo_login = true
   RETURNING id, email, nome`,
  ["logistica02@pontualpetroleo.com.br", hash, "thiago.pontual", SETOR_ID, CARGO_ID]
);

console.log("[ok] usuário Thiago criado/atualizado:");
console.log(r.rows[0]);
console.log("\nCredenciais pro Thiago:");
console.log("  Email: logistica02@pontualpetroleo.com.br");
console.log("  Senha: pontual2025");
console.log("  Cargo: Analista de Logística");
console.log("  Setor: Logistica");
console.log("  Super Admin: NÃO");
console.log("  Trocar senha no primeiro login: SIM");

await c.end();
process.exit(0);
