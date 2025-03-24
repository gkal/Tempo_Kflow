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

/**
 * Type assertion function to bypass Supabase's strict typing
 * This is needed because Supabase's client has strict table typing that doesn't
 * work well with our dynamic table name approach
 */
const fromTable = (table: TableName) => {
  // @ts-ignore - We're intentionally bypassing type checking here to support dynamic table names
  return supabase.from(table);
};

/**
 * Fetch records from a table with optional filters and sorting
 * 
 * @param table - Database table name
 * @param query - Query modifiers including select, filters, sorting, etc.
 * @returns Promise with typed data response
 * 
 * @example
 * ```tsx
 * // Fetch all customers
 * const { data, error } = await fetchRecords<Customer>('customers');
 * 
 * // Fetch specific customer fields with filtering
 * const { data, error } = await fetchRecords<Customer>('customers', {
 *   select: 'id, name, email, phone',
 *   filters: { is_active: true },
 *   order: { column: 'created_at', ascending: false },
 *   limit: 10
 * });
 * ```
 * 
 * Used in:
 * - src/components/customers/CustomersPage.tsx
 * - src/components/offers/OffersPage.tsx
 * - src/components/tasks/TasksPage.tsx
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
  }
): Promise<DbResponse<T | T[]>> {
  try {
    let query = fromTable(table).select(options?.select || '*');

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
    const { data, error } = options?.single 
      ? await query.single() 
      : await query;

    if (error) {
      return { data: null, error, status: 'error' };
    }

    return { data: data as T | T[], error: null, status: 'success' };
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
    const { data: result, error } = await fromTable(table)
      .insert(data as any)
      .select()
      .single();

    if (error) {
      return { data: null, error, status: 'error' };
    }

    return { data: result as T, error: null, status: 'success' };
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
    const { data: result, error } = await fromTable(table)
      .update(data as any)
      .eq(idField, id)
      .select()
      .single();

    if (error) {
      return { data: null, error, status: 'error' };
    }

    return { data: result as T, error: null, status: 'success' };
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
    const { error } = await fromTable(table)
      .delete()
      .eq(idField, id);

    if (error) {
      return { error, status: 'error' };
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
 * Sets appropriate deletion flags while preserving the record
 * 
 * @param table - Database table name that supports soft delete
 * @param id - Record ID to soft delete
 * @returns Promise with the soft-deleted record
 * 
 * @example
 * ```tsx
 * // Soft delete a customer
 * const { data, error } = await softDeleteRecord<Customer>('customers', '123');
 * ```
 * 
 * Used in:
 * - src/components/customers/CustomerDetailPage.tsx
 * - src/components/offers/OffersPage.tsx
 */
export async function softDeleteRecord<T extends { is_deleted?: boolean; deleted_at?: string }>(
  table: TableName,
  id: string
): Promise<DbResponse<T>> {
  try {
    const softDeleteData = {
      is_deleted: true,
      deleted_at: new Date().toISOString(),
    };

    const { data: result, error } = await fromTable(table)
      .update(softDeleteData as any)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error, status: 'error' };
    }

    return { data: result as T, error: null, status: 'success' };
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
    const { data, error } = await fromTable(table)
      .select(select)
      .eq(idField, id)
      .single();

    if (error) {
      return { data: null, error, status: 'error' };
    }

    return { data: data as T, error: null, status: 'success' };
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
 * Fetch records with related data using joins
 * 
 * @param table - Primary table name
 * @param select - Select statement including join columns
 * @param options - Query options for filtering, ordering, etc.
 * @returns Promise with the fetched records
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
    let query = fromTable(table).select(select);

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

    const { data, error } = await query;

    if (error) {
      return { data: null, error, status: 'error' };
    }

    return { data: data as T[], error: null, status: 'success' };
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
    return fetchRecords<T[]>(table, {
      select: options?.select,
      order: options?.order,
      limit: options?.limit,
      filters: options?.additionalFilters
    });
  }

  try {
    let query = fromTable(table).select(options?.select || '*');

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

    const { data, error } = await query;

    if (error) {
      return { data: null, error, status: 'error' };
    }

    return { data: data as T[], error: null, status: 'success' };
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
    let query = fromTable(table).select('*', { count: 'exact', head: true });

    // Apply filters if provided
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    const { count, error } = await query;

    if (error) {
      return { data: null, error, status: 'error' };
    }

    return { data: count || 0, error: null, status: 'success' };
  } catch (error) {
    console.error(`Error counting records in ${table}:`, error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error(String(error)), 
      status: 'error' 
    };
  }
} 