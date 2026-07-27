-- =====================================================================
-- Emissão de certificados
--
-- DUAS PORTAS, DE NOVO — e desta vez uma delas é ABERTA:
--
--   1. EMITIR (/intranet, aba Certificados) → usuário e senha de administrador.
--      É quem cadastra o participante, o curso e a carga horária.
--
--   2. VALIDAR (/certificado) → NINGUÉM precisa entrar. Quem recebe o
--      certificado (ou o cliente/auditor que o recebeu de terceiro) digita o
--      código impresso nele e confere se é autêntico. Um validador que exigisse
--      login não validaria nada: quem confere está justamente FORA da empresa.
--
-- Aplicar:  psql -U postgres -d intranet -f 005_certificados.sql
-- =====================================================================

\set ON_ERROR_STOP on

-- =====================================================================
-- 1. CERTIFICADOS
--
-- O código é a única coisa que o validador recebe, então ele é a chave pública
-- do documento. Formato PNT-2026-K7QP-3F2D, gerado pela API com alfabeto sem
-- caracteres ambíguos (sem O/0, sem I/1/L) — o código é DIGITADO por gente
-- lendo um papel, e "0 ou O?" viraria suporte.
-- =====================================================================
create table if not exists certificados (
  id               serial primary key,
  codigo           text not null unique,
  nome             text not null,                 -- participante
  -- CPF, opcional. Guardado inteiro para a emissão conferir a pessoa, mas NUNCA
  -- sai inteiro na validação pública: a API mascara (***.456.789-**). Certificado
  -- circula por e-mail e WhatsApp; CPF em claro numa página aberta é vazamento.
  documento        text not null default '',
  curso            text not null,                 -- título do treinamento/evento
  descricao        text not null default '',      -- conteúdo programático, observações
  -- null = não informado. numeric e não int: existe treinamento de 1,5 h.
  carga_horaria    numeric(6,1),
  instrutor        text not null default '',
  concluido_em     date not null,
  emitido_em       timestamptz not null default now(),
  -- Usuário do admin que emitiu, congelado: sobrevive à exclusão da conta, do
  -- mesmo jeito que `acessos.quem`.
  emitido_por      text not null default '',
  -- Revogar em vez de excluir: um certificado emitido por engano precisa
  -- continuar respondendo à validação — dizendo que foi CANCELADO. Se sumisse do
  -- banco, o código daria "não encontrado", e quem tem o papel na mão não
  -- saberia distinguir de um erro de digitação.
  revogado         boolean not null default false,
  revogado_em      timestamptz,
  motivo_revogacao text not null default '',
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);

-- Busca do validador: o código é digitado do papel, com ou sem os hifens, em
-- maiúscula ou minúscula. O índice é sobre a forma normalizada para que
-- "pnt2026k7qp3f2d" ache o mesmo registro que "PNT-2026-K7QP-3F2D" — e para que
-- a consulta use índice em vez de varrer a tabela.
create unique index if not exists uq_certificados_codigo_norm
  on certificados (upper(replace(codigo, '-', '')));

create index if not exists ix_certificados_emitido on certificados (emitido_em desc);
create index if not exists ix_certificados_nome    on certificados (lower(nome));

-- =====================================================================
-- 2. VALIDAÇÕES — toda consulta pública, inclusive as que não acharam nada
--
-- Serve para duas coisas: mostrar ao emissor que o certificado dele está sendo
-- conferido (e por quem, pelo IP), e sustentar a trava de tentativas — sem
-- registrar as falhas, varrer códigos seria invisível.
--
-- Tabela própria, e não `acessos`: aqui não há "quem" (o validador é anônimo,
-- de fora da empresa) e o que interessa é o certificado consultado.
-- =====================================================================
create table if not exists certificado_validacoes (
  id             bigserial primary key,
  -- O que foi digitado, já normalizado. Guardado mesmo quando não existe:
  -- é a pista de que alguém está tentando adivinhar códigos.
  codigo         text not null default '',
  certificado_id int references certificados(id) on delete set null,
  ip             text not null default '',
  -- valido | revogado | nao_encontrado | travado
  resultado      text not null,
  em             timestamptz not null default now()
);
create index if not exists ix_cert_valid_em on certificado_validacoes (em desc);
-- A trava conta as tentativas recentes daquele IP; sem este índice, cada
-- validação varreria o histórico inteiro conforme ele cresce.
create index if not exists ix_cert_valid_ip on certificado_validacoes (ip, em desc);

-- =====================================================================
-- Permissões do papel da aplicação
-- O `grant ... on all tables` do 001 valeu só para as tabelas que existiam
-- naquele momento — tabela nova precisa do seu próprio grant.
-- =====================================================================
grant select, insert, update, delete on certificados, certificado_validacoes to intranet_app;
grant usage, select on sequence certificados_id_seq to intranet_app;
grant usage, select on sequence certificado_validacoes_id_seq to intranet_app;

-- =====================================================================
-- Card do portal — o validador é PÚBLICO, mas quem emite chega por aqui.
-- caminho vazio: a página é rota da própria SPA, não um app separado do Apache,
-- então não há o que o guard.php proteger.
-- =====================================================================
insert into links (nome, tipo, url, icone, cor, ordem, ativo, acesso_direto, caminho)
values ('Certificados', 'url', '/certificado', 'certificado', '#0f766e', 13, true, true, '')
on conflict do nothing;

select 'certificados' as tabela, count(*)::text as registros from certificados
union all
select 'validações', count(*)::text from certificado_validacoes;
