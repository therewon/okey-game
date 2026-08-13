import {
  onAuthStateChanged,
  signInAnonymously,
  type User,
} from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { auth } from "../firebase/firebase";

interface AuthContextValue {
  user: User | null;
  ready: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setReady(true);
        return;
      }
      try {
        await signInAnonymously(auth);
      } catch {
        setError("Oyun xidmətinə qoşulmaq mümkün olmadı.");
        setReady(true);
      }
    });
    return unsubscribe;
  }, []);

  const value = useMemo(() => ({ user, ready, error }), [user, ready, error]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
