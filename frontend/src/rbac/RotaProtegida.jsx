// Guarda de rota por permissão. Redireciona quem não tem acesso.
//
// Uso no App.jsx:
//   <Route path="/usuarios" element={
//     <PrivateRoute>
//       <RotaProtegida permissao="usuarios.ver">
//         <Usuarios />
//       </RotaProtegida>
//     </PrivateRoute>
//   } />

import { Navigate } from "react-router-dom";
import { useRBAC } from "./RBACContext";

export default function RotaProtegida({
  permissao,
  algumaDe,
  todasDe,
  redirecionarPara = "/dashboard",
  children,
}) {
  const { temPermissao, temAlguma, temTodas, loading } = useRBAC();

  if (loading) {
    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f0f4f8" }}>
        <div style={{ color:"#1a3a5c", fontWeight:700, fontSize:"1rem", fontFamily:"system-ui" }}>Carregando...</div>
      </div>
    );
  }

  let permitido = false;
  if (permissao)     permitido = temPermissao(permissao);
  else if (algumaDe) permitido = temAlguma(algumaDe);
  else if (todasDe)  permitido = temTodas(todasDe);
  else               permitido = true;

  if (!permitido) return <Navigate to={redirecionarPara} replace />;
  return children;
}
