// Teste unitário resolverDataHora — node --test nativo, zero deps.
// Rodar: cd frontend && node --test src/utils/__tests__/dataRetroativa.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolverDataHora } from "../dataRetroativa.js";

const AGORA = new Date("2026-08-22T14:35:20-03:00"); // hora local BR
const AGORA_ISO = AGORA.toISOString();

test("dataRetroativa vazia → agora", () => {
  assert.equal(resolverDataHora("", AGORA), AGORA_ISO);
});

test("dataRetroativa null/undefined → agora", () => {
  assert.equal(resolverDataHora(null, AGORA), AGORA_ISO);
  assert.equal(resolverDataHora(undefined, AGORA), AGORA_ISO);
});

test("data futura → cai pra agora (guard)", () => {
  const amanha = "2026-08-23";
  assert.equal(resolverDataHora(amanha, AGORA), AGORA_ISO);
});

test("data hoje → mesmo dia, mesma hora corrente", () => {
  const hoje = "2026-08-22";
  const out = resolverDataHora(hoje, AGORA);
  // Deve bater com AGORA (mesma data + hora local)
  const d = new Date(out);
  assert.equal(d.toISOString().slice(0, 10), "2026-08-22");
});

test("data ontem → devolve ISO com data anterior, hora atual preservada", () => {
  const ontem = "2026-08-21";
  const out = resolverDataHora(ontem, AGORA);
  const d = new Date(out);
  // Data local do ISO deve ser 21/08
  assert.equal(d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }), "21/08/2026");
  // Hora local deve ser ~14:35 (mesmo minuto do AGORA)
  const hora = d.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour12: false }).slice(0, 5);
  assert.equal(hora, "14:35");
});

test("data 30 dias atrás → funciona igual", () => {
  const trintaAtras = "2026-07-23";
  const out = resolverDataHora(trintaAtras, AGORA);
  const d = new Date(out);
  assert.equal(d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }), "23/07/2026");
});

test("string malformada → cai pra agora", () => {
  assert.equal(resolverDataHora("banana", AGORA), AGORA_ISO);
});

test("format YYYY-MM-DD comparado lexicograficamente é seguro pra guard", () => {
  // 2026-08-22 > 2026-08-21 lexicograficamente = cronologicamente. OK.
  const doisAnosNoFuturo = "2028-01-01";
  assert.equal(resolverDataHora(doisAnosNoFuturo, AGORA), AGORA_ISO);
  const dezAnosAtras = "2016-01-01";
  const out = resolverDataHora(dezAnosAtras, AGORA);
  assert.notEqual(out, AGORA_ISO);
  assert.ok(out.startsWith("2016-01-01"));
});
