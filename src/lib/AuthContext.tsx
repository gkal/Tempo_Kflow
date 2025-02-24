import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "./supabase";
import type { User } from "@/types/auth";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    setLoading(true);
    try {
      const userId = sessionStorage.getItem("userId");
      if (!userId) {
        setUser(null);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select()
        .eq("id", userId)
        .eq("status", "active")
        .single();

      if (error || !data) {
        setUser(null);
        sessionStorage.removeItem("userId");
        return;
      }

      setUser(data);
    } catch (error) {
      console.error("Auth check error:", error);
      setUser(null);
      sessionStorage.removeItem("userId");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    sessionStorage.removeItem("userId");
    localStorage.removeItem("rememberedUser");
    setUser(null);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, checkAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
