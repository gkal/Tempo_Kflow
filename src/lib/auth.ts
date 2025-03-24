/**
 * Authentication utilities for user management and session handling
 */
import { supabase } from "./supabaseClient";
import type { User } from "@/types/auth";
import { Database } from "@/types/supabase";

/**
 * Error class for authentication related errors
 */
export class AuthError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Database user type that matches the Supabase schema
 */
type DatabaseUser = Database['public']['Tables']['users']['Row'];

/**
 * Maps a database user to the application User type
 */
function mapDatabaseUserToAppUser(dbUser: DatabaseUser): User {
  return {
    ...dbUser,
    department: dbUser.department_id, // Map department_id to department for the app
    status: dbUser.status as "active" | "inactive", // Ensure correct status type
  };
}

/**
 * Login credentials interface
 */
export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * New user data interface
 */
export interface NewUserData extends Omit<User, "id" | "created_at" | "updated_at" | "last_login_at"> {
  rememberMe?: boolean;
}

/**
 * Checks if this is the first user in the system
 * @returns Promise resolving to true if no users exist
 */
export async function checkIfFirstUser(): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error("Error checking if first user:", error);
      throw new AuthError("Failed to check if first user", "DB_ERROR");
    }

    return count === 0;
  } catch (error) {
    console.error("Error in checkIfFirstUser:", error);
    throw new AuthError("Unable to connect to authentication service", "CONNECTION_ERROR");
  }
}

/**
 * Safely stores user ID in session storage
 * @param userId - The user ID to store
 */
function storeUserId(userId: string): void {
  try {
    sessionStorage.setItem("userId", userId);
  } catch (storageError) {
    console.error("Session storage access error:", storageError);
    // Continue without storing - user will need to log in again if page refreshes
  }
}

/**
 * Safely manages remembered user credentials
 * @param credentials - User credentials to remember, or null to clear
 */
function manageRememberedUser(credentials: { username: string; password: string } | null): void {
  try {
    if (credentials) {
      localStorage.setItem("rememberedUser", JSON.stringify(credentials));
    } else {
      localStorage.removeItem("rememberedUser");
    }
  } catch (storageError) {
    console.error("Local storage access error:", storageError);
    // Continue without storing
  }
}

/**
 * Creates the first admin user in the system
 * @param userData - New admin user data
 * @returns Promise resolving to the created user
 */
export async function createFirstAdmin(userData: NewUserData): Promise<User> {
  try {
    // Insert using the database schema format
    const { data, error } = await supabase
      .from("users")
      .insert({
        username: userData.username,
        password: userData.password, // In production, use proper password hashing
        fullname: userData.fullname,
        email: userData.email,
        phone: userData.phone,
        department_id: userData.department, // Map department to department_id for DB
        role: "Admin", // Use exact role value from enum
        status: "active",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating user:", error);
      throw new AuthError("Failed to create admin user", "DB_ERROR");
    }

    if (userData.rememberMe) {
      manageRememberedUser({
        username: userData.username,
        password: userData.password,
      });
    }

    storeUserId(data.id);
    return mapDatabaseUserToAppUser(data);
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    console.error("Unexpected error in createFirstAdmin:", error);
    throw new AuthError("Failed to create admin user", "UNKNOWN_ERROR");
  }
}

/**
 * Attempts to log in a user with the provided credentials
 * @param username - Username to log in with
 * @param password - Password to authenticate with
 * @param rememberMe - Whether to remember the user's credentials
 * @returns Promise resolving to the logged in user
 */
export async function loginUser(
  username: string,
  password: string,
  rememberMe: boolean = false,
): Promise<User> {
  try {
    // Trim the username to handle any whitespace
    const trimmedUsername = username.trim();
    
    // Special case for 'kp' username
    if (trimmedUsername.toLowerCase() === 'kp') {
      return await handleKpLogin(password, rememberMe);
    }
    
    // Regular login flow
    return await handleRegularLogin(trimmedUsername, password, rememberMe);
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    console.error("Unexpected error in loginUser:", error);
    throw new AuthError("Authentication failed", "UNKNOWN_ERROR");
  }
}

/**
 * Handles the special case login for 'kp' user
 * @param password - Password to authenticate with
 * @param rememberMe - Whether to remember the user's credentials
 * @returns Promise resolving to the logged in user
 */
async function handleKpLogin(
  password: string,
  rememberMe: boolean
): Promise<User> {
  // Get all users to see if 'kp' exists with any case variation
  const { data: allUsers, error: usersError } = await supabase
    .from("users")
    .select("username, id, status");
  
  if (usersError) {
    console.error("Error fetching users for KP login:", usersError);
    throw new AuthError("Failed to authenticate", "DB_ERROR");
  }
  
  // Find any user that matches 'kp' case-insensitively
  const kpUser = allUsers?.find(u => 
    u.username.toLowerCase() === 'kp' || 
    u.username.toLowerCase().includes('kp')
  );
  
  if (!kpUser) {
    throw new AuthError("Λάθος όνομα χρήστη", "USER_NOT_FOUND");
  }
  
  // Check if user is active
  if (kpUser.status === "inactive") {
    throw new AuthError("Ο λογαριασμός σας είναι ανενεργός", "ACCOUNT_INACTIVE");
  }
  
  // Check password
  const { data, error } = await supabase
    .from("users")
    .select()
    .eq("id", kpUser.id)
    .single();
  
  if (error || !data) {
    throw new AuthError("Error fetching user data", "DB_ERROR");
  }
  
  // Validate password manually to avoid 406 errors
  if (data.password !== password) {
    throw new AuthError("Λάθος κωδικός πρόσβασης", "INVALID_PASSWORD");
  }
  
  // Update last login
  await updateLastLogin(data.id);
  
  // Handle remember me preferences
  if (rememberMe) {
    manageRememberedUser({
      username: kpUser.username,
      password,
    });
  } else {
    manageRememberedUser(null);
  }
  
  storeUserId(data.id);
  return mapDatabaseUserToAppUser(data);
}

/**
 * Handles the regular login flow for non-KP users
 * @param username - Username to log in with
 * @param password - Password to authenticate with
 * @param rememberMe - Whether to remember the user's credentials
 * @returns Promise resolving to the logged in user
 */
async function handleRegularLogin(
  username: string,
  password: string,
  rememberMe: boolean
): Promise<User> {
  // Step 1: First check if user exists - using ilike for case-insensitive matching
  let { data: userExists, error: userExistsError } = await supabase
    .from("users")
    .select("id, username, status")
    .ilike("username", username)
    .maybeSingle();

  if (userExistsError) {
    console.error("Error checking if user exists:", userExistsError);
    throw new AuthError("Failed to authenticate", "DB_ERROR");
  }

  // If no user found, try a more direct approach
  if (!userExists) {
    // Try exact match
    const { data: exactUser } = await supabase
      .from("users")
      .select("id, username, status")
      .eq("username", username)
      .maybeSingle();
      
    if (exactUser) {
      userExists = exactUser;
    } else {
      throw new AuthError("Λάθος όνομα χρήστη", "USER_NOT_FOUND");
    }
  }

  // Check if user is active before proceeding
  if (userExists.status === "inactive") {
    throw new AuthError("Ο λογαριασμός σας είναι ανενεργός", "ACCOUNT_INACTIVE");
  }
  
  // Step 2: Fetch full user data by ID (not exposing password in query params)
  const { data: userData, error: userDataError } = await supabase
    .from("users")
    .select("*")
    .eq("id", userExists.id)
    .single();
    
  if (userDataError || !userData) {
    console.error("Error fetching user data:", userDataError);
    throw new AuthError("Failed to authenticate", "DB_ERROR");
  }
  
  // Validate password manually instead of in the query
  if (userData.password !== password) {
    throw new AuthError("Λάθος κωδικός πρόσβασης", "INVALID_PASSWORD");
  }
  
  // Update last login
  await updateLastLogin(userData.id);

  // Handle remember me preferences
  if (rememberMe) {
    manageRememberedUser({
      username: userData.username,
      password,
    });
  } else {
    manageRememberedUser(null);
  }

  storeUserId(userData.id);
  return mapDatabaseUserToAppUser(userData);
}

/**
 * Updates the last login timestamp for a user
 * @param userId - ID of the user to update
 */
async function updateLastLogin(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", userId);
      
    if (error) {
      console.error("Error updating last login:", error);
      // Non-critical error, continue with login
    }
  } catch (error) {
    console.error("Failed to update last login time:", error);
    // Non-critical error, continue with login
  }
}

/**
 * Gets the remembered user credentials from local storage
 * @returns The remembered user credentials or null
 */
export function getRememberedUser(): { username: string; password: string } | null {
  try {
    const remembered = localStorage.getItem("rememberedUser");
    if (remembered) {
      return JSON.parse(remembered);
    }
  } catch (storageError) {
    console.error("Local storage access error:", storageError);
  }
  return null;
}

/**
 * Gets the current user's JWT token
 * @returns Promise resolving to the user's token or null if not authenticated
 */
export async function getCurrentUserToken(): Promise<string | null> {
  try {
    // Get the user ID from session storage
    const userId = sessionStorage.getItem("userId");
    if (!userId) {
      return null;
    }
    
    // Get the user data from Supabase
    const { data, error } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", userId)
      .eq("status", "active")
      .single();
      
    if (error || !data) {
      console.error("Error getting user data:", error);
      return null;
    }
    
    // Create a custom JWT token with the user's ID and role
    // Note: In production, use a proper JWT library with signing
    const tokenPayload = {
      sub: data.id,
      role: data.role,
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour expiration
    };
    
    return btoa(JSON.stringify(tokenPayload));
  } catch (error) {
    console.error("Error getting current user token:", error);
    return null;
  }
}

/**
 * Logs out the current user
 */
export function logoutUser(): void {
  try {
    sessionStorage.removeItem("userId");
  } catch (storageError) {
    console.error("Session storage access error:", storageError);
  }
}

/**
 * Checks if a user is currently logged in
 * @returns Whether a user is logged in
 */
export function isLoggedIn(): boolean {
  try {
    return !!sessionStorage.getItem("userId");
  } catch (storageError) {
    console.error("Session storage access error:", storageError);
    return false;
  }
}
