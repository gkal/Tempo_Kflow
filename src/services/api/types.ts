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
  | 'offer_history'
  | 'task_history'
  | 'materials'
  | 'brands'
  | 'comments'
  | 'resource_locks'
  | 'history_logs'
  | 'system_settings'
  | 'document_references'
  | 'equipment_categories'
  | 'equipment_items'
  | 'audit_log';

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
  deleted_at?: string | null;
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
  deleted_at?: string | null;
}

/**
 * Department table row type
 */
export interface Department {
  id: string;
  name: string;
  created_at?: string;
  deleted_at?: string | null;
}

/**
 * Offer table row type
 */
export interface Offer {
  id: string;
  customer_id: string;
  requirements: string | null;
  amount: string | null;
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
  updated_by?: string;
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
  deleted_at?: string | null;
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
  deleted_at?: string | null;
}

/**
 * Service category table row type - matches database structure exactly
 */
export interface ServiceCategory {
  id: string;
  category_name: string;
  date_created: string;
  date_updated: string | null;
  user_create: string | null;
  user_updated: string | null;
  deleted_at: string | null;
  is_deleted: boolean | null;
}

/**
 * Service subcategory table row type - matches database structure exactly
 */
export interface ServiceSubcategory {
  id: string;
  subcategory_name: string;
  category_id: string;
  date_created: string;
  date_updated: string | null;
  user_create: string | null;
  user_updated: string | null;
  deleted_at: string | null;
}

/**
 * Category with subcategories type - used for display in the UI
 */
export interface CategoryWithSubcategories extends ServiceCategory {
  isSubcategory: boolean;
  parentId?: string;
  name?: string; // For backwards compatibility
  created_at?: string; // For backwards compatibility
  subcategory_name?: string; // When representing a subcategory
}

/**
 * Unit table row type
 */
export interface Unit {
  id: string;
  name: string;
  abbreviation?: string;
  created_at?: string;
  deleted_at?: string | null;
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
  deleted_at?: string | null;
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
 * Equipment table row type
 */
export interface Equipment {
  id: string;
  name?: string;
  description?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  // Add other fields based on your database schema
}

/**
 * Equipment category table row type - matches database structure exactly
 */
export interface EquipmentCategory {
  id: string;
  category_name: string;
  date_created: string;
  created_at?: string;
  date_updated: string | null;
  user_create: string | null;
  user_updated: string | null;
  deleted_at: string | null;
  is_deleted?: boolean | null;
  code_prefix?: string | null;
}

/**
 * Equipment item table row type - matches database structure exactly
 */
export interface EquipmentItem {
  id: string;
  item_name: string;
  name?: string;
  category_id: string;
  created_at: string;
  date_created: string;
  date_updated: string | null;
  user_create: string | null;
  user_updated: string | null;
  status: string | null;
  code: string | null;
  is_available?: boolean | null;
  date_rented?: string | null;
  dates_available?: string | null;
  assigned_user?: string | null;
  deleted_at?: string | null;
  is_deleted?: boolean | null;
}

/**
 * Task history table row type
 */
export interface TaskHistory {
  id: string;
  task_id: string;
  action: string;
  old_values: any;
  new_values: any;
  user_id?: string;
  created_at: string;
  ip_address?: string | null;
  user_agent?: string | null;
}

/**
 * Offer history table row type
 */
export interface OfferHistory {
  id: string;
  offer_id: string;
  action: string;
  old_values: any;
  new_values: any;
  user_id?: string;
  created_at: string;
  ip_address?: string | null;
  user_agent?: string | null;
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

/**
 * ResourceLock table row type for handling concurrent editing
 */
export interface ResourceLock {
  id: string;
  resource_type: string;
  resource_id: string;
  user_id: string;
  user_name: string;
  locked_at: string;
  expires_at: string;
  _timestamp?: number;
} 