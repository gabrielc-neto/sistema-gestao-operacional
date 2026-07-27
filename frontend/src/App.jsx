import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { PermissionsProvider } from "./contexts/PermissionsContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { RBACProvider } from "./rbac/RBACContext";
import RotaProtegida from "./rbac/RotaProtegida";
// Telas públicas da intranet: eager, como a antiga Login. São a porta de entrada,
// e o lazy inseriria o fallback do Suspense no meio da animação de saída de /acesso.
import Acesso from "./pages/Acesso";
import Sistemas from "./pages/Sistemas";

const Dashboard   = lazy(() => import("./pages/Dashboard"));
const Frota       = lazy(() => import("./pages/Frota"));
const Motoristas  = lazy(() => import("./pages/Motoristas"));
const Atrelamento = lazy(() => import("./pages/Atrelamento"));
const OC          = lazy(() => import("./pages/OC"));
const Manutencao  = lazy(() => import("./pages/Manutencao"));
const Compras     = lazy(() => import("./pages/Compras"));
const PropostaConvite = lazy(() => import("./pages/PropostaConvite"));
const Historico   = lazy(() => import("./pages/Historico"));
const Permissoes  = lazy(() => import("./pages/Permissoes"));
const Ferias      = lazy(() => import("./pages/Ferias"));
const Rastreamento= lazy(() => import("./pages/Rastreamento"));
const Cercas      = lazy(() => import("./pages/Cercas"));
const Jornada     = lazy(() => import("./pages/Jornada"));
const Usuarios    = lazy(() => import("./pages/Usuarios"));
const ImportAdmin = lazy(() => import("./pages/ImportAdmin"));
const Setores     = lazy(() => import("./pages/admin/Setores"));
const Cargos      = lazy(() => import("./pages/admin/Cargos"));
// Configurar a intranet deixou de ser assunto do Gestão Operacional: virou o
// painel em /intranet, dentro do próprio portal, com acesso por palavra-chave.
const IntranetArea= lazy(() => import("./pages/IntranetArea"));
// Validação pública de certificados. Sem login e sem palavra-chave: quem confere
// está fora da empresa (ver o cabeçalho da página).
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

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RBACProvider>
          <PermissionsProvider>
            <BrowserRouter>
              <Suspense fallback={<Loading />}>
                <Routes>
                  {/* Intranet pública, em duas páginas: /acesso é a porta de entrada
                      (splash + anel de ícones) e /sistemas lista os sistemas e trata o
                      que vem depois deles. A raiz só encaminha para a porta de entrada.

                      Estas rotas NÃO usam PublicRoute de propósito. O portal é o hub de 12
                      sistemas, a maioria sem relação com o SGO — estar logado no SGO não pode
                      impedir de voltar aqui para abrir o Service Desk ou o Canal de Integridade.
                      Envolvê-las em PublicRoute prendia o usuário logado num laço: voltar ao
                      portal era interceptado e devolvido ao /dashboard. Quem redireciona para o
                      /dashboard depois de autenticar é a própria Sistemas.jsx, na tela de login. */}
                  <Route path="/"            element={<Navigate to="/acesso" replace />} />
                  <Route path="/acesso"      element={<Acesso />} />
                  <Route path="/sistemas"    element={<Sistemas />} />

                  {/* Convite público a UMA proposta (sem login, via token no link) */}
                  <Route path="/proposta-convite/:id" element={<PropostaConvite />} />

                  {/* Validação de certificado — aberta a qualquer um, de fora da
                      empresa inclusive. Duas formas: a tela com o campo de código,
                      e o link direto (QR impresso no documento), que já consulta. */}
                  <Route path="/certificado"         element={<Certificado />} />
                  <Route path="/certificado/:codigo" element={<Certificado />} />

                  {/* Área interna da Intranet — acesso liberado pelo portão (rede + palavra-chave),
                      sem login Firebase. A própria página valida a flag de sessão do portão. */}
                  <Route path="/intranet" element={<IntranetArea />} />

                  {/* Dashboard sempre acessível para usuário logado */}
                  <Route path="/dashboard"   element={<PrivateRoute><Dashboard /></PrivateRoute>} />

                  {/* Módulos operacionais */}
                  <Route path="/frota"       element={<Privada permissao="frota.ver"><Frota /></Privada>} />
                  <Route path="/motoristas"  element={<Privada permissao="motoristas.ver"><Motoristas /></Privada>} />
                  <Route path="/atrelamento" element={<Privada permissao="atrelamento.ver"><Atrelamento /></Privada>} />
                  <Route path="/oc"          element={<Privada permissao="oc.ver"><OC /></Privada>} />
                  <Route path="/manutencao"  element={<Privada permissao="manutencao.ver"><Manutencao /></Privada>} />
                  <Route path="/compras"     element={<Privada permissao="compras.ver"><Compras /></Privada>} />
                  <Route path="/historico"   element={<Privada permissao="historico.ver"><Historico /></Privada>} />
                  <Route path="/ferias"      element={<Privada permissao="ferias.ver"><Ferias /></Privada>} />
                  <Route path="/rastreamento" element={<PrivateRoute><Rastreamento /></PrivateRoute>} />
                  <Route path="/cercas"       element={<PrivateRoute><Cercas /></PrivateRoute>} />
                  <Route path="/jornada"      element={<PrivateRoute><Jornada /></PrivateRoute>} />

                  {/* Administração */}
                  <Route path="/usuarios"        element={<Privada permissao="usuarios.ver"><Usuarios /></Privada>} />
                  <Route path="/admin/setores"   element={<Privada permissao="setores.ver"><Setores /></Privada>} />
                  <Route path="/admin/cargos"    element={<Privada permissao="cargos.ver"><Cargos /></Privada>} />
                  <Route path="/permissoes"      element={<Privada permissao="permissoes.ver"><Permissoes /></Privada>} />
                  <Route path="/import"          element={<PrivateRoute><ImportAdmin /></PrivateRoute>} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </PermissionsProvider>
        </RBACProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
