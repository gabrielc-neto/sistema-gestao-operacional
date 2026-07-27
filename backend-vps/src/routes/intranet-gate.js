// Rota /api/intranet-gate — substitui Firebase Function intranetGate.
// Valida IP corporativo (CIDR) + palavra-chave (hash sha256).
// Config lida da tabela documents (collection='intranet', id='config').
import { Router } from "express";
import crypto from "crypto";
import { asyncH } from "../middleware/error.js";
import { q1 } from "../db.js";

const INTRANET_SALT = "pontual-intranet-v1";

function hashIntranetKeyword(k) {
  return crypto.createHash("sha256").update(INTRANET_SALT + String(k)).digest("hex");
}

function ipDoCliente(req) {
  const xff = req.headers["x-forwarded-for"];
  if (xff) return String(xff).split(",")[0].trim();
  return (req.ip || "").replace(/^::ffff:/, "");
}

function ipParaLong(ip) {
  const p = String(ip).split(".");
  if (p.length !== 4) return null;
  let n = 0;
  for (const o of p) {
    const x = Number(o);
    if (!Number.isInteger(x) || x < 0 || x > 255) return null;
    n = n * 256 + x;
  }
  return n >>> 0;
}

function ipCombina(ip, regra) {
  if (!regra) return false;
  regra = String(regra).trim();
  if (regra.includes("/")) {
    const [base, bitsStr] = regra.split("/");
    const bits = Number(bitsStr);
    const ipL = ipParaLong(ip);
    const baseL = ipParaLong(base);
    if (ipL == null || baseL == null || !Number.isInteger(bits) || bits < 0 || bits > 32) return false;
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (ipL & mask) === (baseL & mask);
  }
  return String(ip) === regra;
}

const r = Router();

r.post("/", asyncH(async (req, res) => {
  const { keyword } = req.body || {};
  const row = await q1("SELECT data FROM documents WHERE collection=$1 AND id=$2", ["intranet", "config"]);
  const cfg = row?.data || {};
  const ips = Array.isArray(cfg.ips) ? cfg.ips.filter(Boolean) : [];
  const ip = ipDoCliente(req);
  const ipOk = ips.length === 0 || ips.some((regra) => ipCombina(ip, regra));
  if (!ipOk) return res.status(403).json({ error: "Acesso à Intranet permitido apenas na rede da base." });
  if (keyword == null || keyword === "") return res.json({ ipOk: true });
  if (!cfg.keywordHash) return res.status(412).json({ error: "Intranet ainda não configurada." });
  if (hashIntranetKeyword(keyword) !== cfg.keywordHash) return res.status(403).json({ error: "Palavra-chave incorreta." });
  return res.json({ ok: true });
}));

export default r;
