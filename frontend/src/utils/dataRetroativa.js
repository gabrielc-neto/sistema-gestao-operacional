// Resolve data/hora final para lançamentos/OS com opção de data retroativa.
// - dataRetroativa vazia/inválida/futura → agora
// - válida (<= hoje) → combina com hora corrente e devolve ISO UTC
export function resolverDataHora(dataRetroativa, agora) {
  if (!dataRetroativa) return agora.toISOString();
  const hojeYmd = agora.toISOString().slice(0, 10);
  if (dataRetroativa > hojeYmd) return agora.toISOString();
  const hhmmss = agora.toTimeString().slice(0, 8);
  const dt = new Date(`${dataRetroativa}T${hhmmss}`);
  return Number.isNaN(dt.getTime()) ? agora.toISOString() : dt.toISOString();
}
