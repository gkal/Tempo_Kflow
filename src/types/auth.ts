export interface User {
  id: string;
  username: string;
  password: string; // This will be hashed
  fullname: string;
  department: string;
  email: string;
  phone: string;
  role: "admin" | "moderator" | "user" | "readonly";
  created_at: string;
  updated_at: string;
  last_login_at: string;
  status: "active" | "inactive";
  avatar_url?: string;
  preferences?: Record<string, any>;
}

export interface HistoryLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_values: Record<string, any>;
  new_values: Record<string, any>;
  created_at: string;
  ip_address: string;
  user_agent: string;
}
