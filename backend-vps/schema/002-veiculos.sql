-- Schema PostgreSQL — Módulo Frota (veículos)
-- Sprint 2 migração Hostinger

CREATE TABLE IF NOT EXISTS veiculos (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id     TEXT UNIQUE,  -- ID Firestore (era = placa)
    placa         TEXT UNIQUE NOT NULL,
    empresa       TEXT DEFAULT 'PONTUAL',
    tipo          TEXT,  -- cavalo, carreta, bitrem, rodotrem
    marca         TEXT,
    modelo        TEXT,
    cor           TEXT,
    ano_fab       TEXT,
    ano_mod       TEXT,
    chassi        TEXT,
    renavam       TEXT,
    tara          TEXT,
    capacidade    NUMERIC,
    eixos         INTEGER,
    combustivel   TEXT,
    status        TEXT DEFAULT 'ativo',   -- ativo, inativo, manutencao

    -- Atrelamento (só cavalos): placas das carretas atreladas
    c1            TEXT,  -- placa carreta 1
    c2            TEXT,  -- placa carreta 2 (bitrem)
    c3            TEXT,  -- placa carreta 3 (rodotrem — reserva)

    -- Bloqueio (objeto rico)
    bloqueio      JSONB DEFAULT '{}'::jsonb,

    -- Motorista atual
    motorista_id  TEXT,
    motorista_nome TEXT,

    -- Odômetro / KM
    odometro_km   NUMERIC,
    odometro_data DATE,

    -- Docs
    crlv_vencimento DATE,
    civ_vencimento  DATE,
    cipp_vencimento DATE,

    -- Extras livres (compat)
    extras        JSONB DEFAULT '{}'::jsonb,

    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_veiculos_placa       ON veiculos(placa);
CREATE INDEX IF NOT EXISTS idx_veiculos_status      ON veiculos(status);
CREATE INDEX IF NOT EXISTS idx_veiculos_tipo        ON veiculos(tipo);
CREATE INDEX IF NOT EXISTS idx_veiculos_bloqueio    ON veiculos((bloqueio->>'ativo'));

-- Trigger updated_at (reusa função criada no schema 001)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_veiculos_upd') THEN
        CREATE TRIGGER trg_veiculos_upd BEFORE UPDATE ON veiculos
            FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
    END IF;
END $$;
