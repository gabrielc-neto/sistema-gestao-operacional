-- =====================================================================
-- Pontual Logística — Migração Firestore → PostgreSQL (Supabase)
-- Fase 0/1: schema multi-tenant + RBAC + frota/pessoas + operacional
--           + rastreamento SASCAR + jornada + histórico
-- Ref: docs/12-migracao-postgresql-tms.md (seção 4) + docs/03-modelo-dados.md
-- Regra de ouro: toda tabela de negócio tem empresa_id + RLS.
-- =====================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()

-- =====================================================================
-- 0. TENANT
-- =====================================================================
create table empresas (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  cnpj        text,
  slug        text unique,
  plano       text not null default 'pro',
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

-- =====================================================================
-- 1. RBAC
--    permissoes_catalogo é GLOBAL (sem empresa_id).
-- =====================================================================
create table permissoes_catalogo (
  codigo      text primary key,           -- "<modulo>.<acao>"
  modulo      text not null,
  acao        text not null,
  descricao   text
);

create table setores (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresas(id) on delete cascade,
  nome        text not null,
  descricao   text,
  status      text not null default 'ativo',
  criado_em   timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table cargos (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresas(id) on delete cascade,
  setor_id    uuid references setores(id) on delete set null,
  nome        text not null,
  nivel       int not null default 1,
  descricao   text,
  status      text not null default 'ativo',
  criado_em   timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Junção cargo↔permissão (era array denormalizado no Firestore)
create table cargo_permissoes (
  cargo_id    uuid not null references cargos(id) on delete cascade,
  permissao   text not null references permissoes_catalogo(codigo) on delete cascade,
  primary key (cargo_id, permissao)
);

-- usuarios: id = auth.users.id (Supabase Auth substitui Firebase Auth)
create table usuarios (
  id            uuid primary key references auth.users(id) on delete cascade,
  empresa_id    uuid not null references empresas(id) on delete cascade,
  nome          text not null,
  email         text not null,
  setor_id      uuid references setores(id) on delete set null,
  cargo_id      uuid references cargos(id) on delete set null,
  is_super_admin boolean not null default false,
  ativo         boolean not null default true,
  role          text,                       -- legado: master/admin
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- =====================================================================
-- 2. FROTA & PESSOAS
-- =====================================================================
create table veiculos (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references empresas(id) on delete cascade,
  placa         text not null,
  tipo          text not null default 'cavalo',   -- cavalo | carreta
  status        text not null default 'ativo',
  modelo        text, fabricante text, ano_modelo text, ano_fab text,
  chassi text, renavam text, tara text,
  cap text, comp text,                            -- capacidade / composição (LS/Bitrem/...)
  motorista     text,                             -- nome atrelado (denormalizado, legado)
  c1 text, t1 text, c2 text, t2 text,             -- carretas atreladas
  id_sascar     bigint,                           -- idVeiculo SASCAR
  bloqueio_ativo  boolean not null default false,
  bloqueio_motivo text,
  bloqueio_obs    text,
  obs           text,
  criado_em     timestamptz not null default now(),
  unique (empresa_id, placa)
);

create table motoristas (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references empresas(id) on delete cascade,
  nome          text not null,
  cnh text, cat text, tel text,
  status        text not null default 'ativo',    -- ativo|inativo|desligado
  tipo_contrato text not null default 'interno',   -- interno | px
  cnh_venc date, mopp_venc date, nr20_venc date, nr35_venc date,
  id_sascar     bigint,                            -- idMotorista SASCAR
  obs           text,
  criado_em     timestamptz not null default now()
);

create table atrelamentos (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresas(id) on delete cascade,
  num         text,                               -- ATR-0001
  data date, hora text,
  op          text,                               -- ATRELAMENTO|DESATRELAMENTO|SUBSTITUIÇÃO
  cavalo text, km text, c1 text, t1 text, c2 text, t2 text,
  motorista text, local text, status text, obs text,
  criado_em   timestamptz not null default now()
);

create table ferias (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresas(id) on delete cascade,
  motorista   text not null,
  inicio date, fim date,
  esocial     boolean not null default false,
  obs         text,
  criado_em   timestamptz not null default now()
);

-- =====================================================================
-- 3. OPERACIONAL — OC, manutenção, OS
-- =====================================================================
create table ordens_carregamento (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresas(id) on delete cascade,
  num         text,                               -- OC-0001
  data date, hora text,
  base        text,                               -- PONTUAL|REPLAN|OUTROS
  cavalo text, cavalo_placa text,
  motorista text, motorista_nome text,
  resp text, c1 text, t1 text, c2 text, t2 text, obs text,
  criado_por  uuid references usuarios(id) on delete set null,
  criado_em   timestamptz not null default now()
);

create table oc_entregas (
  id          uuid primary key default gen_random_uuid(),
  oc_id       uuid not null references ordens_carregamento(id) on delete cascade,
  dest text, prod text, vol text, req text,
  ordem int
);

create table manutencoes (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresas(id) on delete cascade,
  placa       text not null,
  tipo        text not null,                      -- civ, crlv, oleo, ... (27 tipos)
  data_realiz date, venc date,
  local text, numero_doc text, km_atual text, resp text, obs text,
  criado_em   timestamptz not null default now()
);

create table ordens_servico (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references empresas(id) on delete cascade,
  numero        text,                             -- OS-00001
  data_hora     timestamptz,
  tipo_servico  text,
  placa         text not null,
  motorista_id  uuid references motoristas(id) on delete set null,
  motorista_nome text,
  status        text not null default 'aberta',   -- aberta | finalizada
  obs           text,
  criado_por    uuid references usuarios(id) on delete set null,
  criado_em     timestamptz not null default now(),
  finalizado_em timestamptz
);

-- =====================================================================
-- 4. RASTREAMENTO SASCAR
-- =====================================================================
create table veiculos_posicoes (
  id            bigserial primary key,
  empresa_id    uuid not null references empresas(id) on delete cascade,
  veiculo_id    uuid references veiculos(id) on delete set null,
  id_sascar     bigint not null,
  placa         text,
  lat double precision, lng double precision,
  direcao int, velocidade int, ignicao int, gps int,
  odometro double precision, tensao double precision,
  cidade text, uf text, rua text, ponto_referencia text,
  id_motorista_sascar bigint, nome_motorista text,
  status_texto  text,                             -- EM_MOVIMENTO|PARADO_LIGADO|ESTACIONADO
  id_pacote     bigint,
  data_posicao  timestamptz,
  dentro_de     text[],                           -- cercaIds atuais
  atualizado_em timestamptz not null default now()
);
-- última posição por veículo (live) — 1 linha por id_sascar
create unique index uq_pos_ultima on veiculos_posicoes (empresa_id, id_sascar);
create index ix_pos_hist on veiculos_posicoes (veiculo_id, data_posicao desc);

create table cercas_eletronicas (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresas(id) on delete cascade,
  nome text not null,
  tipo text,                                       -- Base|Cliente|Restrita|...
  cor text,
  formato text not null default 'poligono',        -- poligono | circulo
  pontos jsonb,                                    -- [[lat,lng],...]
  centro jsonb,                                    -- {lat,lng}
  raio double precision,
  criado_em timestamptz not null default now(),
  criado_por text,
  atualizado_em timestamptz, atualizado_por text
);

create table cercas_eventos (
  id          bigserial primary key,
  empresa_id  uuid not null references empresas(id) on delete cascade,
  tipo text not null,                              -- ENTRADA | SAIDA
  id_sascar bigint, placa text,
  cerca_id uuid references cercas_eletronicas(id) on delete set null,
  cerca_nome text, cerca_tipo text,
  lat double precision, lng double precision,
  id_pacote bigint, data_posicao timestamptz,
  criado_em timestamptz not null default now()
);

-- =====================================================================
-- 5. JORNADA (snapshot diário — resolve o histórico bloqueado no Firebase)
-- =====================================================================
create table jornada_dia (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references empresas(id) on delete cascade,
  motorista_id  uuid references motoristas(id) on delete set null,
  id_motorista_sascar bigint,
  nome_motorista text,
  data          date not null,
  tipo_dia      text,                             -- util | sabado | domingo
  tipo_contrato text,                             -- interno | px
  total_ativo_min int, dirigindo_min int, refeicao_min int, pausa_min int,
  direcao_continua_max_min int,
  encerrou boolean, ultimo_evento_tipo text,
  pausa_diaria_suficiente boolean, pausa_faltante_min int,
  infracoes jsonb, timeline jsonb, ciclos jsonb,
  criado_em timestamptz not null default now(),
  unique (empresa_id, id_motorista_sascar, data)
);

-- =====================================================================
-- 6. AUDITORIA
-- =====================================================================
create table historico (
  id          bigserial primary key,
  empresa_id  uuid not null references empresas(id) on delete cascade,
  usuario_id  uuid references usuarios(id) on delete set null,
  acao        text,                               -- criar|editar|excluir|...
  entidade    text,                               -- veiculos|oc|...
  entidade_id text,
  dados       jsonb,                              -- antes/depois
  criado_em   timestamptz not null default now()
);
create index ix_hist_empresa_data on historico (empresa_id, criado_em desc);

-- =====================================================================
-- APOSENTADO COMO MIGRAÇÃO EM 2026-07-27 — mantido como DESENHO.
--
-- Este arquivo saiu de supabase/migrations/ porque nunca foi aplicado em lugar
-- nenhum e colidia com o schema real: ele define veiculos/manutencoes/
-- ordens_servico de forma RELACIONAL, enquanto o app (30+ telas) fala com o
-- contrato documents(collection, id, data jsonb) herdado do Firestore.
--
-- Aplicar os dois ao mesmo tempo criava tabelas com o mesmo nome e formatos
-- diferentes. Quem vale hoje é 20260727150000_sgo_schema.sql, cópia fiel do
-- banco que roda na VPS.
--
-- Este desenho continua sendo o DESTINO: normalizar coleção por coleção, com o
-- sistema de pé, em vez de trocar tudo de uma vez.
-- =====================================================================
