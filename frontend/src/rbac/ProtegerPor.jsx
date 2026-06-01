// Guarda declarativa por permissão.
//
// Uso:
//   <ProtegerPor permissao="cargos.editar">
//     <BotaoEditar />
//   </ProtegerPor>
//
//   <ProtegerPor algumaDe={["financeiro.ver","financeiro.editar"]}>
//     <MenuFinanceiro />
//   </ProtegerPor>
//
//   <ProtegerPor permissao="usuarios.criar" fallback={<p>Sem acesso</p>}>
//     <FormNovoUsuario />
//   </ProtegerPor>

import { useRBAC } from "./RBACContext";

export default function ProtegerPor({
  permissao,
  algumaDe,
  todasDe,
  fallback = null,
  children,
}) {
  const { temPermissao, temAlguma, temTodas, loading } = useRBAC();

  if (loading) return null;

  let permitido;
  if (permissao)        permitido = temPermissao(permissao);
  else if (algumaDe)    permitido = temAlguma(algumaDe);
  else if (todasDe)     permitido = temTodas(todasDe);
  else                  permitido = true;

  return permitido ? children : fallback;
}
