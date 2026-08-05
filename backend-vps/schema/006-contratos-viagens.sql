-- 006-contratos-viagens.sql
-- Modulo NOVO: Contratos de compra + Viagens (retiradas) na Pontual.
--
-- Contexto (Wesley 2026-08-04):
--   Pontual compra combustivel (etanol anidro/hidratado, diesel S10/S500, gasolina)
--   de distribuidoras/usinas (ex: COOPCANA/CPA — CNPJ 78.340.270/0002-10).
--   Contrato define VOLUME TOTAL em m3. Cada viagem (motorista busca na usina,
--   traz pra base Araucaria) CONSUME parte desse volume ate esgotar.
--
-- Regra de complemento:
--   Se saldo(contrato_principal) < capacidade(veiculo), viagem pode consumir de
--   MAIS DE UM contrato (mesmo produto, mesmo fornecedor) — via viagem_itens.
--   Ex: veiculo 38.000 L, contrato principal com 8.000 L de saldo, sistema
--       auto-sugere contrato complementar ativo pra completar os 30.000 L faltantes.
--
-- Unidade base: TUDO em LITROS no banco (evita floats esquisitos com m3).
--   Frontend exibe em m3 nas telas de contrato e em L nas telas de viagem/frota.
--   Conversao: 1 m3 = 1000 L
--
-- Aplicar (homolog):
--   PGPASSWORD=$DB_PASS psql -h 127.0.0.1 -U pontual_app -d pontual_homolog \
--       -f /var/pontual-homolog/backend-vps/schema/006-contratos-viagens.sql

-- ============================================================
-- FORNECEDORES (usinas e distribuidoras)
-- ============================================================
CREATE TABLE IF NOT EXISTS fornecedores (
    id                TEXT PRIMARY KEY,
    razao_social      TEXT NOT NULL,
    nome_fantasia     TEXT,
    cnpj              TEXT UNIQUE NOT NULL,
    inscricao_estadual TEXT,
    registro_anp      TEXT,
    endereco          TEXT,
    numero            TEXT,
    bairro            TEXT,
    complemento       TEXT,
    cidade            TEXT,
    uf                TEXT,
    cep               TEXT,
    telefone          TEXT,
    email             TEXT,
    -- Dados bancarios (pra deposito antecipado)
    banco             TEXT,
    banco_agencia     TEXT,
    banco_conta       TEXT,
    banco_cnpj        TEXT,
    -- Auditoria
    ativo             BOOLEAN NOT NULL DEFAULT TRUE,
    criado_por        TEXT,
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_por    TEXT,
    atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fornecedores_cnpj  ON fornecedores(cnpj);
CREATE INDEX IF NOT EXISTS idx_fornecedores_ativo ON fornecedores(ativo);

-- ============================================================
-- CONTRATOS DE COMPRA
-- ============================================================
CREATE TABLE IF NOT EXISTS contratos_compra (
    id                     TEXT PRIMARY KEY,

    -- Identificacao (do PDF emitido pela distribuidora)
    numero                 TEXT NOT NULL,       -- ex: "101553"
    protocolo              TEXT,                -- ex: "0"
    data_contrato          DATE NOT NULL,       -- ex: 2026-08-03
    operador_fornecedor    TEXT,                -- ex: "Aislan Lenon Antonelli"
    tipo_formulario        TEXT,                -- ex: "F-MIN-001"

    -- Vendedor
    fornecedor_id          TEXT NOT NULL REFERENCES fornecedores(id),

    -- Comprador (por default e a Pontual, mas fica salvo caso mude de razao social)
    comprador_razao_social TEXT DEFAULT 'PONTUAL BRASIL PETROLEO LTDA',
    comprador_cnpj         TEXT DEFAULT '02.886.685/0001-40',

    -- Produto
    produto                TEXT NOT NULL,       -- ETANOL_ANIDRO | ETANOL_HIDRATADO |
                                                -- DIESEL_S10 | DIESEL_S500 | GASOLINA | OUTRO
    produto_descricao      TEXT,                -- descricao literal do PDF (fallback)

    -- Volumes (em LITROS — sempre)
    volume_total_litros    NUMERIC(14,2) NOT NULL CHECK (volume_total_litros > 0),

    -- Precos
    preco_por_m3           NUMERIC(12,4) NOT NULL,   -- ex: 2452.37
    icms_por_m3            NUMERIC(12,4) DEFAULT 0,
    valor_total            NUMERIC(14,2) NOT NULL,   -- calculado ou vindo do PDF
    data_pagamento         DATE,
    forma_pagamento        TEXT,                     -- ex: "DEPOSITO ANTECIPADO..."

    -- Operacao / retirada
    modalidade             TEXT,                     -- ex: "PVU/FOB" | "CIF"
    condicoes_retirada     TEXT,
    local_retirada_nome    TEXT,                     -- ex: "COOPCANA - IND."
    local_retirada_endereco TEXT,

    -- Referencias comerciais
    safra                  TEXT,                     -- ex: "26/27"
    indice_referencia      TEXT,                     -- ex: "CEPEA-ESALQ..."
    observacoes            TEXT,

    -- Complemento (contrato pai)
    contrato_pai_id        TEXT REFERENCES contratos_compra(id),
                                                    -- NULL = contrato principal
                                                    -- preenchido = contrato criado como complemento

    -- Status
    status                 TEXT NOT NULL DEFAULT 'ativo'
                           CHECK (status IN ('rascunho','ativo','pago','esgotado','cancelado')),

    -- Auditoria
    criado_por             TEXT,
    criado_em              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_por         TEXT,
    atualizado_em          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_contratos_numero_fornecedor
    ON contratos_compra(numero, fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_contratos_fornecedor  ON contratos_compra(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_contratos_status      ON contratos_compra(status);
CREATE INDEX IF NOT EXISTS idx_contratos_produto     ON contratos_compra(produto);
CREATE INDEX IF NOT EXISTS idx_contratos_pai         ON contratos_compra(contrato_pai_id);
CREATE INDEX IF NOT EXISTS idx_contratos_data        ON contratos_compra(data_contrato);

-- ============================================================
-- ANEXOS DO CONTRATO (PDF principal + docs auxiliares)
-- ============================================================
CREATE TABLE IF NOT EXISTS contratos_anexos (
    id            TEXT PRIMARY KEY,
    contrato_id   TEXT NOT NULL REFERENCES contratos_compra(id) ON DELETE CASCADE,
    tipo          TEXT NOT NULL DEFAULT 'contrato'
                  CHECK (tipo IN ('contrato','nf','comprovante_pagto','outro')),
    nome_arquivo  TEXT NOT NULL,
    caminho       TEXT NOT NULL,        -- ex: /var/pontual-homolog/uploads/contratos/2026/101553.pdf
    mime_type     TEXT,
    tamanho_bytes BIGINT,
    -- Extracao automatica (parser regex / LLM)
    texto_extraido TEXT,
    dados_extraidos JSONB,              -- JSON com campos detectados (pra debug)
    metodo_extracao TEXT,               -- "regex_cpa" | "openai_mini" | "manual"
    -- Auditoria
    criado_por    TEXT,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anexos_contrato ON contratos_anexos(contrato_id);

-- ============================================================
-- VIAGENS (= retiradas)
-- Motorista busca na usina/fornecedor e traz pra base Pontual Araucaria
-- ============================================================
CREATE TABLE IF NOT EXISTS viagens (
    id                       TEXT PRIMARY KEY,

    -- Programacao
    numero                   SERIAL UNIQUE,       -- numero sequencial auto (ex: V-000123)
    data_programada          DATE,
    data_saida               TIMESTAMPTZ,
    data_chegada             TIMESTAMPTZ,

    -- Frota
    veiculo_id               TEXT NOT NULL,       -- FK solta pra veiculos (mesmo padrao do resto do sistema)
    veiculo_placa            TEXT,                -- denormalizado pra listagem
    carreta_id               TEXT,                -- carreta atrelada (se aplicavel)
    carreta_placa            TEXT,
    motorista_id             TEXT NOT NULL,
    motorista_nome           TEXT,

    -- Origem (fornecedor/usina — denormalizado do contrato principal)
    origem_fornecedor_id     TEXT REFERENCES fornecedores(id),
    origem_nome              TEXT,
    origem_endereco          TEXT,
    origem_cidade            TEXT,
    origem_uf                TEXT,

    -- Destino (default = base Araucaria; editavel)
    destino_nome             TEXT DEFAULT 'PONTUAL BRASIL PETROLEO LTDA - Base Araucaria',
    destino_endereco         TEXT DEFAULT 'Rua Luiz Franceschi, 666 - Thomaz Coelho',
    destino_cidade           TEXT DEFAULT 'Araucaria',
    destino_uf               TEXT DEFAULT 'PR',

    -- Nota fiscal da distribuidora
    nfe_numero               TEXT,
    nfe_chave                TEXT,
    nfe_data_emissao         DATE,

    -- Volumes (litros — soma dos itens)
    volume_total_litros      NUMERIC(14,2) NOT NULL DEFAULT 0,

    -- Custos operacionais (opcional — futuro CPK)
    km_saida                 NUMERIC(10,1),
    km_chegada               NUMERIC(10,1),
    custo_pedagio            NUMERIC(12,2),
    custo_diaria             NUMERIC(12,2),

    -- Observacoes / status
    observacoes              TEXT,
    status                   TEXT NOT NULL DEFAULT 'programada'
                             CHECK (status IN ('programada','em_transito','concluida','cancelada')),

    -- Auditoria
    criado_por               TEXT,
    criado_em                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_por           TEXT,
    atualizado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_viagens_veiculo    ON viagens(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_viagens_motorista  ON viagens(motorista_id);
CREATE INDEX IF NOT EXISTS idx_viagens_fornecedor ON viagens(origem_fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_viagens_status     ON viagens(status);
CREATE INDEX IF NOT EXISTS idx_viagens_data_prog  ON viagens(data_programada);

-- ============================================================
-- VIAGEM_ITENS (N:N contrato <-> viagem — suporta complemento)
-- Cada linha = "esta viagem consumiu X litros deste contrato"
-- ============================================================
CREATE TABLE IF NOT EXISTS viagem_itens (
    id             TEXT PRIMARY KEY,
    viagem_id      TEXT NOT NULL REFERENCES viagens(id) ON DELETE CASCADE,
    contrato_id    TEXT NOT NULL REFERENCES contratos_compra(id),
    volume_litros  NUMERIC(14,2) NOT NULL CHECK (volume_litros > 0),
    ordem          INTEGER NOT NULL DEFAULT 1,   -- 1 = principal, 2+ = complementos
    criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_viagem_itens_viagem   ON viagem_itens(viagem_id);
CREATE INDEX IF NOT EXISTS idx_viagem_itens_contrato ON viagem_itens(contrato_id);

-- ============================================================
-- VIEW: saldo atual de cada contrato (calculado)
-- ============================================================
CREATE OR REPLACE VIEW v_contratos_saldo AS
SELECT
    c.id,
    c.numero,
    c.produto,
    c.fornecedor_id,
    c.volume_total_litros,
    COALESCE(SUM(vi.volume_litros), 0)                              AS volume_retirado_litros,
    (c.volume_total_litros - COALESCE(SUM(vi.volume_litros), 0))    AS saldo_litros,
    CASE
        WHEN c.volume_total_litros = 0 THEN 0
        ELSE ROUND(
            (COALESCE(SUM(vi.volume_litros), 0) / c.volume_total_litros) * 100,
            2
        )
    END                                                             AS percentual_retirado,
    c.status
FROM contratos_compra c
LEFT JOIN viagem_itens vi ON vi.contrato_id = c.id
LEFT JOIN viagens v ON v.id = vi.viagem_id AND v.status <> 'cancelada'
GROUP BY c.id;

-- ============================================================
-- Trigger: atualiza volume_total_litros da viagem quando itens mudam
-- ============================================================
CREATE OR REPLACE FUNCTION fn_atualiza_volume_viagem()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE viagens
       SET volume_total_litros = (
           SELECT COALESCE(SUM(volume_litros), 0)
           FROM viagem_itens
           WHERE viagem_id = COALESCE(NEW.viagem_id, OLD.viagem_id)
       ),
       atualizado_em = NOW()
    WHERE id = COALESCE(NEW.viagem_id, OLD.viagem_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_viagem_itens_volume ON viagem_itens;
CREATE TRIGGER trg_viagem_itens_volume
    AFTER INSERT OR UPDATE OR DELETE ON viagem_itens
    FOR EACH ROW EXECUTE FUNCTION fn_atualiza_volume_viagem();

-- ============================================================
-- Trigger: marca contrato como 'esgotado' quando saldo chega em 0
-- ============================================================
CREATE OR REPLACE FUNCTION fn_atualiza_status_contrato()
RETURNS TRIGGER AS $$
DECLARE
    v_saldo NUMERIC;
BEGIN
    SELECT (c.volume_total_litros - COALESCE(SUM(vi.volume_litros), 0))
      INTO v_saldo
      FROM contratos_compra c
      LEFT JOIN viagem_itens vi ON vi.contrato_id = c.id
     WHERE c.id = COALESCE(NEW.contrato_id, OLD.contrato_id)
     GROUP BY c.id, c.volume_total_litros;

    IF v_saldo <= 0 THEN
        UPDATE contratos_compra
           SET status = 'esgotado', atualizado_em = NOW()
         WHERE id = COALESCE(NEW.contrato_id, OLD.contrato_id)
           AND status IN ('ativo','pago');
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_atualiza_status_contrato ON viagem_itens;
CREATE TRIGGER trg_atualiza_status_contrato
    AFTER INSERT OR UPDATE OR DELETE ON viagem_itens
    FOR EACH ROW EXECUTE FUNCTION fn_atualiza_status_contrato();

-- ============================================================
-- Verificacao (executar apos migrar)
-- \d fornecedores
-- \d contratos_compra
-- \d viagens
-- \d viagem_itens
-- SELECT * FROM v_contratos_saldo;
-- ============================================================
