-- 007-viagens-carreta2.sql
-- Adiciona 2a carreta na viagem (bitrem/rodotrem tem cavalo + 2 carretas).
-- Contexto (planilha Wesley "Saldos Usinas Segundo Semestre"): cada linha tem
-- Placa | 1a carreta | 2a carreta — a 2a nem sempre existe (simples/bitrem = so 1).
--
-- Aplicar:
--   psql -U pontual_app -d pontual -f 007-viagens-carreta2.sql

ALTER TABLE viagens
    ADD COLUMN IF NOT EXISTS carreta2_id    TEXT,
    ADD COLUMN IF NOT EXISTS carreta2_placa TEXT;
