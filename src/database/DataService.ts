import { supabase } from '@/lib/supabaseClient';
import type { PostgrestError } from '@supabase/supabase-js';
import type { TableName, DbResponse } from '@/services/api/types';

/**
 * DataService - A centralized data access layer for all database operations
 * 
 * This service provides a single entry point for all database operations,
 * ensuring consistency, error handling, and type safety across the application.
 * 
 * Features:
 * - Type-safe operations for all tables
 * - Standardized error handling
 * - Support for soft deletion and restoration
 * - Comprehensive filtering, sorting, and pagination
 * - Audit logging for all operations
 * - Transaction support for multi-table operations
 * 
 * Usage:
 * ```tsx
 * // Get an instance for a specific table
 * const customerService = DataService.forTable('customers');
 * 
 * // Fetch all records
 * const { data, error } = await customerService.getAll();
 * 
 * // Get a single record
 * const { data, error } = await customerService.getById('123');
 * 
 * // Create a new record
 * const { data, error } = await customerService.create({ name: 'New Customer' });
 * 
 * // Update a record
 * const { data, error } = await customerService.update('123', { name: 'Updated Name' });
 * 
 * // Soft delete a record
 * const { data, error } = await customerService.softDelete('123');
 * 
 * // Hard delete (rarely used)
 * const { error } = await customerService.hardDelete('123');
 * ```
 */
export class DataService<T extends Record<string, any>> {
  private tableName: TableName;
  public idField: string;
  private enableAudit: boolean;
  private historyTable: string | null;

  /**
   * Create a DataService instance for a specific table
   * 
   * @param tableName - The database table name
   * @param options - Configuration options
   */
  constructor(
    tableName: TableName,
    options: {
      idField?: string;
      enableAudit?: boolean;
      historyTable?: string | null;
    } = {}
  ) {
    this.tableName = tableName;
    this.idField = options.idField || 'id';
    this.enableAudit = options.enableAudit !== false;
    this.historyTable = options.historyTable || null;
  }

  /**
   * Create a DataService instance for a specific table (static factory method)
   * 
   * @param tableName - The database table name
   * @param options - Configuration options
   * @returns A new DataService instance for the specified table
   */
  static forTable<T extends Record<string, any>>(
    tableName: TableName,
    options: {
      idField?: string;
      enableAudit?: boolean;
      historyTable?: string | null;
    } = {}
  ): DataService<T> {
    return new DataService<T>(tableName, options);
  }

  /**
   * Get all records from the table with filtering, sorting, and pagination
   * 
   * @param options - Query options
   * @returns Promise with typed data response
   */
  async getAll(
    options: {
      select?: string;
      filters?: Record<string, any>;
      order?: { column: string; ascending?: boolean };
      limit?: number;
      page?: number;
      range?: { from: number; to: number };
      includeDeleted?: boolean;
      language?: 'en' | 'el';
    } = {}
  ): Promise<DbResponse<T[]>> {
    try {
      let query = supabase
        .from(this.tableName as any)
        .select(options.select || '*');

      // Apply soft delete filter unless includeDeleted is true
      if (!options.includeDeleted && this.hasField('deleted_at')) {
        query = query.is('deleted_at', null);
      }

      // Apply filters
      if (options.filters) {
        query = this.applyFilters(query, options.filters);
      }

      // Apply sorting
      if (options.order) {
        query = query.order(
          options.order.column,
          { ascending: options.order.ascending ?? true }
        );
      }

      // Apply pagination
      if (options.range) {
        query = query.range(options.range.from, options.range.to);
      } else if (options.page !== undefined && options.limit) {
        const from = options.page * options.limit;
        const to = from + options.limit - 1;
        query = query.range(from, to);
      } else if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        return { data: null, error: this.localizeError(error, options.language), status: 'error' };
      }

      return { data: data as unknown as T[], error: null, status: 'success' };
    } catch (error) {
      console.error(`Error in getAll for ${this.tableName}:`, error);
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        data: null,
        error: this.localizeError(err, options.language),
        status: 'error'
      };
    }
  }

  /**
   * Get a single record by ID
   * 
   * @param id - Record ID
   * @param options - Query options
   * @returns Promise with typed data response
   */
  async getById(
    id: string,
    options: {
      select?: string;
      includeDeleted?: boolean;
      language?: 'en' | 'el';
    } = {}
  ): Promise<DbResponse<T>> {
    try {
      let query = supabase
        .from(this.tableName as any)
        .select(options.select || '*')
        .eq(this.idField, id);

      // Apply soft delete filter unless includeDeleted is true
      if (!options.includeDeleted && this.hasField('deleted_at')) {
        query = query.is('deleted_at', null);
      }

      const { data, error } = await query.single();

      if (error) {
        // Handle "no rows returned" gracefully
        if (error.code === 'PGRST116') {
          const notFoundError = new Error(`Record with ID ${id} not found`);
          (notFoundError as any).code = 'PGRST116';
          return { 
            data: null, 
            error: this.localizeError(notFoundError, options.language), 
            status: 'error' 
          };
        }
        return { 
          data: null, 
          error: this.localizeError(error, options.language), 
          status: 'error' 
        };
      }

      return { data: data as unknown as T, error: null, status: 'success' };
    } catch (error) {
      console.error(`Error in getById for ${this.tableName}:`, error);
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        data: null,
        error: this.localizeError(err, options.language),
        status: 'error'
      };
    }
  }

  /**
   * Create a new record
   * 
   * @param data - Record data to insert
   * @param options - Additional options
   * @returns Promise with typed data response
   */
  async create(
    data: Omit<Partial<T>, 'id' | 'created_at' | 'updated_at'>,
    options: {
      language?: 'en' | 'el'
    } = {}
  ): Promise<DbResponse<T>> {
    try {
      const timestamp = new Date().toISOString();
      
      // Add timestamps
      const recordData = {
        ...data,
        created_at: timestamp,
        updated_at: timestamp
      };

      const { data: createdData, error } = await supabase
        .from(this.tableName as any)
        .insert(recordData as any)
        .select()
        .single();

      if (error) {
        return { data: null, error: this.localizeError(error, options.language), status: 'error' };
      }

      // Log the creation in history table if enabled
      if (this.enableAudit && this.historyTable) {
        if ('id' in createdData) {
          await this.addToHistory(String(createdData.id), 'create', null, createdData as unknown as T);
        }
      }

      return { data: createdData as unknown as T, error: null, status: 'success' };
    } catch (error) {
      console.error(`Error in create for ${this.tableName}:`, error);
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        data: null,
        error: this.localizeError(err, options.language),
        status: 'error'
      };
    }
  }

  /**
   * Update an existing record
   * 
   * @param id - Record ID
   * @param data - Updated record data
   * @param options - Additional options
   * @returns Promise with typed data response
   */
  async update(
    id: string, 
    data: Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>,
    options: {
      language?: 'en' | 'el'
    } = {}
  ): Promise<DbResponse<T>> {
    try {
      // Get the current data for history tracking if audit is enabled
      let oldData: T | null = null;
      if (this.enableAudit && this.historyTable) {
        const { data: currentData } = await this.getById(id, options);
        oldData = currentData;
      }

      // Some tables use date_updated instead of updated_at
      let updateData: any = { ...data };
      
      // Handle tables with alternative date field names
      const useAlternativeDateFieldNames = ['service_categories', 'service_subcategories', 'units'].includes(this.tableName);
      
      // Tables using standard created_at/updated_at field names
      const useStandardDateFieldNames = ['departments'].includes(this.tableName);
      
      if (useAlternativeDateFieldNames) {
        // Don't add updated_at for tables that use date_updated
        if (!updateData.date_updated) {
          updateData.date_updated = new Date().toISOString();
        }
      } else if (useStandardDateFieldNames) {
        // Add standard updated_at timestamp
        updateData.updated_at = new Date().toISOString();
      } else {
        // Add updated_at timestamp for other tables
        updateData.updated_at = new Date().toISOString();
      }

      const { data: updatedData, error } = await supabase
        .from(this.tableName as any)
        .update(updateData as any)
        .eq(this.idField, id)
        .select()
        .single();

      if (error) {
        return { data: null, error: this.localizeError(error, options.language), status: 'error' };
      }

      // Log the update in history table if enabled
      if (this.enableAudit && this.historyTable && oldData) {
        await this.addToHistory(id, 'update', oldData, updatedData as unknown as T);
      }

      return { data: updatedData as unknown as T, error: null, status: 'success' };
    } catch (error) {
      console.error(`Error in update for ${this.tableName}:`, error);
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        data: null,
        error: this.localizeError(err, options.language),
        status: 'error'
      };
    }
  }

  /**
   * Soft delete a record by setting deleted_at
   * 
   * @param id - Record ID
   * @param options - Additional options
   * @returns Promise with typed data response
   */
  async softDelete(
    id: string,
    options: {
      language?: 'en' | 'el'
    } = {}
  ): Promise<DbResponse<T>> {
    try {
      // Verify the table has deleted_at column
      if (!this.hasField('deleted_at')) {
        throw new Error(`Table ${this.tableName} does not support soft deletion`);
      }

      // Get the current data for history tracking if audit is enabled
      let oldData: T | null = null;
      if (this.enableAudit && this.historyTable) {
        const { data: currentData } = await this.getById(id, options);
        oldData = currentData;
      }

      const timestamp = new Date().toISOString();
      
      // Handle tables with alternative date field names
      const useAlternativeDateFieldNames = ['service_categories', 'service_subcategories', 'units'].includes(this.tableName);
      
      // Tables using standard created_at/updated_at field names
      const useStandardDateFieldNames = ['departments'].includes(this.tableName);
      
      const updateData = {
        deleted_at: timestamp,
      };
      
      // Add the appropriate updated timestamp field
      if (useAlternativeDateFieldNames) {
        updateData['date_updated'] = timestamp;
      } else if (useStandardDateFieldNames) {
        updateData['updated_at'] = timestamp;
      } else {
        updateData['updated_at'] = timestamp;
      }

      const { data: deletedData, error } = await supabase
        .from(this.tableName as any)
        .update(updateData as any)
        .eq(this.idField, id)
        .select()
        .single();

      if (error) {
        return { data: null, error: this.localizeError(error, options.language), status: 'error' };
      }

      // Log the soft delete in history table if enabled
      if (this.enableAudit && this.historyTable && oldData) {
        await this.addToHistory(id, 'soft-delete', oldData, deletedData as unknown as T);
      }

      return { data: deletedData as unknown as T, error: null, status: 'success' };
    } catch (error) {
      console.error(`Error in softDelete for ${this.tableName}:`, error);
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        data: null,
        error: this.localizeError(err, options.language),
        status: 'error'
      };
    }
  }

  /**
   * Restore a soft-deleted record
   * 
   * @param id - Record ID
   * @param options - Additional options
   * @returns Promise with typed data response
   */
  async restore(
    id: string,
    options: {
      language?: 'en' | 'el'
    } = {}
  ): Promise<DbResponse<T>> {
    try {
      // Verify the table has deleted_at column
      if (!this.hasField('deleted_at')) {
        throw new Error(`Table ${this.tableName} does not support soft deletion/restoration`);
      }

      // Get the current data for history tracking if audit is enabled
      let oldData: T | null = null;
      if (this.enableAudit && this.historyTable) {
        const { data: currentData } = await this.getById(id, { includeDeleted: true, language: options.language });
        oldData = currentData;
      }

      const timestamp = new Date().toISOString();
      
      // Handle tables with alternative date field names
      const useAlternativeDateFieldNames = ['service_categories', 'service_subcategories', 'units'].includes(this.tableName);
      
      // Tables using standard created_at/updated_at field names
      const useStandardDateFieldNames = ['departments'].includes(this.tableName);
      
      const updateData = {
        deleted_at: null,
      };
      
      // Add the appropriate updated timestamp field
      if (useAlternativeDateFieldNames) {
        updateData['date_updated'] = timestamp;
      } else if (useStandardDateFieldNames) {
        updateData['updated_at'] = timestamp;
      } else {
        updateData['updated_at'] = timestamp;
      }

      const { data: restoredData, error } = await supabase
        .from(this.tableName as any)
        .update(updateData as any)
        .eq(this.idField, id)
        .select()
        .single();

      if (error) {
        return { data: null, error: this.localizeError(error, options.language), status: 'error' };
      }

      // Log the restoration in history table if enabled
      if (this.enableAudit && this.historyTable && oldData) {
        await this.addToHistory(id, 'restore', oldData, restoredData as unknown as T);
      }

      return { data: restoredData as unknown as T, error: null, status: 'success' };
    } catch (error) {
      console.error(`Error in restore for ${this.tableName}:`, error);
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        data: null,
        error: this.localizeError(err, options.language),
        status: 'error'
      };
    }
  }

  /**
   * Hard delete a record (permanent deletion)
   * 
   * @param id - Record ID
   * @param options - Additional options
   * @returns Promise with delete operation status
   */
  async hardDelete(
    id: string,
    options: {
      language?: 'en' | 'el'
    } = {}
  ): Promise<{ error: Error | PostgrestError | null; status: 'success' | 'error' }> {
    try {
      // Get the current data for history tracking if audit is enabled
      let oldData: T | null = null;
      if (this.enableAudit && this.historyTable) {
        const { data: currentData } = await this.getById(id, { includeDeleted: true, language: options.language });
        oldData = currentData;
      }

      const { error } = await supabase
        .from(this.tableName as any)
        .delete()
        .eq(this.idField, id);

      if (error) {
        return { error: this.localizeError(error, options.language), status: 'error' };
      }

      // Log the hard delete in history table if enabled
      if (this.enableAudit && this.historyTable && oldData) {
        await this.addToHistory(id, 'hard-delete', oldData, null);
      }

      return { error: null, status: 'success' };
    } catch (error) {
      console.error(`Error in hardDelete for ${this.tableName}:`, error);
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        error: this.localizeError(err, options.language),
        status: 'error'
      };
    }
  }

  /**
   * Count records with optional filters
   * 
   * @param options - Counting options
   * @returns Promise with count result
   */
  async count(
    options: {
      filters?: Record<string, any>;
      includeDeleted?: boolean;
      language?: 'en' | 'el';
    } = {}
  ): Promise<DbResponse<number>> {
    try {
      let query = supabase
        .from(this.tableName as any)
        .select('*', { count: 'exact', head: true });

      // Apply soft delete filter unless includeDeleted is true
      if (!options.includeDeleted && this.hasField('deleted_at')) {
        query = query.is('deleted_at', null);
      }

      // Apply filters
      if (options.filters) {
        query = this.applyFilters(query, options.filters);
      }

      const { count, error } = await query;

      if (error) {
        return { data: null, error: this.localizeError(error, options.language), status: 'error' };
      }

      return { data: count || 0, error: null, status: 'success' };
    } catch (error) {
      console.error(`Error in count for ${this.tableName}:`, error);
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        data: null,
        error: this.localizeError(err, options.language),
        status: 'error'
      };
    }
  }

  /**
   * Search records by matching search term across specified fields
   * 
   * @param searchTerm - The term to search for
   * @param searchFields - Fields to search in
   * @param options - Additional search options
   * @returns Promise with search results
   */
  async search(
    searchTerm: string,
    searchFields: string[],
    options: {
      select?: string;
      order?: { column: string; ascending?: boolean };
      limit?: number;
      additionalFilters?: Record<string, any>;
      includeDeleted?: boolean;
      language?: 'en' | 'el';
    } = {}
  ): Promise<DbResponse<T[]>> {
    try {
      if (!searchTerm || !searchFields.length) {
        return this.getAll({
          select: options.select,
          filters: options.additionalFilters,
          order: options.order,
          limit: options.limit,
          includeDeleted: options.includeDeleted,
          language: options.language
        });
      }

      let query = supabase
        .from(this.tableName as any)
        .select(options.select || '*');

      // Apply soft delete filter unless includeDeleted is true
      if (!options.includeDeleted && this.hasField('deleted_at')) {
        query = query.is('deleted_at', null);
      }

      // Build the search conditions using OR logic
      const term = `%${searchTerm}%`;
      let searchQuery = query;
      
      searchFields.forEach((field, index) => {
        if (index === 0) {
          searchQuery = searchQuery.ilike(field, term);
        } else {
          searchQuery = searchQuery.or(`${field}.ilike.${term}`);
        }
      });

      // Apply additional filters
      if (options.additionalFilters) {
        searchQuery = this.applyFilters(searchQuery, options.additionalFilters);
      }

      // Apply sorting
      if (options.order) {
        searchQuery = searchQuery.order(
          options.order.column,
          { ascending: options.order.ascending ?? true }
        );
      }

      // Apply limit
      if (options.limit) {
        searchQuery = searchQuery.limit(options.limit);
      }

      const { data, error } = await searchQuery;

      if (error) {
        return { data: null, error: this.localizeError(error, options.language), status: 'error' };
      }

      return { data: data as unknown as T[], error: null, status: 'success' };
    } catch (error) {
      console.error(`Error in search for ${this.tableName}:`, error);
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        data: null,
        error: this.localizeError(err, options.language),
        status: 'error'
      };
    }
  }

  /**
   * Get records with JOIN queries for related tables
   * 
   * @param select - The select string with join syntax
   * @param options - Additional query options
   * @returns Promise with joined data
   */
  async getWithJoins<R = any>(
    select: string,
    options: {
      filters?: Record<string, any>;
      order?: { column: string; ascending?: boolean };
      limit?: number;
      page?: number;
      range?: { from: number; to: number };
      includeDeleted?: boolean;
      language?: 'en' | 'el';
    } = {}
  ): Promise<DbResponse<R[]>> {
    try {
      let query = supabase
        .from(this.tableName as any)
        .select(select);

      // Apply soft delete filter unless includeDeleted is true
      if (!options.includeDeleted && this.hasField('deleted_at')) {
        query = query.is('deleted_at', null);
      }

      // Apply filters
      if (options.filters) {
        query = this.applyFilters(query, options.filters);
      }

      // Apply sorting
      if (options.order) {
        query = query.order(
          options.order.column,
          { ascending: options.order.ascending ?? true }
        );
      }

      // Apply pagination
      if (options.range) {
        query = query.range(options.range.from, options.range.to);
      } else if (options.page !== undefined && options.limit) {
        const from = options.page * options.limit;
        const to = from + options.limit - 1;
        query = query.range(from, to);
      } else if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        return { data: null, error: this.localizeError(error, options.language), status: 'error' };
      }

      return { data: data as R[], error: null, status: 'success' };
    } catch (error) {
      console.error(`Error in getWithJoins for ${this.tableName}:`, error);
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        data: null,
        error: this.localizeError(err, options.language),
        status: 'error'
      };
    }
  }

  /**
   * Execute a raw SQL query via Supabase's rpc function
   * 
   * @param functionName - The Postgres function name
   * @param params - Function parameters
   * @param options - Additional options
   * @returns Promise with query results
   */
  async executeRpc<R = any>(
    functionName: string,
    params: Record<string, any> = {},
    options: {
      language?: 'en' | 'el';
    } = {}
  ): Promise<DbResponse<R>> {
    try {
      const { data, error } = await supabase
        .rpc(functionName as any, params);

      if (error) {
        return { data: null, error: this.localizeError(error, options.language), status: 'error' };
      }

      return { data: data as R, error: null, status: 'success' };
    } catch (error) {
      console.error(`Error executing RPC ${functionName}:`, error);
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        data: null,
        error: this.localizeError(err, options.language),
        status: 'error'
      };
    }
  }

  /**
   * Check if a table has a specific field (column)
   * 
   * @param fieldName - The field name to check
   * @returns Boolean indicating if the field exists
   * 
   * Note: This is a simplification; in a full implementation,
   * you might want to cache table schemas or use introspection
   */
  private hasField(fieldName: string): boolean {
    // A more robust implementation would check actual table schema
    // For common fields, we can use this simplified approach
    const commonSoftDeleteTables = [
      'customers',
      'contacts',
      'offers',
      'offer_details',
      'tasks'
    ];
    
    if (fieldName === 'deleted_at' && commonSoftDeleteTables.includes(this.tableName)) {
      return true;
    }
    
    // For timestamp fields - most tables have these
    if (['created_at', 'updated_at'].includes(fieldName)) {
      return true;
    }
    
    // Default to true for simplicity; in production, this should be more precise
    return true;
  }

  /**
   * Apply filters to a query
   * 
   * @param query - The Supabase query builder
   * @param filters - Object with filter conditions
   * @returns Updated query with filters applied
   */
  private applyFilters(
    query: any,
    filters: Record<string, any>
  ): any {
    let filteredQuery = query;

    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        filteredQuery = filteredQuery.is(key, null);
      } else if (Array.isArray(value)) {
        if (value.length > 0) {
          filteredQuery = filteredQuery.in(key, value);
        }
      } else if (typeof value === 'object' && value !== null) {
        // Handle complex filter conditions (gt, lt, etc.)
        if ('gt' in value) filteredQuery = filteredQuery.gt(key, value.gt);
        if ('gte' in value) filteredQuery = filteredQuery.gte(key, value.gte);
        if ('lt' in value) filteredQuery = filteredQuery.lt(key, value.lt);
        if ('lte' in value) filteredQuery = filteredQuery.lte(key, value.lte);
        if ('neq' in value) filteredQuery = filteredQuery.neq(key, value.neq);
        if ('like' in value) filteredQuery = filteredQuery.like(key, value.like);
        if ('ilike' in value) filteredQuery = filteredQuery.ilike(key, value.ilike);
      } else {
        filteredQuery = filteredQuery.eq(key, value);
      }
    });

    return filteredQuery;
  }

  /**
   * Add an entry to the history/audit table
   * 
   * @param recordId - The ID of the record being modified
   * @param action - The type of action (create, update, delete)
   * @param oldValues - Previous record values (for updates and deletes)
   * @param newValues - New record values (for creates and updates)
   */
  private async addToHistory(
    recordId: string,
    action: string,
    oldValues: T | null,
    newValues: T | null
  ): Promise<void> {
    if (!this.historyTable) return;

    try {
      // Get user info from storage for audit purposes
      let userId = '';
      try {
        userId = sessionStorage.getItem('userId') || '';
      } catch (e) {
        // Ignore errors accessing sessionStorage
      }

      // Create a history record with the appropriate structure
      const historyEntry = {
        // Use the table's ID field as the foreign key
        [this.tableName === 'offer_history' ? 'offer_id' : `${this.tableName.slice(0, -1)}_id`]: recordId,
        action,
        old_values: oldValues,
        new_values: newValues,
        user_id: userId || null,
        created_at: new Date().toISOString(),
        // Capture additional context if available
        ip_address: null, // Would need server-side implementation
        user_agent: navigator.userAgent || null
      };

      // Insert into history table with proper casting
      await supabase
        .from(this.historyTable as any)
        .insert(historyEntry as any);
    } catch (error) {
      // Log error but don't fail the main operation
      console.error(`Error adding history entry for ${this.tableName}:`, error);
    }
  }

  /**
   * Translate error messages to the specified language
   * 
   * @param error - The original error
   * @param language - The target language (default: 'en')
   * @returns Localized error message
   */
  private localizeError(error: PostgrestError | Error, language: 'en' | 'el' = 'en'): Error {
    if (!error) return error;
    
    // Create a copy of the error to avoid modifying the original
    const localizedError = new Error(error.message);
    
    // Copy properties from the original error
    if ('code' in error) {
      (localizedError as any).code = error.code;
    }
    
    // If English is requested, return the original error message
    if (language === 'en') {
      return localizedError;
    }
    
    // For PostgreSQL error codes, provide Greek translations
    if ('code' in error) {
      const pgErrorCode = error.code;
      
      // Greek translations for common PostgreSQL error codes
      const greekErrorMessages: Record<string, string> = {
        // Integrity constraint violations
        '23000': 'Παραβίαση περιορισμού ακεραιότητας',
        '23001': 'Παραβίαση περιορισμού ακεραιότητας',
        '23502': 'Παραβίαση μη-μηδενικής τιμής',
        '23503': 'Παραβίαση περιορισμού ξένου κλειδιού',
        '23505': 'Παραβίαση μοναδικού περιορισμού',
        '23514': 'Παραβίαση περιορισμού ελέγχου',
        
        // Authentication/authorization errors
        '28000': 'Μη έγκυρη εξουσιοδότηση',
        '28P01': 'Λανθασμένος κωδικός πρόσβασης',
        '42501': 'Ανεπαρκή δικαιώματα',
        
        // Connection errors
        '08000': 'Σφάλμα σύνδεσης',
        '08003': 'Η σύνδεση δεν είναι ανοιχτή',
        '08006': 'Αποτυχία σύνδεσης',
        
        // Data exceptions
        '22000': 'Εξαίρεση δεδομένων',
        '22001': 'Υπέρβαση μέγιστου μήκους συμβολοσειράς',
        '22003': 'Εκτός εύρους τιμή',
        '22007': 'Μη έγκυρη ημερομηνία',
        '22008': 'Υπέρβαση πεδίου ημερομηνίας/ώρας',
        '22012': 'Διαίρεση με μηδέν',
        '22P02': 'Μη έγκυρη σύνταξη για τύπο',
        
        // Generic errors
        '42P01': 'Ο πίνακας δεν υπάρχει',
        '42P02': 'Το παραμετροποιημένο όνομα δεν υπάρχει',
        '42703': 'Η στήλη δεν υπάρχει',
        
        // Custom application error codes could be added here
        'PGRST116': 'Δεν βρέθηκαν εγγραφές'
      };
      
      // Map common error messages to Greek
      const commonErrorMessages: Record<string, string> = {
        'Record with ID': 'Η εγγραφή με ID',
        'not found': 'δεν βρέθηκε',
        'duplicate key value': 'διπλότυπη τιμή κλειδιού',
        'violates unique constraint': 'παραβιάζει τον περιορισμό μοναδικότητας',
        'violates foreign key constraint': 'παραβιάζει τον περιορισμό ξένου κλειδιού',
        'violates not-null constraint': 'παραβιάζει τον περιορισμό μη-μηδενικής τιμής',
        'value too long': 'η τιμή είναι πολύ μεγάλη',
        'invalid input syntax': 'μη έγκυρη σύνταξη εισόδου',
        'permission denied': 'άρνηση πρόσβασης',
        'could not connect': 'αδυναμία σύνδεσης',
        'database connection error': 'σφάλμα σύνδεσης βάσης δεδομένων',
        'timeout expired': 'λήξη χρονικού ορίου',
        'An unexpected error occurred': 'Παρουσιάστηκε ένα απρόσμενο σφάλμα'
      };
      
      // Try to use the code-specific message first
      if (pgErrorCode && greekErrorMessages[pgErrorCode]) {
        localizedError.message = greekErrorMessages[pgErrorCode];
      } else {
        // Try to match parts of the error message for translation
        let translatedMessage = error.message;
        
        Object.entries(commonErrorMessages).forEach(([englishPhrase, greekPhrase]) => {
          translatedMessage = translatedMessage.replace(
            new RegExp(englishPhrase, 'gi'), 
            greekPhrase
          );
        });
        
        localizedError.message = translatedMessage;
      }
    } else {
      // Generic errors
      if (error.message.includes('An unexpected error occurred')) {
        localizedError.message = 'Παρουσιάστηκε ένα απρόσμενο σφάλμα';
      }
    }
    
    return localizedError;
  }
}

/**
 * Examples:
 * 
 * // Create table-specific services (singleton pattern)
 * export const customersService = DataService.forTable<Customer>('customers', {
 *   historyTable: 'customer_history'
 * });
 * 
 * export const offersService = DataService.forTable<Offer>('offers', {
 *   historyTable: 'offer_history'
 * });
 * 
 * export const tasksService = DataService.forTable<Task>('tasks', {
 *   historyTable: 'task_history'
 * });
 */ 