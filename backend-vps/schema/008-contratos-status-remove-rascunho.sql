-- 008-contratos-status-remove-rascunho.sql
-- Remove status "rascunho" do enum de contratos_compra.
-- Status finais: ativo | pago | esgotado (labelado "Finalizado" na UI) | cancelado
--
-- Aplicar:
--   psql -U pontual_app -d pontual -f 008-contratos-status-remove-rascunho.sql

-- 1) Migra qualquer contrato ainda em rascunho pra ativo (nao devia existir)
UPDATE contratos_compra SET status = 'ativo' WHERE status = 'rascunho';

-- 2) Troca o CHECK constraint
ALTER TABLE contratos_compra DROP CONSTRAINT IF EXISTS contratos_compra_status_check;
ALTER TABLE contratos_compra
    ADD CONSTRAINT contratos_compra_status_check
    CHECK (status IN ('ativo','pago','esgotado','cancelado'));
