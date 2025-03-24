import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import type { User } from "@/types/auth";
import { AuthError } from "./auth";
import type { Database } from "@/types/supabase";

/**
 * Authentication context interface
 */
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  isSuperUser: boolean;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// Create auth context with undefined default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Type for database user from Supabase schema
type DatabaseUser = Database['public']['Tables']['users']['Row'];

/**
 * Maps a database user to the application User type
 */
function mapDatabaseUserToAppUser(dbUser: DatabaseUser): User {
  return {
    ...dbUser,
    department: dbUser.department_id,
    status: dbUser.status as "active" | "inactive",
  };
}

/**
 * Safely access session storage
 */
function getSessionItem(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch (error) {
    console.error("Session storage access error:", error);
    return null;
  }
}

/**
 * Safely remove session storage item
 */
function removeSessionItem(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch (error) {
    console.error("Session storage access error:", error);
  }
}

/**
 * Safely remove local storage item
 */
function removeLocalItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Local storage access error:", error);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Check if the current user is an administrator
   */
  const isAdmin = user?.role === "Admin";

  /**
   * Check if the current user is a super user
   */
  const isSuperUser = user?.role === "Super User";

  /**
   * Validate and retrieve the current user from the database
   */
  const checkAuth = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const userId = getSessionItem("userId");
      
      if (!userId) {
        setUser(null);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .eq("status", "active")
        .single();

      if (error) {
        console.error("Auth check error:", error);
        setError("Authentication failed: " + error.message);
        setUser(null);
        removeSessionItem("userId");
        return;
      }

      if (!data) {
        setUser(null);
        removeSessionItem("userId");
        return;
      }

      setUser(mapDatabaseUserToAppUser(data as DatabaseUser));
    } catch (error) {
      const errorMessage = error instanceof AuthError 
        ? error.message 
        : "Unknown authentication error";
        
      console.error("Auth check error:", error);
      setError(errorMessage);
      setUser(null);
      removeSessionItem("userId");
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh the current user's data from the database
   */
  const refreshUser = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .eq("status", "active")
        .single();

      if (error || !data) {
        console.error("User refresh error:", error);
        return;
      }

      setUser(mapDatabaseUserToAppUser(data as DatabaseUser));
    } catch (error) {
      console.error("User refresh error:", error);
    }
  }, [user?.id]);

  /**
   * Logout the current user and clear session data
   */
  const logout = useCallback(async () => {
    removeSessionItem("userId");
    removeLocalItem("rememberedUser");
    setUser(null);
  }, []);

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const contextValue = {
    user,
    loading,
    error,
    isAdmin,
    isSuperUser,
    checkAuth,
    logout,
    refreshUser
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access the authentication context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
