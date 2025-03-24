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
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  vat_number?: string;
  tax_office?: string;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
  is_deleted?: boolean;
  deleted_at?: string;
  website?: string;
  industry?: string;
  contact_person?: string;
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
  created_at?: string;
  source: "Email" | "Phone" | "Site" | "Physical";
  requirements?: string;
  amount?: string;
  customer_comments?: string;
  our_comments?: string;
  status: "pending" | "accepted" | "rejected" | "completed";
  offer_date?: string;
  delivery_date?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  contact_id?: string;
  is_deleted?: boolean;
  deleted_at?: string;
  offer_number?: string;
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
  description?: string;
  status: "pending" | "in_progress" | "completed" | "canceled";
  priority: "low" | "medium" | "high";
  due_date?: string;
  assigned_to?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
  is_deleted?: boolean;
  deleted_at?: string;
  customer_id?: string;
  offer_id?: string;
}

/**
 * User table row type
 */
export interface User {
  id: string;
  email: string;
  created_at?: string;
  first_name?: string;
  last_name?: string;
  role: "admin" | "user" | "manager";
  is_active: boolean;
  department_id?: string;
  last_login?: string;
  avatar_url?: string;
}

/**
 * Service category table row type
 */
export interface ServiceCategory {
  id: string;
  name: string;
  created_at?: string;
}

/**
 * Service subcategory table row type
 */
export interface ServiceSubcategory {
  id: string;
  name: string;
  category_id: string;
  created_at?: string;
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
  title: string;
  message: string;
  is_read: boolean;
  created_at?: string;
  type: "info" | "warning" | "success" | "error";
  link?: string;
  reference_id?: string;
  reference_type?: string;
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