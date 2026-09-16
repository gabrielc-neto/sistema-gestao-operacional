// RBAC: contexto de permissões granulares.
//
// Modelo:
//   Usuário → Setor → Cargo → Permissões
//
// Carrega no login:
//   - usuario.setor   (do doc /setores/{setor_id})
//   - usuario.cargo   (do doc /cargos/{cargo_id})
//   - usuario.permissoes  (array no doc do cargo, denormalizado)
//
// Super Admin (is_super_admin = true) ignora qualquer validação.
//
// API pública:
//   const { temPermissao, temAlguma, temTodas, setor, cargo, permissoes, isSuperAdmin } = useRBAC();
//   if (temPermissao("cargos.editar")) { ... }

import { createContext, useContext, useEffect, useState } from "react";
import { get as dsGet } from "../services/genericDataSource";
import { useAuth } from "../contexts/AuthContext";

const RBACContext = createContext({
  setor: null,
  cargo: null,
  permissoes: [],
  isSuperAdmin: false,
  menuRestrito: false,
  loading: true,
  temPermissao: () => false,
  temAlguma: () => false,
  temTodas: () => false,
});

export function RBACProvider({ children }) {
  const { user, profile } = useAuth();
  const [setor, setSetor]           = useState(null);
  const [cargo, setCargo]           = useState(null);
  const [permissoes, setPermissoes] = useState([]);
  const [loading, setLoading]       = useState(true);

  const isSuperAdmin = !!profile?.is_super_admin
    // compatibilidade com sistema legado: master/admin ganham super admin temporariamente
    || ["master", "admin"].includes(profile?.role);

  // deps granulares (user.uid, profile.setor_id, etc) evitam re-runs desnecessários quando outras props do profile mudam
  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      if (!user || !profile) {
        if (!cancelado) {
          setSetor(null); setCargo(null); setPermissoes([]); setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const setorId = profile.setor_id;
        const cargoId = profile.cargo_id;

        const [setorData, cargoData] = await Promise.all([
          setorId ? dsGet("setores", setorId).catch(() => null) : Promise.resolve(null),
          cargoId ? dsGet("cargos",  cargoId).catch(() => null) : Promise.resolve(null),
        ]);

        if (cancelado) return;

        const perms = Array.isArray(cargoData?.permissoes) ? cargoData.permissoes : [];

        setSetor(setorData);
        setCargo(cargoData);
        setPermissoes(perms);
      } catch (e) {
        // falha de leitura não trava login — fica sem permissão
        console.error("[RBAC] erro carregando setor/cargo:", e);
        if (!cancelado) {
          setSetor(null); setCargo(null); setPermissoes([]);
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    }

    carregar();
    return () => { cancelado = true; };
  }, [user?.uid, profile?.setor_id, profile?.cargo_id, profile?.is_super_admin, profile?.role]);

  function temPermissao(nome) {
    if (isSuperAdmin) return true;
    if (!nome) return false;
    return permissoes.includes(nome);
  }

  function temAlguma(lista) {
    if (isSuperAdmin) return true;
    if (!Array.isArray(lista) || lista.length === 0) return false;
    return lista.some(p => permissoes.includes(p));
  }

  function temTodas(lista) {
    if (isSuperAdmin) return true;
    if (!Array.isArray(lista) || lista.length === 0) return false;
    return lista.every(p => permissoes.includes(p));
  }

  const menuRestrito = !isSuperAdmin && !!cargo?.menu_restrito;

  const value = {
    setor, cargo, permissoes, isSuperAdmin, menuRestrito, loading,
    temPermissao, temAlguma, temTodas,
  };

  return <RBACContext.Provider value={value}>{children}</RBACContext.Provider>;
}

export const useRBAC = () => useContext(RBACContext);
