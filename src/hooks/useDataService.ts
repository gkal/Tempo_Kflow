import React, { useState, useCallback, useEffect } from 'react';
import { db } from '@/database';
import type { TableName, DbResponse } from '@/services/api/types';

// List of all tables
const TABLES: TableName[] = [
  'customers',
  'contacts',
  'offers',
  'offer_details',
  'tasks',
  'departments',
  'service_categories',
  'service_subcategories',
  'units',
  'materials',
  'brands',
  'contact_positions',
  'users',
  'comments',
  'notifications'
];

// Map snake_case table names to camelCase db service names
const TABLE_TO_SERVICE_MAP: Record<string, string> = {
  'customers': 'customers',
  'contacts': 'contacts',
  'offers': 'offers',
  'offer_details': 'offerDetails', 
  'tasks': 'tasks',
  'departments': 'departments',
  'service_categories': 'serviceCategories',
  'service_subcategories': 'serviceSubcategories',
  'units': 'units',
  'materials': 'materials',
  'brands': 'brands',
  'contact_positions': 'contactPositions',
  'users': 'users',
  'comments': 'comments',
  'notifications': 'notifications',
  'offer_history': 'offerHistory',
  'task_history': 'taskHistory',
  'resource_locks': 'resourceLocks',
  'history_logs': 'historyLogs'
};

/**
 * Hook for easy data service access in components
 * 
 * This hook provides a simplified interface for using the DataService
 * in React components, with built-in loading and error state management.
 * 
 * @param tableName - The database table to access
 * @param options - Optional configuration options
 * @returns Object with CRUD methods and state
 * 
 * @example
 * ```tsx
 * // In a component
 * const { 
 *   data: customers,
 *   loading,
 *   error,
 *   fetchAll,
 *   getById,
 *   create,
 *   update,
 *   softDelete,
 *   search
 * } = useDataService<Customer>('customers', { 
 *   language: 'en'
 * });
 * 
 * // Fetch all customers when component mounts
 * useEffect(() => {
 *   fetchAll();
 * }, [fetchAll]);
 * 
 * // Display data
 * return (
 *   <div>
 *     {loading && <p>Loading...</p>}
 *     {error && <p>Error: {error}</p>}
 *     {customers?.map(customer => (
 *       <div key={customer.id}>{customer.company_name}</div>
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useDataService<T extends Record<string, any>>(
  tableName: TableName,
  options: {
    language?: 'en' | 'el';
  } = {}
) {
  const [data, setData] = useState<T | T[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const defaultLanguage = options.language || 'en';

  // Store the last query options to re-fetch when real-time updates occur
  const lastQueryRef = React.useRef<any>(null);

  /**
   * Reset the error state
   */
  const resetError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Fetch all records with optional filtering, sorting, etc.
   */
  const fetchAll = useCallback(async (queryOptions?: {
    select?: string;
    filters?: Record<string, any>;
    order?: { column: string; ascending?: boolean };
    limit?: number;
    page?: number;
    range?: { from: number; to: number };
    includeDeleted?: boolean;
    language?: 'en' | 'el';
  }) => {
    setLoading(true);
    resetError();
    lastQueryRef.current = queryOptions;

    try {
      console.log(`[DataService] Fetching all records from table: ${tableName}`, { queryOptions });
      
      // Get the correct service name using the mapping
      const serviceName = TABLE_TO_SERVICE_MAP[tableName] || tableName;
      const service = db[serviceName as keyof typeof db];
      
      if (!service) {
        throw new Error(`No service found for table: ${tableName}`);
      }

      const response = await service.getAll({
        ...queryOptions,
        language: queryOptions?.language || defaultLanguage
      });

      console.log(`[DataService] Fetch result for ${tableName}:`, response);

      if (response.error) {
        throw response.error;
      }

      // Safe type assertion since we know the data matches T
      const typedData = (response.data || []) as unknown as T[];
      setData(typedData);
      return typedData;
    } catch (err) {
      const error = err as Error;
      console.error(`[DataService] Error fetching ${tableName}:`, error);
      setError(error.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [tableName, resetError, defaultLanguage]);

  /**
   * Get a single record by ID
   */
  const getById = useCallback(async (id: string, queryOptions?: {
    select?: string;
    includeDeleted?: boolean;
    language?: 'en' | 'el';
  }) => {
    setLoading(true);
    resetError();

    try {
      // Get the correct service name using the mapping
      const serviceName = TABLE_TO_SERVICE_MAP[tableName] || tableName;
      const service = db[serviceName as keyof typeof db];
      
      const response = await service.getById(id, {
        ...queryOptions,
        language: queryOptions?.language || defaultLanguage
      });

      if (response.error) {
        setError(response.error.message);
        return null;
      }

      // Use type assertion to ensure TypeScript knows the data is of the correct type
      const typedData = (response.data || {}) as unknown as T;
      setData(typedData);
      return typedData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [tableName, resetError, defaultLanguage]);

  /**
   * Create a new record
   */
  const create = useCallback(async (record: Partial<T>, createOptions?: {
    language?: 'en' | 'el';
  }) => {
    setLoading(true);
    resetError();

    try {
      // Get the correct service name using the mapping
      const serviceName = TABLE_TO_SERVICE_MAP[tableName] || tableName;
      const service = db[serviceName as keyof typeof db];
      
      const response = await service.create(record, {
        language: createOptions?.language || defaultLanguage
      });

      if (response.error) {
        setError(response.error.message);
        return null;
      }

      // If we have array data, add the new record to it
      if (data && Array.isArray(data)) {
        setData([...data, (response.data || {}) as unknown as T] as T[]);
      } else {
        setData((response.data || {}) as unknown as T);
      }

      return (response.data || {}) as unknown as T;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [tableName, data, resetError, defaultLanguage]);

  /**
   * Update a record
   */
  const update = useCallback(async (id: string, record: Partial<T>, updateOptions?: {
    language?: 'en' | 'el';
  }) => {
    setLoading(true);
    resetError();

    try {
      // Get the correct service name using the mapping
      const serviceName = TABLE_TO_SERVICE_MAP[tableName] || tableName;
      const service = db[serviceName as keyof typeof db];
      
      const response = await service.update(id, record, {
        language: updateOptions?.language || defaultLanguage
      });

      if (response.error) {
        setError(response.error.message);
        return null;
      }

      // Update data if it exists
      if (data) {
        if (Array.isArray(data)) {
          setData(data.map(item => 
            item[service.idField] === id 
              ? { ...item, ...(response.data || {}) as unknown as T } 
              : item
          ));
        } else if ((data as T)[service.idField] === id) {
          setData({ ...(data as T), ...(response.data || {}) as unknown as T });
        }
      }

      return (response.data || {}) as unknown as T;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [tableName, data, resetError, defaultLanguage]);

  /**
   * Soft delete a record
   */
  const softDelete = useCallback(async (id: string, deleteOptions?: {
    language?: 'en' | 'el';
  }) => {
    setLoading(true);
    resetError();

    try {
      // Get the correct service name using the mapping
      const serviceName = TABLE_TO_SERVICE_MAP[tableName] || tableName;
      const service = db[serviceName as keyof typeof db];
      
      const response = await service.softDelete(id, {
        language: deleteOptions?.language || defaultLanguage
      });

      if (response.error) {
        setError(response.error.message);
        return null;
      }

      // Remove from data if it exists
      if (data && Array.isArray(data)) {
        setData(data.filter(item => item[service.idField] !== id));
      } else if (data && (data as T)[service.idField] === id) {
        setData(null);
      }

      return (response.data || {}) as unknown as T;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [tableName, data, resetError, defaultLanguage]);

  /**
   * Search for records matching the query
   */
  const search = useCallback(async (query: string, searchOptions?: {
    fields?: string[];
    limit?: number;
    language?: 'en' | 'el';
  }) => {
    setLoading(true);
    resetError();

    try {
      // Get the correct service name using the mapping
      const serviceName = TABLE_TO_SERVICE_MAP[tableName] || tableName;
      const service = db[serviceName as keyof typeof db];
      
      // Check if the service has a search method
      if (!service.search) {
        throw new Error('Search is not supported for this table');
      }

      // Extract fields from the options
      const fields = searchOptions?.fields || [];
      // Create separate options object for other parameters
      const options = {
        limit: searchOptions?.limit,
        language: searchOptions?.language || defaultLanguage
      };

      // Call search with fields as second parameter and options as third
      const response = await service.search(query, fields, options);

      if (response.error) {
        setError(response.error.message);
        return null;
      }

      // Safe type assertion since we know the data matches T
      const typedData = (response.data || []) as unknown as T[];
      setData(typedData);
      return typedData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [tableName, resetError, defaultLanguage]);

  // Return the hook interface
  return {
    data,
    loading,
    error,
    resetError,
    fetchAll,
    getById,
    create,
    update,
    softDelete,
    search,
    // Allow refetching with the last query
    refetch: async () => lastQueryRef.current ? fetchAll(lastQueryRef.current) : fetchAll()
  };
} 