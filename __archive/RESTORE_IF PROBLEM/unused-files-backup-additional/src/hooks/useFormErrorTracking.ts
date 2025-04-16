import { useEffect, useCallback } from 'react';
import { useForm, UseFormReturn, FieldValues, FieldErrors } from 'react-hook-form';
import formErrorTrackingService, { ErrorType } from '@/services/formErrorTrackingService';

interface UseFormErrorTrackingProps<T extends FieldValues> {
  formMethods: UseFormReturn<T>;
  formLinkId: string;
  enabled?: boolean;
}

/**
 * Hook for integrating form error tracking with React Hook Form
 * @param params - Configuration for error tracking
 * @returns Form methods with error tracking
 */
export function useFormErrorTracking<T extends FieldValues>({
  formMethods,
  formLinkId,
  enabled = true
}: UseFormErrorTrackingProps<T>) {
  const { formState } = formMethods;
  
  // Track form validation errors
  useEffect(() => {
    if (!enabled || !formLinkId) return;
    
    // Process validation errors and track them
    const trackErrors = async (errors: FieldErrors<T>) => {
      // Skip if no errors or empty object
      if (!errors || Object.keys(errors).length === 0) return;
      
      // Process each error
      for (const [fieldName, error] of Object.entries(errors)) {
        if (error && error.message) {
          await formErrorTrackingService.trackValidationError(
            formLinkId,
            fieldName,
            error.message as string
          );
        }
      }
    };
    
    // Only track when form is submitted and has errors
    if (formState.isSubmitted && !formState.isValid) {
      trackErrors(formState.errors);
    }
  }, [enabled, formLinkId, formState.errors, formState.isSubmitted, formState.isValid]);
  
  // Track API submission errors
  const trackSubmissionError = useCallback(
    async (errorMessage: string, metadata?: Record<string, any>) => {
      if (!enabled || !formLinkId) return;
      
      await formErrorTrackingService.trackSubmissionError(
        formLinkId,
        errorMessage,
        metadata
      );
    },
    [enabled, formLinkId]
  );
  
  // Track API errors
  const trackApiError = useCallback(
    async (errorMessage: string, endpoint?: string, statusCode?: number) => {
      if (!enabled || !formLinkId) return;
      
      await formErrorTrackingService.trackApiError(
        formLinkId,
        errorMessage,
        endpoint,
        statusCode
      );
    },
    [enabled, formLinkId]
  );
  
  // Track connectivity errors
  const trackConnectivityError = useCallback(
    async (errorMessage: string) => {
      if (!enabled || !formLinkId) return;
      
      await formErrorTrackingService.trackConnectivityError(
        formLinkId,
        errorMessage
      );
    },
    [enabled, formLinkId]
  );
  
  // Add error tracking to handle errors from form submission
  const handleSubmitWithErrorTracking = useCallback(
    (onValid: (data: T) => void, onInvalid?: (errors: FieldErrors<T>) => void) => {
      return formMethods.handleSubmit(
        onValid,
        (errors) => {
          // Track validation errors on submission
          if (enabled && formLinkId && Object.keys(errors).length > 0) {
            for (const [fieldName, error] of Object.entries(errors)) {
              if (error && error.message) {
                formErrorTrackingService.trackValidationError(
                  formLinkId,
                  fieldName,
                  error.message as string
                );
              }
            }
          }
          
          // Call original onInvalid if provided
          if (onInvalid) {
            onInvalid(errors);
          }
        }
      );
    },
    [enabled, formLinkId, formMethods]
  );
  
  // Get error statistics
  const getErrorStatistics = useCallback(() => {
    return formErrorTrackingService.getErrorStatistics();
  }, []);
  
  // Clear error state
  const clearErrorState = useCallback(() => {
    formErrorTrackingService.clearErrorState();
  }, []);
  
  // Return augmented form methods
  return {
    ...formMethods,
    handleSubmitWithErrorTracking,
    trackSubmissionError,
    trackApiError,
    trackConnectivityError,
    getErrorStatistics,
    clearErrorState
  };
} 