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
  // First check if user exists
  const { data: userExists } = await supabase
    .from("users")
    .select("username")
    .eq("username", username)
    .maybeSingle();

  if (!userExists) {
    throw new Error("Λάθος όνομα χρήστη");
  }

  // Then check password
  // First check if user exists and is active
  const { data: userStatus } = await supabase
    .from("users")
    .select("status")
    .eq("username", username)
    .single();

  if (userStatus?.status === "inactive") {
    throw new Error("Ο λογαριασμός σας είναι ανενεργός");
  }

  const { data, error } = await supabase
    .from("users")
    .select()
    .eq("username", username)
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
          username,
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
