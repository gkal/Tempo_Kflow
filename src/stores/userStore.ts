import { create } from 'zustand';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';

interface UserState {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  setUser: (user: User | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  isLoading: true,
  error: null,
  
  setUser: (user) => set({ user }),
  
  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      set({ user: data.user, isLoading: false });
    } catch (error) {
      console.error('Error signing in:', error);
      set({ 
        error: error instanceof Error ? error : new Error('Failed to sign in'), 
        isLoading: false 
      });
    }
  },
  
  signOut: async () => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null, isLoading: false });
    } catch (error) {
      console.error('Error signing out:', error);
      set({ 
        error: error instanceof Error ? error : new Error('Failed to sign out'), 
        isLoading: false 
      });
    }
  },
  
  refreshUser: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      set({ user: data.user, isLoading: false });
    } catch (error) {
      console.error('Error refreshing user:', error);
      set({ 
        error: error instanceof Error ? error : new Error('Failed to refresh user'), 
        isLoading: false, 
        user: null 
      });
    }
  }
})); 