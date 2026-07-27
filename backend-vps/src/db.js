// Pool PostgreSQL — helper `q(sql, params)` + `tx(callback)`.
import pg from "pg";
import { config } from "./config.js";

export const pool = new pg.Pool(config.db);

pool.on("error", (err) => {
  console.error("[pg] pool error:", err.message);
});

// Query simples com prepared statement
export async function q(sql, params) {
  const r = await pool.query(sql, params);
  return r.rows;
}

// Query que retorna 1 linha (ou null)
export async function q1(sql, params) {
  const rows = await q(sql, params);
  return rows[0] || null;
}

// Transaction wrapper — passa um objeto com .q dentro
export async function tx(callback) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback({
      q:  async (sql, params) => (await client.query(sql, params)).rows,
      q1: async (sql, params) => (await client.query(sql, params)).rows[0] || null,
    });
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// Ping (usado no healthcheck)
export async function ping() {
  const r = await q("SELECT 1 as ok");
  return r[0]?.ok === 1;
}
