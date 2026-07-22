// PopPneus — Procedimento Operacional Padrão do módulo Gestão de Pneus
// Modal com explicação de cada aba + passo a passo pra usuário seguir
// Aberto pelo botão "Como usar" no header do /pneus

import { useState } from "react";
import {
  X, Package, ShoppingCart, MapPin, ClipboardCheck, RefreshCw,
  History, LayoutDashboard, Info, ArrowRight, CheckCircle2, Lightbulb, HelpCircle,
} from "lucide-react";

const ABAS_POP = [
  {
    id: "compras",
    label: "1. Compras",
    icon: ShoppingCart,
    cor: "#16a34a",
    bg: "#dcfce7",
    quando: "Todo pneu NOVO ou RECAPADO que entra na empresa começa aqui.",
    campos: [
      "Fornecedor (loja/borracharia)",
      "Nota Fiscal (número + valor total)",
      "Data da compra",
      "Marca (Michelin, Pirelli, Goodyear, etc)",
      "Medida (295/80 R22.5, 275/80 R22.5, etc)",
      "Modelo (XZE, XDA5, etc)",
      "DOT (código de fabricação — 4 dígitos: 2 semana + 2 ano, ex: 2624 = semana 26 de 2024)",
      "Quantidade e valor unitário",
    ],
    passos: [
      "Chegou nota fiscal de pneu novo? Vai em Compras.",
      "Clica em \"Novo lançamento\" (ou similar).",
      "Preenche fornecedor, NF, marca, medida, DOT, quantidade e valor.",
      "Salva → os pneus entram automático na aba ESTOQUE com status \"disponível\".",
    ],
    dica: "Sempre registre o DOT — é a única forma de saber a idade real do pneu. Pneu com mais de 6 anos perde garantia mesmo sem uso.",
  },
  {
    id: "estoque",
    label: "2. Estoque",
    icon: Package,
    cor: "#059669",
    bg: "#d1fae5",
    quando: "Vê todos os pneus que estão PARADOS no depósito, prontos pra usar.",
    campos: [
      "Lista todos os pneus com status = \"disponível\"",
      "Mostra: marca · medida · modelo · DOT · vida (novo/recapado 1ª/2ª/3ª)",
      "Filtros: por marca, medida, vida",
    ],
    passos: [
      "Quer saber quantos pneus tem no depósito? Vai em Estoque.",
      "Quer alocar um pneu num caminhão? Clica no pneu → aba FROTA abre com dados dele.",
      "Quer atualizar preço/informação? Clica no pneu → \"Editar\".",
    ],
    dica: "Se aparecer 0 no Estoque mas você comprou → verifica se registrou em Compras primeiro. Compras alimenta Estoque.",
  },
  {
    id: "frota",
    label: "3. Frota",
    icon: MapPin,
    cor: "#2563eb",
    bg: "#dbeafe",
    quando: "Vê os pneus que estão MONTADOS nos caminhões (cavalo + carreta).",
    campos: [
      "Placa do veículo + posição (eixo dianteiro/traseiro, posição direita/esquerda)",
      "Quilometragem no momento da instalação",
      "Data da instalação",
      "Motorista que instalou/quem fez (opcional)",
    ],
    passos: [
      "Chegou hora de trocar pneu do caminhão? Vai em Estoque, seleciona o pneu.",
      "Escolhe o veículo (placa cavalo ou carreta).",
      "Escolhe a posição no eixo (ex: eixo 2, roda interna esquerda).",
      "Registra KM do hodômetro no momento (importante pra calcular vida útil).",
      "Salva → pneu sai do Estoque e vai pra Frota (status = \"em uso\").",
    ],
    dica: "Sempre registre a POSIÇÃO exata do pneu no eixo. Isso serve pra rodízio futuro e detectar desalinhamento (pneu do lado direito gasta mais rápido = alinhamento errado).",
  },
  {
    id: "inspecao",
    label: "4. Inspeção",
    icon: ClipboardCheck,
    cor: "#7c3aed",
    bg: "#e9d5ff",
    quando: "Registra CHECK periódico do pneu (mensal ou a cada X km) — verifica desgaste e problemas.",
    campos: [
      "Sulco atual (medido em mm com sulcômetro)",
      "Pressão (PSI ou libra)",
      "Fotos do pneu (danos, cortes, desgaste anormal)",
      "Status: OK / Trocar / Recapar / Descartar",
      "KM atual do veículo",
      "Observações",
    ],
    passos: [
      "Faz inspeção mensal ou quando motorista relatar algo estranho.",
      "Vai em Inspeção → \"Nova inspeção\".",
      "Escolhe o pneu (por placa+posição) ou escaneia QR code se tiver.",
      "Mede sulco com sulcômetro (mm) e anota pressão.",
      "Foto de qualquer coisa fora do normal (corte, bolha, desgaste em ponto).",
      "Marca status. Se \"Trocar\" ou \"Recapar\", já vira alerta no Dashboard.",
    ],
    dica: "Regra da Pontual: sulco menor que 3mm em dianteira, 2mm em traseira = trocar. Menor que 1.6mm = fora da lei (Contran) e multa em blitz.",
  },
  {
    id: "recapagem",
    label: "5. Recapagem",
    icon: RefreshCw,
    cor: "#b45309",
    bg: "#fed7aa",
    quando: "Pneu chegou no fim da vida mas a CARCAÇA ainda tá boa → manda pra recapadora reusar.",
    campos: [
      "Recapadora (fornecedor)",
      "Data de envio",
      "Custo da recapagem",
      "Data de retorno",
      "Vida nova: 1ª recapagem, 2ª ou 3ª (Pontual: máx 3 recapagens por carcaça)",
      "Novo desenho (banda de rodagem)",
    ],
    passos: [
      "Pneu foi marcado \"Recapar\" na Inspeção? Aparece na aba Recapagem como \"pendente envio\".",
      "Envia pra recapadora → clica \"Enviar\" → informa data e recapadora.",
      "Pneu fica com status \"em recapagem\" — não aparece em Estoque nem Frota.",
      "Quando volta da recapadora: clica \"Registrar retorno\" → informa custo e data.",
      "Pneu volta pra Estoque como \"recapado 1ª/2ª/3ª vida\" pronto pra reinstalar.",
    ],
    dica: "Recapagem custa 30-40% do preço de um pneu novo e dura ~70% da vida. Rende ~R$ 4-6 mil/pneu economizado ao longo do ciclo. Só recapa carcaça sem cortes profundos.",
  },
  {
    id: "historico",
    label: "6. Histórico",
    icon: History,
    cor: "#7c3aed",
    bg: "#e9d5ff",
    quando: "Vê a linha do tempo completa de UM pneu específico — desde a compra até descarte.",
    campos: [
      "Todas as mudanças de status (compra → estoque → uso → recapagem → uso → ...)",
      "Todas as inspeções feitas",
      "Todos os veículos e posições onde já rodou",
      "KM total percorrido (soma de todas as instalações)",
      "Custo total investido (compra + recapagens)",
      "CPK (custo por km rodado)",
    ],
    passos: [
      "Quer saber tudo sobre um pneu? Vai em Histórico e busca por DOT ou serial.",
      "Aparece linha do tempo: quando comprou, onde rodou, quando trocou, quando recapou.",
      "Serve pra: decidir descarte, avaliar fornecedor, calcular CPK real do pneu.",
    ],
    dica: "Pneu que rodou +150 mil km com 2 recapagens = ótimo custo-benefício. Pneu que estourou com 30 mil km = fornecedor ruim, evitar comprar de novo.",
  },
  {
    id: "dashboard",
    label: "7. Dashboard",
    icon: LayoutDashboard,
    cor: "#0891b2",
    bg: "#cffafe",
    quando: "VISÃO GERAL de toda a operação de pneus — KPIs, alertas, gastos.",
    campos: [
      "Total de pneus cadastrados",
      "Em estoque · Em uso · Em recapagem",
      "R$ investido no mês / ano",
      "Alertas: pneus pra trocar, pra recapar, com pressão baixa",
      "Ranking de fornecedores (quem dá pneu que dura mais)",
      "CPK médio da frota",
    ],
    passos: [
      "Todo dia de manhã: abre Dashboard, checa alertas críticos.",
      "Se tem pneu marcado \"Trocar\": aciona motorista/oficina.",
      "Fim do mês: vê gasto total, ranking de fornecedores, CPK médio.",
      "Reunião com Wesley: usa Dashboard como base.",
    ],
    dica: "Se o Dashboard mostrar 0 em tudo, é porque não tem dado ainda. Comece cadastrando em Compras → depois usa Estoque → Frota → Inspeção.",
  },
];

const FLUXO_GERAL = [
  { de: "Compra chega",         para: "Compras",   acao: "Registra NF" },
  { de: "Compras",              para: "Estoque",   acao: "Automático — vira \"disponível\"" },
  { de: "Estoque",              para: "Frota",     acao: "Aloca no cavalo/carreta" },
  { de: "Frota (mensal)",       para: "Inspeção",  acao: "Mede sulco/pressão + foto" },
  { de: "Inspeção diz \"Recapar\"", para: "Recapagem", acao: "Envia pra recapadora" },
  { de: "Recapagem",            para: "Estoque",   acao: "Volta com vida nova (1ª/2ª/3ª)" },
  { de: "Qualquer aba",         para: "Histórico", acao: "Consulta linha do tempo do pneu" },
  { de: "Todo dia",             para: "Dashboard", acao: "Visão geral + alertas" },
];

export default function PopPneus({ onClose }) {
  const [abaAtiva, setAbaAtiva] = useState("intro");

  const S = {
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
    modal: { background: "#fff", borderRadius: 12, maxWidth: 900, width: "100%", maxHeight: "92vh", display: "flex", flexDirection: "column" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #e2e8f0" },
    titulo: { margin: 0, color: "#1a3a5c", fontSize: "1.15rem", fontWeight: 800, display: "flex", alignItems: "center", gap: 8 },
    body: { display: "grid", gridTemplateColumns: "220px 1fr", flex: 1, overflow: "hidden" },
    sidebar: { background: "#f8fafc", borderRight: "1px solid #e2e8f0", padding: "12px 8px", overflowY: "auto" },
    sideBtn: (ativo, cor) => ({
      display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 12px", marginBottom: 4,
      background: ativo ? cor : "transparent", color: ativo ? "#fff" : "#1a3a5c",
      border: "none", borderRadius: 8, cursor: "pointer", fontSize: ".85rem", fontWeight: 600, textAlign: "left",
    }),
    content: { padding: "20px 24px", overflowY: "auto" },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: ".78rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 },
    card: (bg) => ({ background: bg, padding: "10px 14px", borderRadius: 8, fontSize: ".88rem" }),
    lista: { margin: 0, paddingLeft: 20, lineHeight: 1.6, fontSize: ".88rem", color: "#1a3a5c" },
    dica: { background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px", display: "flex", gap: 10, fontSize: ".82rem", color: "#78350f" },
    fluxoLinha: { display: "flex", alignItems: "center", gap: 10, padding: "8px 0", fontSize: ".85rem" },
    fluxoTag: { background: "#f1f5f9", color: "#1a3a5c", padding: "3px 10px", borderRadius: 999, fontSize: ".78rem", fontWeight: 700, whiteSpace: "nowrap" },
  };

  return (
    <div onClick={onClose} style={S.overlay}>
      <div onClick={e => e.stopPropagation()} style={S.modal}>
        <div style={S.header}>
          <h2 style={S.titulo}><HelpCircle size={22} color="#0891b2" /> POP — Como usar a Gestão de Pneus</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><X size={20} /></button>
        </div>

        <div style={S.body}>
          <div style={S.sidebar}>
            <button style={S.sideBtn(abaAtiva === "intro", "#0891b2")} onClick={() => setAbaAtiva("intro")}>
              <Info size={14} /> Introdução
            </button>
            <button style={S.sideBtn(abaAtiva === "fluxo", "#0891b2")} onClick={() => setAbaAtiva("fluxo")}>
              <ArrowRight size={14} /> Fluxo geral
            </button>
            <div style={{ borderTop: "1px solid #e2e8f0", margin: "8px 0" }} />
            {ABAS_POP.map(aba => {
              const Ico = aba.icon;
              return (
                <button key={aba.id} style={S.sideBtn(abaAtiva === aba.id, aba.cor)} onClick={() => setAbaAtiva(aba.id)}>
                  <Ico size={14} /> {aba.label}
                </button>
              );
            })}
          </div>

          <div style={S.content}>
            {abaAtiva === "intro" && (
              <>
                <h3 style={{ margin: "0 0 12px", color: "#1a3a5c" }}>O que é este módulo</h3>
                <p style={{ fontSize: ".9rem", color: "#475569", lineHeight: 1.6 }}>
                  A Gestão de Pneus controla o ciclo de vida completo de cada pneu da frota Pontual — da compra até o descarte, passando por uso, inspeção e recapagem.
                </p>
                <div style={{ ...S.card("#dbeafe"), marginTop: 16 }}>
                  <strong>Por que é importante?</strong><br />
                  Pneu é o 2º maior custo da operação (depois de combustível). Controlar bem economiza R$ 30-80 mil/ano numa frota de 37 caminhões.
                </div>
                <h3 style={{ margin: "20px 0 12px", color: "#1a3a5c" }}>Regra da Pontual</h3>
                <ul style={S.lista}>
                  <li>Cavalo trucado/traçado: 6 pneus (10 se dianteira dupla — raro)</li>
                  <li>Carreta simples: 8 pneus</li>
                  <li>Bitrem: 16 pneus (2 carretas)</li>
                  <li>Rodotrem: 20 pneus (rodotrem = 3 conjuntos)</li>
                  <li>Cada carcaça pode ser recapada até <strong>3 vezes</strong> (padrão Pontual)</li>
                </ul>
                <div style={{ ...S.dica, marginTop: 16 }}>
                  <Lightbulb size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>Comece pelo menu <strong>Fluxo geral</strong> pra entender a jornada. Depois clique em cada aba pra ver o passo a passo.</div>
                </div>
              </>
            )}

            {abaAtiva === "fluxo" && (
              <>
                <h3 style={{ margin: "0 0 12px", color: "#1a3a5c" }}>Ciclo de vida do pneu</h3>
                <p style={{ fontSize: ".88rem", color: "#475569", marginBottom: 16 }}>
                  Todo pneu passa por estas etapas. Cada seta significa uma AÇÃO que você faz no sistema.
                </p>
                <div style={S.card("#f8fafc")}>
                  {FLUXO_GERAL.map((f, i) => (
                    <div key={i} style={S.fluxoLinha}>
                      <span style={S.fluxoTag}>{f.de}</span>
                      <ArrowRight size={14} color="#94a3b8" />
                      <span style={{ ...S.fluxoTag, background: "#dbeafe", color: "#1d4ed8" }}>{f.para}</span>
                      <span style={{ fontSize: ".78rem", color: "#64748b" }}>{f.acao}</span>
                    </div>
                  ))}
                </div>
                <div style={{ ...S.dica, marginTop: 20 }}>
                  <Lightbulb size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>Os pneus estão TODOS conectados. Uma ação em uma aba reflete nas outras em tempo real. Não precisa cadastrar o mesmo pneu em vários lugares.</div>
                </div>
              </>
            )}

            {ABAS_POP.filter(a => a.id === abaAtiva).map(aba => {
              const Ico = aba.icon;
              return (
                <div key={aba.id}>
                  <h3 style={{ margin: "0 0 12px", color: aba.cor, display: "flex", alignItems: "center", gap: 8 }}>
                    <Ico size={22} /> {aba.label}
                  </h3>

                  <div style={S.section}>
                    <div style={S.sectionTitle}>Quando usar</div>
                    <div style={S.card(aba.bg)}>{aba.quando}</div>
                  </div>

                  <div style={S.section}>
                    <div style={S.sectionTitle}>Campos que aparecem</div>
                    <ul style={S.lista}>
                      {aba.campos.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>

                  <div style={S.section}>
                    <div style={S.sectionTitle}>Passo a passo</div>
                    <ol style={{ ...S.lista, paddingLeft: 24 }}>
                      {aba.passos.map((p, i) => (
                        <li key={i} style={{ marginBottom: 6 }}>{p}</li>
                      ))}
                    </ol>
                  </div>

                  <div style={S.dica}>
                    <Lightbulb size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div><strong>Dica prática:</strong> {aba.dica}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", fontSize: ".78rem", color: "#64748b", textAlign: "center" }}>
          POP salvo permanentemente — abra sempre que precisar ({new Date().toLocaleDateString("pt-BR")})
        </div>
      </div>
    </div>
  );
}
