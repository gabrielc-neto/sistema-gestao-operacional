// Teste do fix do bug UUID em lancamentos-os.js
// Bug: POST /api/lancamentos-os com osId="OS-00009" quebrava com
// "invalid input syntax for type uuid" porque osId ia direto na coluna UUID.
//
// Fix: resolverOsId(v) — se v é UUID devolve; se é "OS-XXXXX" busca id real no PG.
//
// Rodar: node --test src/routes/__tests__/lancamentos-os.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";

// Copia da função do fix (isolada pra teste, sem depender de db.js/express)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function makeResolver(q1Mock) {
  return async function resolverOsId(v) {
    if (v == null || v === "") return null;
    const s = String(v).trim();
    if (UUID_RE.test(s)) return s;
    const row = await q1Mock(
      `SELECT id FROM ordens_servico WHERE numero = $1 OR legacy_id = $1 LIMIT 1`,
      [s]
    );
    return row?.id || null;
  };
}

test("resolverOsId: null/undefined/vazio → null (não faz query)", async () => {
  let called = false;
  const q1 = async () => { called = true; return null; };
  const resolverOsId = makeResolver(q1);

  assert.equal(await resolverOsId(null), null);
  assert.equal(await resolverOsId(undefined), null);
  assert.equal(await resolverOsId(""), null);
  assert.equal(called, false, "não deve chamar PG pra valores vazios");
});

test("resolverOsId: UUID válido → devolve o próprio UUID (sem query)", async () => {
  let called = false;
  const q1 = async () => { called = true; return { id: "OUTRO-UUID" }; };
  const resolverOsId = makeResolver(q1);

  const uuid = "a1b2c3d4-e5f6-7890-abcd-1234567890ab";
  assert.equal(await resolverOsId(uuid), uuid);
  assert.equal(called, false, "não deve tocar PG pra UUID válido");
});

test("resolverOsId: UUID case-insensitive", async () => {
  const q1 = async () => null;
  const resolverOsId = makeResolver(q1);

  const uuidUpper = "A1B2C3D4-E5F6-7890-ABCD-1234567890AB";
  assert.equal(await resolverOsId(uuidUpper), uuidUpper);
});

test("resolverOsId: 'OS-00009' existente → devolve UUID real", async () => {
  const uuidReal = "11111111-2222-3333-4444-555555555555";
  let capturedSql = null, capturedParams = null;
  const q1 = async (sql, params) => {
    capturedSql = sql;
    capturedParams = params;
    return { id: uuidReal };
  };
  const resolverOsId = makeResolver(q1);

  const out = await resolverOsId("OS-00009");
  assert.equal(out, uuidReal);
  assert.match(capturedSql, /FROM ordens_servico/);
  assert.match(capturedSql, /numero = \$1 OR legacy_id = \$1/);
  assert.deepEqual(capturedParams, ["OS-00009"]);
});

test("resolverOsId: 'OS-99999' inexistente → null", async () => {
  const q1 = async () => null; // não achou
  const resolverOsId = makeResolver(q1);

  assert.equal(await resolverOsId("OS-99999"), null);
});

test("resolverOsId: string com espaços → trim antes de buscar", async () => {
  let capturedParams = null;
  const q1 = async (_sql, params) => {
    capturedParams = params;
    return { id: "XYZ" };
  };
  const resolverOsId = makeResolver(q1);

  await resolverOsId("  OS-00009  ");
  assert.deepEqual(capturedParams, ["OS-00009"], "deve fazer trim");
});

test("resolverOsId: número puro (edge case) → busca como texto", async () => {
  let capturedParams = null;
  const q1 = async (_sql, params) => {
    capturedParams = params;
    return null;
  };
  const resolverOsId = makeResolver(q1);

  await resolverOsId(12345);
  assert.deepEqual(capturedParams, ["12345"], "converte pra string");
});

// Simula o fluxo do POST — verifica que osIdResolvido e osNumeroFinal ficam certos
test("POST flow: body {osId: 'OS-00009'} → osIdResolvido=UUID, osNumeroFinal='OS-00009'", async () => {
  const uuidReal = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  const q1 = async () => ({ id: uuidReal });
  const resolverOsId = makeResolver(q1);

  const osId = "OS-00009";
  const osNumero = undefined; // frontend não mandou

  const osIdResolvido = await resolverOsId(osId);
  const osNumeroFinal = osNumero || (osId && !UUID_RE.test(String(osId)) ? String(osId) : null);

  assert.equal(osIdResolvido, uuidReal, "os_id deve virar UUID real");
  assert.equal(osNumeroFinal, "OS-00009", "os_numero deve receber o numero legível");
});

test("POST flow: body {osId: UUID, osNumero: 'OS-00009'} → mantém ambos", async () => {
  const q1 = async () => { throw new Error("não deve chamar PG"); };
  const resolverOsId = makeResolver(q1);

  const osId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  const osNumero = "OS-00009";

  const osIdResolvido = await resolverOsId(osId);
  const osNumeroFinal = osNumero || (osId && !UUID_RE.test(String(osId)) ? String(osId) : null);

  assert.equal(osIdResolvido, osId);
  assert.equal(osNumeroFinal, "OS-00009");
});

test("POST flow: body sem osId → osIdResolvido=null, osNumeroFinal=null", async () => {
  const q1 = async () => null;
  const resolverOsId = makeResolver(q1);

  const osId = undefined;
  const osNumero = undefined;

  const osIdResolvido = await resolverOsId(osId);
  const osNumeroFinal = osNumero || (osId && !UUID_RE.test(String(osId)) ? String(osId) : null);

  assert.equal(osIdResolvido, null);
  assert.equal(osNumeroFinal, null);
});

// PATCH flow: quando merged.os_id chega como "OS-XXXX"
test("PATCH flow: merged.os_id='OS-00009' → resolve pra UUID e injeta os_numero", async () => {
  const uuidReal = "11111111-2222-3333-4444-555555555555";
  const q1 = async () => ({ id: uuidReal });
  const resolverOsId = makeResolver(q1);

  const merged = { os_id: "OS-00009", valor_total: 100 };
  if ("os_id" in merged && merged.os_id != null && !UUID_RE.test(String(merged.os_id))) {
    const numeroBruto = String(merged.os_id);
    merged.os_id = await resolverOsId(numeroBruto);
    if (!("os_numero" in merged)) merged.os_numero = numeroBruto;
  }

  assert.equal(merged.os_id, uuidReal);
  assert.equal(merged.os_numero, "OS-00009");
  assert.equal(merged.valor_total, 100, "outros campos intactos");
});

test("PATCH flow: merged.os_id=UUID → intacto, sem query", async () => {
  let called = false;
  const q1 = async () => { called = true; return null; };
  const resolverOsId = makeResolver(q1);

  const uuid = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  const merged = { os_id: uuid };
  if ("os_id" in merged && merged.os_id != null && !UUID_RE.test(String(merged.os_id))) {
    const numeroBruto = String(merged.os_id);
    merged.os_id = await resolverOsId(numeroBruto);
    if (!("os_numero" in merged)) merged.os_numero = numeroBruto;
  }

  assert.equal(merged.os_id, uuid);
  assert.equal("os_numero" in merged, false, "não deve inventar os_numero");
  assert.equal(called, false);
});
