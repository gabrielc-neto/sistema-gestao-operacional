-- 013-lancamentos-os-fix.sql
-- Corrige schema/mapper de lancamentos_os — bug análogo ao 005 (ordens_servico).
--
-- Bug reportado 2026-08-06: Wesley faz "lançamento de NF" no módulo Manutenção
-- e os dados somem ao recarregar tela. Causa: frontend envia camelCase
-- (tipoLancamento/placa/hodometro/servicoFeito/osId/valorTotal), mas:
--   a) backend usa nomes snake_case direto do body sem mapper → tudo vira null
--   b) schema não tem colunas tipo_lancamento/placa/hodometro/servico_feito
--
-- Adiciona colunas + mantém colunas antigas (nf_numero/nf_serie/nf_chave) intactas.
-- O mapper camelCase→snake_case fica no backend (routes/lancamentos-os.js).

ALTER TABLE lancamentos_os
    ADD COLUMN IF NOT EXISTS tipo_lancamento TEXT,
    ADD COLUMN IF NOT EXISTS placa           TEXT,
    ADD COLUMN IF NOT EXISTS hodometro       NUMERIC,
    ADD COLUMN IF NOT EXISTS servico_feito   TEXT;

-- Índices para queries frequentes
CREATE INDEX IF NOT EXISTS idx_lanc_os_placa ON lancamentos_os(placa);
CREATE INDEX IF NOT EXISTS idx_lanc_os_tipo  ON lancamentos_os(tipo_lancamento);

-- Verificação: mostrar colunas resultantes
-- \d lancamentos_os
