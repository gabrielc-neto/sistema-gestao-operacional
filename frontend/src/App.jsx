import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { PermissionsProvider } from "./contexts/PermissionsContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { RBACProvider } from "./rbac/RBACContext";
import RotaProtegida from "./rbac/RotaProtegida";
import Login from "./pages/Login";
import InstallPWA from "./components/InstallPWA";

const Dashboard   = lazy(() => import("./pages/Dashboard"));
const Frota       = lazy(() => import("./pages/Frota"));
const Motoristas  = lazy(() => import("./pages/Motoristas"));
const Atrelamento = lazy(() => import("./pages/Atrelamento"));
const OC          = lazy(() => import("./pages/OC"));
const Manutencao  = lazy(() => import("./pages/Manutencao"));
const Pneus       = lazy(() => import("./pages/Pneus"));
const FichaPneu   = lazy(() => import("./pages/FichaPneu"));
const Historico   = lazy(() => import("./pages/Historico"));
const Permissoes  = lazy(() => import("./pages/Permissoes"));
const Ferias      = lazy(() => import("./pages/Ferias"));
const Rastreamento= lazy(() => import("./pages/Rastreamento"));
const Cercas      = lazy(() => import("./pages/Cercas"));
const Jornada     = lazy(() => import("./pages/Jornada"));
const Usuarios    = lazy(() => import("./pages/Usuarios"));
const Abastecimento = lazy(() => import("./pages/Abastecimento"));
const ImportAdmin = lazy(() => import("./pages/ImportAdmin"));
const Setores     = lazy(() => import("./pages/admin/Setores"));
const Cargos      = lazy(() => import("./pages/admin/Cargos"));
const Compras            = lazy(() => import("./pages/Compras"));
const Contratos          = lazy(() => import("./pages/Contratos"));
const ContratoDetalhe    = lazy(() => import("./pages/ContratoDetalhe"));
const Viagens            = lazy(() => import("./pages/Viagens"));
const IntranetArea       = lazy(() => import("./pages/IntranetArea"));
const ConfiguracoesIntranet = lazy(() => import("./pages/admin/ConfiguracoesIntranet"));
const PropostaConvite    = lazy(() => import("./pages/PropostaConvite"));

const Loading = () => (
  <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f0f4f8" }}>
    <div style={{ color:"#1a3a5c", fontWeight:700, fontSize:"1rem", fontFamily:"system-ui" }}>Carregando...</div>
  </div>
);

function PrivateRoute({ children }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/" replace />;
  if (profile && profile.ativo === false) return <Navigate to="/" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

// Helper para condensar PrivateRoute + RotaProtegida.
function Privada({ permissao, algumaDe, children }) {
  return (
    <PrivateRoute>
      <RotaProtegida permissao={permissao} algumaDe={algumaDe}>
        {children}
      </RotaProtegida>
    </PrivateRoute>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RBACProvider>
          <PermissionsProvider>
            <BrowserRouter>
              <Suspense fallback={<Loading />}>
                <Routes>
                  <Route path="/"            element={<PublicRoute><Login /></PublicRoute>} />
                  <Route path="/proposta-convite/:id" element={<PropostaConvite />} />

                  {/* Dashboard sempre acessível para usuário logado */}
                  <Route path="/dashboard"   element={<PrivateRoute><Dashboard /></PrivateRoute>} />

                  {/* Módulos operacionais */}
                  <Route path="/frota"       element={<Privada permissao="frota.ver"><Frota /></Privada>} />
                  <Route path="/motoristas"  element={<Privada permissao="motoristas.ver"><Motoristas /></Privada>} />
                  <Route path="/atrelamento" element={<Privada permissao="atrelamento.ver"><Atrelamento /></Privada>} />
                  <Route path="/oc"          element={<Privada permissao="oc.ver"><OC /></Privada>} />
                  <Route path="/manutencao"  element={<Privada permissao="manutencao.ver"><Manutencao /></Privada>} />
                  <Route path="/compras"     element={<Privada permissao="compras.ver"><Compras /></Privada>} />
                  {/* Contratos + Viagens ocultos temporariamente (2026-08-10) — módulo em desenvolvimento */}
                  {/* <Route path="/contratos"    element={<Privada permissao="contratos.ver"><Contratos /></Privada>} /> */}
                  {/* <Route path="/contratos/:id" element={<Privada permissao="contratos.ver"><ContratoDetalhe /></Privada>} /> */}
                  {/* <Route path="/viagens"     element={<Privada permissao="viagens.ver"><Viagens /></Privada>} /> */}
                  <Route path="/intranet"    element={<Privada permissao="intranet.ver"><IntranetArea /></Privada>} />
                  <Route path="/abastecimento" element={<PrivateRoute><Abastecimento /></PrivateRoute>} />
                  <Route path="/pneus"       element={<Privada permissao="pneus.ver"><Pneus /></Privada>} />
                  <Route path="/pneus/:id"   element={<Privada permissao="pneus.ver"><FichaPneu /></Privada>} />
                  <Route path="/historico"   element={<Privada permissao="historico.ver"><Historico /></Privada>} />
                  <Route path="/ferias"      element={<Privada permissao="ferias.ver"><Ferias /></Privada>} />
                  <Route path="/rastreamento" element={<PrivateRoute><Rastreamento /></PrivateRoute>} />
                  <Route path="/cercas"       element={<PrivateRoute><Cercas /></PrivateRoute>} />
                  <Route path="/jornada"      element={<PrivateRoute><Jornada /></PrivateRoute>} />

                  {/* Administração */}
                  <Route path="/usuarios"        element={<Privada permissao="usuarios.ver"><Usuarios /></Privada>} />
                  <Route path="/admin/setores"   element={<Privada permissao="setores.ver"><Setores /></Privada>} />
                  <Route path="/admin/cargos"    element={<Privada permissao="cargos.ver"><Cargos /></Privada>} />
                  <Route path="/admin/intranet"  element={<Privada permissao="intranet.configurar"><ConfiguracoesIntranet /></Privada>} />
                  <Route path="/permissoes"      element={<Privada permissao="permissoes.ver"><Permissoes /></Privada>} />
                  <Route path="/import"          element={<PrivateRoute><ImportAdmin /></PrivateRoute>} />
                </Routes>
              </Suspense>
              <InstallPWA />
            </BrowserRouter>
          </PermissionsProvider>
        </RBACProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
