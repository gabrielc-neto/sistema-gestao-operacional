-- Schema PostgreSQL — Módulo Manutenção do Sistema Pontual Logística
-- Aplicado no banco `pontual` do VPS srv1464919.hstgr.cloud (usuário pontual_app)
-- Origem: coleções Firestore correspondentes
-- Data: 2026-07-22 (Sprint 1 migração Hostinger)

-- ============================================================
-- Extensões
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid

-- ============================================================
-- 1. manutencoes — Vencimentos e registros de manutenção por veículo+tipo
-- ============================================================
-- Origem: coleção Firestore `manutencoes`
-- ID original Firestore: `${placa}__${tipoId}` — preservado em legacy_id pra migração
CREATE TABLE IF NOT EXISTS manutencoes (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id    TEXT UNIQUE,          -- ID original do Firestore (pra migração)
    placa        TEXT NOT NULL,
    tipo         TEXT NOT NULL,        -- id do tipo (ex: 'crlv', 'civ', 'oleo_motor')
    label        TEXT NOT NULL,        -- nome legível (ex: 'CRLV', 'Óleo Motor')
    grupo        TEXT,                 -- categoria ('documental', 'preventiva', etc)
    venc         DATE,                 -- data vencimento
    data_realiz  DATE,                 -- data que foi feito
    agendamento  DATE,                 -- data prevista futura
    local        TEXT,
    numero_doc   TEXT,                 -- nº doc/OS/nota
    km_atual     TEXT,                 -- string livre (motorista pode digitar ' 250.000')
    km_prox      TEXT,
    resp         TEXT,                 -- responsável
    obs          TEXT,
    anexos       JSONB DEFAULT '[]'::jsonb,  -- array [{nome, url, path, contentType, tamanho, criadoEm, criadoPor}]
    created_at   TIMESTAMPTZ DEFAULT now(),
    updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manutencoes_placa       ON manutencoes(placa);
CREATE INDEX IF NOT EXISTS idx_manutencoes_tipo        ON manutencoes(tipo);
CREATE INDEX IF NOT EXISTS idx_manutencoes_venc        ON manutencoes(venc);
CREATE INDEX IF NOT EXISTS idx_manutencoes_placa_tipo  ON manutencoes(placa, tipo);


-- ============================================================
-- 2. ordens_servico — OS (ordens de serviço da oficina)
-- ============================================================
CREATE TABLE IF NOT EXISTS ordens_servico (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id            TEXT UNIQUE,
    numero               TEXT UNIQUE NOT NULL,   -- 'OS-00001', etc
    placa                TEXT NOT NULL,
    status               TEXT NOT NULL DEFAULT 'aberta',  -- aberta, em_andamento, concluida, cancelada
    solicitante          TEXT,
    responsavel          TEXT,
    descricao_problema   TEXT,
    descricao_servico    TEXT,
    km_abertura          NUMERIC,
    km_conclusao         NUMERIC,
    data_abertura        TIMESTAMPTZ DEFAULT now(),
    data_conclusao       TIMESTAMPTZ,
    itens                JSONB DEFAULT '[]'::jsonb,  -- serviços e peças
    fotos                JSONB DEFAULT '[]'::jsonb,  -- [{nome, url, path, tamanho, ...}]
    assinaturas          JSONB DEFAULT '{}'::jsonb,  -- {solicitante: base64, responsavel: base64}
    custo_total          NUMERIC(12,2) DEFAULT 0,
    obs                  TEXT,
    created_at           TIMESTAMPTZ DEFAULT now(),
    updated_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_os_placa   ON ordens_servico(placa);
CREATE INDEX IF NOT EXISTS idx_os_status  ON ordens_servico(status);
CREATE INDEX IF NOT EXISTS idx_os_data_ab ON ordens_servico(data_abertura DESC);


-- ============================================================
-- 3. lancamentos_os — Lançamentos de NF-e vinculados a OS (peças/serviços)
-- ============================================================
CREATE TABLE IF NOT EXISTS lancamentos_os (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id     TEXT UNIQUE,
    numero        TEXT NOT NULL,
    os_id         UUID REFERENCES ordens_servico(id) ON DELETE SET NULL,
    os_numero     TEXT,                 -- redundância pra facilitar query
    fornecedor    TEXT,
    cnpj          TEXT,
    nf_numero     TEXT,
    nf_serie      TEXT,
    nf_chave      TEXT,
    valor_total   NUMERIC(12,2) DEFAULT 0,
    itens         JSONB DEFAULT '[]'::jsonb,
    anexos        JSONB DEFAULT '[]'::jsonb,
    data_emissao  DATE,
    data_pagamento DATE,
    obs           TEXT,
    created_at    TIMESTAMPTZ DEFAULT now(),
    editado_em    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lancos_os_id       ON lancamentos_os(os_id);
CREATE INDEX IF NOT EXISTS idx_lancos_fornecedor  ON lancamentos_os(fornecedor);
CREATE INDEX IF NOT EXISTS idx_lancos_data        ON lancamentos_os(data_emissao DESC);


-- ============================================================
-- 4. tipos_manutencao_custom — Tipos customizados pela usuária
-- ============================================================
CREATE TABLE IF NOT EXISTS tipos_manutencao_custom (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id      TEXT UNIQUE,
    slug           TEXT UNIQUE NOT NULL,  -- ID do tipo (ex: 'filtro_ar_customizado')
    label          TEXT NOT NULL,         -- nome legível
    grupo          TEXT,                  -- categoria
    km_intervalo   INTEGER,               -- em km
    dias_intervalo INTEGER,               -- em dias
    ativo          BOOLEAN DEFAULT true,
    created_at     TIMESTAMPTZ DEFAULT now(),
    updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tipos_custom_ativo ON tipos_manutencao_custom(ativo);


-- ============================================================
-- Trigger genérica pra updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION trg_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_manutencoes_upd') THEN
        CREATE TRIGGER trg_manutencoes_upd BEFORE UPDATE ON manutencoes
            FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_os_upd') THEN
        CREATE TRIGGER trg_os_upd BEFORE UPDATE ON ordens_servico
            FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_tipos_upd') THEN
        CREATE TRIGGER trg_tipos_upd BEFORE UPDATE ON tipos_manutencao_custom
            FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
    END IF;
END $$;


-- ============================================================
-- Verificação (informativa)
-- ============================================================
DO $$
DECLARE r RECORD;
BEGIN
    RAISE NOTICE 'Schema manutenção criado. Tabelas:';
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename LOOP
        RAISE NOTICE '  - %', r.tablename;
    END LOOP;
END $$;
