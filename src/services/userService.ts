/**
 * User Service
 * 
 * Provides functionality for getting user information and managing user data.
 */

import { supabase } from '@/lib/supabaseClient';

interface UserInfo {
  id: string;
  username?: string;
  email?: string;
  fullname?: string;
  role?: string;
}

/**
 * Get information about the currently logged in user
 * @returns Promise resolving to the current user's information or null if not logged in
 */
export async function getUserInfo(): Promise<UserInfo | null> {
  try {
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('Error getting session or no session found:', sessionError);
      return null;
    }
    
    const userId = session.user?.id;
    
    if (!userId) {
      return null;
    }
    
    // Get user information from the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, username, email, fullname, role')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('Error getting user information:', userError);
      return null;
    }
    
    return userData || { id: userId };
  } catch (error) {
    console.error('Exception in getUserInfo:', error);
    return null;
  }
} 