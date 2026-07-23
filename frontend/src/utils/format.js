// Helpers de formatação compartilhados entre páginas.
// Antes duplicados em Jornada, Rastreamento, MapaFrota e exportJornadaPdf.

// Formato padrão pra registrar QUEM fez uma ação: NOME.PONTUAL
// Ex: THIAGO.PONTUAL, ROSILDA.PONTUAL, WESLEY.PONTUAL
// Usar em criadoPor/atualizadoPor/finalizadoPor/bloqueadoPor/etc
// Regra permanente Rosilda 2026-07-23.
export function usuarioPontual(profile) {
  const nome = profile?.nome || profile?.displayName || profile?.email || "";
  const primeira = String(nome).trim().split(/[\s@.]+/)[0];
  if (!primeira) return "USUARIO.PONTUAL";
  return `${primeira.toUpperCase()}.PONTUAL`;
}

export function capitalizarNome(nome) {
  if (!nome) return "";
  return nome.trim().toLowerCase()
    .split(/\s+/)
    .map(w => w.length <= 2 ? w : w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function tempoDecorrido(iso) {
  if (!iso) return "—";
  const t = new Date(iso.replace("T", " "));
  if (!Number.isFinite(t.getTime())) return iso;
  const ms = Date.now() - t.getTime();
  if (ms < 0) return "agora";
  const min = Math.floor(ms / 60000);
  if (min < 1)   return "agora";
  if (min < 60)  return `${min} min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24)    return `${h}h atrás`;
  const d = Math.floor(h / 24);
  return `${d}d atrás`;
}
