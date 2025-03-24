/**
 * Error handling utility functions
 * 
 * This module provides standardized error handling utilities used across the application.
 * These utilities ensure consistent error management, logging, and user feedback.
 * 
 * @module errorUtils
 */

import { logError } from './loggingUtils';

/**
 * Error types for categorizing errors in the application
 */
export enum ErrorType {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATA_FETCH = 'data_fetch',
  DATA_SUBMIT = 'data_submit',
  API = 'api',
  NETWORK = 'network',
  INTERNAL = 'internal',
  UNEXPECTED = 'unexpected'
}

/**
 * Structure for a standardized error response
 */
export interface ErrorResponse {
  message: string;
  type: ErrorType;
  status?: number;
  details?: Record<string, any>;
  originalError?: any;
}

/**
 * Creates a standardized error response object
 * 
 * @param message - User-friendly error message
 * @param type - Type of error (from ErrorType enum)
 * @param originalError - Original error object
 * @param status - HTTP status code (if applicable)
 * @param details - Additional error details
 * @returns Standardized error response object
 * 
 * @example
 * ```typescript
 * // Create a validation error
 * const error = createError(
 *   "Please check the form for errors",
 *   ErrorType.VALIDATION,
 *   originalError,
 *   400,
 *   { field: "email", issue: "Invalid format" }
 * );
 * ```
 * 
 * Used in:
 * - src/components/customers/CustomerForm.tsx
 * - src/components/offers/OffersPage.tsx
 */
export function createError(
  message: string,
  type: ErrorType = ErrorType.UNEXPECTED,
  originalError?: any,
  status?: number,
  details?: Record<string, any>
): ErrorResponse {
  // Log the error
  logError(`[${type}] ${message}`, originalError, 'errorUtils');
  
  return {
    message,
    type,
    status,
    details,
    originalError
  };
}

/**
 * Handles a Supabase error and returns a standardized error response
 * 
 * @param error - Supabase error object
 * @param context - Context in which the error occurred
 * @param friendlyMessage - Override the default user-friendly message
 * @returns Standardized error response
 * 
 * @example
 * ```typescript
 * try {
 *   const { data, error } = await supabase.from('customers').select('*');
 *   if (error) {
 *     const handledError = handleSupabaseError(error, 'Fetching customers');
 *     showError(handledError.message);
 *     return;
 *   }
 *   // Process data
 * } catch (err) {
 *   const handledError = handleSupabaseError(err, 'Fetching customers');
 *   showError(handledError.message);
 * }
 * ```
 * 
 * Used in:
 * - src/components/customers/CustomerForm.tsx
 * - src/components/offers/OffersPage.tsx
 */
export function handleSupabaseError(
  error: any,
  context: string = 'database operation',
  friendlyMessage?: string
): ErrorResponse {
  // Default user-friendly message
  const defaultMessage = friendlyMessage || `An error occurred while ${context}. Please try again.`;
  
  // If no error, return a generic error
  if (!error) {
    return createError(defaultMessage, ErrorType.UNEXPECTED);
  }
  
  // Determine error type
  let errorType = ErrorType.UNEXPECTED;
  let errorMessage = defaultMessage;
  let statusCode: number | undefined = undefined;
  
  // Extract error code and message
  const errorCode = error.code || '';
  const originalMessage = error.message || '';
  const status = error.status || undefined;
  
  // Match error codes to types
  if (errorCode === '22P02') {
    // Invalid parameter type
    errorType = ErrorType.VALIDATION;
    errorMessage = 'Invalid data format was provided.';
  } else if (errorCode === '23505') {
    // Unique violation
    errorType = ErrorType.VALIDATION;
    errorMessage = 'This record already exists.';
  } else if (errorCode === '23503') {
    // Foreign key violation
    errorType = ErrorType.VALIDATION;
    errorMessage = 'This operation would violate database relationships.';
  } else if (errorCode === '42501' || errorCode === '42P01' || errorCode === 'PGRST116') {
    // Permission/policy violation
    errorType = ErrorType.AUTHORIZATION;
    errorMessage = 'You do not have permission to perform this action.';
  } else if (errorCode === '3D000') {
    // Database does not exist
    errorType = ErrorType.INTERNAL;
    errorMessage = 'Database configuration error. Please contact support.';
  } else if (errorCode === '28P01') {
    // Invalid password
    errorType = ErrorType.AUTHENTICATION;
    errorMessage = 'Authentication failed. Please check your credentials.';
  } else if (status === 401) {
    // Unauthorized
    errorType = ErrorType.AUTHENTICATION;
    errorMessage = 'Authentication required. Please log in again.';
  } else if (status === 403) {
    // Forbidden
    errorType = ErrorType.AUTHORIZATION;
    errorMessage = 'You do not have permission to perform this action.';
  } else if (status === 404) {
    // Not found
    errorType = ErrorType.DATA_FETCH;
    errorMessage = 'The requested resource was not found.';
  } else if (status === 500) {
    // Server error
    errorType = ErrorType.API;
    errorMessage = 'A server error occurred. Please try again later.';
  } else if (status === 503 || status === 504) {
    // Service unavailable or gateway timeout
    errorType = ErrorType.NETWORK;
    errorMessage = 'The service is temporarily unavailable. Please try again later.';
  }
  
  return createError(
    errorMessage,
    errorType,
    error,
    statusCode || status,
    {
      context,
      originalMessage,
      code: errorCode
    }
  );
}

/**
 * Handles errors from a form submission
 * 
 * @param error - The error that occurred during form submission
 * @param formName - Name of the form for context
 * @returns Standardized error response
 * 
 * @example
 * ```typescript
 * try {
 *   await saveCustomer(customerData);
 * } catch (error) {
 *   const handledError = handleFormError(error, 'customer');
 *   setFormError(handledError.message);
 * }
 * ```
 * 
 * Used in:
 * - src/components/customers/CustomerForm.tsx
 * - src/components/offers/OfferForm.tsx
 */
export function handleFormError(error: any, formName: string): ErrorResponse {
  // Default message
  const defaultMessage = `Failed to save ${formName}. Please check your input and try again.`;
  
  // Handle validation errors
  if (error && error.details && error.details.validationErrors) {
    const validationErrors = error.details.validationErrors;
    
    // Create a readable message from validation errors
    const errorMessages = Object.entries(validationErrors)
      .map(([field, message]) => `${field}: ${message}`)
      .join(', ');
    
    return createError(
      `Please fix the following errors: ${errorMessages}`,
      ErrorType.VALIDATION,
      error,
      400,
      { validationErrors }
    );
  }
  
  // Handle Supabase errors
  if (error && (error.code || error.statusCode || error.status)) {
    return handleSupabaseError(error, `saving ${formName}`, defaultMessage);
  }
  
  // Generic error fallback
  return createError(
    defaultMessage,
    ErrorType.DATA_SUBMIT,
    error
  );
}

/**
 * Creates an appropriate user-facing message for system errors
 * 
 * @param error - The error object
 * @param defaultTitle - Default title to use if error type can't be determined
 * @returns Object containing error title and message for display
 * 
 * @example
 * ```typescript
 * try {
 *   await fetchData();
 * } catch (error) {
 *   const { title, message } = getUserErrorMessage(error);
 *   showErrorDialog(title, message);
 * }
 * ```
 * 
 * Used in:
 * - src/components/customers/CustomerDetailPage.tsx
 * - src/components/offers/OffersPage.tsx
 */
export function getUserErrorMessage(
  error: any,
  defaultTitle: string = 'Error'
): { title: string; message: string } {
  // If it's already our standard error format
  if (error && error.type && error.message) {
    // Set title based on error type
    let title;
    switch (error.type) {
      case ErrorType.VALIDATION:
        title = 'Validation Error';
        break;
      case ErrorType.AUTHENTICATION:
        title = 'Authentication Error';
        break;
      case ErrorType.AUTHORIZATION:
        title = 'Permission Error';
        break;
      case ErrorType.DATA_FETCH:
        title = 'Data Load Error';
        break;
      case ErrorType.DATA_SUBMIT:
        title = 'Save Error';
        break;
      case ErrorType.NETWORK:
        title = 'Network Error';
        break;
      default:
        title = 'System Error';
    }
    
    return { title, message: error.message };
  }
  
  // Handle Error objects
  if (error instanceof Error) {
    // Network error detection
    if (error.message.includes('Network') || error.message.includes('fetch')) {
      return {
        title: 'Network Error',
        message: 'Unable to connect to the server. Please check your internet connection and try again.'
      };
    }
    
    return { title: defaultTitle, message: error.message };
  }
  
  // String errors
  if (typeof error === 'string') {
    return { title: defaultTitle, message: error };
  }
  
  // Fallback for unknown error types
  return {
    title: defaultTitle,
    message: 'An unexpected error occurred. Please try again or contact support if the problem persists.'
  };
}

/**
 * Checks if the error is a network connectivity error
 * 
 * @param error - Error to analyze
 * @returns True if it's a network error
 * 
 * @example
 * ```typescript
 * try {
 *   await fetchData();
 * } catch (error) {
 *   if (isNetworkError(error)) {
 *     showOfflineIndicator();
 *   } else {
 *     showErrorMessage(error);
 *   }
 * }
 * ```
 * 
 * Used in:
 * - src/lib/api.ts
 * - src/components/common/DataLoader.tsx
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;
  
  // Handle strings
  if (typeof error === 'string') {
    const lowercased = error.toLowerCase();
    return (
      lowercased.includes('network') || 
      lowercased.includes('offline') || 
      lowercased.includes('internet') ||
      lowercased.includes('connection') ||
      lowercased.includes('unreachable')
    );
  }
  
  // Handle error objects
  const message = error.message?.toLowerCase() || '';
  const name = error.name?.toLowerCase() || '';
  
  return (
    name === 'networkerror' ||
    message.includes('network') ||
    message.includes('offline') ||
    message.includes('internet') ||
    message.includes('connection') ||
    message.includes('unreachable') ||
    // Fetch API network errors
    error.code === 20 ||
    // Fetch API timeout errors
    error.code === 23
  );
}

/**
 * Extracts field-specific validation errors from an error object
 * 
 * @param error - Error to analyze
 * @returns Map of field names to error messages
 * 
 * @example
 * ```typescript
 * try {
 *   await submitForm(data);
 * } catch (error) {
 *   const fieldErrors = getFieldErrors(error);
 *   
 *   // Set field-specific errors
 *   Object.entries(fieldErrors).forEach(([field, message]) => {
 *     setFieldError(field, message);
 *   });
 * }
 * ```
 * 
 * Used in:
 * - src/components/customers/CustomerForm.tsx
 * - src/components/forms/FormContainer.tsx
 */
export function getFieldErrors(error: any): Record<string, string> {
  if (!error) return {};
  
  // If error has a structured validation errors object
  if (error.details?.validationErrors) {
    return error.details.validationErrors;
  }
  
  // If error has a fields property (common in form libraries)
  if (error.fields) {
    return error.fields;
  }
  
  // If it's a Supabase constraint error, try to extract field name
  if (error.code === '23505' && error.details?.includes('constraint')) {
    // Extract field name from constraint like "customers_email_key"
    const constraintMatch = /(\w+)_(\w+)_key/.exec(error.details);
    if (constraintMatch && constraintMatch[2]) {
      const field = constraintMatch[2];
      return { [field]: `This ${field} is already in use` };
    }
  }
  
  return {};
}

// Export all utilities
export default {
  createError,
  handleSupabaseError,
  handleFormError,
  getUserErrorMessage,
  isNetworkError,
  getFieldErrors,
  ErrorType
}; 