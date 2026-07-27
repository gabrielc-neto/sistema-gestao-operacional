// Rotas de upload/download local — substitui Cloudinary.
// Uploads vão pra disco (config.uploadsDir), servidos por rota /files/:pathId
// no formato compatível com uploadArquivo() do frontend antigo.
import { Router } from "express";
import multer from "multer";
import { existsSync, mkdirSync, statSync, createReadStream, unlinkSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { randomUUID } from "node:crypto";
import { requireAuth } from "../middleware/auth.js";
import { asyncH } from "../middleware/error.js";
import { config } from "../config.js";

const r = Router();

// Garante diretório base
if (!existsSync(config.uploadsDir)) mkdirSync(config.uploadsDir, { recursive: true });

// Multer com storage em disco e nome único
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = String(req.body.folder || req.query.folder || "geral")
      .replace(/[^a-zA-Z0-9/_-]+/g, "_")
      .replace(/^\/+|\/+$/g, "");
    const target = join(config.uploadsDir, folder);
    if (!existsSync(target)) mkdirSync(target, { recursive: true });
    cb(null, target);
  },
  filename: (req, file, cb) => {
    const ext = extname(file.originalname) || "";
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 60);
    const id = randomUUID().slice(0, 12);
    cb(null, `${id}_${safe}${safe.endsWith(ext) ? "" : ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.uploadsMaxBytes },
});

// POST /api/uploads?folder=manutencoes/XYZ  (multipart: file, folder)
// Retorno equivalente ao uploadArquivo Cloudinary: {url, publicId, tipo, tamanho, nome}
r.post("/", requireAuth, upload.single("file"), asyncH(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "no_file" });
  const rel = req.file.path.replace(config.uploadsDir + "/", "").replace(config.uploadsDir + "\\", "");
  const publicId = rel.replace(/\\/g, "/");
  const url = `${req.protocol}://${req.get("host")}${config.uploadsBaseUrl}/${publicId}`;
  res.status(201).json({
    url,
    publicId,
    tipo: req.file.mimetype,
    tamanho: req.file.size,
    nome: req.file.originalname,
    uploadedAt: new Date().toISOString(),
  });
}));

// GET /uploads/:pathId — download público (ou proteger com auth se quiser)
// Rota registrada em src/index.js separadamente pra ficar em /uploads em vez de /api/uploads
export function attachFileServer(app) {
  app.get(`${config.uploadsBaseUrl}/*`, asyncH(async (req, res) => {
    const rel = decodeURIComponent(req.params[0] || "").replace(/\.\.+/g, "");
    const abs = join(config.uploadsDir, rel);
    if (!existsSync(abs)) return res.status(404).json({ error: "not_found" });
    const st = statSync(abs);
    if (!st.isFile()) return res.status(404).json({ error: "not_found" });
    res.setHeader("Content-Length", st.size);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    createReadStream(abs).pipe(res);
  }));
}

// DELETE /api/uploads/:publicId  (opcional — user marca "remover" no front)
r.delete("/*", requireAuth, asyncH(async (req, res) => {
  const rel = decodeURIComponent(req.params[0] || "").replace(/\.\.+/g, "");
  const abs = join(config.uploadsDir, rel);
  if (existsSync(abs)) unlinkSync(abs);
  res.json({ ok: true });
}));

export default r;
