-- =====================================================================
-- Seed RBAC + empresa demo + super admin  (MySQL 8 / MariaDB)
-- Espelha scripts/seed_rbac.py do sistema Firebase.
-- Idempotente: usa INSERT ... ON DUPLICATE KEY UPDATE onde aplicável.
-- =====================================================================
SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- Empresa (tenant) inicial
-- ---------------------------------------------------------------------
INSERT INTO empresas (id, nome, cnpj, slug, plano, ativo)
VALUES (1, 'Pontual Petróleo', NULL, 'pontual', 'pro', 1)
ON DUPLICATE KEY UPDATE nome = VALUES(nome);

-- ---------------------------------------------------------------------
-- Catálogo de permissões: <modulo>.<acao> para cada módulo x ação
-- (cross join de módulos x ações) + extras especiais
-- ---------------------------------------------------------------------
INSERT INTO permissoes_catalogo (nome, modulo, acao, descricao)
SELECT CONCAT(m.modulo, '.', a.acao) AS nome,
       m.modulo,
       a.acao,
       CONCAT(a.label, ' ', m.label) AS descricao
FROM (
  SELECT 'dashboard' modulo,'Dashboard' label UNION ALL
  SELECT 'frota','Frota' UNION ALL
  SELECT 'motoristas','Motoristas' UNION ALL
  SELECT 'atrelamento','Atrelamento' UNION ALL
  SELECT 'oc','Ordens de Carregamento' UNION ALL
  SELECT 'manutencao','Manutenção' UNION ALL
  SELECT 'os','Ordens de Serviço' UNION ALL
  SELECT 'ferias','Férias' UNION ALL
  SELECT 'clientes','Clientes' UNION ALL
  SELECT 'produtos','Produtos' UNION ALL
  SELECT 'usinas','Usinas' UNION ALL
  SELECT 'pedidos','Pedidos' UNION ALL
  SELECT 'rastreamento','Rastreamento' UNION ALL
  SELECT 'cercas','Cercas Eletrônicas' UNION ALL
  SELECT 'historico','Histórico' UNION ALL
  SELECT 'relatorios','Relatórios' UNION ALL
  SELECT 'financeiro','Financeiro' UNION ALL
  SELECT 'usuarios','Usuários' UNION ALL
  SELECT 'setores','Setores' UNION ALL
  SELECT 'cargos','Cargos' UNION ALL
  SELECT 'permissoes','Permissões'
) m
CROSS JOIN (
  SELECT 'ver' acao,'Visualizar' label UNION ALL
  SELECT 'criar','Criar' UNION ALL
  SELECT 'editar','Editar' UNION ALL
  SELECT 'excluir','Excluir'
) a
ON DUPLICATE KEY UPDATE descricao = VALUES(descricao);

-- Extras (ações fora do padrão CRUD)
INSERT INTO permissoes_catalogo (nome, modulo, acao, descricao) VALUES
  ('relatorios.exportar','relatorios','exportar','Exportar relatórios em PDF/Excel'),
  ('financeiro.aprovar', 'financeiro','aprovar', 'Aprovar lançamentos financeiros'),
  ('oc.aprovar',         'oc',         'aprovar', 'Aprovar ordens de carregamento'),
  ('os.finalizar',       'os',         'finalizar','Finalizar ordem de serviço'),
  ('historico.exportar', 'historico',  'exportar','Exportar histórico de auditoria')
ON DUPLICATE KEY UPDATE descricao = VALUES(descricao);

-- ---------------------------------------------------------------------
-- Setores (6)
-- ---------------------------------------------------------------------
INSERT INTO setores (id, empresa_id, nome, descricao, status) VALUES
  (1, 1, 'Logística',   'Operação logística e despacho',       'ativo'),
  (2, 1, 'Manutenção',  'Manutenção da frota',                 'ativo'),
  (3, 1, 'Financeiro',  'Financeiro e contas',                 'ativo'),
  (4, 1, 'RH',          'Recursos humanos',                    'ativo'),
  (5, 1, 'Comercial',   'Vendas e relacionamento',             'ativo'),
  (6, 1, 'TI / Admin',  'Tecnologia e administração do sistema','ativo')
ON DUPLICATE KEY UPDATE nome = VALUES(nome), descricao = VALUES(descricao);

-- ---------------------------------------------------------------------
-- Cargos (12) — nível 1 (baixo) a 5 (alto)
-- ---------------------------------------------------------------------
INSERT INTO cargos (id, empresa_id, setor_id, nome, nivel, descricao, status) VALUES
  (1,  1, 1, 'Despachante',          2, 'Monta OC e despacha frota',       'ativo'),
  (2,  1, 1, 'Supervisor Logística', 4, 'Supervisiona despacho',           'ativo'),
  (3,  1, 1, 'Gerente Logística',    5, 'Gestão completa da operação',     'ativo'),
  (4,  1, 2, 'Mecânico',             2, 'Executa manutenções',             'ativo'),
  (5,  1, 2, 'Supervisor Manutenção',4, 'Gerencia OS e oficina',           'ativo'),
  (6,  1, 3, 'Analista Financeiro',  3, 'Lançamentos e conciliação',       'ativo'),
  (7,  1, 3, 'Gerente Financeiro',   5, 'Aprova lançamentos',              'ativo'),
  (8,  1, 4, 'Analista RH',          3, 'Férias, documentos de motorista', 'ativo'),
  (9,  1, 5, 'Vendedor',             2, 'Cadastro de clientes e pedidos',  'ativo'),
  (10, 1, 5, 'Gerente Comercial',    5, 'Gestão comercial',                'ativo'),
  (11, 1, 6, 'Operador TI',          3, 'Suporte e cadastros',             'ativo'),
  (12, 1, 6, 'Administrador',        5, 'Acesso total ao sistema',         'ativo')
ON DUPLICATE KEY UPDATE nome = VALUES(nome), nivel = VALUES(nivel);

-- ---------------------------------------------------------------------
-- Permissões por cargo (exemplos representativos)
-- Administrador recebe TODAS as permissões.
-- ---------------------------------------------------------------------
-- Administrador (cargo 12) = todas
INSERT IGNORE INTO cargo_permissao (cargo_id, permissao_id)
SELECT 12, id FROM permissoes_catalogo;

-- Despachante (cargo 1): dashboard.ver, frota.ver, motoristas.ver,
-- atrelamento.*, oc.* (sem aprovar), historico.ver
INSERT IGNORE INTO cargo_permissao (cargo_id, permissao_id)
SELECT 1, id FROM permissoes_catalogo
WHERE nome IN (
  'dashboard.ver','frota.ver','motoristas.ver','clientes.ver','produtos.ver','usinas.ver',
  'atrelamento.ver','atrelamento.criar','atrelamento.editar',
  'oc.ver','oc.criar','oc.editar','pedidos.ver','pedidos.criar','historico.ver','rastreamento.ver'
);

-- Supervisor Manutenção (cargo 5): manutencao.*, os.* incl. finalizar, frota.ver/editar
INSERT IGNORE INTO cargo_permissao (cargo_id, permissao_id)
SELECT 5, id FROM permissoes_catalogo
WHERE modulo IN ('manutencao','os') OR nome IN ('frota.ver','frota.editar','dashboard.ver','historico.ver');

-- Analista RH (cargo 8): motoristas.*, ferias.*
INSERT IGNORE INTO cargo_permissao (cargo_id, permissao_id)
SELECT 8, id FROM permissoes_catalogo
WHERE modulo IN ('motoristas','ferias') OR nome = 'dashboard.ver';

-- ---------------------------------------------------------------------
-- Super Admin inicial
-- Senha padrão: "password"  (hash bcrypt abaixo) — TROQUE após primeiro login.
-- Para gerar outro hash:  php -r "echo password_hash('suaSenha', PASSWORD_BCRYPT);"
-- ---------------------------------------------------------------------
INSERT INTO usuarios (id, empresa_id, nome, email, password, setor_id, cargo_id, is_super_admin, ativo, role)
VALUES (
  1, 1, 'Administrador', 'administrativo@pontualpetroleo.com.br',
  '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- "password"
  6, 12, 1, 1, 'master'
)
ON DUPLICATE KEY UPDATE is_super_admin = 1, ativo = 1;

-- ---------------------------------------------------------------------
-- Produtos base (líquidos)
-- ---------------------------------------------------------------------
INSERT INTO produtos (empresa_id, nome, codigo_anp, unidade) VALUES
  (1, 'Etanol Anidro',     '320101001', 'litros'),
  (1, 'Diesel S10',        '820101034', 'litros'),
  (1, 'Diesel S500',       '820101035', 'litros'),
  (1, 'Gasolina Comum',    '320102001', 'litros'),
  (1, 'Gasolina Aditivada','320102002', 'litros'),
  (1, 'Etanol Hidratado',  '320102003', 'litros');

-- =====================================================================
-- FIM DO SEED
-- =====================================================================
