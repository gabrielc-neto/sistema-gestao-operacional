// Hook utilitário para uma única permissão.
//
// Uso:
//   const podeEditar = usePermissao("cargos.editar");
//   if (podeEditar) { ... }

import { useRBAC } from "./RBACContext";

export function usePermissao(nome) {
  const { temPermissao } = useRBAC();
  return temPermissao(nome);
}
