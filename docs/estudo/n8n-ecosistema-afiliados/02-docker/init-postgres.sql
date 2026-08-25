-- =====================================================
-- Init Postgres: cria tabelas do ecossistema
-- Executar UMA VEZ depois do docker compose up:
-- docker exec -i n8n-postgres psql -U n8n -d n8n < init-postgres.sql
-- =====================================================

CREATE TABLE IF NOT EXISTS ofertas_coletadas (
  id BIGSERIAL PRIMARY KEY,
  fonte VARCHAR(20) NOT NULL,               -- amazon | mercadolivre | shopee | aliexpress
  item_id VARCHAR(100),                     -- ID do produto na plataforma
  titulo TEXT NOT NULL,
  preco NUMERIC(10,2),
  preco_original NUMERIC(10,2),
  desconto_pct INT,
  imagem TEXT,
  link_original TEXT NOT NULL,
  link_afiliado TEXT,
  comissao_pct NUMERIC(5,2),
  categoria VARCHAR(50),
  coletado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Colunas: validação Zoom (workflow 11)
ALTER TABLE ofertas_coletadas ADD COLUMN IF NOT EXISTS validado_zoom BOOLEAN;
ALTER TABLE ofertas_coletadas ADD COLUMN IF NOT EXISTS veredicto_zoom VARCHAR(20);
ALTER TABLE ofertas_coletadas ADD COLUMN IF NOT EXISTS score_confianca INT;
ALTER TABLE ofertas_coletadas ADD COLUMN IF NOT EXISTS menor_preco_zoom NUMERIC(10,2);

-- Colunas: score engine (workflow 12) + posting state
ALTER TABLE ofertas_coletadas ADD COLUMN IF NOT EXISTS score_total INT DEFAULT 0;
ALTER TABLE ofertas_coletadas ADD COLUMN IF NOT EXISTS score_breakdown JSONB;
ALTER TABLE ofertas_coletadas ADD COLUMN IF NOT EXISTS scoreado_em TIMESTAMPTZ;
ALTER TABLE ofertas_coletadas ADD COLUMN IF NOT EXISTS postado BOOLEAN DEFAULT FALSE;
ALTER TABLE ofertas_coletadas ADD COLUMN IF NOT EXISTS postado_em TIMESTAMPTZ;
ALTER TABLE ofertas_coletadas ADD COLUMN IF NOT EXISTS urgente_postado BOOLEAN DEFAULT FALSE;
ALTER TABLE ofertas_coletadas ADD COLUMN IF NOT EXISTS urgente_postado_em TIMESTAMPTZ;
ALTER TABLE ofertas_coletadas ADD COLUMN IF NOT EXISTS expira_em TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_ofertas_fonte ON ofertas_coletadas(fonte);
CREATE INDEX IF NOT EXISTS idx_ofertas_item ON ofertas_coletadas(item_id);
CREATE INDEX IF NOT EXISTS idx_ofertas_data ON ofertas_coletadas(coletado_em DESC);
CREATE INDEX IF NOT EXISTS idx_ofertas_validado ON ofertas_coletadas(validado_zoom, score_confianca DESC);
CREATE INDEX IF NOT EXISTS idx_ofertas_fila ON ofertas_coletadas(postado, score_total DESC) WHERE postado = false;
CREATE INDEX IF NOT EXISTS idx_ofertas_urgentes ON ofertas_coletadas(urgente_postado, score_total DESC) WHERE urgente_postado = false;
CREATE INDEX IF NOT EXISTS idx_ofertas_titulo_recente ON ofertas_coletadas(titulo, postado_em DESC) WHERE postado = true;


CREATE TABLE IF NOT EXISTS ofertas_validadas_ia (
  id BIGSERIAL PRIMARY KEY,
  item_id VARCHAR(100),
  fonte VARCHAR(20),
  titulo TEXT,
  preco NUMERIC(10,2),
  media_30d NUMERIC(10,2),
  desconto_real_pct INT,
  link_original TEXT,
  link_afiliado TEXT,
  post_gerado_ia TEXT,
  postado BOOLEAN DEFAULT FALSE,
  postado_em TIMESTAMPTZ,
  detectado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_validadas_postado ON ofertas_validadas_ia(postado, desconto_real_pct DESC);


CREATE TABLE IF NOT EXISTS cupons_coletados (
  id BIGSERIAL PRIMARY KEY,
  fonte VARCHAR(30),                        -- pelando | promobit | cuponomia
  titulo TEXT,
  codigo VARCHAR(50),
  link TEXT,
  loja VARCHAR(100),
  desconto_pct INT,
  descricao TEXT,
  valido_ate DATE,
  coletado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cupons_loja ON cupons_coletados(loja);
CREATE INDEX IF NOT EXISTS idx_cupons_valido ON cupons_coletados(valido_ate);


-- Termos em alta (Google Trends BR + ML Trends) — workflow 14
-- Consumido pelo workflow 12 (score engine) pra dar +7/+10 pontos em produtos trending
CREATE TABLE IF NOT EXISTS termos_hot_agora (
  id BIGSERIAL PRIMARY KEY,
  fonte VARCHAR(30) NOT NULL,             -- google-trends | ml-trends
  termo TEXT NOT NULL,                    -- ex: "iphone 17", "playstation 5"
  volume_estimado VARCHAR(20),            -- "500K+", "1M+" (só Google Trends fornece)
  coletado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_termos_hot_termo ON termos_hot_agora USING gin(to_tsvector('portuguese', termo));
CREATE INDEX IF NOT EXISTS idx_termos_hot_data ON termos_hot_agora(coletado_em DESC);


CREATE TABLE IF NOT EXISTS click_tracker (
  id BIGSERIAL PRIMARY KEY,
  oferta_id BIGINT REFERENCES ofertas_validadas_ia(id),
  ip VARCHAR(45),
  user_agent TEXT,
  referer TEXT,
  clicado_em TIMESTAMPTZ DEFAULT NOW()
);


-- Performance por categoria (workflow 15 - feedback loop CTR)
-- Consumido pelo workflow 12 (score engine) pra dar boost em categorias que convertem
CREATE TABLE IF NOT EXISTS performance_categoria (
  id BIGSERIAL PRIMARY KEY,
  categoria VARCHAR(50) NOT NULL UNIQUE,
  posts_totais INT DEFAULT 0,
  cliques_totais INT DEFAULT 0,
  ctr_pct NUMERIC(5,2) DEFAULT 0,           -- click-through rate
  boost_score INT DEFAULT 0,                 -- pontos extras -20 a +20
  vendas_estimadas INT DEFAULT 0,            -- se Caminho B: soma comissões pagas
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perf_categoria ON performance_categoria(categoria);

-- Log de posts + link Kutt gerado (workflow 15 lê pra medir cliques)
CREATE TABLE IF NOT EXISTS posts_log (
  id BIGSERIAL PRIMARY KEY,
  oferta_id BIGINT,
  categoria VARCHAR(50),
  kutt_link_id VARCHAR(50),                  -- ex: "abc123" (o final da URL kutt)
  kutt_short_url TEXT,                       -- ex: "http://localhost:3010/abc123"
  link_afiliado_original TEXT,
  cliques_ultimo_check INT DEFAULT 0,
  postado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_log_data ON posts_log(postado_em DESC);
CREATE INDEX IF NOT EXISTS idx_posts_log_kutt ON posts_log(kutt_link_id);


-- BANCO SEPARADO PRA KUTT (não polui banco do n8n)
-- Roda automaticamente na primeira subida do Postgres
CREATE DATABASE kutt WITH OWNER = n8n;


-- Métricas rápidas
CREATE VIEW IF NOT EXISTS v_metricas_dia AS
SELECT
  DATE(coletado_em) as dia,
  fonte,
  COUNT(*) as coletadas
FROM ofertas_coletadas
WHERE coletado_em > NOW() - INTERVAL '30 days'
GROUP BY DATE(coletado_em), fonte
ORDER BY dia DESC;

CREATE VIEW IF NOT EXISTS v_top_categoria AS
SELECT categoria, COUNT(*) as qtd, AVG(desconto_pct) as media_desconto
FROM ofertas_coletadas
WHERE coletado_em > NOW() - INTERVAL '7 days'
GROUP BY categoria
ORDER BY qtd DESC
LIMIT 20;

-- Confirma
SELECT 'Tabelas criadas com sucesso' as status;
