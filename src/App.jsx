import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { PermissionsProvider } from "./contexts/PermissionsContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Login from "./pages/Login";

const Dashboard   = lazy(() => import("./pages/Dashboard"));
const Frota       = lazy(() => import("./pages/Frota"));
const Motoristas  = lazy(() => import("./pages/Motoristas"));
const Atrelamento = lazy(() => import("./pages/Atrelamento"));
const OC          = lazy(() => import("./pages/OC"));
const Manutencao  = lazy(() => import("./pages/Manutencao"));
const Historico   = lazy(() => import("./pages/Historico"));
const Permissoes  = lazy(() => import("./pages/Permissoes"));
const Ferias      = lazy(() => import("./pages/Ferias"));
const Usuarios    = lazy(() => import("./pages/Usuarios"));
const ImportAdmin = lazy(() => import("./pages/ImportAdmin"));

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

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PermissionsProvider>
          <BrowserRouter>
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/"            element={<PublicRoute><Login /></PublicRoute>} />
                <Route path="/dashboard"   element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="/frota"       element={<PrivateRoute><Frota /></PrivateRoute>} />
                <Route path="/motoristas"  element={<PrivateRoute><Motoristas /></PrivateRoute>} />
                <Route path="/atrelamento" element={<PrivateRoute><Atrelamento /></PrivateRoute>} />
                <Route path="/oc"          element={<PrivateRoute><OC /></PrivateRoute>} />
                <Route path="/manutencao"  element={<PrivateRoute><Manutencao /></PrivateRoute>} />
                <Route path="/historico"   element={<PrivateRoute><Historico /></PrivateRoute>} />
                <Route path="/permissoes"  element={<PrivateRoute><Permissoes /></PrivateRoute>} />
                <Route path="/ferias"      element={<PrivateRoute><Ferias /></PrivateRoute>} />
                <Route path="/usuarios"    element={<PrivateRoute><Usuarios /></PrivateRoute>} />
                <Route path="/import"      element={<PrivateRoute><ImportAdmin /></PrivateRoute>} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </PermissionsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
