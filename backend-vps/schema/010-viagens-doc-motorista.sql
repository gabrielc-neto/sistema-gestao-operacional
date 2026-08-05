-- 010-viagens-doc-motorista.sql
-- Adiciona docs do motorista (CPF, CNH) + capacidade snapshot do veiculo
-- na viagem, pra gerar Autorizacao de Carregamento em PDF.
ALTER TABLE viagens
    ADD COLUMN IF NOT EXISTS motorista_cpf            TEXT,
    ADD COLUMN IF NOT EXISTS motorista_cnh            TEXT,
    ADD COLUMN IF NOT EXISTS capacidade_veiculo_litros NUMERIC(14,2);
