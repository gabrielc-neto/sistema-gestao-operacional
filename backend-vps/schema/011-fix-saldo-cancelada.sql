-- 011-fix-saldo-cancelada.sql
-- Bug: ao cancelar viagem (status='cancelada'), o volume NAO era devolvido ao saldo.
-- Causa: LEFT JOIN com viagens filtrando por status <> 'cancelada' deixava v.* NULL
-- mas SUM(vi.volume_litros) continuava contando o item.
-- Fix: usar CASE WHEN pra zerar o volume das viagens canceladas dentro do SUM.
--
-- Tambem corrige o trigger fn_atualiza_status_contrato pela mesma logica.
-- E adiciona trigger no UPDATE de viagens.status pra:
--   - marcar contrato como 'esgotado' quando ultima viagem zera o saldo
--   - reverter contrato pra 'ativo' se viagem cancelada devolve saldo

CREATE OR REPLACE VIEW v_contratos_saldo AS
SELECT
    c.id,
    c.numero,
    c.produto,
    c.fornecedor_id,
    c.volume_total_litros,
    COALESCE(SUM(CASE WHEN v.status <> 'cancelada' OR v.status IS NULL THEN vi.volume_litros ELSE 0 END), 0)
        AS volume_retirado_litros,
    (c.volume_total_litros
     - COALESCE(SUM(CASE WHEN v.status <> 'cancelada' OR v.status IS NULL THEN vi.volume_litros ELSE 0 END), 0))
        AS saldo_litros,
    CASE
        WHEN c.volume_total_litros = 0 THEN 0
        ELSE ROUND(
            (COALESCE(SUM(CASE WHEN v.status <> 'cancelada' OR v.status IS NULL THEN vi.volume_litros ELSE 0 END), 0)
             / c.volume_total_litros) * 100,
            2
        )
    END AS percentual_retirado,
    c.status
FROM contratos_compra c
LEFT JOIN viagem_itens vi ON vi.contrato_id = c.id
LEFT JOIN viagens v       ON v.id = vi.viagem_id
GROUP BY c.id;


-- Trigger: recalcula status do contrato considerando viagens NAO canceladas
CREATE OR REPLACE FUNCTION fn_atualiza_status_contrato()
RETURNS TRIGGER AS $$
DECLARE
    v_contrato_id TEXT;
    v_total       NUMERIC;
    v_retirado    NUMERIC;
    v_status_atual TEXT;
BEGIN
    v_contrato_id := COALESCE(NEW.contrato_id, OLD.contrato_id);

    SELECT c.volume_total_litros, c.status
      INTO v_total, v_status_atual
      FROM contratos_compra c WHERE c.id = v_contrato_id;

    IF v_total IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

    SELECT COALESCE(SUM(CASE WHEN v.status <> 'cancelada' OR v.status IS NULL THEN vi.volume_litros ELSE 0 END), 0)
      INTO v_retirado
      FROM viagem_itens vi
      LEFT JOIN viagens v ON v.id = vi.viagem_id
     WHERE vi.contrato_id = v_contrato_id;

    IF (v_total - v_retirado) <= 0 AND v_status_atual IN ('ativo') THEN
        UPDATE contratos_compra SET status = 'esgotado', atualizado_em = NOW() WHERE id = v_contrato_id;
    ELSIF (v_total - v_retirado) > 0 AND v_status_atual = 'esgotado' THEN
        -- Viagem cancelada devolveu volume → contrato volta a ficar ativo
        UPDATE contratos_compra SET status = 'ativo', atualizado_em = NOW() WHERE id = v_contrato_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;


-- Trigger auxiliar: quando o STATUS de uma viagem muda (ex: user cancela),
-- rebate o recalculo pra cada item da viagem
CREATE OR REPLACE FUNCTION fn_recalcula_contratos_da_viagem()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        UPDATE contratos_compra c
           SET atualizado_em = NOW()
          FROM viagem_itens vi
         WHERE vi.viagem_id = NEW.id AND vi.contrato_id = c.id;
        -- Rebate manualmente o trigger de item (poderia ser inline, mas mantem consistencia)
        PERFORM fn_atualiza_status_contrato_para(vi.contrato_id)
           FROM viagem_itens vi WHERE vi.viagem_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Wrapper pra chamar recalculo por contrato_id
CREATE OR REPLACE FUNCTION fn_atualiza_status_contrato_para(p_contrato_id TEXT)
RETURNS VOID AS $$
DECLARE
    v_total       NUMERIC;
    v_retirado    NUMERIC;
    v_status_atual TEXT;
BEGIN
    SELECT c.volume_total_litros, c.status
      INTO v_total, v_status_atual
      FROM contratos_compra c WHERE c.id = p_contrato_id;

    IF v_total IS NULL THEN RETURN; END IF;

    SELECT COALESCE(SUM(CASE WHEN v.status <> 'cancelada' OR v.status IS NULL THEN vi.volume_litros ELSE 0 END), 0)
      INTO v_retirado
      FROM viagem_itens vi
      LEFT JOIN viagens v ON v.id = vi.viagem_id
     WHERE vi.contrato_id = p_contrato_id;

    IF (v_total - v_retirado) <= 0 AND v_status_atual IN ('ativo') THEN
        UPDATE contratos_compra SET status = 'esgotado', atualizado_em = NOW() WHERE id = p_contrato_id;
    ELSIF (v_total - v_retirado) > 0 AND v_status_atual = 'esgotado' THEN
        UPDATE contratos_compra SET status = 'ativo', atualizado_em = NOW() WHERE id = p_contrato_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_viagens_status_recalc ON viagens;
CREATE TRIGGER trg_viagens_status_recalc
    AFTER UPDATE OF status ON viagens
    FOR EACH ROW EXECUTE FUNCTION fn_recalcula_contratos_da_viagem();
