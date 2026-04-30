"use client";

import * as React from "react";
import {
  signInAnonymously,
  onAuthStateChanged,
  type User,
} from "firebase/auth";

import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";

type AuthState = {
  user: User | null;
  loading: boolean;
  configured: boolean;
};

const AuthContext = React.createContext<AuthState>({
  user: null,
  loading: true,
  configured: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const configured = isFirebaseConfigured();

  React.useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        setLoading(false);
      } else {
        try {
          await signInAnonymously(auth);
        } catch (err) {
          console.error("[RegulMate] Anonymous sign-in failed:", err);
          setLoading(false);
        }
      }
    });
    return () => unsub();
  }, [configured]);

  return (
    <AuthContext.Provider value={{ user, loading, configured }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return React.useContext(AuthContext);
}
