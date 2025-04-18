/**
 * Supabase API Service
 * 
 * This module provides a centralized interface for all Supabase database operations.
 * It abstracts the direct Supabase client usage, providing type-safe methods for 
 * common CRUD operations across all tables in the application.
 * 
 * Benefits:
 * - Centralizes database logic for easier maintenance
 * - Provides consistent error handling
 * - Ensures type safety for database operations
 * - Simplifies mocking for testing
 * 
 * @module supabaseService
 */

import { supabase } from '@/lib/supabaseClient';
import { 
  DbResponse, 
  TableName,
  Customer,
  Contact,
  ContactPosition,
  Department,
  Offer,
  OfferDetail,
  Task,
  User,
  ServiceCategory,
  ServiceSubcategory,
  Unit,
  Notification,
  OfferHistory
} from './types';

interface SoftDeleteFields {
  is_deleted: boolean;
  deleted_at: string;
  user_updated: string | null;
  date_updated: string;
}

/**
 * Fetch multiple records from the specified table with filtering options
 * 
 * @param table - Database table name
 * @param options - Query options for filtering, sorting, and pagination
 * @returns Promise with the fetched records
 * 
 * @example
 * ```tsx
 * // Basic fetch
 * const { data, error } = await fetchRecords<Customer[]>('customers');
 * 
 * // With filtering and ordering
 * const { data } = await fetchRecords<Customer[]>('customers', {
 *   filters: { status: 'active' },
 *   order: { column: 'created_at', ascending: false },
 *   limit: 10
 * });
 * ```
 */
export async function fetchRecords<T>(
  table: TableName,
  options?: {
    select?: string;
    filters?: Record<string, any>;
    order?: { column: string; ascending?: boolean };
    limit?: number;
    range?: { from: number; to: number };
    single?: boolean;
    includeSoftDeleted?: boolean;
  }
): Promise<DbResponse<T | T[]>> {
  try {
    const client: any = supabase;
    let query = client.from(table).select(options?.select || '*');

    // Add soft delete filter unless explicitly including deleted records
    if (!options?.includeSoftDeleted) {
      // Different tables use different column names for soft delete
      if (table === 'contacts') {
        // Contacts table uses 'deleted' column
        query = query.is('deleted_at', null);
      } else {
        // Most tables use 'is_deleted' column
        query = query.eq('is_deleted', false);
      }
    }

    // Apply additional filters
    if (options?.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    // Apply ordering
    if (options?.order) {
      query = query.order(
        options.order.column,
        { ascending: options.order.ascending ?? true }
      );
    }

    // Apply limit
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    // Apply range
    if (options?.range) {
      query = query.range(options.range.from, options.range.to);
    }

    // Execute query
    const response = options?.single
      ? await query.single()
      : await query;

    if (response.error) {
      return { data: null, error: response.error, status: 'error' };
    }

    return {
      data: response.data as (T | T[]),
      error: null,
      status: 'success'
    };
  } catch (error) {
    console.error(`Error fetching records from ${table}:`, error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
      status: 'error'
    };
  }
}

/**
 * Create a new record in the specified table
 * 
 * @param table - Database table name
 * @param data - Record data to insert
 * @returns Promise with the inserted record
 * 
 * @example
 * ```tsx
 * // Create a new customer
 * const { data, error } = await createRecord<Customer>('customers', {
 *   name: 'Acme Inc',
 *   email: 'info@acme.com',
 *   phone: '2101234567'
 * });
 * ```
 * 
 * Used in:
 * - src/components/customers/CustomerForm.tsx
 * - src/components/contacts/ContactDialog.tsx
 * - src/components/tasks/TaskDialog.tsx
 */
export async function createRecord<T>(
  table: TableName,
  data: Partial<T>
): Promise<DbResponse<T>> {
  try {
    // Use a direct approach without type instantiation depth issues
    const client: any = supabase;
    const query = client.from(table);
    const response = await query
      .insert(data)
      .select()
      .single();

    if (response.error) {
      return { data: null, error: response.error, status: 'error' };
    }

    return { data: response.data as T, error: null, status: 'success' };
  } catch (error) {
    console.error(`Error creating record in ${table}:`, error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error(String(error)), 
      status: 'error' 
    };
  }
}

/**
 * Update an existing record in the specified table
 * 
 * @param table - Database table name
 * @param id - Record ID to update
 * @param data - Updated record data
 * @param idField - Name of the ID field (default: 'id')
 * @returns Promise with the updated record
 * 
 * @example
 * ```tsx
 * // Update a customer
 * const { data, error } = await updateRecord<Customer>('customers', '123', {
 *   name: 'Updated Company Name',
 *   is_active: false
 * });
 * 
 * // Update using a custom ID field
 * const { data, error } = await updateRecord<User>('users', '456', {
 *   theme: 'dark'
 * }, 'user_id');
 * ```
 * 
 * Used in:
 * - src/components/customers/CustomerForm.tsx
 * - src/components/tasks/TaskDialog.tsx
 * - src/components/settings/SettingsPage.tsx
 */
export async function updateRecord<T>(
  table: TableName,
  id: string,
  data: Partial<T>,
  idField: string = 'id'
): Promise<DbResponse<T>> {
  try {
    // Use a direct approach without type instantiation depth issues
    const client: any = supabase;
    const query = client.from(table);
    const response = await query
      .update(data)
      .eq(idField, id)
      .select()
      .single();
    
    if (response.error) {
      return { data: null, error: response.error, status: 'error' };
    }

    return { data: response.data as T, error: null, status: 'success' };
  } catch (error) {
    console.error(`Error updating record in ${table}:`, error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error(String(error)), 
      status: 'error' 
    };
  }
}

/**
 * Delete a record from the specified table
 * 
 * @param table - Database table name
 * @param id - Record ID to delete
 * @param idField - Name of the ID field (default: 'id')
 * @returns Promise with deletion status
 * 
 * @example
 * ```tsx
 * // Delete a customer
 * const { error } = await deleteRecord('customers', '123');
 * 
 * // Delete using a custom ID field
 * const { error } = await deleteRecord('settings', '456', 'user_id');
 * ```
 * 
 * Used in:
 * - src/components/customers/CustomerDetailPage.tsx
 * - src/components/contacts/ContactDialog.tsx
 * - src/components/offers/OffersPage.tsx
 */
export async function deleteRecord(
  table: TableName,
  id: string,
  idField: string = 'id'
): Promise<{ error: Error | null; status: 'success' | 'error' }> {
  try {
    // Use a direct approach without type instantiation depth issues
    const client: any = supabase;
    const response = await client.from(table).delete().eq(idField, id);

    if (response.error) {
      return { error: response.error, status: 'error' };
    }

    return { error: null, status: 'success' };
  } catch (error) {
    console.error(`Error deleting record from ${table}:`, error);
    return { 
      error: error instanceof Error ? error : new Error(String(error)), 
      status: 'error' 
    };
  }
}

/**
 * Perform a soft delete by updating a record instead of removing it
 * Sets both is_deleted flag and deleted_at timestamp while preserving the record
 * 
 * @param table - Database table name that supports soft delete
 * @param id - Record ID to soft delete
 * @param userId - Optional user ID performing the deletion for audit
 * @returns Promise with the soft-deleted record
 * 
 * @example
 * ```tsx
 * // Soft delete a customer
 * const { data, error } = await softDeleteRecord<Customer>('customers', '123', userId);
 * ```
 * 
 * Used in:
 * - src/components/customers/CustomerDetailPage.tsx
 * - src/components/offers/OffersPage.tsx
 */
export async function softDeleteRecord<T extends Partial<SoftDeleteFields>>(
  table: TableName,
  id: string,
  userId?: string
): Promise<DbResponse<T>> {
  try {
    const now = new Date().toISOString();
    const softDeleteData: SoftDeleteFields = {
      is_deleted: true,
      deleted_at: now,
      user_updated: userId || null,
      date_updated: now
    };

    // Use the central updateRecord function
    return await updateRecord<T>(table, id, softDeleteData as Partial<T>);
  } catch (error) {
    console.error(`Error soft deleting record from ${table}:`, error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error(String(error)), 
      status: 'error' 
    };
  }
}

/**
 * Fetch a single record by ID from the specified table
 * 
 * @param table - Database table name
 * @param id - Record ID to fetch
 * @param select - Columns to select (default: '*')
 * @param idField - Name of the ID field (default: 'id')
 * @returns Promise with the fetched record
 * 
 * @example
 * ```tsx
 * // Fetch a customer by ID
 * const { data, error } = await fetchRecordById<Customer>('customers', '123');
 * 
 * // Fetch specific customer fields
 * const { data, error } = await fetchRecordById<Customer>(
 *   'customers', 
 *   '123', 
 *   'id, name, email, created_at'
 * );
 * ```
 * 
 * Used in:
 * - src/components/customers/CustomerDetailPage.tsx
 * - src/components/offers/improved/CustomerOffersPage.tsx
 * - src/components/tasks/TaskDialog.tsx
 */
export async function fetchRecordById<T>(
  table: TableName,
  id: string,
  select: string = '*',
  idField: string = 'id'
): Promise<DbResponse<T>> {
  try {
    // Use a direct approach without type instantiation depth issues
    const client: any = supabase;
    const query = client.from(table);
    const response = await query
      .select(select)
      .eq(idField, id)
      .single();

    if (response.error) {
      return { data: null, error: response.error, status: 'error' };
    }

    return { data: response.data as T, error: null, status: 'success' };
  } catch (error) {
    console.error(`Error fetching record by ID from ${table}:`, error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error(String(error)), 
      status: 'error' 
    };
  }
}

/**
 * Fetch records with joins to related tables
 * 
 * @param table - Database table name
 * @param select - Fields to select including joined tables
 * @param options - Query options including filters, ordering, etc.
 * @returns Promise with joined data
 * 
 * @example
 * ```tsx
 * // Fetch customers with their contacts
 * const { data, error } = await fetchJoinedRecords<Customer>(
 *   'customers',
 *   '*, contacts(*)',
 *   { filters: { is_active: true } }
 * );
 * 
 * // Fetch offers with customer and contact details
 * const { data, error } = await fetchJoinedRecords<Offer>(
 *   'offers',
 *   '*, customers(id, name), contacts(id, name, position)',
 *   { 
 *     filters: { status: 'pending' },
 *     order: { column: 'created_at', ascending: false }
 *   }
 * );
 * ```
 * 
 * Used in:
 * - src/components/customers/CustomersPage.tsx
 * - src/components/offers/OffersPage.tsx
 */
export async function fetchJoinedRecords<T>(
  table: TableName,
  select: string,
  options?: {
    filters?: Record<string, any>;
    order?: { column: string; ascending?: boolean };
    limit?: number;
    range?: { from: number; to: number };
  }
): Promise<DbResponse<T[]>> {
  try {
    // Use a direct approach without type instantiation depth issues
    const client: any = supabase;
    let query = client.from(table).select(select);

    // Apply filters if provided
    if (options?.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    // Apply order if provided
    if (options?.order) {
      query = query.order(
        options.order.column, 
        { ascending: options.order.ascending ?? true }
      );
    }

    // Apply limit if provided
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    // Apply range if provided
    if (options?.range) {
      query = query.range(options.range.from, options.range.to);
    }

    const response = await query;

    if (response.error) {
      return { data: null, error: response.error, status: 'error' };
    }

    return { data: response.data as T[], error: null, status: 'success' };
  } catch (error) {
    console.error(`Error fetching joined records from ${table}:`, error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error(String(error)), 
      status: 'error' 
    };
  }
}

/**
 * Search records in a table based on multiple fields
 * 
 * @param table - Database table name
 * @param searchTerm - Text to search for
 * @param fields - Array of fields to search in
 * @param options - Additional query options
 * @returns Promise with matching records
 * 
 * @example
 * ```tsx
 * // Search customers by name, email or phone
 * const { data, error } = await searchRecords<Customer>(
 *   'customers',
 *   'acme',
 *   ['name', 'email', 'phone'],
 *   { select: 'id, name, email, phone' }
 * );
 * ```
 * 
 * Used in:
 * - src/components/customers/CustomersPage.tsx
 * - src/components/ui/search-bar.tsx
 */
export async function searchRecords<T>(
  table: TableName,
  searchTerm: string,
  fields: string[],
  options?: {
    select?: string;
    order?: { column: string; ascending?: boolean };
    limit?: number;
    additionalFilters?: Record<string, any>;
  }
): Promise<DbResponse<T[]>> {
  if (!searchTerm || !fields.length) {
    return fetchRecords(table, {
      select: options?.select,
      order: options?.order,
      limit: options?.limit,
      filters: options?.additionalFilters
    }) as Promise<DbResponse<T[]>>;
  }

  try {
    // Use a direct approach without type instantiation depth issues
    const client: any = supabase;
    let query = client.from(table).select(options?.select || '*');

    // Apply additional filters
    if (options?.additionalFilters) {
      Object.entries(options.additionalFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    // Add OR conditions for each search field
    // Start with the first field
    let filter = `${fields[0]}.ilike.%${searchTerm}%`;
    
    // Add remaining fields with OR
    for (let i = 1; i < fields.length; i++) {
      filter += `,or(${fields[i]}.ilike.%${searchTerm}%)`;
    }
    
    query = query.or(filter);

    // Apply ordering if provided
    if (options?.order) {
      query = query.order(
        options.order.column, 
        { ascending: options.order.ascending ?? true }
      );
    }

    // Apply limit if provided
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const response = await query;

    if (response.error) {
      return { data: null, error: response.error, status: 'error' };
    }

    return { data: response.data as T[], error: null, status: 'success' };
  } catch (error) {
    console.error(`Error searching records in ${table}:`, error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error(String(error)), 
      status: 'error' 
    };
  }
}

/**
 * Count records in a table with optional filtering
 * 
 * @param table - Database table name
 * @param filters - Optional filters to apply
 * @returns Promise with the count result
 * 
 * @example
 * ```tsx
 * // Count all active customers
 * const { data, error } = await countRecords('customers', { 
 *   is_active: true 
 * });
 * 
 * // Count pending offers for a specific customer
 * const { data, error } = await countRecords('offers', { 
 *   customer_id: '123',
 *   status: 'pending'
 * });
 * ```
 * 
 * Used in:
 * - src/components/dashboard/MetricCards.tsx
 * - src/components/customers/CustomersPage.tsx
 */
export async function countRecords(
  table: TableName,
  filters?: Record<string, any>
): Promise<DbResponse<number>> {
  try {
    // Use a direct approach without type instantiation depth issues
    const client: any = supabase;
    let query = client.from(table).select('*', { count: 'exact', head: true });

    // Apply filters if provided
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    const response = await query;

    if (response.error) {
      return { data: null, error: response.error, status: 'error' };
    }

    return { data: response.count || 0, error: null, status: 'success' };
  } catch (error) {
    console.error(`Error counting records in ${table}:`, error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error(String(error)), 
      status: 'error' 
    };
  }
}

/**
 * Fetch records with complex filtering options
 */
export async function fetchRecordsWithOptions<T>(
  table: TableName,
  options?: {
    select?: string;
    filters?: Record<string, any>;
    order?: { column: string; ascending?: boolean };
    limit?: number;
    range?: { from: number; to: number };
    single?: boolean;
  }
): Promise<DbResponse<T | T[]>> {
  try {
    // Use a direct approach without type instantiation depth issues
    const client: any = supabase;
    let query = client.from(table).select(options?.select || '*');

    // Apply filters if provided
    if (options?.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    // Apply order if provided
    if (options?.order) {
      query = query.order(
        options.order.column, 
        { ascending: options.order.ascending ?? true }
      );
    }

    // Apply limit if provided
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    // Apply range if provided
    if (options?.range) {
      query = query.range(options.range.from, options.range.to);
    }

    // Execute query
    const response = options?.single 
      ? await query.single() 
      : await query;

    if (response.error) {
      return { data: null, error: response.error, status: 'error' };
    }

    return { data: response.data as (T | T[]), error: null, status: 'success' };
  } catch (error) {
    console.error(`Error fetching records from ${table}:`, error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error(String(error)), 
      status: 'error' 
    };
  }
} 