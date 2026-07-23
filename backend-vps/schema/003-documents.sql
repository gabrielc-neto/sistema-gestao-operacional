-- Schema genérico pra armazenar qualquer coleção Firestore como JSONB.
-- Replica o modelo NoSQL do Firestore em PostgreSQL.
-- Sprint 2 — migração completa de todas coleções restantes.

CREATE TABLE IF NOT EXISTS documents (
    id           TEXT NOT NULL,               -- ID Firestore original
    collection   TEXT NOT NULL,               -- Nome da coleção (motoristas, cargos, etc)
    data         JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Todo o documento como JSON
    created_at   TIMESTAMPTZ DEFAULT now(),
    updated_at   TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (collection, id)
);

CREATE INDEX IF NOT EXISTS idx_documents_collection ON documents(collection);
CREATE INDEX IF NOT EXISTS idx_documents_updated    ON documents(updated_at DESC);
-- Índice GIN pra buscas por campo dentro do JSONB (ex: WHERE data->>'placa' = 'ABC-1234')
CREATE INDEX IF NOT EXISTS idx_documents_data_gin   ON documents USING GIN (data);

-- Trigger updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_documents_upd') THEN
        CREATE TRIGGER trg_documents_upd BEFORE UPDATE ON documents
            FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
    END IF;
END $$;
