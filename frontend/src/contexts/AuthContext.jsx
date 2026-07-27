import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getAuth as getFirebaseAuth } from "firebase/auth";
import app, { db } from "../firebase/config";
import {
  login as vpsLogin,
  logout as vpsLogout,
  onAuthChange as vpsOnChange,
  refreshUser as vpsRefresh,
  getCurrentUser as vpsCurrent,
} from "../services/authVPS";
import { get as dsGet } from "../services/genericDataSource";

// Migração 2026-07-23: Firebase Auth eliminado. JWT próprio (VPS) sempre.
const USE_VPS_AUTH = true;

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (USE_VPS_AUTH) {
      // Modo VPS Auth JWT
      const unsub = vpsOnChange(async (u) => {
        if (u) {
          setUser(u);
          // Perfil vem do próprio JWT + tabela documents.usuarios se existir
          try {
            const perfilExtra = await dsGet("usuarios", u.uid || u.id);
            setProfile({ ...u, ...(perfilExtra || {}) });
          } catch {
            setProfile(u);
          }
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      });
      // Ao montar, tenta refresh do token (se ainda válido)
      vpsRefresh().catch(() => {});
      return unsub;
    }

    // Modo Firebase Auth (legado)
    const firebaseAuth = getFirebaseAuth(app);
    const unsub = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const snap = await getDoc(doc(db, "usuarios", firebaseUser.uid));
          setProfile(snap.exists() ? snap.data() : {});
        } catch {
          setProfile({});
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async (email, senha) => {
    if (USE_VPS_AUTH) return await vpsLogin(email, senha);
    const firebaseAuth = getFirebaseAuth(app);
    return await signInWithEmailAndPassword(firebaseAuth, email, senha);
  };

  const logout = async () => {
    if (USE_VPS_AUTH) return await vpsLogout();
    const firebaseAuth = getFirebaseAuth(app);
    return await signOut(firebaseAuth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
