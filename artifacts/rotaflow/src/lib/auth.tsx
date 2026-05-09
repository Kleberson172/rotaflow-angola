import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "./api";

export interface AuthUser {
  id: number;
  nome: string;
  email: string;
  papel: string;
  motoristaNome: string | null;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  isAdmin: boolean;
  isEntregador: boolean;
  login: (email: string, senha: string) => Promise<AuthUser>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("rf_token");
    if (token) {
      api.auth.me()
        .then((u) => setUser(u as AuthUser))
        .catch(() => localStorage.removeItem("rf_token"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, senha: string): Promise<AuthUser> => {
    const result = await api.auth.login(email, senha);
    localStorage.setItem("rf_token", result.token);
    const u = result.utilizador as AuthUser;
    setUser(u);
    return u;
  };

  const logout = () => {
    localStorage.removeItem("rf_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!user,
      user,
      isAdmin: user?.papel === "administrador",
      isEntregador: user?.papel === "entregador",
      login,
      logout,
      loading,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
