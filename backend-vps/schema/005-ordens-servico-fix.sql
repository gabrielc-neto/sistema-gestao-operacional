-- 005-ordens-servico-fix.sql
-- Corrige schema de ordens_servico — adiciona colunas que o frontend envia mas backend
-- estava descartando silenciosamente desde a migração Firestore→PG (2026-07-23).
--
-- Bug reportado 2026-08-03: PDF da OS mostrava motorista, hodômetro, tipo de serviço
-- em branco. Causa: frontend enviava esses campos, backend INSERT ignorava.
--
-- Colunas adicionadas:
--   motorista_id       — UUID do motorista (referência solta, sem FK forte)
--   motorista_nome     — nome denormalizado (usado no PDF, evita join)
--   tipo_servico       — categoria (ex: "Troca de óleo", "Freio", "Lavagem")
--   hodometro          — km na abertura (alias semântico de km_abertura, mantido separado
--                        pra compat com nomenclatura do frontend)
--   fornecedor         — nome do fornecedor (oficina externa, se aplicável)
--   fornecedor_cnpj    — CNPJ do fornecedor
--
-- Aplicar: psql -U pontual_app -d pontual -f 005-ordens-servico-fix.sql
-- OU via node scripts/vps-ssh.mjs (quando SSH estiver disponível)

ALTER TABLE ordens_servico
    ADD COLUMN IF NOT EXISTS motorista_id     TEXT,
    ADD COLUMN IF NOT EXISTS motorista_nome   TEXT,
    ADD COLUMN IF NOT EXISTS tipo_servico     TEXT,
    ADD COLUMN IF NOT EXISTS hodometro        NUMERIC,
    ADD COLUMN IF NOT EXISTS fornecedor       TEXT,
    ADD COLUMN IF NOT EXISTS fornecedor_cnpj  TEXT;

-- Índice pra query por motorista (ex: histórico de OSs de um motorista)
CREATE INDEX IF NOT EXISTS idx_os_motorista_id ON ordens_servico(motorista_id);

-- Verificação: mostra as novas colunas
-- \d ordens_servico
