// PermissionsContext — wrapper LEGACY mantido para não quebrar telas existentes
// (ex: pages/Permissoes.jsx ainda usa MODULES/ROLES e canView/canEdit).
//
// A fonte de verdade do RBAC novo é `rbac/RBACContext.jsx`.
// Esta camada apenas converte:
//   - "canView('frota')"  → temPermissao('frota.ver')
//   - "canEdit('frota')"  → temPermissao('frota.editar')
//
// As constantes MODULES e ROLES seguem disponíveis para a tela legacy
// `pages/Permissoes.jsx` (matriz simples role × módulo). Quando essa tela for
// migrada para o novo CRUD de Cargos, este arquivo pode ser removido.

import { createContext, useContext, useEffect, useState } from "react";
import { get as dsGet, save as dsSave } from "../services/genericDataSource";
import { useAuth } from "./AuthContext";
import { useRBAC } from "../rbac/RBACContext";

export const MODULES = [
  { id: "frota",       label: "Frota" },
  { id: "motoristas",  label: "Motoristas" },
  { id: "atrelamento", label: "Atrelamento" },
  { id: "oc",          label: "Ordens de Carregamento" },
  { id: "manutencao",  label: "Manutenção" },
  { id: "historico",   label: "Histórico" },
  { id: "ferias",      label: "Férias" },
];

export const ROLES = [
  { id: "diretor",         label: "Diretor" },
  { id: "superintendente", label: "Superintendente" },
  { id: "gestao",          label: "Gestão" },
  { id: "logistica",       label: "Logística" },
  { id: "comercial",       label: "Comercial" },
  { id: "faturamento",     label: "Faturamento" },
  { id: "rh",              label: "RH" },
  { id: "motorista",       label: "Motorista" },
];

const PermissionsContext = createContext({});

export function PermissionsProvider({ children }) {
  const { profile } = useAuth();
  const { temPermissao, isSuperAdmin } = useRBAC();
  const [perms, setPerms]     = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    dsGet("config", "permissions")
      .then(data => setPerms(data || {}))
      .catch(e => console.warn("[PermissionsContext] falha ao ler config/permissions:", e.message))
      .finally(() => setLoading(false));
  }, [profile?.role]);

  // canView/canEdit agora consultam o RBAC novo.
  // Fallback: se o RBAC novo não tem a permissão E é admin legacy, ainda aceita.
  function canView(module) {
    if (isSuperAdmin) return true;
    if (temPermissao(`${module}.ver`)) return true;
    // Fallback legado: matriz role → módulo
    const lvl = perms[profile?.role]?.[module];
    return lvl === "view" || lvl === "edit";
  }

  function canEdit(module) {
    if (isSuperAdmin) return true;
    if (temPermissao(`${module}.editar`)) return true;
    return perms[profile?.role]?.[module] === "edit";
  }

  async function savePerms(newPerms) {
    await dsSave("config", "permissions", newPerms);
    setPerms(newPerms);
  }

  return (
    <PermissionsContext.Provider value={{ perms, loading, canView, canEdit, savePerms, isAdmin: isSuperAdmin }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export const usePermissions = () => useContext(PermissionsContext);
