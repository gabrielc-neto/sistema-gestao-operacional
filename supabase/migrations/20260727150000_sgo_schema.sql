-- =====================================================================
-- Sistema de Gestão Operacional no Supabase
--
-- Este schema é uma CÓPIA FIEL do banco que hoje roda na VPS (pg_dump do
-- banco `pontual`), e não o modelo relacional de 20260701120000_init_schema.sql.
--
-- O porquê: o app não fala com tabelas relacionais. Ele fala com o contrato
-- `documents(collection, id, data jsonb)` — herança do Firestore, mantida na
-- migração para a VPS. Trinta e poucas telas leem e escrevem documentos JSON com
-- esse formato. Reproduzir o mesmo contrato aqui faz o app inteiro funcionar no
-- Supabase sem reescrever tela nenhuma; adotar o modelo relacional agora exigiria
-- reescrever todas elas de uma vez, com o sistema fora do ar no meio do caminho.
--
-- O init_schema relacional continua no repositório e segue sendo o destino: a
-- normalização é um passo posterior, coleção por coleção, com o sistema de pé.
--
-- Aplicar:  supabase db reset   (local)
--           supabase db push    (projeto na nuvem)
-- =====================================================================

-- ---------------------------------------------------------------- gatilho
create or replace function public.trg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================================
-- 1. DOCUMENTS — o coração. Toda coleção do Firestore virou linha aqui.
--
-- 2.104 documentos hoje: motoristas, cargos, setores, usuarios, cercas, férias,
-- pneus, checklists, vistorias, multas, estoque, propostas de compra...
-- =====================================================================
create table if not exists public.documents (
  id         text not null,                          -- ID original do Firestore
  collection text not null,                          -- motoristas, cargos, ...
  data       jsonb not null default '{}'::jsonb,     -- o documento inteiro
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (collection, id)
);

create index if not exists idx_documents_collection on public.documents (collection);
create index if not exists idx_documents_updated    on public.documents (updated_at desc);
-- GIN para os filtros por campo dentro do JSON (where data->>'placa' = 'ABC-1234'),
-- que é como o app consulta praticamente tudo.
create index if not exists idx_documents_data_gin   on public.documents using gin (data);

-- =====================================================================
-- 2. VEÍCULOS — tabela própria (a frota é consultada por coluna, não por JSON)
-- =====================================================================
create table if not exists public.veiculos (
  id              uuid primary key default gen_random_uuid(),
  legacy_id       text unique,          -- id do Firestore, para reconciliação
  placa           text not null unique,
  empresa         text default 'PONTUAL',
  tipo            text,
  marca           text,
  modelo          text,
  cor             text,
  ano_fab         text,
  ano_mod         text,
  chassi          text,
  renavam         text,
  tara            text,
  capacidade      numeric,
  eixos           integer,
  combustivel     text,
  status          text default 'ativo',
  c1              text,
  c2              text,
  c3              text,
  -- bloqueio.ativo é o que a tela de OC consulta para recusar veículo em OS.
  bloqueio        jsonb default '{}'::jsonb,
  motorista_id    text,
  motorista_nome  text,
  odometro_km     numeric,
  odometro_data   date,
  crlv_vencimento date,
  civ_vencimento  date,
  cipp_vencimento date,
  extras          jsonb default '{}'::jsonb,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- =====================================================================
-- 3. MANUTENÇÃO
-- =====================================================================
create table if not exists public.manutencoes (
  id          uuid primary key default gen_random_uuid(),
  legacy_id   text unique,
  placa       text not null,
  tipo        text not null,
  label       text not null,
  grupo       text,
  venc        date,
  data_realiz date,
  agendamento date,
  local       text,
  numero_doc  text,
  km_atual    text,
  km_prox     text,
  resp        text,
  obs         text,
  anexos      jsonb default '[]'::jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists idx_manutencoes_placa      on public.manutencoes (placa);
create index if not exists idx_manutencoes_tipo       on public.manutencoes (tipo);
create index if not exists idx_manutencoes_placa_tipo on public.manutencoes (placa, tipo);
create index if not exists idx_manutencoes_venc       on public.manutencoes (venc);

create table if not exists public.ordens_servico (
  id                 uuid primary key default gen_random_uuid(),
  legacy_id          text unique,
  numero             text not null unique,
  placa              text not null,
  status             text not null default 'aberta',
  solicitante        text,
  responsavel        text,
  descricao_problema text,
  descricao_servico  text,
  km_abertura        numeric,
  km_conclusao       numeric,
  data_abertura      timestamptz default now(),
  data_conclusao     timestamptz,
  itens              jsonb default '[]'::jsonb,
  fotos              jsonb default '[]'::jsonb,
  assinaturas        jsonb default '{}'::jsonb,
  custo_total        numeric(12,2) default 0,
  obs                text,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create table if not exists public.lancamentos_os (
  id             uuid primary key default gen_random_uuid(),
  legacy_id      text unique,
  numero         text not null,
  os_id          uuid,
  os_numero      text,
  fornecedor     text,
  cnpj           text,
  nf_numero      text,
  nf_serie       text,
  nf_chave       text,
  valor_total    numeric(12,2) default 0,
  itens          jsonb default '[]'::jsonb,
  anexos         jsonb default '[]'::jsonb,
  data_emissao   date,
  data_pagamento date,
  obs            text,
  created_at     timestamptz default now(),
  editado_em     timestamptz default now()
);
create index if not exists idx_lancos_os_id      on public.lancamentos_os (os_id);
create index if not exists idx_lancos_fornecedor on public.lancamentos_os (fornecedor);
create index if not exists idx_lancos_data       on public.lancamentos_os (data_emissao desc);

create table if not exists public.tipos_manutencao_custom (
  id             uuid primary key default gen_random_uuid(),
  legacy_id      text unique,
  slug           text not null unique,
  label          text not null,
  grupo          text,
  km_intervalo   integer,
  dias_intervalo integer,
  ativo          boolean default true,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- =====================================================================
-- 4. PERFIS — quem é cada usuário do Supabase Auth dentro do sistema
--
-- A autenticação sai do JWT próprio da VPS (`usuarios_auth`) e passa para o
-- Supabase Auth: senha, sessão e refresh viram problema do Supabase, não nosso.
-- Sobra o que é do NEGÓCIO — setor, cargo, super admin — e é isto aqui.
--
-- `id` referencia auth.users: o perfil morre junto com a conta, e o RLS abaixo
-- consegue perguntar "quem é você" com auth.uid().
-- =====================================================================
create table if not exists public.perfis (
  id             uuid primary key references auth.users(id) on delete cascade,
  legacy_id      text unique,          -- id em usuarios_auth (VPS) / uid Firebase
  email          text not null,
  nome           text,
  setor_id       text,
  cargo_id       text,
  is_super_admin boolean default false,
  ativo          boolean default true,
  ultimo_login   timestamptz,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
create index if not exists idx_perfis_email on public.perfis (email);
create index if not exists idx_perfis_ativo on public.perfis (ativo);

-- ---------------------------------------------------------------- gatilhos
do $$
declare t text;
begin
  foreach t in array array['documents','veiculos','manutencoes','ordens_servico','tipos_manutencao_custom','perfis']
  loop
    execute format(
      'drop trigger if exists trg_%1$s_upd on public.%1$s;
       create trigger trg_%1$s_upd before update on public.%1$s
         for each row execute function public.trg_set_updated_at();', t);
  end loop;
end $$;

-- =====================================================================
-- 5. RLS — obrigatório aqui, diferente da VPS
--
-- Na VPS o Express barrava tudo antes do banco (requireAuth em toda rota de
-- coleção). No Supabase o PostgREST expõe as tabelas DIRETO na internet: sem
-- RLS, a chave anônima — que vai no bundle do frontend, publicamente — leria e
-- escreveria a base inteira.
--
-- A política abaixo reproduz o que a VPS faz hoje, nem mais nem menos: quem está
-- AUTENTICADO acessa; anônimo não acessa nada. O RBAC por cargo continua sendo
-- aplicado no frontend, como sempre foi.
--
-- Fica registrado que isso é o PISO, não o teto: com o RBAC já em `documents`
-- (coleções cargos/setores), dá para escrever políticas por permissão e mover a
-- checagem para o banco. É um passo seguinte, não um detalhe esquecido.
-- =====================================================================
-- RLS filtra o que o papel PODE ver, mas não concede acesso: sem o grant abaixo,
-- o PostgREST responde "permission denied for table documents" mesmo com a
-- política liberando. São duas camadas distintas, e as duas precisam existir.
-- `anon` fica de fora de propósito: quem não entrou não lê nada.
grant usage on schema public to anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['documents','veiculos','manutencoes','ordens_servico','lancamentos_os','tipos_manutencao_custom','perfis']
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated;', t);
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "autenticado_le" on public.%I;', t);
    execute format('drop policy if exists "autenticado_escreve" on public.%I;', t);
    execute format(
      'create policy "autenticado_le" on public.%I for select to authenticated using (true);', t);
    execute format(
      'create policy "autenticado_escreve" on public.%I for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- O próprio usuário lê o seu perfil mesmo antes de qualquer outra política —
-- é o que o app consulta logo depois do login para montar o menu.
drop policy if exists "perfil_proprio" on public.perfis;
create policy "perfil_proprio" on public.perfis
  for select to authenticated using (id = auth.uid());

-- =====================================================================
-- 6. MERGE DE DOCUMENTO — o que o Express fazia com `data || $patch`
--
-- Isto não é conveniência: é CORREÇÃO. O app salva documentos parcialmente o
-- tempo todo (updateDoc de um campo só). Pelo PostgREST puro, um merge vira
-- ler-alterar-escrever no navegador — e duas telas salvando campos diferentes do
-- mesmo documento ao mesmo tempo fariam a última apagar o campo da primeira.
-- Aqui a leitura e a escrita acontecem na mesma instrução, no banco, como na VPS.
--
-- security invoker (padrão): a função roda com os privilégios de quem chamou,
-- então o RLS acima continua valendo. Com SECURITY DEFINER isto viraria um
-- buraco — qualquer autenticado escreveria em qualquer coleção, ignorando
-- políticas futuras mais restritas.
-- =====================================================================
create or replace function public.documento_merge(
  p_colecao    text,
  p_id         text,
  p_patch      jsonb,
  p_substituir boolean default false   -- true = setDoc sem merge (PUT)
)
returns jsonb
language plpgsql
as $$
declare
  v_data jsonb;
begin
  insert into public.documents (collection, id, data)
  values (p_colecao, p_id, p_patch - 'id')
  on conflict (collection, id) do update
    set data = case
                 when p_substituir then excluded.data
                 else public.documents.data || excluded.data
               end,
        updated_at = now()
  returning data into v_data;

  -- Mesmo formato que a API da VPS devolve: {id, ...data}
  return jsonb_build_object('id', p_id) || coalesce(v_data, '{}'::jsonb);
end;
$$;

revoke all on function public.documento_merge(text, text, jsonb, boolean) from public;
grant execute on function public.documento_merge(text, text, jsonb, boolean) to authenticated;
