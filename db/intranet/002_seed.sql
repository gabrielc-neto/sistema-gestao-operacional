-- =====================================================================
-- Seed da intranet: os 12 links do portal + o SUPERUSUÁRIO do painel.
--
-- O superusuário é indispensável: o cadastro de administradores e de
-- palavras-chave mora DENTRO do painel, e o painel só abre com um login.
-- Sem este seed ninguém entra, ninguém cadastra chave, e ninguém abre o
-- portal — porque os links passaram a existir só no banco.
--
-- Aplicar (credenciais por parâmetro, para não ficarem no repositório):
--   psql -U postgres -d intranet \
--        -v usuario="'admin'" -v senha="'senha-forte-aqui'" \
--        -f 002_seed.sql
--
-- Idempotente: links têm ID fixo e o admin é procurado pelo usuário, então
-- rodar de novo atualiza em vez de duplicar.
-- =====================================================================

\set ON_ERROR_STOP on

-- ---------------------------------------------------------------- links
-- Os mesmos 12 cards que estavam fixos em frontend/src/data/sistemas.jsx.
-- `tipo` substitui as flags booleanas de lá:
--   config     → abre o painel de Configurações (usuário + senha)
--   interno    → abre o login do Gestão Operacional
--   instrucoes → abre o PDF
--   url        → abre o endereço (na mesma guia)
--   subsecoes  → o portão mostra um botão por subseção
insert into links (id, nome, tipo, url, icone, cor, ordem, subsecoes, ativo) values
  (1,  'Configurações',                         'config',     '',                                                        'engrenagem',   '#334155', 1,  '[]', true),
  (2,  'Canal de Integridade e Relacionamento', 'url',        'https://web-homol.pontualpetroleo.com.br/integridade/',   'escudo',       '#15803d', 2,  '[]', true),
  (3,  'Gestão Operacional',                    'interno',    '',                                                        'caminhao',     '#18216e', 3,  '[]', true),
  (4,  'Service Desk',                          'url',        'https://web-homol.pontualpetroleo.com.br/servicedesk',    'suporte',      '#0c7f98', 4,  '[]', true),
  (5,  'Procedimentos (POPs)',                  'url',        '',                                                        'prancheta',    '#7c3aed', 5,  '[]', true),
  (6,  'Gerenciamento de Projetos',             'url',        '',                                                        'grade',        '#be123c', 6,  '[]', true),
  (7,  'Modelos Corporativos',                  'subsecoes',  '',                                                        'apresentacao', '#4f46e5', 7,
       '[{"id":"apresentacoes","nome":"Apresentações","url":""},{"id":"documentacoes","nome":"Documentações","url":""}]', true),
  (8,  'Gestão de Espaço',                      'url',        'https://web-homol.pontualpetroleo.com.br/gestao-espaco/', 'quadrantes',   '#0d9488', 8,  '[]', true),
  (9,  'Gestão de Compras',                     'url',        'https://web-homol.pontualpetroleo.com.br/gestao-compras/','carrinho',     '#ea580c', 9,  '[]', true),
  (10, 'Sistemas Externos',                     'url',        'https://web-homol.pontualpetroleo.com.br/sistemas-externos/', 'externo',  '#0369a1', 10, '[]', true),
  (11, 'Instruções de Acesso',                  'instrucoes', '/instrucoes-acesso.pdf',                                  'ajuda',        '#4d7c0f', 11, '[]', true),
  (12, 'Site Institucional',                    'url',        'https://www.pontualpetroleo.com.br',                      'globo',        '#b45309', 12, '[]', true)
on conflict (id) do update set
  nome = excluded.nome, tipo = excluded.tipo, url = excluded.url,
  icone = excluded.icone, cor = excluded.cor, ordem = excluded.ordem,
  subsecoes = excluded.subsecoes, atualizado_em = now();

-- IDs inseridos à mão não avançam a sequence — sem isto, o primeiro link criado
-- pelo painel tentaria o id 1 e colidiria.
select setval('links_id_seq', (select max(id) from links));

-- ---------------------------------------------------------------- superusuário
-- bcrypt via pgcrypto: hash lento de propósito, que encarece força bruta.
insert into admins (usuario, senha_hash, super, ativo)
values (:usuario, crypt(:senha, gen_salt('bf', 10)), true, true)
on conflict (usuario) do update set
  senha_hash = excluded.senha_hash, super = true, ativo = true, atualizado_em = now();

-- ---------------------------------------------------------------- conferência
select 'links ativos'   as item, count(*)::text as valor from links where ativo
union all
select 'administradores', count(*)::text from admins
union all
select 'superusuário',    usuario from admins where super
union all
select 'palavras-chave',  count(*)::text from chaves;
