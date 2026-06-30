-- =====================================================================
-- Sistema Logística — Pontual Petróleo
-- Esquema de banco de dados (MySQL 8 / MariaDB 10.4+)
-- Conversão do Firestore -> SQL relacional
-- © 2026 Pontual Petróleo. Todos os direitos reservados.
-- =====================================================================
-- Convenções:
--   * Engine InnoDB, charset utf8mb4 (acentos + emoji), collation _unicode_ci
--   * Multi-tenancy: coluna empresa_id em toda tabela operacional
--   * Datas de negócio: DATE (YYYY-MM-DD). Carimbos: TIMESTAMP (servidor)
--   * Placas: sempre UPPER, sem traço. Email: sempre lower
--   * Status: VARCHAR/ENUM legível (nunca boolean para status com >2 estados)
-- =====================================================================

SET NAMES utf8mb4;
SET time_zone = '-03:00';            -- America/Sao_Paulo
SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================================
-- 0. MULTI-TENANCY
-- =====================================================================
CREATE TABLE empresas (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome          VARCHAR(160)  NOT NULL,
  cnpj          VARCHAR(18)   NULL,
  slug          VARCHAR(60)   NOT NULL,
  plano         VARCHAR(40)   NOT NULL DEFAULT 'trial',  -- trial|basico|pro
  ativo         TINYINT(1)    NOT NULL DEFAULT 1,
  created_at    TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_empresas_slug (slug),
  UNIQUE KEY uq_empresas_cnpj (cnpj)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 1. RBAC  (setores -> cargos -> permissoes ; usuarios)
-- =====================================================================
CREATE TABLE setores (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id    BIGINT UNSIGNED NOT NULL,
  nome          VARCHAR(120)  NOT NULL,
  descricao     VARCHAR(255)  NULL,
  status        ENUM('ativo','inativo') NOT NULL DEFAULT 'ativo',
  created_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_setores_empresa (empresa_id),
  CONSTRAINT fk_setores_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cargos (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id    BIGINT UNSIGNED NOT NULL,
  setor_id      BIGINT UNSIGNED NULL,
  nome          VARCHAR(120)  NOT NULL,
  nivel         TINYINT UNSIGNED NOT NULL DEFAULT 1,   -- 1 (baixo) .. 5 (alto)
  descricao     VARCHAR(255)  NULL,
  status        ENUM('ativo','inativo') NOT NULL DEFAULT 'ativo',
  created_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_cargos_empresa (empresa_id),
  KEY ix_cargos_setor (setor_id),
  CONSTRAINT fk_cargos_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
  CONSTRAINT fk_cargos_setor  FOREIGN KEY (setor_id)  REFERENCES setores(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Catálogo mestre de permissões (<modulo>.<acao>)
CREATE TABLE permissoes_catalogo (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome          VARCHAR(80)  NOT NULL,         -- "frota.editar"
  modulo        VARCHAR(40)  NOT NULL,         -- "frota"
  acao          VARCHAR(40)  NOT NULL,         -- "editar"
  descricao     VARCHAR(160) NULL,
  created_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_perm_nome (nome),
  KEY ix_perm_modulo (modulo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pivot cargo <-> permissão (substitui o array denormalizado do Firestore)
CREATE TABLE cargo_permissao (
  cargo_id      BIGINT UNSIGNED NOT NULL,
  permissao_id  BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (cargo_id, permissao_id),
  KEY ix_cp_permissao (permissao_id),
  CONSTRAINT fk_cp_cargo     FOREIGN KEY (cargo_id)     REFERENCES cargos(id)              ON DELETE CASCADE,
  CONSTRAINT fk_cp_permissao FOREIGN KEY (permissao_id) REFERENCES permissoes_catalogo(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE usuarios (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id      BIGINT UNSIGNED NOT NULL,
  nome            VARCHAR(160) NOT NULL,
  email           VARCHAR(190) NOT NULL,
  password        VARCHAR(255) NOT NULL,         -- bcrypt (substitui Firebase Auth)
  setor_id        BIGINT UNSIGNED NULL,
  cargo_id        BIGINT UNSIGNED NULL,
  is_super_admin  TINYINT(1) NOT NULL DEFAULT 0, -- ignora qualquer permissão
  ativo           TINYINT(1) NOT NULL DEFAULT 1, -- 0 bloqueia login
  role            VARCHAR(40) NULL,              -- legado: master|admin
  remember_token  VARCHAR(100) NULL,
  email_verified_at TIMESTAMP NULL,
  created_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email),
  KEY ix_usuarios_empresa (empresa_id),
  KEY ix_usuarios_cargo (cargo_id),
  CONSTRAINT fk_usuarios_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
  CONSTRAINT fk_usuarios_setor   FOREIGN KEY (setor_id)   REFERENCES setores(id)  ON DELETE SET NULL,
  CONSTRAINT fk_usuarios_cargo   FOREIGN KEY (cargo_id)   REFERENCES cargos(id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabelas de infra do Laravel (sessões, cache, jobs) -------------------
CREATE TABLE sessions (
  id            VARCHAR(255) NOT NULL,
  user_id       BIGINT UNSIGNED NULL,
  ip_address    VARCHAR(45) NULL,
  user_agent    TEXT NULL,
  payload       LONGTEXT NOT NULL,
  last_activity INT NOT NULL,
  PRIMARY KEY (id),
  KEY ix_sessions_user (user_id),
  KEY ix_sessions_last (last_activity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cache (
  `key`       VARCHAR(255) NOT NULL,
  value       MEDIUMTEXT NOT NULL,
  expiration  INT NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE jobs (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  queue         VARCHAR(255) NOT NULL,
  payload       LONGTEXT NOT NULL,
  attempts      TINYINT UNSIGNED NOT NULL,
  reserved_at   INT UNSIGNED NULL,
  available_at  INT UNSIGNED NOT NULL,
  created_at    INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY ix_jobs_queue (queue)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 2. FROTA
-- =====================================================================
CREATE TABLE veiculos (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id    BIGINT UNSIGNED NOT NULL,
  placa         VARCHAR(8)  NOT NULL,                 -- ABC1D23
  tipo          ENUM('cavalo','carreta') NOT NULL,
  status        ENUM('ativo','disponivel','em_viagem','manutencao','inativo') NOT NULL DEFAULT 'ativo',
  modelo        VARCHAR(80)  NULL,
  fabricante    VARCHAR(80)  NULL,
  ano_modelo    VARCHAR(9)   NULL,
  ano_fab       VARCHAR(9)   NULL,
  chassi        VARCHAR(40)  NULL,
  renavam       VARCHAR(20)  NULL,
  tara          VARCHAR(12)  NULL,                    -- peso vazio (kg)
  -- Específico de cavalo:
  cap           VARCHAR(12)  NULL,                    -- capacidade total (litros)
  comp          VARCHAR(20)  NULL,                    -- LS|Bitrem|Rodotrem|4° Eixo
  motorista_id  BIGINT UNSIGNED NULL,                 -- motorista atrelado
  c1_veiculo_id BIGINT UNSIGNED NULL,                 -- carreta 1 (FK)
  t1            VARCHAR(20)  NULL,
  c2_veiculo_id BIGINT UNSIGNED NULL,                 -- carreta 2 (FK)
  t2            VARCHAR(20)  NULL,
  -- Bloqueio (origem 'os' = ordem de serviço de manutenção):
  bloqueio_ativo  TINYINT(1) NOT NULL DEFAULT 0,
  bloqueio_motivo VARCHAR(40) NULL,                   -- CIV|CIPP|Manutenção|...
  bloqueio_origem VARCHAR(20) NULL,                   -- 'os' | 'manual'
  bloqueio_obs    VARCHAR(255) NULL,
  obs           TEXT NULL,
  created_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_veiculos_empresa_placa (empresa_id, placa),
  KEY ix_veiculos_tipo (tipo),
  KEY ix_veiculos_status (status),
  KEY ix_veiculos_motorista (motorista_id),
  CONSTRAINT fk_veiculos_empresa FOREIGN KEY (empresa_id)    REFERENCES empresas(id)  ON DELETE CASCADE,
  CONSTRAINT fk_veiculos_c1      FOREIGN KEY (c1_veiculo_id) REFERENCES veiculos(id)  ON DELETE SET NULL,
  CONSTRAINT fk_veiculos_c2      FOREIGN KEY (c2_veiculo_id) REFERENCES veiculos(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Compartimentos (multi-setas) por veículo
CREATE TABLE compartimentos (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  veiculo_id        BIGINT UNSIGNED NOT NULL,
  numero            TINYINT UNSIGNED NOT NULL,
  capacidade_litros INT UNSIGNED NOT NULL,
  produto_id        BIGINT UNSIGNED NULL,           -- produto atual carregado
  PRIMARY KEY (id),
  UNIQUE KEY uq_comp_veiculo_numero (veiculo_id, numero),
  CONSTRAINT fk_comp_veiculo FOREIGN KEY (veiculo_id) REFERENCES veiculos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 3. MOTORISTAS
-- =====================================================================
CREATE TABLE motoristas (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id    BIGINT UNSIGNED NOT NULL,
  nome          VARCHAR(160) NOT NULL,
  cnh           VARCHAR(20)  NULL,
  cat           VARCHAR(5)   NULL,                  -- D, E
  tel           VARCHAR(20)  NULL,
  status        ENUM('ativo','inativo','desligado') NOT NULL DEFAULT 'ativo',
  cnh_venc      DATE NULL,
  mopp_venc     DATE NULL,
  nr20_venc     DATE NULL,
  nr35_venc     DATE NULL,
  obs           TEXT NULL,
  created_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_motoristas_empresa (empresa_id),
  KEY ix_motoristas_status (status),
  CONSTRAINT fk_motoristas_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- FK tardia veiculos.motorista_id -> motoristas (após criar motoristas)
ALTER TABLE veiculos
  ADD CONSTRAINT fk_veiculos_motorista FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE SET NULL;

-- =====================================================================
-- 4. CADASTROS DE APOIO
-- =====================================================================
CREATE TABLE produtos (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id    BIGINT UNSIGNED NOT NULL,
  nome          VARCHAR(80) NOT NULL,             -- "Diesel S10"
  codigo_anp    VARCHAR(20) NULL,
  unidade       VARCHAR(12) NOT NULL DEFAULT 'litros',
  created_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_produtos_empresa (empresa_id),
  CONSTRAINT fk_produtos_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE clientes (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id    BIGINT UNSIGNED NOT NULL,
  razao_social  VARCHAR(190) NOT NULL,
  cnpj          VARCHAR(18)  NULL,
  endereco      VARCHAR(255) NULL,
  lat           DECIMAL(10,7) NULL,
  lng           DECIMAL(10,7) NULL,
  contato       VARCHAR(120) NULL,
  created_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_clientes_empresa (empresa_id),
  CONSTRAINT fk_clientes_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE usinas (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id    BIGINT UNSIGNED NOT NULL,
  nome          VARCHAR(160) NOT NULL,
  endereco      VARCHAR(255) NULL,
  lat           DECIMAL(10,7) NULL,
  lng           DECIMAL(10,7) NULL,
  produtos_disponiveis JSON NULL,                 -- ["Diesel S10","Anidro",...]
  created_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_usinas_empresa (empresa_id),
  CONSTRAINT fk_usinas_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 5. PEDIDOS
-- =====================================================================
CREATE TABLE pedidos (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id      BIGINT UNSIGNED NOT NULL,
  cliente_id      BIGINT UNSIGNED NULL,
  produto_id      BIGINT UNSIGNED NULL,
  litros          INT UNSIGNED NULL,
  data_solicitada DATE NULL,
  status          VARCHAR(30) NOT NULL DEFAULT 'aberto',
  nfe_vinculada   VARCHAR(60) NULL,
  created_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_pedidos_empresa (empresa_id),
  KEY ix_pedidos_cliente (cliente_id),
  CONSTRAINT fk_pedidos_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
  CONSTRAINT fk_pedidos_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
  CONSTRAINT fk_pedidos_produto FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 6. ORDENS DE CARREGAMENTO (OC)  +  entregas
-- =====================================================================
CREATE TABLE ordens_carregamento (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id    BIGINT UNSIGNED NOT NULL,
  num           VARCHAR(16) NOT NULL,             -- "OC-0001"
  data          DATE NULL,
  hora          VARCHAR(5) NULL,                  -- "HH:MM"
  base          ENUM('PONTUAL','REPLAN','OUTROS') NOT NULL DEFAULT 'PONTUAL',
  cavalo_id     BIGINT UNSIGNED NULL,
  cavalo_placa  VARCHAR(8) NULL,                  -- denormalizado
  motorista_id  BIGINT UNSIGNED NULL,
  motorista_nome VARCHAR(160) NULL,               -- denormalizado
  resp          VARCHAR(120) NULL,                -- despachante responsável
  c1_placa      VARCHAR(8) NULL,
  t1            VARCHAR(20) NULL,
  c2_placa      VARCHAR(8) NULL,
  t2            VARCHAR(20) NULL,
  obs           TEXT NULL,
  created_by    BIGINT UNSIGNED NULL,             -- usuario
  created_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_oc_empresa_num (empresa_id, num),
  KEY ix_oc_empresa (empresa_id),
  KEY ix_oc_cavalo (cavalo_id),
  CONSTRAINT fk_oc_empresa   FOREIGN KEY (empresa_id)   REFERENCES empresas(id)   ON DELETE CASCADE,
  CONSTRAINT fk_oc_cavalo    FOREIGN KEY (cavalo_id)    REFERENCES veiculos(id)   ON DELETE SET NULL,
  CONSTRAINT fk_oc_motorista FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE SET NULL,
  CONSTRAINT fk_oc_usuario   FOREIGN KEY (created_by)   REFERENCES usuarios(id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE oc_entregas (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  oc_id         BIGINT UNSIGNED NOT NULL,
  seq           SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  dest          VARCHAR(190) NULL,                -- destino/cliente
  cliente_id    BIGINT UNSIGNED NULL,
  prod          VARCHAR(80) NULL,                 -- produto (texto)
  vol           INT UNSIGNED NULL,               -- volume em litros
  req           VARCHAR(40) NULL,                 -- nº requisição
  status        VARCHAR(20) NOT NULL DEFAULT 'pendente',
  PRIMARY KEY (id),
  KEY ix_entregas_oc (oc_id),
  CONSTRAINT fk_entregas_oc      FOREIGN KEY (oc_id)      REFERENCES ordens_carregamento(id) ON DELETE CASCADE,
  CONSTRAINT fk_entregas_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id)            ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 7. ATRELAMENTOS (histórico ATR/DES/SUB)
-- =====================================================================
CREATE TABLE atrelamentos (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id    BIGINT UNSIGNED NOT NULL,
  num           VARCHAR(16) NOT NULL,             -- "ATR-0001"
  data          DATE NULL,
  hora          VARCHAR(5) NULL,
  op            ENUM('ATRELAMENTO','DESATRELAMENTO','SUBSTITUIÇÃO') NOT NULL,
  cavalo_id     BIGINT UNSIGNED NULL,
  cavalo_placa  VARCHAR(8) NULL,
  km            VARCHAR(12) NULL,
  c1_placa      VARCHAR(8) NULL,
  t1            VARCHAR(20) NULL,
  c2_placa      VARCHAR(8) NULL,
  t2            VARCHAR(20) NULL,
  motorista_nome VARCHAR(160) NULL,
  local         VARCHAR(160) NULL,
  status        ENUM('CONCLUÍDO','PENDENTE','CANCELADO') NOT NULL DEFAULT 'CONCLUÍDO',
  obs           TEXT NULL,
  created_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_atr_empresa_num (empresa_id, num),
  KEY ix_atr_empresa (empresa_id),
  KEY ix_atr_cavalo (cavalo_id),
  CONSTRAINT fk_atr_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
  CONSTRAINT fk_atr_cavalo  FOREIGN KEY (cavalo_id)  REFERENCES veiculos(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 8. MANUTENÇÃO — itens com vencimento (doc/mecânica/motorista)
-- =====================================================================
CREATE TABLE manutencoes (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id    BIGINT UNSIGNED NOT NULL,
  veiculo_id    BIGINT UNSIGNED NULL,
  placa         VARCHAR(8) NULL,                  -- denormalizado p/ itens sem FK
  tipo          VARCHAR(30) NOT NULL,            -- civ|cipp|crlv|oleo|pneus|cnh_venc|...
  data_realiz   DATE NULL,
  venc          DATE NULL,
  local         VARCHAR(160) NULL,
  numero_doc    VARCHAR(60) NULL,
  km_atual      VARCHAR(12) NULL,
  resp          VARCHAR(120) NULL,
  obs           TEXT NULL,
  created_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_manut_empresa (empresa_id),
  KEY ix_manut_veiculo (veiculo_id),
  KEY ix_manut_venc (venc),
  CONSTRAINT fk_manut_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
  CONSTRAINT fk_manut_veiculo FOREIGN KEY (veiculo_id) REFERENCES veiculos(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Anexos de manutenção (NF, PDF, imagem) — caminho no storage
CREATE TABLE manutencao_anexos (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  manutencao_id BIGINT UNSIGNED NOT NULL,
  nome_arquivo  VARCHAR(255) NOT NULL,
  caminho       VARCHAR(255) NOT NULL,           -- storage/app/...
  mime          VARCHAR(120) NULL,
  tamanho       INT UNSIGNED NULL,
  created_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_anexo_manut (manutencao_id),
  CONSTRAINT fk_anexo_manut FOREIGN KEY (manutencao_id) REFERENCES manutencoes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 9. ORDENS DE SERVIÇO (OS de manutenção mecânica)
--    Regra: abrir OS bloqueia o veículo (bloqueio.origem='os').
--           Editável por 24h. Finalizar libera (se não houver outra OS aberta).
-- =====================================================================
CREATE TABLE ordens_servico (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id      BIGINT UNSIGNED NOT NULL,
  numero          VARCHAR(16) NOT NULL,            -- "OS-00001"
  data_hora       DATETIME NOT NULL,
  tipo_servico    VARCHAR(120) NOT NULL,           -- "Troca de Óleo"...
  veiculo_id      BIGINT UNSIGNED NULL,
  placa           VARCHAR(8) NOT NULL,
  motorista_id    BIGINT UNSIGNED NULL,
  motorista_nome  VARCHAR(160) NULL,
  status          ENUM('aberta','finalizada','cancelada') NOT NULL DEFAULT 'aberta',
  obs             TEXT NULL,
  criado_por      VARCHAR(190) NULL,               -- email
  finalizada_em   DATETIME NULL,
  created_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_os_empresa_num (empresa_id, numero),
  KEY ix_os_empresa (empresa_id),
  KEY ix_os_veiculo (veiculo_id),
  KEY ix_os_status (status),
  CONSTRAINT fk_os_empresa   FOREIGN KEY (empresa_id)   REFERENCES empresas(id)   ON DELETE CASCADE,
  CONSTRAINT fk_os_veiculo   FOREIGN KEY (veiculo_id)   REFERENCES veiculos(id)   ON DELETE SET NULL,
  CONSTRAINT fk_os_motorista FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 10. FÉRIAS
-- =====================================================================
CREATE TABLE ferias (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id    BIGINT UNSIGNED NOT NULL,
  motorista_id  BIGINT UNSIGNED NULL,
  motorista_nome VARCHAR(160) NULL,
  inicio        DATE NULL,
  fim           DATE NULL,
  esocial       TINYINT(1) NOT NULL DEFAULT 0,
  obs           TEXT NULL,
  created_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_ferias_empresa (empresa_id),
  KEY ix_ferias_motorista (motorista_id),
  CONSTRAINT fk_ferias_empresa   FOREIGN KEY (empresa_id)   REFERENCES empresas(id)   ON DELETE CASCADE,
  CONSTRAINT fk_ferias_motorista FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 11. VIAGENS (execução da OC)
-- =====================================================================
CREATE TABLE viagens (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id    BIGINT UNSIGNED NOT NULL,
  ordem_id      BIGINT UNSIGNED NULL,
  motorista_id  BIGINT UNSIGNED NULL,
  status        ENUM('aguardando','carregando','em_rota','vazio','concluida') NOT NULL DEFAULT 'aguardando',
  pos_lat       DECIMAL(10,7) NULL,
  pos_lng       DECIMAL(10,7) NULL,
  pos_timestamp DATETIME NULL,
  created_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_viagens_empresa (empresa_id),
  KEY ix_viagens_ordem (ordem_id),
  CONSTRAINT fk_viagens_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id)            ON DELETE CASCADE,
  CONSTRAINT fk_viagens_ordem   FOREIGN KEY (ordem_id)   REFERENCES ordens_carregamento(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE viagem_eventos (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  viagem_id     BIGINT UNSIGNED NOT NULL,
  tipo          VARCHAR(40) NOT NULL,
  descricao     VARCHAR(255) NULL,
  ocorrido_em   DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY ix_vevt_viagem (viagem_id),
  CONSTRAINT fk_vevt_viagem FOREIGN KEY (viagem_id) REFERENCES viagens(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 12. RASTREAMENTO SASCAR
-- =====================================================================
CREATE TABLE sascar_posicoes (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id      BIGINT UNSIGNED NOT NULL,
  id_veiculo      BIGINT NOT NULL,                 -- idVeiculo SASCAR (chave de negócio)
  placa           VARCHAR(8) NULL,
  id_equip_desc   VARCHAR(40) NULL,
  atualizado_em   TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  id_pacote       BIGINT NULL,
  data_posicao    VARCHAR(30) NULL,
  data_pacote     VARCHAR(30) NULL,
  latitude        DECIMAL(10,7) NULL,
  longitude       DECIMAL(10,7) NULL,
  direcao         SMALLINT NULL,
  velocidade      SMALLINT NULL,
  ignicao         TINYINT NULL,
  gps             TINYINT NULL,
  odometro        BIGINT NULL,
  horimetro       BIGINT NULL,
  tensao          DECIMAL(5,2) NULL,
  uf              VARCHAR(4) NULL,
  cidade          VARCHAR(120) NULL,
  rua             VARCHAR(190) NULL,
  ponto_ref       VARCHAR(190) NULL,
  id_motorista    BIGINT NULL DEFAULT 0,
  nome_motorista  VARCHAR(160) NULL,
  status_texto    ENUM('EM_MOVIMENTO','PARADO_LIGADO','ESTACIONADO','SEM_DADOS') NULL,
  dentro_de       JSON NULL,                        -- ["cercaId",...]
  PRIMARY KEY (id),
  UNIQUE KEY uq_sascar_empresa_veic (empresa_id, id_veiculo),
  KEY ix_sascar_empresa (empresa_id),
  CONSTRAINT fk_sascar_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cercas_eletronicas (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id    BIGINT UNSIGNED NOT NULL,
  nome          VARCHAR(160) NOT NULL,
  tipo          ENUM('Base','Cliente','Restrita','Posto','Refinaria','Oficina','Outro') NOT NULL DEFAULT 'Outro',
  cor           VARCHAR(9) NULL DEFAULT '#2563eb',
  formato       ENUM('poligono','circulo') NOT NULL DEFAULT 'poligono',
  pontos        JSON NULL,                          -- [[lat,lng],...]
  centro_lat    DECIMAL(10,7) NULL,
  centro_lng    DECIMAL(10,7) NULL,
  raio          INT UNSIGNED NULL,                  -- metros
  criado_em     TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  criado_por    VARCHAR(190) NULL,
  atualizado_em TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  atualizado_por VARCHAR(190) NULL,
  PRIMARY KEY (id),
  KEY ix_cercas_empresa (empresa_id),
  CONSTRAINT fk_cercas_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cercas_eventos (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id    BIGINT UNSIGNED NOT NULL,
  chave         VARCHAR(120) NOT NULL,              -- idVeiculo_cercaId_idPacote_E|S (idempotência)
  tipo          ENUM('ENTRADA','SAIDA') NOT NULL,
  id_veiculo    BIGINT NOT NULL,
  placa         VARCHAR(8) NULL,
  cerca_id      BIGINT UNSIGNED NULL,
  cerca_nome    VARCHAR(160) NULL,
  cerca_tipo    VARCHAR(40) NULL,
  latitude      DECIMAL(10,7) NULL,
  longitude     DECIMAL(10,7) NULL,
  id_pacote     BIGINT NULL,
  data_posicao  VARCHAR(30) NULL,
  criado_em     TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  criado_em_ms  BIGINT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cevt_chave (empresa_id, chave),
  KEY ix_cevt_empresa (empresa_id),
  KEY ix_cevt_cerca (cerca_id),
  CONSTRAINT fk_cevt_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id)           ON DELETE CASCADE,
  CONSTRAINT fk_cevt_cerca   FOREIGN KEY (cerca_id)   REFERENCES cercas_eletronicas(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 13. AUDITORIA  (log completo: quem, o quê, quando, antes/depois)
-- =====================================================================
CREATE TABLE historico (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id    BIGINT UNSIGNED NOT NULL,
  usuario_id    BIGINT UNSIGNED NULL,
  usuario_nome  VARCHAR(160) NULL,
  modulo        VARCHAR(40) NOT NULL,              -- frota|oc|os|manutencao|usuarios|...
  acao          VARCHAR(40) NOT NULL,             -- criar|editar|excluir|atrelar|...
  entidade      VARCHAR(40) NULL,                 -- nome da tabela/recurso
  entidade_id   VARCHAR(40) NULL,
  descricao     VARCHAR(255) NULL,
  valor_antes   JSON NULL,
  valor_depois  JSON NULL,
  ip            VARCHAR(45) NULL,
  created_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_hist_empresa (empresa_id),
  KEY ix_hist_modulo (modulo),
  KEY ix_hist_created (created_at),
  CONSTRAINT fk_hist_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
-- =====================================================================
-- FIM DO SCHEMA
-- =====================================================================
