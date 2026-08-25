-- Função de merge PROFUNDO de JSONB. Substitui o `||` nativo que só faz merge raso
-- e apagava sub-objetos silenciosamente (documentos.cnh, extras.*, etc).
--
-- Regras:
--   * a IS NULL → devolve b     (INSERT novo)
--   * b IS NULL → devolve a     (nada pra mesclar)
--   * ambos objetos → mescla recursivamente por chave
--   * qualquer outro caso (array, escalar) → devolve b (patch vence)
--
-- Nota: o COALESCE externo evita bug do jsonb_object_agg sobre conjunto vazio
-- (que retorna SQL NULL em vez de '{}' — corromperia sub-objetos vazios).
CREATE OR REPLACE FUNCTION jsonb_deep_merge(a jsonb, b jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT
    CASE
      WHEN a IS NULL THEN b
      WHEN b IS NULL THEN a
      WHEN jsonb_typeof(a) = 'object' AND jsonb_typeof(b) = 'object' THEN
        COALESCE(
          (SELECT jsonb_object_agg(
            COALESCE(ka, kb),
            CASE
              WHEN va IS NULL THEN vb
              WHEN vb IS NULL THEN va
              WHEN jsonb_typeof(va) = 'object' AND jsonb_typeof(vb) = 'object'
                THEN jsonb_deep_merge(va, vb)
              ELSE vb
            END
          )
          FROM jsonb_each(a) e1(ka, va)
          FULL OUTER JOIN jsonb_each(b) e2(kb, vb) ON ka = kb),
          '{}'::jsonb
        )
      ELSE b
    END
$$;
