-- =====================================================================
-- Intranet — portal por palavra-chave + painel de Configurações
-- Banco: intranet   |   Papel da aplicação: intranet_app
--
-- Aplicar:  psql -U postgres -d intranet -f 001_init.sql
--
-- DUAS PORTAS, DUAS CREDENCIAIS — não confundir:
--
--   1. O PORTAL (/sistemas) abre com PALAVRA-CHAVE individual, uma por pessoa,
--      que expira a cada 3 meses e tem horário próprio. A chave É a identidade:
--      é dela que sai o "quem entrou" do histórico.
--
--   2. As CONFIGURAÇÕES (/intranet) abrem com USUÁRIO E SENHA de administrador.
--      É quem gerencia as chaves acima, os horários e vê o histórico.
--
-- Convenção dos apps irmãos desta VPS (canal_etica, gestao_espaco,
-- gestao_compras): um papel de aplicação por app, sem superusuário.
-- =====================================================================

create extension if not exists pgcrypto;

-- =====================================================================
-- 1. ADMINISTRADORES — entram nas Configurações (usuário + senha)
-- =====================================================================
create table admins (
  id            serial primary key,
  usuario       text not null unique,
  -- Opcional e só para contato/identificação: o login é por `usuario`.
  -- Único quando preenchido (índice parcial abaixo), livre quando vazio.
  email         text not null default '',
  -- bcrypt (crypt/gen_salt do pgcrypto), NÃO sha256: senha de login é digitada
  -- por gente e merece um hash lento, que torna força bruta cara. A palavra-chave
  -- do portal usa sha256 por ser gerada/curta e já ter trava por IP na frente.
  senha_hash    text not null,
  -- super: pode gerenciar OUTROS administradores. Terceiros adicionados por ele
  -- cuidam das chaves e do histórico, mas não mexem em quem administra.
  super         boolean not null default false,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Índice parcial: um unique comum barraria o segundo admin sem e-mail.
create unique index uq_admins_email on admins (lower(email)) where email <> '';

-- =====================================================================
-- 2. PALAVRAS-CHAVE — abrem o portal. Uma por pessoa.
-- =====================================================================
create table chaves (
  id            serial primary key,
  nome          text not null,              -- de quem é a chave
  -- unique: duas pessoas com a mesma chave tornariam o login ambíguo — o portão
  -- descobre QUEM é a pessoa justamente pelo hash.
  keyword_hash  text not null unique,
  -- Expira a cada 3 meses. Guardar a data (em vez de calcular de criado_em)
  -- deixa o painel mostrar e o admin ajustar caso a caso.
  expira_em     timestamptz not null,
  -- null = 24h/7. Senão {"dias":[1,2,3,4,5],"inicio":"08:00","fim":"18:00"};
  -- dias vazio = todos os dias. Conferido pelo servidor, em America/Sao_Paulo.
  horario       jsonb,
  ativo         boolean not null default true,
  bloqueado     boolean not null default false,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- =====================================================================
-- 3. LINKS do portal
--
-- icone guarda o NOME do ícone ("escudo"), não o desenho: banco não guarda JSX.
-- O frontend resolve pelo mapa em src/data/icones.jsx.
-- =====================================================================
create table links (
  id            serial primary key,
  nome          text not null,
  -- url | interno (login do SGO) | config (painel) | instrucoes (PDF) | subsecoes
  tipo          text not null default 'url',
  url           text not null default '',
  icone         text not null default 'link',
  cor           text not null default '#334155',
  ativo         boolean not null default true,
  ordem         int not null default 99,
  subsecoes     jsonb not null default '[]',
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index ix_links_ordem on links (ordem);

-- =====================================================================
-- 4. SESSÕES — separadas, porque são portas diferentes
-- Um token do portal não pode virar acesso ao painel, e vice-versa.
-- =====================================================================
create table sessoes_portal (
  token     text primary key,
  chave_id  int not null references chaves(id) on delete cascade,
  expira_em timestamptz not null,
  criada_em timestamptz not null default now()
);

create table sessoes_admin (
  token     text primary key,
  admin_id  int not null references admins(id) on delete cascade,
  expira_em timestamptz not null,
  criada_em timestamptz not null default now()
);

-- =====================================================================
-- 5. HISTÓRICO — entradas no portal E logins no painel
--
-- Registra TODA tentativa, inclusive as negadas: sem isso, força bruta seria
-- invisível.
--
-- coords vem do navegador (GPS): é forjável e pode ser negada, então vale como
-- conveniência. Quem sustenta a auditoria é o ip, observado pelo servidor. Os
-- dois são gravados justamente por isso.
-- =====================================================================
create table acessos (
  id        bigserial primary key,
  tipo      text not null,          -- portal | painel
  -- Nome da pessoa (portal) ou usuário do admin (painel), congelado: sobrevive
  -- à exclusão da chave/conta. null quando nem identificamos quem tentou.
  quem      text,
  ip        text not null default '',
  coords    jsonb,                  -- {"lat":..,"lng":..,"precisao":..} | null = negada
  -- portal: ok | chave_invalida | expirada | bloqueado | fora_horario | ip_negado | travado
  -- painel: ok | senha_invalida | bloqueado | travado
  resultado text not null,
  em        timestamptz not null default now()
);
create index ix_acessos_em on acessos (em desc);
create index ix_acessos_tipo on acessos (tipo, em desc);

-- =====================================================================
-- 6. TRAVA anti força bruta, por IP
-- Tabela dedicada em vez de contar linhas em `acessos`: leitura de chave
-- primária, sem varrer o histórico conforme ele cresce.
-- O IP vira hash para não deixar endereço em claro numa tabela de controle.
-- =====================================================================
create table travas (
  ip_hash text primary key,
  falhas  int not null default 0,
  desde   timestamptz not null default now()
);

-- =====================================================================
-- 7. CONFIGURAÇÃO (hoje só a lista de IPs autorizados)
-- Formato chave/valor para não exigir migração a cada opção nova.
-- =====================================================================
create table config (
  chave text primary key,
  valor jsonb not null
);

-- Lista vazia = sem restrição de rede (só a palavra-chave protege).
insert into config (chave, valor) values ('ips', '[]'::jsonb)
  on conflict (chave) do nothing;

-- =====================================================================
-- Permissões do papel da aplicação
-- Sem DDL: a API não cria nem altera tabelas, só lê e escreve dados.
-- =====================================================================
grant usage on schema public to intranet_app;
grant select, insert, update, delete on all tables in schema public to intranet_app;
grant usage, select on all sequences in schema public to intranet_app;
