/**
 * API Utilities
 * 
 * A collection of utilities for working with API calls and responses.
 * These utilities provide standardized error handling, response parsing,
 * and common patterns for API operations.
 * 
 * Benefits:
 * - Consistent error handling across API calls
 * - Standardized response parsing
 * - Utilities for common API patterns (retry, timeout, etc.)
 * - Type-safe API responses
 * 
 * @module apiUtils
 */

import { PostgrestError } from '@supabase/supabase-js';
import logger from './loggingUtils';

/**
 * Standard API response format
 */
export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  status: 'success' | 'error';
  meta?: Record<string, any>;
}

/**
 * API error with standardized format
 */
export interface ApiError {
  message: string;
  code?: string;
  details?: any;
  status?: number;
}

/**
 * Options for API calls
 */
export interface ApiOptions {
  /** Number of retry attempts for the API call */
  retries?: number;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Whether to show loading indicators */
  showLoading?: boolean;
  /** Whether to handle errors automatically */
  handleErrors?: boolean;
}

/**
 * Default API options
 */
const defaultApiOptions: ApiOptions = {
  retries: 0,
  timeout: 30000,
  showLoading: true,
  handleErrors: true
};

/**
 * Create a standardized error object from various error types
 * 
 * @param error - Error from API call
 * @param context - Optional context information
 * @returns Standardized error object
 * 
 * Used in:
 * - API service layer
 * - Database operations
 * - Form submission handlers
 */
export function formatApiError(error: any, context?: string): ApiError {
  // Log detailed error information
  logger.error('API error occurred', error, context);
  
  // Handle Supabase PostgrestError
  if (isPostgrestError(error)) {
    return {
      message: error.message || 'Database error occurred',
      code: error.code,
      details: error.details,
      status: error.code === '23505' ? 409 : 500
    };
  }
  
  // Handle standard Error objects
  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'UNKNOWN_ERROR',
      details: error.stack
    };
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return {
      message: error,
      code: 'UNKNOWN_ERROR'
    };
  }
  
  // Handle unknown errors
  return {
    message: 'An unknown error occurred',
    code: 'UNKNOWN_ERROR',
    details: error
  };
}

/**
 * Type guard for PostgrestError
 */
function isPostgrestError(error: any): error is PostgrestError {
  return error && 
    typeof error === 'object' && 
    'code' in error && 
    'message' in error &&
    'details' in error;
}

/**
 * Create a success response
 * 
 * @param data - Response data
 * @param meta - Optional metadata
 * @returns Success response object
 */
export function createSuccessResponse<T>(data: T, meta?: Record<string, any>): ApiResponse<T> {
  return {
    data,
    error: null,
    status: 'success',
    meta
  };
}

/**
 * Create an error response
 * 
 * @param error - Error object or message
 * @param context - Optional context for the error
 * @returns Error response object
 */
export function createErrorResponse<T>(error: any, context?: string): ApiResponse<T> {
  return {
    data: null,
    error: formatApiError(error, context),
    status: 'error'
  };
}

/**
 * Safely execute an API call with standardized error handling
 * 
 * @param apiCall - Function that makes the API call
 * @param options - Options for the API call
 * @returns Standardized API response
 * 
 * @example
 * ```typescript
 * const { data, error } = await safeApiCall(
 *   () => supabase.from('customers').select('*'),
 *   { retries: 1 }
 * );
 * 
 * if (error) {
 *   // Handle error
 *   return;
 * }
 * 
 * // Use data
 * ```
 * 
 * Used in:
 * - API service layer
 * - Component data fetching
 * - Form submission handlers
 */
export async function safeApiCall<T>(
  apiCall: () => Promise<any>,
  options?: Partial<ApiOptions>
): Promise<ApiResponse<T>> {
  const opts = { ...defaultApiOptions, ...options };
  let retryCount = 0;
  
  // Show loading indicator if requested
  if (opts.showLoading) {
    // Implementation would depend on your loading state management
    // e.g., dispatch({ type: 'SET_LOADING', payload: true });
  }
  
  try {
    // Setup timeout if requested
    const timeoutPromise = opts.timeout 
      ? new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('API call timed out')), opts.timeout)
        )
      : null;
    
    // Retry logic
    while (true) {
      try {
        // Execute API call with optional timeout
        const result = timeoutPromise 
          ? await Promise.race([apiCall(), timeoutPromise])
          : await apiCall();
        
        // Handle Supabase-style responses with { data, error } pattern
        if (result && typeof result === 'object' && 'error' in result) {
          if (result.error) {
            throw result.error;
          }
          return createSuccessResponse<T>(result.data);
        }
        
        // Handle normal responses
        return createSuccessResponse<T>(result);
      } catch (error) {
        // Retry if we haven't exceeded retry count
        if (retryCount < (opts.retries || 0)) {
          retryCount++;
          // Exponential backoff: 300ms, 900ms, 2700ms, etc.
          const backoff = Math.min(30000, 300 * Math.pow(3, retryCount - 1));
          await new Promise(resolve => setTimeout(resolve, backoff));
          continue;
        }
        throw error;
      }
    }
  } catch (error) {
    // Handle errors if requested
    if (opts.handleErrors) {
      // Implementation would depend on your error handling strategy
      // e.g., showErrorNotification(formatApiError(error).message);
    }
    
    return createErrorResponse<T>(error);
  } finally {
    // Hide loading indicator if requested
    if (opts.showLoading) {
      // Implementation would depend on your loading state management
      // e.g., dispatch({ type: 'SET_LOADING', payload: false });
    }
  }
}

/**
 * Check if an API response is successful
 * 
 * @param response - API response to check
 * @returns Whether the response is successful
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiResponse<T> & { data: T } {
  return response.status === 'success' && response.data !== null;
}

/**
 * Parse API response data safely with type casting
 * 
 * @param response - Response from API
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed data or default value
 * 
 * Used in:
 * - API service layer
 * - Component data processing
 */
export function parseApiData<T, D = T>(response: any, defaultValue: D): T | D {
  try {
    if (!response || typeof response !== 'object') {
      return defaultValue;
    }
    
    // Handle Supabase-style responses
    if ('data' in response && 'error' in response) {
      return response.error ? defaultValue : (response.data as T);
    }
    
    // Handle standard JSON responses
    return response as T;
  } catch (error) {
    logger.error('Error parsing API data', error);
    return defaultValue;
  }
}

/**
 * Create an AbortController with timeout
 * 
 * @param timeoutMs - Timeout in milliseconds
 * @returns AbortController and signal
 * 
 * @example
 * ```typescript
 * const { controller, signal } = createTimeoutController(5000);
 * 
 * try {
 *   const response = await fetch('/api/data', { signal });
 *   // Process response
 * } catch (error) {
 *   if (error.name === 'AbortError') {
 *     console.log('Request timed out');
 *   }
 * }
 * ```
 */
export function createTimeoutController(timeoutMs: number = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  // Create a cleanup function to clear the timeout
  const cleanup = () => clearTimeout(timeoutId);
  
  return {
    controller,
    signal: controller.signal,
    cleanup
  };
}

/**
 * Convert API query parameters to a URL query string
 * 
 * @param params - Query parameters
 * @returns Formatted query string
 */
export function formatQueryParams(params: Record<string, any>): string {
  const validParams = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      // Handle arrays
      if (Array.isArray(value)) {
        return value.map(v => `${encodeURIComponent(key)}=${encodeURIComponent(v)}`).join('&');
      }
      // Handle objects by converting to JSON
      if (typeof value === 'object') {
        return `${encodeURIComponent(key)}=${encodeURIComponent(JSON.stringify(value))}`;
      }
      // Handle simple values
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join('&');
  
  return validParams ? `?${validParams}` : '';
}

// Default export with all utilities
export default {
  formatApiError,
  createSuccessResponse,
  createErrorResponse,
  safeApiCall,
  isSuccessResponse,
  parseApiData,
  createTimeoutController,
  formatQueryParams
}; 