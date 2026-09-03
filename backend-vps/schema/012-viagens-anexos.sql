-- 012-viagens-anexos.sql
-- Anexos na viagem: nota fiscal (DANFE), comprovante, foto de carga, etc.
-- Wesley 2026-08-05: precisa anexar NF de venda que a usina manda depois do carregamento.

CREATE TABLE IF NOT EXISTS viagens_anexos (
    id            TEXT PRIMARY KEY,
    viagem_id     TEXT NOT NULL REFERENCES viagens(id) ON DELETE CASCADE,
    tipo          TEXT NOT NULL DEFAULT 'nf'
                  CHECK (tipo IN ('nf','comprovante_pagto','foto_carga','outro')),
    nome_arquivo  TEXT NOT NULL,
    caminho       TEXT NOT NULL,        -- ex: /app/uploads-local/viagens/2026/viagem-<id>.pdf
    mime_type     TEXT,
    tamanho_bytes BIGINT,
    criado_por    TEXT,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_viagens_anexos_viagem ON viagens_anexos(viagem_id);
