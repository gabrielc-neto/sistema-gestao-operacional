// Entry point do backend Pontual. Sprint 1 = módulo manutenção.
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config.js";
import { ping } from "./db.js";
import { errorHandler } from "./middleware/error.js";

// Rotas
import manutencoesRoutes from "./routes/manutencoes.js";
import ordensServicoRoutes from "./routes/ordens-servico.js";
import lancamentosOsRoutes from "./routes/lancamentos-os.js";
import tiposManutRoutes from "./routes/tipos-manutencao.js";
import uploadsRoutes, { attachFileServer } from "./routes/uploads.js";
import veiculosRoutes from "./routes/veiculos.js";
import collectionsRoutes from "./routes/collections.js";
import sascarRoutes from "./routes/sascar.js";
import jornadaRoutes from "./routes/jornada.js";
import ctaRoutes from "./routes/cta.js";
import authRoutes from "./routes/auth.js";
import intranetGateRoutes from "./routes/intranet-gate.js";
import fornecedoresRoutes from "./routes/fornecedores.js";
import contratosRoutes from "./routes/contratos.js";
import viagensRoutes from "./routes/viagens.js";
import { iniciarCronjobs } from "./cron.js";

const app = express();

// Middlewares globais
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: config.cors.origins, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(morgan(config.nodeEnv === "production" ? "combined" : "dev"));

// Healthcheck (público)
app.get("/health", async (req, res) => {
  const dbOk = await ping().catch(() => false);
  res.json({ ok: true, db: dbOk, ts: new Date().toISOString() });
});

// Servidor de arquivos estáticos (uploads)
attachFileServer(app);

// Rotas do módulo manutenção
app.use("/api/manutencoes",      manutencoesRoutes);
app.use("/api/ordens-servico",   ordensServicoRoutes);
app.use("/api/lancamentos-os",   lancamentosOsRoutes);
app.use("/api/tipos-manutencao", tiposManutRoutes);
app.use("/api/uploads",          uploadsRoutes);
app.use("/api/veiculos",         veiculosRoutes);
app.use("/api/collections",      collectionsRoutes);
app.use("/api/sascar",           sascarRoutes);
app.use("/api/jornada",          jornadaRoutes);
app.use("/api/cta",              ctaRoutes);
app.use("/api/auth",             authRoutes);
app.use("/api/intranet-gate",    intranetGateRoutes);

// Módulo Contratos & Viagens (retiradas de combustível)
app.use("/api/fornecedores",     fornecedoresRoutes);
app.use("/api/contratos",        contratosRoutes);
app.use("/api/viagens",          viagensRoutes);

// 404 catch-all
app.use((req, res) => res.status(404).json({ error: "not_found", path: req.originalUrl }));

// Error handler (sempre por último)
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`[pontual] backend rodando em porta ${config.port} (${config.nodeEnv})`);
  console.log(`[pontual] uploads em: ${config.uploadsDir}`);
  console.log(`[pontual] CORS origins: ${config.cors.origins.join(", ")}`);
  iniciarCronjobs();
});
