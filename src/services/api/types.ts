/**
 * Database table type definitions for the Supabase service
 * 
 * This module provides TypeScript types that represent the database schema.
 * These types ensure type safety when working with database operations.
 * 
 * @module databaseTypes
 */

import { PostgrestError } from '@supabase/supabase-js';

/**
 * Generic response type for database operations
 */
export interface DbResponse<T> {
  data: T | null;
  error: PostgrestError | Error | null;
  status: 'success' | 'error';
}

/**
 * Supported database tables in the application
 */
export type TableName = 
  | 'customers'
  | 'contacts'
  | 'contact_positions'
  | 'departments'
  | 'offers'
  | 'offer_details'
  | 'tasks'
  | 'users'
  | 'service_categories'
  | 'service_subcategories'
  | 'units'
  | 'notifications'
  | 'offer_history';

/**
 * Customer table row type
 */
export interface Customer {
  id: string;
  company_name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  created_at: string;
  updated_at?: string | null;
}

/**
 * Contact table row type
 */
export interface Contact {
  id: string;
  customer_id: string;
  name: string;
  position_id?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  is_primary?: boolean;
  is_deleted?: boolean;
  deleted_at?: string;
}

/**
 * Contact position table row type
 */
export interface ContactPosition {
  id: string;
  name: string;
  created_at?: string;
}

/**
 * Department table row type
 */
export interface Department {
  id: string;
  name: string;
  created_at?: string;
}

/**
 * Offer table row type
 */
export interface Offer {
  id: string;
  customer_id: string;
  requirements: string | null;
  amount: string | number | null;
  offer_result: string | null;
  result: string | null;
  created_at: string;
  updated_at: string | null;
  assigned_to: string | null;
  source: string | null;
  customer_comments: string | null;
  our_comments?: string | null;
  hma?: boolean | null;
  certificate?: string | null;
  address?: string | null;
  postal_code?: string | null;
  town?: string | null;
  status?: string | null;
  contact_id?: string | null;
  special_conditions?: string;
  sent_at?: string | null;
  assigned_user?: User | { id: string; fullname: string };
  customer?: Customer | {
    id: string;
    company_name: string;
  };
  customers?: {
    id: string;
    company_name: string;
  };
  assignee?: {
    id: string;
    fullname: string;
  };
  created_by?: string;
  customer_name?: string;
  deleted_at?: string | null;
  title?: string;
  offer_details?: OfferDetail[];
  created_user?: User[] | {
    id: string;
    fullname: string;
  }[];
}

/**
 * Offer details table row type
 */
export interface OfferDetail {
  id: string;
  offer_id: string;
  service_category_id?: string;
  service_subcategory_id?: string;
  description: string;
  quantity?: number;
  unit_id?: string;
  unit_price?: number;
  total_price?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Task table row type
 */
export interface Task {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: string;
  due_date: string;
  assigned_to: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at: string;
  contact_id: string | null;
  offer_id: string | null;
  customer_id: string | null;
  creator?: { id: string; email?: string; fullname?: string } | undefined;
  assignee?: { id: string; email?: string; fullname?: string } | undefined;
  assigned_user?: { id: string; fullname: string; email?: string };
  offer?: {
    id: string;
    customer_id: string;
    requirements?: string;
    customers?: { company_name: string }
  } | undefined;
  customer?: Customer;
  deleted_at?: string | null;
  isParent?: boolean;
  children?: Task[];
  creator_id?: string;
  assignee_id?: string;
}

/**
 * User table row type
 */
export interface User {
  id: string;
  email: string;
  username?: string;
  password?: string;
  fullname: string;
  department_id?: string;
  phone?: string;
  role: "Admin" | "Super User" | "User" | "Μόνο ανάγνωση";
  status?: string;
  created_at: string;
  updated_at?: string | null;
  last_login_at?: string | null;
  avatar_url?: string;
}

/**
 * Service category table row type
 */
export interface ServiceCategory {
  id: string;
  name: string;
  created_at: string;
  date_created?: string;
  date_updated?: string;
  user_create?: string;
  user_updated?: string;
  category_name?: string;
}

/**
 * Service subcategory table row type
 */
export interface ServiceSubcategory {
  id: string;
  name: string;
  category_id: string;
  subcategory_name?: string;
  created_at: string;
  date_created?: string;
  date_updated?: string;
  user_create?: string;
  user_updated?: string;
}

/**
 * Category with subcategories type
 */
export interface CategoryWithSubcategories extends ServiceCategory {
  isSubcategory: boolean;
  category_id?: string;
  subcategory_name?: string;
}

/**
 * Unit table row type
 */
export interface Unit {
  id: string;
  name: string;
  abbreviation?: string;
  created_at?: string;
}

/**
 * Notification table row type
 */
export interface Notification {
  id: string;
  user_id: string;
  sender_id?: string | null;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  related_task_id?: string | null;
  // Relations
  sender?: {
    id: string;
    fullname: string;
  };
  task?: {
    id: string;
    title: string;
    offer_id?: string;
  };
  offer?: {
    id: string;
    customer: {
      id: string;
      company_name: string;
    };
  };
}

/**
 * Offer history table row type
 */
export interface OfferHistory {
  id: string;
  offer_id: string;
  action: string;
  old_values?: any;
  new_values?: any;
  user_id?: string;
  created_at?: string;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Interface for records that have been soft-deleted
 */
export interface DeletedRecord {
  id: string;
  deleted_at: string;
  record: any;
  table: string;
} 