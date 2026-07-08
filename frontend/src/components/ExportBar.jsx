import { useState } from "react";
import { Printer, FileText, FileSpreadsheet, FileDown } from "lucide-react";
import { exportarCsv, exportarExcel, exportarPdf, imprimir } from "../utils/exportacao";

/**
 * Barra de exportação corporativa — Imprimir · PDF · CSV · Excel.
 * Reutilizável em qualquer página; padroniza estética + comportamento.
 *
 * Props:
 *  - titulo     (string)   nome do relatório (aparece no cabeçalho do arquivo)
 *  - arquivo    (string)   base do nome do arquivo salvo (ex.: "frota")
 *  - subtitulo  (string?)  linha auxiliar (período, filtros aplicados…)
 *  - colunas    (string[] | () => string[])            cabeçalhos
 *  - linhas     ((string|number)[][] | () => linhas)   dados (uma linha = array de células)
 *  - dados      (() => ({colunas, linhas}))            alternativa: computa tudo no clique
 *  - align      ("left" | "right")  alinhamento da barra (default "right")
 *  - compacto   (bool)     versão sem rótulos (só ícones) — útil em telas apertadas
 *
 * Passe `colunas`/`linhas` como funções (ou use `dados`) para computar só no clique,
 * refletindo os filtros ativos da tela sem recalcular a cada render.
 */
export default function ExportBar({
  titulo,
  arquivo,
  subtitulo,
  colunas,
  linhas,
  dados,
  align = "right",
  compacto = false,
}) {
  const [ocupado, setOcupado] = useState(null); // formato em execução (ex.: "pdf")

  function montarSpec() {
    let cols, rows;
    if (typeof dados === "function") {
      const d = dados() || {};
      cols = d.colunas;
      rows = d.linhas;
    } else {
      cols = typeof colunas === "function" ? colunas() : colunas;
      rows = typeof linhas === "function" ? linhas() : linhas;
    }
    return {
      titulo,
      subtitulo: typeof subtitulo === "function" ? subtitulo() : subtitulo,
      arquivo,
      colunas: Array.isArray(cols) ? cols : [],
      linhas: Array.isArray(rows) ? rows : [],
    };
  }

  async function acionar(formato, fn) {
    const spec = montarSpec();
    if (spec.linhas.length === 0) {
      alert("Não há dados para exportar com os filtros atuais.");
      return;
    }
    try {
      setOcupado(formato);
      await fn(spec);
    } catch (e) {
      console.error("Falha ao exportar:", e);
      alert("Não foi possível gerar o arquivo. Tente novamente.");
    } finally {
      setOcupado(null);
    }
  }

  const botoes = [
    { fmt: "imprimir", label: "Imprimir", Icon: Printer,         fn: imprimir,      cor: "var(--text)" },
    { fmt: "pdf",      label: "PDF",      Icon: FileText,        fn: exportarPdf,   cor: "#dc2626" },
    { fmt: "csv",      label: "CSV",      Icon: FileDown,        fn: exportarCsv,   cor: "#0369a1" },
    { fmt: "excel",    label: "Excel",    Icon: FileSpreadsheet, fn: exportarExcel, cor: "#15803d" },
  ];

  return (
    <div className={"exportbar" + (align === "left" ? " exportbar-left" : "")}>
      <span className="exportbar-legenda">Exportar</span>
      <div className="exportbar-btns">
        {botoes.map(({ fmt, label, Icon, fn, cor }) => (
          <button
            key={fmt}
            type="button"
            className="exportbar-btn"
            onClick={() => acionar(fmt, fn)}
            disabled={ocupado !== null}
            title={fmt === "imprimir" ? "Imprimir relatório" : `Salvar ${label}`}
          >
            <Icon size={15} color={cor} className={ocupado === fmt ? "exportbar-spin" : ""} />
            {!compacto && <span>{ocupado === fmt ? "Gerando…" : label}</span>}
          </button>
        ))}
      </div>

      <style>{`
        .exportbar {
          display: flex; align-items: center; gap: 10px;
          margin: 0 0 14px; padding: 8px 12px;
          background: var(--card-bg); border: 1px solid var(--border);
          border-radius: 10px; box-shadow: var(--sh-sm, 0 1px 3px rgba(0,0,0,.05));
          flex-wrap: wrap;
        }
        .exportbar.exportbar-left { justify-content: flex-start; }
        .exportbar:not(.exportbar-left) { justify-content: flex-end; }
        .exportbar-legenda {
          font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em;
          color: var(--text-subtle); margin-right: auto;
        }
        .exportbar:not(.exportbar-left) .exportbar-legenda { margin-right: auto; }
        .exportbar-btns { display: flex; gap: 6px; flex-wrap: wrap; }
        .exportbar-btn {
          display: inline-flex; align-items: center; gap: 7px; white-space: nowrap;
          padding: 7px 13px; border: 1px solid var(--border-strong);
          border-radius: 8px; background: var(--surface-2); color: var(--text);
          font-family: inherit; font-size: .8rem; font-weight: 600; cursor: pointer;
          transition: background .15s, border-color .15s, transform .12s, box-shadow .15s;
        }
        .exportbar-btn:hover:not(:disabled) {
          background: var(--surface-3); border-color: var(--accent); color: var(--accent);
          transform: translateY(-1px); box-shadow: 0 2px 6px rgba(15,23,42,.08);
        }
        .exportbar-btn:active:not(:disabled) { transform: translateY(0); }
        .exportbar-btn:disabled { opacity: .55; cursor: default; }
        .exportbar-spin { animation: exportbar-spin 1s linear infinite; }
        @keyframes exportbar-spin { to { transform: rotate(360deg); } }

        @media (max-width: 640px) {
          .exportbar { padding: 8px 10px; }
          .exportbar-legenda { flex-basis: 100%; margin-bottom: 2px; }
          .exportbar-btns { width: 100%; }
          .exportbar-btn { flex: 1 1 auto; justify-content: center; }
        }
      `}</style>
    </div>
  );
}
