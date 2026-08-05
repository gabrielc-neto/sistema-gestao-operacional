// Lista global de viagens (retiradas) de todos os contratos.
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, Loader2, AlertCircle, Search, Calendar } from "lucide-react";
import ModuleHeader from "../components/ModuleHeader";
import { apiGet } from "../services/api";

const NAVY = "#18216E";
const STATUS_META = {
  programada: { label: "Programada", cor: "#F5B800" },
  em_transito: { label: "Em trânsito", cor: "#0EA5E9" },
  concluida: { label: "Concluída", cor: "#16A34A" },
  cancelada: { label: "Cancelada", cor: "#DC2626" },
};

const fmtL   = v => Number(v||0).toLocaleString("pt-BR",{maximumFractionDigits:0})+" L";
const fmtData = iso => iso ? new Date(iso).toLocaleDateString("pt-BR") : "-";

export default function Viagens() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [filtroStatus, setStatus] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true); setErro(null);
    try {
      const params = new URLSearchParams();
      if (filtroStatus) params.set("status", filtroStatus);
      if (de)           params.set("de", de);
      if (ate)          params.set("ate", ate);
      const r = await apiGet(`/api/viagens?${params}`);
      setRows(r.rows || []);
    } catch (e) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  }, [filtroStatus, de, ate]);

  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: "0 auto" }}>
      <ModuleHeader
        titulo="Viagens (Retiradas)"
        subtitulo="Retiradas de combustível nas usinas/distribuidoras. Origem: fornecedor · Destino: base Araucária."
        icone={<Truck size={22}/>}
      />

      <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center", flexWrap: "wrap" }}>
        <select value={filtroStatus} onChange={(e) => setStatus(e.target.value)} style={inp()}>
          <option value="">Todos os status</option>
          {Object.entries(STATUS_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
        </select>
        <input type="date" value={de}  onChange={(e) => setDe(e.target.value)}  style={inp()} placeholder="De"/>
        <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} style={inp()} placeholder="Até"/>
      </div>

      <div style={{ marginTop: 12, background: "white", borderRadius: 10, border: "1px solid #E2E8F0", overflow: "hidden" }}>
        {loading && <Ctr><Loader2 className="anim-spin" size={18}/> Carregando…</Ctr>}
        {erro && <Ctr style={{ color: "#DC2626" }}><AlertCircle size={18}/> {erro}</Ctr>}
        {!loading && rows.length === 0 && <Ctr>Nenhuma viagem encontrada.</Ctr>}
        {!loading && rows.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#F8FAFC" }}>
              <tr>
                <Th>Nº</Th><Th>Data prog.</Th><Th>Data saída</Th>
                <Th>Origem (fornecedor)</Th><Th>Destino</Th>
                <Th>Veículo / Carreta</Th><Th>Motorista</Th>
                <Th align="right">Volume</Th><Th>NF-e</Th><Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map(v => (
                <tr key={v.id} style={{ borderTop: "1px solid #F1F5F9" }}>
                  <Td><strong>V-{String(v.numero).padStart(4,"0")}</strong></Td>
                  <Td>{fmtData(v.dataProgramada)}</Td>
                  <Td>{v.dataSaida ? new Date(v.dataSaida).toLocaleString("pt-BR") : "-"}</Td>
                  <Td>{v.origemNome || "-"}<br/><span style={{ fontSize: 11, color: "#64748B" }}>{v.origemCidade}/{v.origemUf}</span></Td>
                  <Td>{v.destinoNome}<br/><span style={{ fontSize: 11, color: "#64748B" }}>{v.destinoCidade}/{v.destinoUf}</span></Td>
                  <Td>{v.veiculoPlaca || v.veiculoId}{v.carretaPlaca && ` / ${v.carretaPlaca}`}</Td>
                  <Td>{v.motoristaNome || v.motoristaId}</Td>
                  <Td align="right">{fmtL(v.volumeTotalLitros)}</Td>
                  <Td>{v.nfeNumero || "-"}</Td>
                  <Td><Badge status={v.status}/></Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Badge({ status }) {
  const m = STATUS_META[status] || { label: status, cor: "#64748B" };
  return <span style={{ background: m.cor + "20", color: m.cor, padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{m.label}</span>;
}
function Th({ children, align = "left" }) { return <th style={{ padding: "10px 12px", textAlign: align, fontSize: 12, color: "#475569", fontWeight: 600 }}>{children}</th>; }
function Td({ children, align = "left" }) { return <td style={{ padding: "10px 12px", textAlign: align, fontSize: 13, color: "#0F172A" }}>{children}</td>; }
function Ctr({ children, style = {} }) { return <div style={{ padding: 40, textAlign: "center", color: "#64748B", display: "flex", justifyContent: "center", alignItems: "center", gap: 8, ...style }}>{children}</div>; }
const inp = () => ({ padding: "7px 10px", border: "1px solid #CBD5E1", borderRadius: 6, fontSize: 14, background: "white" });
