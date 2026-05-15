import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const snap = await getDoc(doc(db, "usuarios", firebaseUser.uid));
          setUser(firebaseUser);
          setProfile(snap.exists() ? snap.data() : {});
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch {
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const login  = (email, senha) => signInWithEmailAndPassword(auth, email, senha);
  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
