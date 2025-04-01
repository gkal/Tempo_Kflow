import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

/**
 * Enhanced Supabase client with type safety and additional features
 */

// Get environment variables for Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing required environment variables: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
}

// Helper function to get the user ID from session storage
const getUserIdFromStorage = (): string => {
  try {
    return sessionStorage.getItem("userId") || '';
  } catch (e) {
    console.warn("Could not access sessionStorage for user ID");
    return '';
  }
};

/**
 * Typed Supabase client instance with real-time enabled
 */
export const supabase = createClient<Database>(
  supabaseUrl, 
  supabaseAnonKey, 
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        'X-User-ID': getUserIdFromStorage(),
      },
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

/**
 * User data interface
 */
export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at?: string;
}

/**
 * Fetch the current user data from the database
 * 
 * @returns User data or null if not authenticated
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    // Get user ID from session storage
    const userId = getUserIdFromStorage();
    if (!userId) {
      return null;
    }
    
    // Fetch user data from the database
    const { data, error } = await supabase
      .from("users")
      .select()
      .eq("id", userId)
      .eq("status", "active")
      .single();
      
    if (error) {
      console.error("Error fetching user data:", error.message);
      return null;
    }
    
    return data as User;
  } catch (error) {
    console.error("Unexpected error fetching current user:", error);
    return null;
  }
};

/**
 * Get the current user session (simple version without Supabase Auth)
 * 
 * @returns Current user object with id and other basic info, or null if not logged in
 */
export const getCurrentSession = async (): Promise<{id: string} | null> => {
  try {
    const userId = getUserIdFromStorage();
    if (!userId) {
      return null;
    }
    
    // Return a simple object with just the user ID
    // This matches what the application expects from a "session"
    return { id: userId };
  } catch (error) {
    console.error("Error getting current session:", error);
    return null;
  }
};

/**
 * Get the current authentication session
 * 
 * @returns Supabase session or null if not authenticated
 */
export const getAuthSession = async (): Promise<Session | null> => {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error("Error getting auth session:", error.message);
      return null;
    }
    
    return data.session;
  } catch (error) {
    console.error("Unexpected error getting auth session:", error);
    return null;
  }
};

// Export types for convenience when importing
export type { SupabaseClient, Session }; 