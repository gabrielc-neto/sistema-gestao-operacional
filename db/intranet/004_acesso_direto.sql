-- =====================================================================
-- Marca, por sistema, se ele pode ser aberto DIRETO pela URL — sem passar
-- pelo portal e sem a palavra-chave.
--
-- O problema que isto resolve: até aqui o portal era só uma vitrine de links.
-- Quem digitasse web-homol.../gestao-espaco/ no navegador entrava, sem chave
-- nenhuma. A palavra-chave protegia a LISTA, não os sistemas.
--
-- default TRUE de propósito: aplicar esta migração não muda o comportamento de
-- nada. Cada sistema só passa a exigir a chave quando o admin desmarcar no
-- painel — senão o deploy trancaria para fora todo mundo que hoje usa o
-- Service Desk pela URL direta.
--
-- Aplicar:  psql -U postgres -d intranet -f 004_acesso_direto.sql
-- =====================================================================

\set ON_ERROR_STOP on

alter table links add column if not exists acesso_direto boolean not null default true;

-- O guard casa a URL pedida com este caminho. Guardado separado do `url` porque
-- o url é o endereço completo (https://host/gestao-espaco/) e o guard só enxerga
-- o caminho (/gestao-espaco). Vazio = o guard ignora este link.
alter table links add column if not exists caminho text not null default '';

-- Preenche o caminho dos sistemas servidos por este mesmo Apache. Os externos
-- (Site Institucional, na Locaweb) ficam vazios: não há como protegê-los daqui.
update links set caminho = '/integridade'      where id = 2  and caminho = '';
update links set caminho = '/servicedesk'      where id = 4  and caminho = '';
update links set caminho = '/gestao-espaco'    where id = 8  and caminho = '';
update links set caminho = '/gestao-compras'   where id = 9  and caminho = '';
update links set caminho = '/sistemas-externos' where id = 10 and caminho = '';

select nome, caminho, acesso_direto from links where caminho <> '' order by ordem;
