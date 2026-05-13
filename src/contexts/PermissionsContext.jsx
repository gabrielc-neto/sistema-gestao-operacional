import { createContext, useContext, useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "./AuthContext";

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

const ADMIN_ROLES = ["master", "admin"];

const PermissionsContext = createContext({});

export function PermissionsProvider({ children }) {
  const { profile } = useAuth();
  const [perms, setPerms]   = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getDoc(doc(db, "config", "permissions"))
      .then(snap => setPerms(snap.exists() ? snap.data() : {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profile?.role]);

  const role    = profile?.role || "visualizador";
  const isAdmin = ADMIN_ROLES.includes(role);

  function canView(module) {
    if (isAdmin) return true;
    const lvl = perms[role]?.[module];
    return lvl === "view" || lvl === "edit";
  }

  function canEdit(module) {
    if (isAdmin) return true;
    return perms[role]?.[module] === "edit";
  }

  async function savePerms(newPerms) {
    await setDoc(doc(db, "config", "permissions"), newPerms);
    setPerms(newPerms);
  }

  return (
    <PermissionsContext.Provider value={{ perms, loading, canView, canEdit, savePerms, isAdmin }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export const usePermissions = () => useContext(PermissionsContext);
