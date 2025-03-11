import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create the Supabase client with auth options
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      // Add a custom header with the user ID if available
      'X-User-ID': (() => {
        try {
          return sessionStorage.getItem("userId") || '';
        } catch (e) {
          return '';
        }
      })(),
    },
  },
});

// Function to get the current user's session
export const getCurrentSession = async () => {
  try {
    // Check if we have a user ID in session storage
    const userId = sessionStorage.getItem("userId");
    if (!userId) {
      console.error("No user ID found in session storage");
      return null;
    }
    
    // Get the user data from Supabase
    const { data, error } = await supabase
      .from("users")
      .select()
      .eq("id", userId)
      .eq("status", "active")
      .single();
      
    if (error || !data) {
      console.error("Error getting user data:", error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Error getting current session:", error);
    return null;
  }
}; 