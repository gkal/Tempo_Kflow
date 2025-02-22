import { supabase } from "./supabase";
import type { User } from "@/types/auth";

export async function checkIfFirstUser() {
  const { count } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  return count === 0;
}

export async function createFirstAdmin(
  userData: Omit<User, "id" | "created_at" | "updated_at" | "last_login_at">,
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
  return data;
}

export async function loginUser(username: string, password: string) {
  const { data, error } = await supabase
    .from("users")
    .select()
    .eq("username", username)
    .eq("password", password) // Note: In production, use proper password hashing
    .single();

  if (error) throw error;
  return data;
}
