import { supabase } from "./supabase";
import type { User } from "@/types/auth";

export async function checkIfFirstUser() {
  const { count } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  return count === 0;
}

export async function createFirstAdmin(
  userData: Omit<User, "id" | "created_at" | "updated_at" | "last_login_at"> & { rememberMe?: boolean },
) {
  const { data, error } = await supabase
    .from("users")
    .insert([
      {
        username: userData.username,
        password: userData.password,
        fullname: userData.fullname,
        email: userData.email,
        phone: userData.phone,
        department: userData.department,
        role: "admin",
        status: "active",
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating user:", error);
    throw error;
  }

  if (userData.rememberMe) {
    try {
      localStorage.setItem(
        "rememberedUser",
        JSON.stringify({
          username: userData.username,
          password: userData.password,
        }),
      );
    } catch (storageError) {
      console.error("Local storage access error:", storageError);
    }
  }

  try {
    sessionStorage.setItem("userId", data.id);
  } catch (storageError) {
    console.error("Session storage access error:", storageError);
  }
  return data;
}

export async function loginUser(
  username: string,
  password: string,
  rememberMe: boolean = false,
): Promise<User> {
  // Trim the username to handle any whitespace
  const trimmedUsername = username.trim();
  
  // Special case for 'kp' username
  if (trimmedUsername.toLowerCase() === 'kp') {
    // Get all users to see if 'kp' exists with any case variation
    const { data: allUsers } = await supabase
      .from("users")
      .select("username, id, status");
    
    // Find any user that matches 'kp' case-insensitively
    const kpUser = allUsers?.find(u => 
      u.username.toLowerCase() === 'kp' || 
      u.username.toLowerCase().includes('kp')
    );
    
    if (kpUser) {
      // Check if user is active
      if (kpUser.status === "inactive") {
        throw new Error("Ο λογαριασμός σας είναι ανενεργός");
      }
      
      // Check password
      const { data, error } = await supabase
        .from("users")
        .select()
        .eq("id", kpUser.id)
        .eq("password", password)
        .eq("status", "active")
        .single();
      
      if (error || !data) {
        throw new Error("Λάθος κωδικός πρόσβασης");
      }
      
      // Update last login
      await supabase
        .from("users")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", data.id);
      
      // Handle remember me
      if (rememberMe) {
        try {
          localStorage.setItem(
            "rememberedUser",
            JSON.stringify({
              username: kpUser.username,
              password,
            }),
          );
        } catch (storageError) {
          console.error("Local storage access error:", storageError);
        }
      } else {
        try {
          localStorage.removeItem("rememberedUser");
        } catch (storageError) {
          console.error("Local storage access error:", storageError);
        }
      }
      
      try {
        sessionStorage.setItem("userId", data.id);
      } catch (storageError) {
        console.error("Session storage access error:", storageError);
      }
      
      return data;
    }
  }
  
  // Continue with the regular login flow for other usernames
  // First check if user exists - using ilike for case-insensitive matching
  let { data: userExists, error: userExistsError } = await supabase
    .from("users")
    .select("username")
    .ilike("username", trimmedUsername)
    .maybeSingle();

  if (userExistsError) {
    console.error("Error checking if user exists:", userExistsError);
  }

  // If no user found, try a more direct approach
  if (!userExists) {
    // Try exact match
    const { data: exactUser } = await supabase
      .from("users")
      .select("username")
      .eq("username", trimmedUsername)
      .maybeSingle();
      
    if (exactUser) {
      userExists = exactUser;
    } else {
      // If still not found, get all users for debugging
      await supabase
        .from("users")
        .select("username");
      
      throw new Error("Λάθος όνομα χρήστη");
    }
  }

  // Use the actual username from the database for subsequent queries
  const actualUsername = userExists.username;

  // Then check if user is active
  const { data: userStatus } = await supabase
    .from("users")
    .select("status")
    .eq("username", actualUsername)
    .single();

  if (userStatus?.status === "inactive") {
    throw new Error("Ο λογαριασμός σας είναι ανενεργός");
  }

  // Check password with the actual username
  const { data, error } = await supabase
    .from("users")
    .select()
    .eq("username", actualUsername)
    .eq("password", password)
    .eq("status", "active")
    .single();

  if (error || !data) {
    throw new Error("Λάθος κωδικός πρόσβασης");
  }

  // Update last login
  await supabase
    .from("users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", data.id);

  // Handle remember me
  if (rememberMe) {
    try {
      localStorage.setItem(
        "rememberedUser",
        JSON.stringify({
          username: actualUsername,
          password,
        }),
      );
    } catch (storageError) {
      console.error("Local storage access error:", storageError);
    }
  } else {
    try {
      localStorage.removeItem("rememberedUser");
    } catch (storageError) {
      console.error("Local storage access error:", storageError);
    }
  }

  try {
    sessionStorage.setItem("userId", data.id);
  } catch (storageError) {
    console.error("Session storage access error:", storageError);
  }
  return data;
}

export function getRememberedUser() {
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
