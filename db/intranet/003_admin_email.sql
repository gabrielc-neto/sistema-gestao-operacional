-- =====================================================================
-- Adiciona o e-mail do administrador.
--
-- Aditiva, porque o banco já está em uso (o superusuário existe). Quem for
-- criar do zero pega isto pelo 001_init.sql, que já foi atualizado — este
-- arquivo é só para as bases que rodaram o 001 antes desta mudança.
--
-- Aplicar:  psql -U postgres -d intranet -f 003_admin_email.sql
-- =====================================================================

\set ON_ERROR_STOP on

-- default '' em vez de null: o resto do código trata e-mail como string, e
-- assim não precisa de coalesce em toda leitura.
alter table admins add column if not exists email text not null default '';

-- Único quando preenchido, livre quando vazio. Índice parcial, porque um unique
-- comum barraria o segundo admin sem e-mail — e e-mail aqui é opcional: o login
-- é por usuário.
create unique index if not exists uq_admins_email on admins (lower(email)) where email <> '';

select 'admins com e-mail' as item, count(*) filter (where email <> '')::text as valor from admins;
