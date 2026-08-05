-- 009-contratos-status-remove-pago.sql
-- Simplifica status pra 3 estados: ativo | esgotado (label "Finalizado") | cancelado.
-- Regra Wesley 2026-08-05: "ativo = contratos ainda nao finalizados,
--                          finalizado = produto zerado,
--                          cancelado = quando for cancelado"
--
-- Aplicar:
--   psql -U pontual_app -d pontual -f 009-contratos-status-remove-pago.sql

-- 1) Migra contratos "pago" pra "ativo"
UPDATE contratos_compra SET status = 'ativo' WHERE status = 'pago';

-- 2) Reconstroi CHECK (drop + add — nome canonico da constraint)
ALTER TABLE contratos_compra DROP CONSTRAINT IF EXISTS contratos_compra_status_check;
ALTER TABLE contratos_compra
    ADD CONSTRAINT contratos_compra_status_check
    CHECK (status IN ('ativo','esgotado','cancelado'));
