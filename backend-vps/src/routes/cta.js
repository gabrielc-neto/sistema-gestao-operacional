// Rota /api/cta/sincronizar — substitui Firebase Function equivalente.
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncH } from "../middleware/error.js";
import { sincronizarCtaAgora } from "../integracoes/cta/sincronizar-pg.js";

const r = Router();
const TOKEN = process.env.CTA_TOKEN || "";

export async function sincronizarCta() {
  if (!TOKEN) return { erro: "CTA_TOKEN não configurado" };
  return await sincronizarCtaAgora({ token: TOKEN });
}

r.post("/sincronizar", requireAuth, asyncH(async (req, res) => {
  const out = await sincronizarCta();
  res.json(out);
}));

export default r;
