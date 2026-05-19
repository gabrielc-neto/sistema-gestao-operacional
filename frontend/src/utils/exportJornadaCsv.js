// Exporta jornada como CSV (BOM UTF-8 + separador ; pra abrir direto no Excel-PT)

function csvField(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  // Se contém ; " ou quebra de linha, envolve em aspas e escapa aspas duplicando
  if (/[;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// SASCAR retorna timestamps em BRT (horário local Brasília), não UTC.
// Confirmado em 2026-05-19 com Wesley olhando hora real do login do motorista no tablet.
function fmtDataBR(iso) {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!m) return iso;
  return m[4] ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : `${m[3]}/${m[2]}/${m[1]}`;
}

export function exportarJornadaCsv({ linhas, dataInicio, dataFim, ehPeriodo }) {
  const headers = ehPeriodo
    ? ["Motorista", "ID", "Placas", "Dias", "Total", "Dirigindo", "Refeição", "Pausa", "Extra 50%", "Extra 100%", "Infrações"]
    : ["Motorista", "ID", "Placas", "Tipo dia", "Início", "Fim", "Total", "Dirigindo", "Refeição", "Pausa", "Extra 50%", "Extra 100%", "Direção contínua máx", "Infrações"];

  const rows = linhas.map(j => {
    const infrTxt = j.infracoes.length === 0 ? "OK"
      : j.infracoes.map(i => `[${i.tipo}] ${i.descricao}${i.data ? ' em ' + fmtDataBR(i.data) : ''}`).join(" | ");
    const base = [
      j.nomeMotorista,
      j.idMotorista,
      j.placas.join(", "),
    ];
    if (ehPeriodo) {
      base.push(j.dias, j.totalAtivo, j.dirigindo, j.refeicao, j.pausa, j.extra50, j.extra100, infrTxt);
    } else {
      const tipoLbl = j.tipoDia === 'domingo' ? 'Domingo' : j.tipoDia === 'sabado' ? 'Sábado' : 'Semana';
      base.push(tipoLbl, fmtDataBR(j.inicio), fmtDataBR(j.fim), j.totalAtivo, j.dirigindo, j.refeicao, j.pausa, j.extra50, j.extra100, j.direcaoContinuaMaxima, infrTxt);
    }
    return base;
  });

  const csv = [headers, ...rows].map(r => r.map(csvField).join(";")).join("\r\n");
  // BOM UTF-8 pro Excel-PT reconhecer acentos
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const sufixo = dataInicio === dataFim ? dataInicio : `${dataInicio}_a_${dataFim}`;
  a.download = `jornada_${sufixo}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
