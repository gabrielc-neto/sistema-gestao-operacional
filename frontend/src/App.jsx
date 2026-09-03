import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { PermissionsProvider } from "./contexts/PermissionsContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { RBACProvider } from "./rbac/RBACContext";
import RotaProtegida from "./rbac/RotaProtegida";
import Layout from "./components/Layout";
import InstallPWA from "./components/InstallPWA";
// Telas públicas da intranet: eager, como era a antiga Login. São a porta de
// entrada, e o lazy inseriria o fallback do Suspense no meio da animação de
// saída de /acesso.
import Acesso from "./pages/Acesso";
import Sistemas from "./pages/Sistemas";
// Login direto do Sistema de Gestão Operacional (porta de entrada principal).
import LoginSGO from "./pages/LoginSGO";

const Dashboard   = lazy(() => import("./pages/Dashboard"));
const Frota       = lazy(() => import("./pages/Frota"));
const Motoristas  = lazy(() => import("./pages/Motoristas"));
const Atrelamento = lazy(() => import("./pages/Atrelamento"));
const OC          = lazy(() => import("./pages/OC"));
const Manutencao  = lazy(() => import("./pages/Manutencao"));
const Compras     = lazy(() => import("./pages/Compras"));
const PropostaConvite = lazy(() => import("./pages/PropostaConvite"));
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
// Configurar a intranet deixou de ser assunto do Gestão Operacional: virou o
// painel em /intranet, dentro do próprio portal, com login de administrador.
const IntranetArea= lazy(() => import("./pages/IntranetArea"));
// Certificados: validação aberta na frente, emissão atrás de login (a própria
// página cuida das duas portas).
const Certificado = lazy(() => import("./pages/Certificado"));

const Loading = () => (
  <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16, background:"var(--bg)" }}>
    <div style={{ width:34, height:34, borderRadius:"50%", border:"3px solid var(--border)", borderTopColor:"var(--accent)", animation:"spin 0.7s linear infinite" }} />
    <div style={{ color:"var(--text-muted)", fontWeight:600, fontSize:".9rem", fontFamily:"var(--font)" }}>Carregando…</div>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

function PrivateRoute({ children }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/" replace />;
  if (profile && profile.ativo === false) return <Navigate to="/" replace />;
  return children;
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

// Layout wrapper para rotas autenticadas — inclui sidebar + bottom nav
function LayoutPrivado({ children }) {
  return (
    <PrivateRoute>
      <Layout>{children}</Layout>
    </PrivateRoute>
  );
}

function LayoutPrivada({ permissao, algumaDe, children }) {
  return (
    <PrivateRoute>
      <RotaProtegida permissao={permissao} algumaDe={algumaDe}>
        <Layout>{children}</Layout>
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
                  {/* ─── Rotas públicas (SEM layout) ──────────────────────── */}
                  <Route path="/"              element={<LoginSGO />} />
                  <Route path="/acesso"        element={<Acesso />} />
                  <Route path="/sistemas"      element={<Sistemas />} />
                  <Route path="/proposta-convite/:id" element={<PropostaConvite />} />
                  <Route path="/certificado"           element={<Certificado />} />
                  <Route path="/certificado/:codigo"   element={<Certificado />} />
                  <Route path="/intranet"       element={<IntranetArea />} />

                  {/* ─── Rotas autenticadas (COM layout sidebar + bottom nav) ── */}
                  <Route path="/dashboard"     element={<LayoutPrivado><Dashboard /></LayoutPrivado>} />

                  {/* Módulos operacionais */}
                  <Route path="/frota"         element={<LayoutPrivada permissao="frota.ver"><Frota /></LayoutPrivada>} />
                  <Route path="/motoristas"    element={<LayoutPrivada permissao="motoristas.ver"><Motoristas /></LayoutPrivada>} />
                  <Route path="/atrelamento"   element={<LayoutPrivada permissao="atrelamento.ver"><Atrelamento /></LayoutPrivada>} />
                  <Route path="/oc"            element={<LayoutPrivada permissao="oc.ver"><OC /></LayoutPrivada>} />
                  <Route path="/manutencao"    element={<LayoutPrivada permissao="manutencao.ver"><Manutencao /></LayoutPrivada>} />
                  <Route path="/compras"       element={<LayoutPrivada permissao="compras.ver"><Compras /></LayoutPrivada>} />
                  <Route path="/abastecimento" element={<LayoutPrivado><Abastecimento /></LayoutPrivado>} />
                  <Route path="/pneus"         element={<LayoutPrivada permissao="pneus.ver"><Pneus /></LayoutPrivada>} />
                  <Route path="/pneus/:id"     element={<LayoutPrivada permissao="pneus.ver"><FichaPneu /></LayoutPrivada>} />
                  <Route path="/historico"     element={<LayoutPrivada permissao="historico.ver"><Historico /></LayoutPrivada>} />
                  <Route path="/ferias"        element={<LayoutPrivada permissao="ferias.ver"><Ferias /></LayoutPrivada>} />
                  <Route path="/rastreamento"  element={<LayoutPrivado><Rastreamento /></LayoutPrivado>} />
                  <Route path="/cercas"        element={<LayoutPrivado><Cercas /></LayoutPrivado>} />
                  <Route path="/jornada"       element={<LayoutPrivado><Jornada /></LayoutPrivado>} />

                  {/* Administração */}
                  <Route path="/usuarios"      element={<LayoutPrivada permissao="usuarios.ver"><Usuarios /></LayoutPrivada>} />
                  <Route path="/admin/setores" element={<LayoutPrivada permissao="setores.ver"><Setores /></LayoutPrivada>} />
                  <Route path="/admin/cargos"  element={<LayoutPrivada permissao="cargos.ver"><Cargos /></LayoutPrivada>} />
                  <Route path="/permissoes"    element={<LayoutPrivada permissao="permissoes.ver"><Permissoes /></LayoutPrivada>} />
                  <Route path="/import"        element={<LayoutPrivado><ImportAdmin /></LayoutPrivado>} />
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
