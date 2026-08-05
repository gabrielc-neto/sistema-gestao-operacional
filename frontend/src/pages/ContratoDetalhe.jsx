// Detalhe do contrato + timeline de viagens + botao "Nova viagem" (modal).
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Truck, Plus, Loader2, AlertCircle, FileText, Paperclip,
  MapPin, Calendar, DollarSign, Factory, Package, Building2, CheckCircle2,
  Download, Edit2, Trash2,
} from "lucide-react";
import ModuleHeader from "../components/ModuleHeader";
import { useRBAC } from "../rbac/RBACContext";
import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from "../services/api";
import { list as dsList } from "../services/genericDataSource";

const NAVY = "#18216E";
const AMARELO = "#F5B800";

const STATUS_META = {
  ativo:     { label: "Ativo",      cor: "#16A34A" },
  esgotado:  { label: "Finalizado", cor: "#0EA5E9" },
  cancelado: { label: "Cancelado",  cor: "#DC2626" },
  // Status de viagens
  programada:  { label: "Programada",  cor: "#F5B800" },
  em_transito: { label: "Em trânsito", cor: "#0EA5E9" },
  concluida:   { label: "Concluída",   cor: "#16A34A" },
  cancelada:   { label: "Cancelada",   cor: "#DC2626" },
};

const fmtL   = v => Number(v||0).toLocaleString("pt-BR",{maximumFractionDigits:0})+" L";
const fmtM3  = v => (Number(v||0)/1000).toLocaleString("pt-BR",{minimumFractionDigits:3,maximumFractionDigits:4})+" m³";
const fmtBRL = v => Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const fmtData = iso => iso ? new Date(iso).toLocaleDateString("pt-BR") : "-";

export default function ContratoDetalhe() {
  const { id } = useParams();
  const nav = useNavigate();
  const { temPermissao, isSuperAdmin } = useRBAC();
  const podeCriarViagem = temPermissao("viagens.criar") || isSuperAdmin;

  const [contrato, setContrato] = useState(null);
  const [viagens, setViagens]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [erro, setErro]         = useState(null);
  const [modalViagem, setModal] = useState(false);
  const [editando, setEditando] = useState(false);
  const [viagemEdit, setViagemEdit] = useState(null); // {id} → abre EditarViagemModal

  const carregar = useCallback(async () => {
    setLoading(true); setErro(null);
    try {
      const [c, v] = await Promise.all([
        apiGet(`/api/contratos/${id}`),
        apiGet(`/api/contratos/${id}/viagens`),
      ]);
      setContrato(c); setViagens(v.rows || []);
    } catch (e) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);

  async function excluirViagem(v) {
    const num = String(v.numero).padStart(4, "0");
    if (!confirm(`Cancelar a viagem V-${num}?\n(soft delete: fica no histórico como Cancelada e devolve o volume ao saldo)`)) return;
    try {
      await apiDelete(`/api/viagens/${v.id}`);
      carregar();
    } catch (e) {
      alert("Falha ao excluir: " + e.message);
    }
  }

  // Abre o PDF do anexo do contrato em nova aba (inline)
  async function baixarAnexoContrato(anexoId, nome, mime) {
    try {
      const token = localStorage.getItem("pontual_auth_token");
      const BASE = import.meta.env?.VITE_PONTUAL_API_URL || "";
      const res = await fetch(`${BASE}/api/contratos/${id}/anexos/${anexoId}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      // PDF/imagem abre em nova aba (inline); outros baixa
      if ((mime || "").includes("pdf") || (mime || "").startsWith("image/")) {
        window.open(url, "_blank");
      } else {
        const a = document.createElement("a");
        a.href = url; a.download = nome;
        document.body.appendChild(a); a.click(); a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      alert("Falha ao abrir anexo: " + e.message);
    }
  }

  // Baixa PDF da Autorizacao de Carregamento
  async function baixarAutorizacao(viagemId) {
    try {
      const token = localStorage.getItem("pontual_auth_token");
      const BASE = import.meta.env?.VITE_PONTUAL_API_URL || "";
      const res = await fetch(`${BASE}/api/viagens/${viagemId}/autorizacao-pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // extrai filename do header
      const cd = res.headers.get("content-disposition") || "";
      const m = cd.match(/filename="([^"]+)"/);
      a.download = m ? m[1] : `autorizacao-${viagemId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Falha ao gerar PDF: " + e.message);
    }
  }

  if (loading) return <Center><Loader2 className="anim-spin" size={22}/> Carregando…</Center>;
  if (erro) return <Center style={{ color: "#DC2626" }}><AlertCircle size={22}/> {erro}</Center>;
  if (!contrato) return null;

  const saldoPct = contrato.percentualRetirado || 0;
  const semaforo = saldoPct >= 90 ? "#16A34A" : saldoPct >= 50 ? AMARELO : "#DC2626";

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      <button onClick={() => nav("/contratos")} style={backStyle}><ArrowLeft size={16}/> Voltar</button>

      <ModuleHeader
        titulo={`Contrato ${contrato.numero}`}
        subtitulo={`${contrato.fornecedor_razao_social || "-"} · ${fmtData(contrato.dataContrato)}`}
        icone={<FileText size={22}/>}
      />

      {/* Cards de resumo — volumes em m3 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 16 }}>
        <Kpi icon={<Package/>}      titulo="Volume total"    valor={fmtM3(contrato.volumeTotalLitros)} sub={fmtL(contrato.volumeTotalLitros)} />
        <Kpi icon={<Truck/>}        titulo="Já retirado"     valor={fmtM3(contrato.volumeRetiradoLitros)} sub={fmtL(contrato.volumeRetiradoLitros)} />
        <Kpi icon={<CheckCircle2/>} titulo="Saldo"           valor={fmtM3(contrato.saldoLitros)}    sub={fmtL(contrato.saldoLitros)} destacar />
      </div>

      {/* Bloco financeiro — valores em R$ calculados por saldo * preco */}
      {(() => {
        const preco    = Number(contrato.precoPorM3 || 0);
        const volTotal = Number(contrato.volumeTotalLitros || 0) / 1000;
        const volRet   = Number(contrato.volumeRetiradoLitros || 0) / 1000;
        const volSaldo = Number(contrato.saldoLitros || 0) / 1000;
        const vTotal   = volTotal * preco;
        const vRet     = volRet   * preco;
        const vSaldo   = volSaldo * preco;
        return (
          <div style={{ marginTop: 12, background: "white", borderRadius: 10, border: "1px solid #E2E8F0", padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: NAVY, fontWeight: 700, marginBottom: 10 }}>
              <DollarSign size={16}/> Financeiro
              <span style={{ marginLeft: "auto", fontSize: 12, color: "#64748B", fontWeight: 400 }}>
                Preço unitário:{" "}
                <strong style={{ color: NAVY }}>{fmtBRL(preco)}/m³</strong>
                {preco > 0 && (
                  <span style={{ marginLeft: 8, color: "#64748B" }}>
                    · <strong>R$ {(preco / 1000).toLocaleString("pt-BR", {minimumFractionDigits: 4, maximumFractionDigits: 4})}/L</strong>
                  </span>
                )}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <FinBox titulo="Valor total contratado" valor={fmtBRL(vTotal)} sub={`${volTotal.toLocaleString("pt-BR", {maximumFractionDigits: 3})} m³ × ${fmtBRL(preco)}`} cor="#64748B"/>
              <FinBox titulo="Já retirado (R$)"       valor={fmtBRL(vRet)}   sub={`${volRet.toLocaleString("pt-BR", {maximumFractionDigits: 3})} m³ consumidos`} cor="#DC2626"/>
              <FinBox titulo="Saldo restante (R$)"    valor={fmtBRL(vSaldo)} sub={`${volSaldo.toLocaleString("pt-BR", {maximumFractionDigits: 3})} m³ a retirar`} cor="#16A34A" destacar/>
            </div>
            {preco === 0 && (
              <div style={{ marginTop: 10, padding: 8, background: "#FEF3C7", borderRadius: 6, fontSize: 12, color: "#92400E" }}>
                ⓘ Preço R$/m³ está zerado — edite o contrato pra ver os valores calculados.
              </div>
            )}
          </div>
        );
      })()}

      {/* Barra de progresso */}
      <div style={{ marginTop: 16, background: "white", padding: 14, borderRadius: 10, border: "1px solid #E2E8F0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
          <span style={{ color: "#475569" }}>Retirado: <strong>{Math.round(saldoPct)}%</strong></span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setEditando(true)} style={{
              background: "white", border: `1px solid ${NAVY}`, color: NAVY,
              padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>Editar</button>
            <Badge status={contrato.status}/>
          </div>
        </div>
        <div style={{ height: 10, background: "#F1F5F9", borderRadius: 6, overflow: "hidden" }}>
          <div style={{ width: `${Math.min(100, saldoPct)}%`, height: "100%", background: semaforo }}/>
        </div>
      </div>

      {/* Dados do contrato + fornecedor */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <Card titulo="Dados da operação" icon={<FileText/>}>
          <Row label="Produto"        val={contrato.produto} />
          <Row label="Data pagamento" val={fmtData(contrato.dataPagamento)} />
          <Row label="Modalidade"     val={contrato.modalidade || "-"} />
          <Row label="Safra"          val={contrato.safra || "-"} />
          <Row label="Índice ref."    val={contrato.indiceReferencia || "-"} />
          <Row label="Local retirada" val={contrato.localRetiradaNome || "-"} />
          <Row label="Forma pagto"    val={contrato.formaPagamento || "-"} />
          {contrato.observacoes && (
            <div style={{ marginTop: 8, padding: 8, background: "#F8FAFC", borderRadius: 6, fontSize: 12, color: "#475569" }}>
              {contrato.observacoes}
            </div>
          )}
        </Card>

        <Card titulo="Fornecedor (vendedor)" icon={<Factory/>}>
          <Row label="Razão"          val={contrato.fornecedor_razao_social || "-"} />
          <Row label="CNPJ"           val={contrato.fornecedor_cnpj || "-"} />
        </Card>
      </div>

      {/* Anexos */}
      <div style={{ marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <h4 style={{ color: NAVY, fontSize: 14, margin: 0 }}>Anexos do contrato</h4>
          <label style={{
            background: NAVY, color: "white", padding: "5px 12px", borderRadius: 6, cursor: "pointer",
            fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4,
          }}>
            <Paperclip size={12}/> Anexar PDF
            <input
              type="file" accept="application/pdf"
              onChange={async (e) => {
                const file = e.target.files?.[0]; if (!file) return;
                try {
                  const fd = new FormData();
                  fd.append("pdf", file);
                  await apiUpload(`/api/contratos/${id}/anexos`, fd);
                  e.target.value = "";
                  carregar();
                } catch (err) { alert("Falha ao anexar: " + err.message); }
              }}
              style={{ display: "none" }}
            />
          </label>
        </div>
        {(contrato.anexos?.length || 0) === 0 ? (
          <div style={{ fontSize: 12, color: "#94A3B8", padding: "6px 0" }}>
            Nenhum PDF anexado. Clique em "Anexar PDF" pra subir o contrato original.
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {contrato.anexos.map(a => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 13, background: "white" }}>
                <Paperclip size={14} color="#64748B"/>
                <span>
                  {a.nome_arquivo} <span style={{ color: "#64748B" }}>({(a.tamanho_bytes/1024).toFixed(0)} KB · {a.metodo_extracao})</span>
                </span>
                <button
                  onClick={() => baixarAnexoContrato(a.id, a.nome_arquivo, a.mime_type)}
                  style={{ background: NAVY, color: "white", border: "none", padding: "4px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  <Download size={12}/> Ver
                </button>
                <button
                  onClick={async () => {
                    if (!confirm("Excluir este anexo?")) return;
                    try {
                      await apiDelete(`/api/contratos/${id}/anexos/${a.id}`);
                      carregar();
                    } catch (e) { alert("Falha: " + e.message); }
                  }}
                  style={{ background: "white", color: "#DC2626", border: "1px solid #DC2626", padding: "4px 8px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}
                >
                  <Trash2 size={12}/>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timeline de viagens */}
      <div style={{ marginTop: 20, background: "white", borderRadius: 10, border: "1px solid #E2E8F0", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h4 style={{ margin: 0, color: NAVY, fontSize: 15 }}>
            Viagens ({viagens.length}) — {contrato.status === "ativo" || contrato.status === "pago" ? "consumindo saldo" : "contrato encerrado"}
          </h4>
          {podeCriarViagem && contrato.status !== "cancelado" && contrato.status !== "esgotado" && (
            <button onClick={() => setModal(true)} style={btnPrimary}>
              <Plus size={16}/> Nova viagem (retirada)
            </button>
          )}
        </div>

        {viagens.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "#64748B" }}>
            Ainda não há viagens registradas neste contrato.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#F8FAFC" }}>
              <tr>
                <Th>Nº</Th><Th>Data prog.</Th><Th>Veículo</Th><Th>Motorista</Th>
                <Th align="right">Vol. deste contrato</Th><Th align="right">Vol. total viagem</Th><Th>Status</Th>
                <Th>Ações</Th>
              </tr>
            </thead>
            <tbody>
              {viagens.map(v => (
                <tr key={v.id} style={{ borderTop: "1px solid #F1F5F9" }}>
                  <Td>V-{String(v.numero).padStart(4,"0")}</Td>
                  <Td>{fmtData(v.data_programada)}</Td>
                  <Td>{v.veiculo_placa || "-"}{v.carreta_placa && ` / ${v.carreta_placa}`}</Td>
                  <Td>{v.motorista_nome || "-"}</Td>
                  <Td align="right"><strong>{fmtL(v.volume_desse_contrato)}</strong></Td>
                  <Td align="right">{fmtL(v.volume_total_litros)}</Td>
                  <Td><Badge status={v.status}/></Td>
                  <Td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        onClick={() => baixarAutorizacao(v.id)}
                        title="Baixar Autorização de Carregamento (PDF)"
                        style={{
                          background: NAVY, color: "white", border: "none",
                          padding: "4px 8px", borderRadius: 6, fontSize: 12,
                          cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
                        }}
                      >
                        <Download size={12}/> PDF
                      </button>
                      <button
                        onClick={() => setViagemEdit(v)}
                        title="Editar viagem"
                        style={{
                          background: "white", color: NAVY, border: `1px solid ${NAVY}`,
                          padding: "4px 8px", borderRadius: 6, fontSize: 12,
                          cursor: "pointer", display: "inline-flex", alignItems: "center",
                        }}
                      >
                        <Edit2 size={12}/>
                      </button>
                      {v.status !== "cancelada" && (
                        <button
                          onClick={() => excluirViagem(v)}
                          title="Cancelar viagem (soft delete)"
                          style={{
                            background: "white", color: "#DC2626", border: "1px solid #DC2626",
                            padding: "4px 8px", borderRadius: 6, fontSize: 12,
                            cursor: "pointer", display: "inline-flex", alignItems: "center",
                          }}
                        >
                          <Trash2 size={12}/>
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalViagem && (
        <NovaViagemModal
          contratoPrincipal={contrato}
          onClose={() => setModal(false)}
          onSalvo={() => { setModal(false); carregar(); }}
        />
      )}
      {editando && (
        <EditarContratoModal
          contrato={contrato}
          onClose={() => setEditando(false)}
          onSalvo={() => { setEditando(false); carregar(); }}
        />
      )}
      {viagemEdit && (
        <EditarViagemModal
          viagemId={viagemEdit.id}
          onClose={() => setViagemEdit(null)}
          onSalvo={() => { setViagemEdit(null); carregar(); }}
        />
      )}
    </div>
  );
}

// ---------------- Modal: editar viagem existente ----------------
function EditarViagemModal({ viagemId, onClose, onSalvo }) {
  const [v, setV]           = useState(null);
  const [motoristas, setM]  = useState([]);
  const [cavalos, setC]     = useState([]);
  const [form, setForm]     = useState(null);
  const [salvando, setSlv]  = useState(false);
  const [erro, setErr]      = useState(null);

  useEffect(() => {
    apiGet(`/api/viagens/${viagemId}`).then(rec => {
      setV(rec);
      setForm({
        dataProgramada: rec.dataProgramada ? String(rec.dataProgramada).slice(0, 10) : "",
        dataSaida:      rec.dataSaida      ? String(rec.dataSaida).slice(0, 16)      : "",
        dataChegada:    rec.dataChegada    ? String(rec.dataChegada).slice(0, 16)    : "",
        veiculoPlaca:   rec.veiculoPlaca   || "",
        carretaPlaca:   rec.carretaPlaca   || "",
        carreta2Placa:  rec.carreta2Placa  || "",
        motoristaId:    rec.motoristaId    || "",
        motoristaNome:  rec.motoristaNome  || "",
        motoristaCpf:   rec.motoristaCpf   || "",
        motoristaCnh:   rec.motoristaCnh   || "",
        capacidadeVeiculoLitros: rec.capacidadeVeiculoLitros || "",
        nfeNumero:      rec.nfeNumero      || "",
        nfeChave:       rec.nfeChave       || "",
        status:         rec.status         || "programada",
        observacoes:    rec.observacoes    || "",
      });
    }).catch(e => setErr(e.message));
    dsList("motoristas", { orderBy: "nome" }).then(setM).catch(() => setM([]));
    dsList("veiculos").then(rows => setC(rows.filter(x => x.tipo === "cavalo"))).catch(() => setC([]));
  }, [viagemId]);

  async function salvar() {
    setSlv(true); setErr(null);
    try {
      await apiPut(`/api/viagens/${viagemId}`, form);
      onSalvo();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSlv(false);
    }
  }

  if (!v || !form) return (
    <div style={overlayStyle}>
      <div style={{ ...modalStyle, width: 500, padding: 40, textAlign: "center" }}>
        <Loader2 className="anim-spin" size={20}/> Carregando…
      </div>
    </div>
  );

  return (
    <div style={overlayStyle}>
      <div style={{ ...modalStyle, width: 720 }}>
        <div style={modalHeader}>
          <Edit2 size={20} color={NAVY}/> <strong>Editar viagem V-{String(v.numero).padStart(4,"0")}</strong>
          <button onClick={onClose} style={btnGhost}>✕</button>
        </div>
        <div style={{ padding: 20, maxHeight: "75vh", overflow: "auto" }}>
          <div style={{ marginBottom: 12, padding: 10, background: "#F0F9FF", borderRadius: 6, fontSize: 13 }}>
            Volume: <strong>{Number(v.volumeTotalLitros).toLocaleString("pt-BR")} L</strong>.
            Pra alterar volumes/contratos, cancele e crie viagem nova.
          </div>

          <SecTitle>Datas / status</SecTitle>
          <Grid>
            <Fld label="Data programada">
              <input type="date" value={form.dataProgramada} onChange={(e) => setForm({...form, dataProgramada: e.target.value})} style={inp()}/>
            </Fld>
            <Fld label="Status">
              <select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})} style={inp()}>
                <option value="programada">Programada</option>
                <option value="em_transito">Em trânsito</option>
                <option value="concluida">Concluída</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </Fld>
            <Fld label="Data/hora saída">
              <input type="datetime-local" value={form.dataSaida} onChange={(e) => setForm({...form, dataSaida: e.target.value})} style={inp()}/>
            </Fld>
            <Fld label="Data/hora chegada">
              <input type="datetime-local" value={form.dataChegada} onChange={(e) => setForm({...form, dataChegada: e.target.value})} style={inp()}/>
            </Fld>
          </Grid>

          <SecTitle>Veículo</SecTitle>
          <Grid>
            <Fld label="Placa cavalo">
              <select
                value={form.veiculoPlaca}
                onChange={(e) => {
                  const cav = cavalos.find(x => x.placa === e.target.value);
                  setForm({
                    ...form,
                    veiculoPlaca:  cav?.placa || e.target.value,
                    carretaPlaca:  cav?.c1 || form.carretaPlaca,
                    carreta2Placa: cav?.c2 || form.carreta2Placa,
                    capacidadeVeiculoLitros: cav ? (cav.capacidade || cav.cap || form.capacidadeVeiculoLitros) : form.capacidadeVeiculoLitros,
                  });
                }}
                style={inp()}
              >
                <option value="">— manter atual: {form.veiculoPlaca || "(vazio)"} —</option>
                {cavalos.map(c => <option key={c.id || c.placa} value={c.placa}>{c.placa}</option>)}
              </select>
            </Fld>
            <Fld label="Capacidade (L)">
              <input type="number" value={form.capacidadeVeiculoLitros} onChange={(e) => setForm({...form, capacidadeVeiculoLitros: e.target.value})} style={inp()}/>
            </Fld>
            <Fld label="1ª carreta">
              <input value={form.carretaPlaca} onChange={(e) => setForm({...form, carretaPlaca: e.target.value})} style={inp()}/>
            </Fld>
            <Fld label="2ª carreta">
              <input value={form.carreta2Placa} onChange={(e) => setForm({...form, carreta2Placa: e.target.value})} style={inp()}/>
            </Fld>
          </Grid>

          <SecTitle>Motorista</SecTitle>
          <Grid>
            <Fld label="Motorista">
              <select
                value={form.motoristaId}
                onChange={(e) => {
                  const m = motoristas.find(x => x.id === e.target.value);
                  setForm({
                    ...form,
                    motoristaId:   m?.id   || "",
                    motoristaNome: m?.nome || "",
                    motoristaCpf:  m?.cpf  || "",
                    motoristaCnh:  m?.cnh  || "",
                  });
                }}
                style={inp()}
              >
                <option value="">— manter atual: {form.motoristaNome || "(vazio)"} —</option>
                {motoristas.filter(m => m.status !== "desligado").map(m => (
                  <option key={m.id} value={m.id}>{m.nome}{m.cpf ? ` · ${m.cpf}` : ""}</option>
                ))}
              </select>
            </Fld>
            <Fld label="CPF (edite se o cadastro estiver vazio)">
              <input value={form.motoristaCpf} onChange={(e) => setForm({ ...form, motoristaCpf: e.target.value })} style={inp()} placeholder="000.000.000-00"/>
            </Fld>
            <Fld label="CNH (edite se o cadastro estiver vazio)">
              <input value={form.motoristaCnh} onChange={(e) => setForm({ ...form, motoristaCnh: e.target.value })} style={inp()} placeholder="00000000000"/>
            </Fld>
          </Grid>

          <SecTitle>Nota fiscal + observações</SecTitle>
          <Grid>
            <Fld label="NF-e número">
              <input value={form.nfeNumero} onChange={(e) => setForm({...form, nfeNumero: e.target.value})} style={inp()}/>
            </Fld>
            <Fld label="Chave NF-e (44 dígitos)">
              <input value={form.nfeChave} onChange={(e) => setForm({...form, nfeChave: e.target.value})} style={inp()}/>
            </Fld>
          </Grid>
          <div style={{ marginTop: 8 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Observações</label>
            <textarea rows={2} value={form.observacoes} onChange={(e) => setForm({...form, observacoes: e.target.value})} style={{ ...inp(), resize: "vertical" }}/>
          </div>

          <SecTitle>Anexos (NF-e, comprovantes)</SecTitle>
          <AnexosViagem viagemId={viagemId} />

          {erro && <div style={{ color: "#DC2626", marginTop: 12, fontSize: 13 }}>{erro}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
            <button onClick={onClose} style={btnSecondary}>Cancelar</button>
            <button onClick={salvar} disabled={salvando} style={{ ...btnPrimary, opacity: salvando ? 0.6 : 1 }}>
              {salvando ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------- Componente: lista + upload de anexos da viagem ----------------
function AnexosViagem({ viagemId }) {
  const [anexos, setAnexos] = useState([]);
  const [tipo, setTipo]     = useState("nf");
  const [enviando, setEnv]  = useState(false);
  const [erro, setErro]     = useState(null);

  const carregar = useCallback(async () => {
    try {
      const r = await apiGet(`/api/viagens/${viagemId}/anexos`);
      setAnexos(r.rows || []);
    } catch (e) { setErro(e.message); }
  }, [viagemId]);
  useEffect(() => { carregar(); }, [carregar]);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEnv(true); setErro(null);
    try {
      const fd = new FormData();
      fd.append("arquivo", file);
      fd.append("tipo", tipo);
      await apiUpload(`/api/viagens/${viagemId}/anexos`, fd);
      await carregar();
      e.target.value = ""; // reset input
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnv(false);
    }
  }

  async function excluir(anexoId) {
    if (!confirm("Excluir este anexo?")) return;
    try {
      await apiDelete(`/api/viagens/${viagemId}/anexos/${anexoId}`);
      carregar();
    } catch (e) {
      alert("Falha: " + e.message);
    }
  }

  function baixar(anexoId, nome) {
    const token = localStorage.getItem("pontual_auth_token");
    const BASE  = import.meta.env?.VITE_PONTUAL_API_URL || "";
    fetch(`${BASE}/api/viagens/${viagemId}/anexos/${anexoId}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then(r => r.blob()).then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = nome;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    });
  }

  const TIPO_LABEL = { nf: "Nota fiscal (NF-e/DANFE)", comprovante_pagto: "Comprovante pagto", foto_carga: "Foto carga", outro: "Outro" };

  return (
    <div style={{ padding: 12, border: "1px solid #E2E8F0", borderRadius: 8, background: "#F8FAFC" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={inp()}>
          {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label style={{
          background: NAVY, color: "white", padding: "7px 14px", borderRadius: 6, cursor: enviando ? "wait" : "pointer",
          fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, opacity: enviando ? 0.6 : 1,
        }}>
          <Paperclip size={14}/> {enviando ? "Enviando…" : "Anexar arquivo"}
          <input type="file" onChange={handleUpload} disabled={enviando} style={{ display: "none" }} />
        </label>
      </div>
      {erro && <div style={{ color: "#DC2626", fontSize: 12, marginBottom: 8 }}>{erro}</div>}
      {anexos.length === 0 ? (
        <div style={{ fontSize: 12, color: "#94A3B8", padding: "8px 0" }}>Nenhum anexo. Envie NF-e da usina, comprovante etc.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {anexos.map(a => (
            <div key={a.id} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: 8, background: "white", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 13,
            }}>
              <Paperclip size={14} color="#64748B"/>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{a.nome_arquivo}</div>
                <div style={{ fontSize: 11, color: "#64748B" }}>
                  {TIPO_LABEL[a.tipo] || a.tipo} · {(a.tamanho_bytes/1024).toFixed(0)} KB · {new Date(a.criado_em).toLocaleString("pt-BR")}
                </div>
              </div>
              <button onClick={() => baixar(a.id, a.nome_arquivo)}
                style={{ background: NAVY, color: "white", border: "none", padding: "4px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Download size={12}/> Baixar
              </button>
              <button onClick={() => excluir(a.id)}
                style={{ background: "white", color: "#DC2626", border: "1px solid #DC2626", padding: "4px 8px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>
                <Trash2 size={12}/>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Aceita "2452.37", "2452,37", "2.452,37", "716.092,04" — retorna Number
function parseBR(s) {
  const str = String(s ?? "").trim().replace(/\s/g, "");
  if (!str) return 0;
  if (str.includes(",")) return Number(str.replace(/\./g, "").replace(",", ".")) || 0;
  return Number(str) || 0;
}

// ---------------- Modal: editar contrato existente (foco: valores/datas/produto) ----------------
function EditarContratoModal({ contrato, onClose, onSalvo }) {
  const PRODUTOS = [
    { value: "ETANOL_ANIDRO",    label: "Etanol Anidro" },
    { value: "ETANOL_HIDRATADO", label: "Etanol Hidratado" },
    { value: "DIESEL_S10",       label: "Diesel S10" },
    { value: "DIESEL_S500",      label: "Diesel S500" },
    { value: "BIODIESEL",        label: "Biodiesel (B100)" },
    { value: "BIODIESEL_BE8",    label: "Biodiesel BE8" },
    { value: "GASOLINA",         label: "Gasolina" },
    { value: "OUTRO",            label: "Outro" },
  ];
  const [form, setForm] = useState({
    numero:        contrato.numero || "",
    dataContrato:  contrato.dataContrato ? String(contrato.dataContrato).slice(0, 10) : "",
    produto:       contrato.produto || "OUTRO",
    volumeM3:      contrato.volumeTotalLitros ? String(contrato.volumeTotalLitros / 1000) : "",
    precoPorM3:    contrato.precoPorM3 ? String(contrato.precoPorM3) : "",
    valorTotal:    contrato.valorTotal ? String(contrato.valorTotal) : "",
    dataPagamento: contrato.dataPagamento ? String(contrato.dataPagamento).slice(0, 10) : "",
    modalidade:    contrato.modalidade || "",
    observacoes:   contrato.observacoes || "",
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  async function salvar() {
    setSalvando(true); setErro(null);
    try {
      const vol = parseBR(form.volumeM3);
      const p   = parseBR(form.precoPorM3);
      const litros = vol * 1000;
      await apiPut(`/api/contratos/${contrato.id}`, {
        numero:            form.numero,
        dataContrato:      form.dataContrato || null,
        produto:           form.produto,
        volumeTotalLitros: litros || 0,
        precoPorM3:        p || 0,
        valorTotal:        parseBR(form.valorTotal) || 0,
        dataPagamento:     form.dataPagamento || null,
        modalidade:        form.modalidade || null,
        observacoes:       form.observacoes || null,
      });
      onSalvo();
    } catch (e) {
      setErro(e.message || "Falha ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div style={overlayStyle}>
      <div style={{ ...modalStyle, width: 640 }}>
        <div style={modalHeader}>
          <FileText size={20} color={NAVY}/> <strong>Editar contrato {contrato.numero}</strong>
          <button onClick={onClose} style={btnGhost}>✕</button>
        </div>
        <div style={{ padding: 20 }}>
          <Grid>
            <Fld label="Número">
              <input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} style={inp()}/>
            </Fld>
            <Fld label="Data">
              <input type="date" value={form.dataContrato} onChange={(e) => setForm({ ...form, dataContrato: e.target.value })} style={inp()}/>
            </Fld>
            <Fld label="Produto">
              <select value={form.produto} onChange={(e) => setForm({ ...form, produto: e.target.value })} style={inp()}>
                {PRODUTOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </Fld>
            <Fld label="Volume (m³)*">
              <input
                type="number"
                value={form.volumeM3}
                onChange={(e) => {
                  const vol = e.target.value;
                  const v = parseBR(vol);
                  const p = parseBR(form.precoPorM3);
                  const val = parseBR(form.valorTotal);
                  let novoValor = form.valorTotal, novoPreco = form.precoPorM3;
                  if (v > 0 && p > 0)         novoValor = (v * p).toFixed(2);
                  else if (v > 0 && val > 0)  novoPreco = (val / v).toFixed(4);
                  setForm({ ...form, volumeM3: vol, precoPorM3: novoPreco, valorTotal: novoValor });
                }}
                style={inp()}
              />
            </Fld>
            <Fld label="Valor total da nota (R$)*">
              <input
                value={form.valorTotal}
                onChange={(e) => {
                  const val = e.target.value;
                  const v = parseBR(form.volumeM3);
                  const t = parseBR(val);
                  const novoPreco = (v > 0 && t > 0) ? (t / v).toFixed(4) : form.precoPorM3;
                  setForm({ ...form, valorTotal: val, precoPorM3: novoPreco });
                }}
                style={inp()}
                placeholder="ex: 716092.04"
              />
              <div style={{ fontSize: 11, color: "#F59E0B", marginTop: 2 }}>
                Digita aqui e o preço/m³ + R$/L aparecem sozinhos
              </div>
            </Fld>
            <Fld label="Preço R$/m³ (calcula sozinho)">
              <input
                value={form.precoPorM3}
                onChange={(e) => {
                  const preco = e.target.value;
                  const vol = parseBR(form.volumeM3);
                  const p   = parseBR(preco);
                  const valorAuto = (vol && p) ? (vol * p).toFixed(2) : form.valorTotal;
                  setForm({ ...form, precoPorM3: preco, valorTotal: valorAuto });
                }}
                style={inp()}
                placeholder="preencha volume + valor da nota"
              />
              {parseBR(form.precoPorM3) > 0 ? (
                <div style={{ fontSize: 11, color: "#16A34A", marginTop: 2, fontWeight: 600 }}>
                  ✓ R$ {(parseBR(form.precoPorM3) / 1000).toLocaleString("pt-BR", {minimumFractionDigits: 4, maximumFractionDigits: 4})} / litro
                </div>
              ) : (
                <div style={{ fontSize: 11, color: "#F59E0B", marginTop: 2 }}>
                  ← digite o Valor da nota abaixo pra calcular
                </div>
              )}
            </Fld>
            <Fld label="ou Preço R$/L (quebrado)">
              <input
                value={form.precoPorM3 ? (parseBR(form.precoPorM3) / 1000).toFixed(6) : ""}
                onChange={(e) => {
                  const precoL = Number(String(e.target.value).replace(",", "."));
                  const precoM3 = precoL ? (precoL * 1000).toFixed(4) : "";
                  const vol = parseBR(form.volumeM3);
                  const valorAuto = (vol && precoL) ? (vol * precoL * 1000).toFixed(2) : form.valorTotal;
                  setForm({ ...form, precoPorM3: precoM3, valorTotal: valorAuto });
                }}
                style={inp()}
                placeholder="ex: 2.4537"
              />
              <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                R$ 2,4537/L = R$ 2.452,37/m³
              </div>
            </Fld>
            {/* Card do valor total calculado */}
            <div style={{ gridColumn: "1 / -1", background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 8, padding: 12 }}>
              {(() => {
                const vol = parseBR(form.volumeM3 || "");
                const preco = parseBR(form.precoPorM3 || "");
                const total = vol * preco;
                return (
                  <>
                    <div style={{ fontSize: 11, color: "#075985", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3 }}>
                      Valor total do contrato (calculado)
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#075985", marginTop: 4 }}>
                      {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </div>
                    {vol > 0 && preco > 0 && (
                      <div style={{ fontSize: 12, color: "#0369A1", marginTop: 4 }}>
                        {vol.toLocaleString("pt-BR", { maximumFractionDigits: 4 })} m³ × R$ {preco.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}/m³
                        {" · também: "}
                        {(vol * 1000).toLocaleString("pt-BR")} L × R$ {(preco/1000).toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}/L
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            <Fld label="Data pagamento">
              <input type="date" value={form.dataPagamento} onChange={(e) => setForm({ ...form, dataPagamento: e.target.value })} style={inp()}/>
            </Fld>
            <Fld label="Modalidade">
              <input value={form.modalidade} onChange={(e) => setForm({ ...form, modalidade: e.target.value })} style={inp()}/>
            </Fld>
          </Grid>
          {erro && <div style={{ color: "#DC2626", marginTop: 12, fontSize: 13 }}>{erro}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
            <button onClick={onClose} style={btnSecondary}>Cancelar</button>
            <button onClick={salvar} disabled={salvando}
              style={{ ...btnPrimary, opacity: salvando ? 0.6 : 1 }}>
              {salvando ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------- Modal: nova viagem ----------------
function NovaViagemModal({ contratoPrincipal, onClose, onSalvo }) {
  const [form, setForm] = useState({
    veiculoId: "", veiculoPlaca: "", capacidadeLitros: "",
    carreta1Placa: "", carreta2Placa: "",
    motoristaId: "", motoristaNome: "", motoristaCpf: "", motoristaCnh: "",
    dataProgramada: new Date().toISOString().slice(0,10),
    nfeNumero: "",
    volumePrincipal: "",
  });
  const [complementos, setComp] = useState([]);
  const [sugestoes, setSug]     = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro]         = useState(null);
  const [criarCompl, setCriarCompl] = useState(false); // atalho: criar contrato complementar inline
  const [reloadSug, setReloadSug] = useState(0);       // trigger de recarregamento das sugestoes
  const [motoristas, setMotoristas] = useState([]);    // cadastro Firestore
  const [cavalos, setCavalos]       = useState([]);    // veiculos tipo=cavalo (pra autopuxar carretas)

  // Carrega motoristas + cavalos do Firestore
  useEffect(() => {
    dsList("motoristas", { orderBy: "nome" }).then(setMotoristas).catch(() => setMotoristas([]));
    dsList("veiculos").then(rows => setCavalos(rows.filter(v => v.tipo === "cavalo"))).catch(() => setCavalos([]));
  }, []);

  // Ao mudar capacidade → pede sugestao de complemento se saldo < capacidade
  useEffect(() => {
    if (!form.capacidadeLitros) return;
    apiGet(`/api/contratos/sugerir-complemento?contratoId=${contratoPrincipal.id}&capacidadeLitros=${form.capacidadeLitros}`)
      .then(r => {
        setSug(r.sugestoes || []);
        setForm(f => ({
          ...f,
          volumePrincipal: r.precisaComplemento
            ? String(r.saldoPrincipal)
            : String(Math.min(Number(f.capacidadeLitros||0), Number(contratoPrincipal.saldoLitros||0))),
        }));
      })
      .catch(() => {});
  }, [form.capacidadeLitros, contratoPrincipal.id, contratoPrincipal.saldoLitros, reloadSug]);

  const totalItens = Number(form.volumePrincipal||0) + complementos.reduce((s,c) => s + Number(c.volumeLitros||0), 0);
  const capacidade = Number(form.capacidadeLitros||0);
  const falta      = Math.max(0, capacidade - totalItens);

  function addComplemento(sug) {
    if (complementos.find(c => c.contratoId === sug.id)) return;
    setComp([...complementos, {
      contratoId: sug.id, numero: sug.numero,
      saldo: sug.saldoLitros, volumeLitros: Math.min(sug.saldoLitros, falta),
    }]);
  }
  function removeComplemento(cid) {
    setComp(complementos.filter(c => c.contratoId !== cid));
  }

  async function salvar() {
    setSalvando(true); setErro(null);
    try {
      if (!form.veiculoId || !form.motoristaId) throw new Error("Informe veículo e motorista");
      if (!form.volumePrincipal || Number(form.volumePrincipal) <= 0) throw new Error("Informe volume do contrato principal");
      const itens = [
        { contratoId: contratoPrincipal.id, volumeLitros: Number(form.volumePrincipal) },
        ...complementos.map(c => ({ contratoId: c.contratoId, volumeLitros: Number(c.volumeLitros) })),
      ];
      await apiPost("/api/viagens", {
        veiculoId:      form.veiculoId,
        veiculoPlaca:   form.veiculoPlaca,
        capacidadeVeiculoLitros: Number(form.capacidadeLitros) || null,
        carretaPlaca:   form.carreta1Placa || null,
        carreta2Placa:  form.carreta2Placa || null,
        motoristaId:    form.motoristaId,
        motoristaNome:  form.motoristaNome,
        motoristaCpf:   form.motoristaCpf || null,
        motoristaCnh:   form.motoristaCnh || null,
        dataProgramada: form.dataProgramada || null,
        nfeNumero:      form.nfeNumero || null,
        itens,
      });
      onSalvo();
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div style={overlayStyle}>
      <div style={{ ...modalStyle, width: 720 }}>
        <div style={modalHeader}>
          <Truck size={20} color={NAVY} /> <strong>Nova viagem — {contratoPrincipal.numero}</strong>
          <button onClick={onClose} style={btnGhost}>✕</button>
        </div>
        <div style={{ padding: 20, maxHeight: "75vh", overflow: "auto" }}>
          <div style={{ marginBottom: 12, padding: 10, background: "#F0F9FF", borderRadius: 6, fontSize: 13 }}>
            Saldo disponível: <strong>{fmtL(contratoPrincipal.saldoLitros)}</strong> · Produto: {contratoPrincipal.produto}
          </div>

          <Grid>
            <Fld label="Placa cavalo*">
              <select
                value={form.veiculoId}
                onChange={(e) => {
                  const cav = cavalos.find(c => c.placa === e.target.value);
                  setForm({
                    ...form,
                    veiculoId:        cav?.placa || "",
                    veiculoPlaca:     cav?.placa || "",
                    capacidadeLitros: cav ? String(cav.capacidade || cav.cap || "") : form.capacidadeLitros,
                    carreta1Placa:    cav?.c1 || "",
                    carreta2Placa:    cav?.c2 || "",
                  });
                }}
                style={inp()}
              >
                <option value="">— selecione o cavalo —</option>
                {cavalos.map(c => (
                  <option key={c.id || c.placa} value={c.placa}>
                    {c.placa}{c.cap || c.capacidade ? ` · ${Number(c.cap || c.capacidade).toLocaleString('pt-BR')} L` : ""}{c.c1 ? ` · c1:${c.c1}` : ""}{c.c2 ? ` · c2:${c.c2}` : ""}
                  </option>
                ))}
              </select>
            </Fld>
            <Fld label="Capacidade do veículo (L)*">
              <input type="number" value={form.capacidadeLitros} onChange={(e) => setForm({...form, capacidadeLitros: e.target.value})} style={inp()} placeholder="47200" />
            </Fld>
            <Fld label="Placa 1ª carreta">
              <input value={form.carreta1Placa} onChange={(e) => setForm({...form, carreta1Placa: e.target.value})} style={inp()} placeholder="ex: TBE-6C67" />
            </Fld>
            <Fld label="Placa 2ª carreta (rodotrem)">
              <input value={form.carreta2Placa} onChange={(e) => setForm({...form, carreta2Placa: e.target.value})} style={inp()} placeholder="ex: XXX-0000" />
            </Fld>
            <Fld label="Motorista*">
              <select
                value={form.motoristaId}
                onChange={(e) => {
                  const m = motoristas.find(x => x.id === e.target.value);
                  setForm({
                    ...form,
                    motoristaId:   m?.id   || "",
                    motoristaNome: m?.nome || "",
                    motoristaCpf:  m?.cpf  || "",
                    motoristaCnh:  m?.cnh  || "",
                  });
                }}
                style={inp()}
              >
                <option value="">— selecione —</option>
                {motoristas.filter(m => m.status !== "desligado").map(m => (
                  <option key={m.id} value={m.id}>
                    {m.nome}{m.cpf ? ` · CPF ${m.cpf}` : ""}
                  </option>
                ))}
              </select>
            </Fld>
            <Fld label="CPF/CNH (auto)">
              <div style={{ padding: "7px 10px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 12, color: "#475569", minHeight: 32 }}>
                {form.motoristaCpf || form.motoristaCnh
                  ? <>CPF {form.motoristaCpf || "—"} · CNH {form.motoristaCnh || "—"}</>
                  : <em>selecione motorista</em>}
              </div>
            </Fld>
            <Fld label="Data programada">
              <input type="date" value={form.dataProgramada} onChange={(e) => setForm({...form, dataProgramada: e.target.value})} style={inp()} />
            </Fld>
            <Fld label="NF-e da distribuidora">
              <input value={form.nfeNumero} onChange={(e) => setForm({...form, nfeNumero: e.target.value})} style={inp()} />
            </Fld>
          </Grid>

          <SecTitle>Itens da viagem</SecTitle>
          <div style={{ padding: 10, border: "1px solid #E2E8F0", borderRadius: 6, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>Contrato principal</strong> — {contratoPrincipal.numero} · saldo {fmtL(contratoPrincipal.saldoLitros)}
              </div>
              <input
                type="number" value={form.volumePrincipal}
                onChange={(e) => setForm({...form, volumePrincipal: e.target.value})}
                style={{ ...inp(), width: 140, textAlign: "right" }}
                placeholder="litros"
              />
            </div>
          </div>

          {complementos.map(c => (
            <div key={c.contratoId} style={{ padding: 10, border: "1px solid #E2E8F0", borderRadius: 6, marginBottom: 8, background: "#FFFBEA" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong>Complemento</strong> — {c.numero} · saldo {fmtL(c.saldo)}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="number" value={c.volumeLitros}
                    onChange={(e) => setComp(complementos.map(x => x.contratoId === c.contratoId ? { ...x, volumeLitros: e.target.value } : x))}
                    style={{ ...inp(), width: 140, textAlign: "right" }}
                  />
                  <button onClick={() => removeComplemento(c.contratoId)} style={btnGhost}>✕</button>
                </div>
              </div>
            </div>
          ))}

          {falta > 0 && (
            <div style={{ marginTop: 8, padding: 10, background: "#FEF9C3", borderRadius: 6, fontSize: 13 }}>
              <strong>Falta {fmtL(falta)} pra completar {fmtL(capacidade)} do veículo.</strong>
              {sugestoes.length > 0 && <> Contratos sugeridos:</>}
              <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {sugestoes.filter(s => !complementos.find(c => c.contratoId === s.id)).map(s => (
                  <button key={s.id} onClick={() => addComplemento(s)} style={{
                    background: "white", border: "1px solid #F5B800", padding: "6px 10px",
                    borderRadius: 6, cursor: "pointer", fontSize: 12,
                  }}>
                    + {s.numero} ({fmtL(s.saldoLitros)})
                  </button>
                ))}
                <button onClick={() => setCriarCompl(true)} style={{
                  background: NAVY, color: "white", border: "none", padding: "6px 10px",
                  borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600,
                }}>
                  + Criar contrato complementar
                </button>
              </div>
              {criarCompl && (
                <CriarComplementarInline
                  contratoPrincipal={contratoPrincipal}
                  faltaLitros={falta}
                  onClose={() => setCriarCompl(false)}
                  onCriado={(novoContrato) => {
                    setCriarCompl(false);
                    addComplemento({
                      id: novoContrato.id,
                      numero: novoContrato.numero,
                      saldoLitros: novoContrato.volumeTotalLitros,
                    });
                    setReloadSug(x => x + 1);
                  }}
                />
              )}
            </div>
          )}

          <div style={{ marginTop: 12, padding: 10, background: "#F8FAFC", borderRadius: 6, fontSize: 13 }}>
            Total da viagem: <strong>{fmtL(totalItens)}</strong>
            {capacidade > 0 && (
              <> · Capacidade: {fmtL(capacidade)} · {totalItens > capacidade
                ? <span style={{ color: "#DC2626" }}>Excede em {fmtL(totalItens - capacidade)}</span>
                : <span style={{ color: "#16A34A" }}>OK ({fmtL(falta)} restante)</span>
              }</>
            )}
          </div>

          {erro && <div style={{ color: "#DC2626", marginTop: 12, fontSize: 13 }}>{erro}</div>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
            <button onClick={onClose} style={btnSecondary}>Cancelar</button>
            <button
              onClick={salvar} disabled={salvando}
              style={{ ...btnPrimary, opacity: salvando ? 0.6 : 1 }}
            >
              {salvando ? <><Loader2 size={16} className="anim-spin"/> Salvando…</> : "Registrar viagem"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------- Sub-modal INLINE: cria contrato complementar rapido ----------------
// Usa mesmo fornecedor + mesmo produto do contrato principal. Volume em m3.
// Depois de salvar, o pai adiciona ele direto como complemento na viagem em construcao.
function CriarComplementarInline({ contratoPrincipal, faltaLitros, onClose, onCriado }) {
  const faltaM3 = Math.ceil((faltaLitros || 0) / 1000);
  const [form, setForm] = useState({
    numero:       "",
    volumeM3:     String(faltaM3 || ""),
    precoPorM3:   contratoPrincipal.precoPorM3 ? String(contratoPrincipal.precoPorM3) : "",
    dataContrato: new Date().toISOString().slice(0, 10),
    observacoes:  `Complementar do contrato ${contratoPrincipal.numero}`,
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro]         = useState(null);

  async function salvar() {
    setSalvando(true); setErro(null);
    try {
      if (!form.numero)   throw new Error("Informe o número do contrato");
      if (!form.volumeM3) throw new Error("Informe o volume em m³");
      const litros = parseBR(form.volumeM3) * 1000;
      const precoM3 = parseBR(form.precoPorM3) || 0;
      const novo = await apiPost("/api/contratos", {
        numero:            form.numero,
        dataContrato:      form.dataContrato,
        fornecedorId:      contratoPrincipal.fornecedorId,
        produto:           contratoPrincipal.produto,
        volumeTotalLitros: litros,
        precoPorM3:        precoM3,
        valorTotal:        precoM3 * (litros / 1000),
        contratoPaiId:     contratoPrincipal.id,   // amarra ao pai (aditivo)
        observacoes:       form.observacoes,
        status:            "ativo",
      });
      onCriado(novo);
    } catch (e) {
      setErro(e.message || "Falha ao criar contrato complementar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div style={{
      marginTop: 10, padding: 12, background: "white",
      border: "1px solid #F5B800", borderRadius: 6,
    }}>
      <div style={{ fontSize: 13, marginBottom: 8, color: NAVY }}>
        <strong>Novo contrato complementar</strong> — {contratoPrincipal.fornecedor_razao_social || "fornecedor"} · {contratoPrincipal.produto}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <Fld label="Número do contrato*">
          <input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} style={inp()} placeholder="ex: 101554" />
        </Fld>
        <Fld label="Volume (m³)*">
          <input type="number" value={form.volumeM3} onChange={(e) => setForm({ ...form, volumeM3: e.target.value })} style={inp()} />
        </Fld>
        <Fld label="Preço R$/m³">
          <input type="number" value={form.precoPorM3} onChange={(e) => setForm({ ...form, precoPorM3: e.target.value })} style={inp()} />
        </Fld>
        <Fld label="Data">
          <input type="date" value={form.dataContrato} onChange={(e) => setForm({ ...form, dataContrato: e.target.value })} style={inp()} />
        </Fld>
      </div>
      {erro && <div style={{ color: "#DC2626", marginTop: 8, fontSize: 12 }}>{erro}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 8 }}>
        <button onClick={onClose} style={{ ...btnSecondary, padding: "6px 12px", fontSize: 12 }}>Cancelar</button>
        <button onClick={salvar} disabled={salvando}
          style={{ ...btnPrimary, padding: "6px 12px", fontSize: 12, opacity: salvando ? 0.6 : 1 }}>
          {salvando ? "Salvando…" : "Criar e adicionar"}
        </button>
      </div>
    </div>
  );
}

// ---- helpers ui ----
function Kpi({ icon, titulo, valor, sub, destacar }) {
  return (
    <div style={{
      background: destacar ? NAVY : "white", color: destacar ? "white" : NAVY,
      padding: 14, borderRadius: 10, border: "1px solid #E2E8F0",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: 0.75, fontSize: 12 }}>
        {icon} {titulo}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 6 }}>{valor}</div>
      {sub && <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
function FinBox({ titulo, valor, sub, cor, destacar }) {
  return (
    <div style={{
      padding: 12, borderRadius: 8,
      background: destacar ? cor : "white",
      color: destacar ? "white" : "#0F172A",
      border: destacar ? "none" : `1px solid #E2E8F0`,
      borderLeft: destacar ? "none" : `4px solid ${cor}`,
    }}>
      <div style={{ fontSize: 11, opacity: destacar ? 0.9 : 0.7, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3 }}>{titulo}</div>
      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: destacar ? "white" : cor }}>{valor}</div>
      <div style={{ fontSize: 11, opacity: destacar ? 0.85 : 0.7, marginTop: 2 }}>{sub}</div>
    </div>
  );
}
function Card({ titulo, icon, children }) {
  return (
    <div style={{ background: "white", padding: 16, borderRadius: 10, border: "1px solid #E2E8F0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: NAVY, fontWeight: 700, marginBottom: 10 }}>
        {icon} {titulo}
      </div>
      {children}
    </div>
  );
}
function Row({ label, val }) {
  return (
    <div style={{ display: "flex", padding: "4px 0", fontSize: 13, borderBottom: "1px dashed #F1F5F9" }}>
      <span style={{ width: 130, color: "#64748B" }}>{label}</span>
      <strong style={{ color: "#0F172A" }}>{val}</strong>
    </div>
  );
}
function Badge({ status }) {
  const m = STATUS_META[status] || { label: status, cor: "#64748B" };
  return <span style={{ background: m.cor + "20", color: m.cor, padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{m.label}</span>;
}
function Th({ children, align = "left" }) { return <th style={{ padding: "10px 12px", textAlign: align, fontSize: 12, color: "#475569", fontWeight: 600 }}>{children}</th>; }
function Td({ children, align = "left" }) { return <td style={{ padding: "10px 12px", textAlign: align, fontSize: 14, color: "#0F172A" }}>{children}</td>; }
function SecTitle({ children }) { return <h4 style={{ margin: "20px 0 8px", color: NAVY, fontSize: 14, fontWeight: 700 }}>{children}</h4>; }
function Grid({ children }) { return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{children}</div>; }
function Fld({ label, children }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}
function Center({ children, style = {} }) {
  return <div style={{ padding: 40, textAlign: "center", color: "#64748B", display: "flex", justifyContent: "center", alignItems: "center", gap: 8, ...style }}>{children}</div>;
}
const inp = () => ({ width: "100%", padding: "7px 10px", border: "1px solid #CBD5E1", borderRadius: 6, fontSize: 14 });
const btnPrimary = { background: NAVY, color: "white", border: "none", padding: "8px 16px", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 };
const btnSecondary = { background: "white", color: NAVY, border: `1px solid ${NAVY}`, padding: "8px 16px", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" };
const btnGhost = { background: "transparent", border: "none", color: "#64748B", fontSize: 20, cursor: "pointer" };
const backStyle = { background: "transparent", border: "none", color: NAVY, fontSize: 14, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 12 };
const overlayStyle = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 };
const modalStyle = { background: "white", borderRadius: 12, maxHeight: "90vh", overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" };
const modalHeader = { padding: "14px 18px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 8, color: NAVY, fontSize: 16 };
