-- Schema Auth JWT próprio — substitui Firebase Auth.
-- Tabela usuarios_auth guarda email + hash bcrypt + roles.

CREATE TABLE IF NOT EXISTS usuarios_auth (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid   TEXT UNIQUE,               -- UID original do Firebase (pra migração)
    email          TEXT UNIQUE NOT NULL,
    senha_hash     TEXT NOT NULL,             -- bcrypt hash
    nome           TEXT,
    setor_id       TEXT,
    cargo_id       TEXT,
    is_super_admin BOOLEAN DEFAULT false,
    ativo          BOOLEAN DEFAULT true,
    ultimo_login   TIMESTAMPTZ,
    trocar_senha_no_proximo_login BOOLEAN DEFAULT false,  -- pra migração inicial
    created_at     TIMESTAMPTZ DEFAULT now(),
    updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_email   ON usuarios_auth(email);
CREATE INDEX IF NOT EXISTS idx_auth_fbuid   ON usuarios_auth(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_auth_ativo   ON usuarios_auth(ativo);

-- Trigger updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_usuarios_auth_upd') THEN
        CREATE TRIGGER trg_usuarios_auth_upd BEFORE UPDATE ON usuarios_auth
            FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
    END IF;
END $$;
