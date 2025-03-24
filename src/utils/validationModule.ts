/**
 * Unified Validation Module
 * 
 * This module consolidates all validation functionality across the application,
 * providing a consistent interface for data validation, form validation, and
 * field validation.
 * 
 * It combines the functionality from formValidation.ts and validationUtils.ts
 * into a single, coherent module with clear separation of concerns.
 * 
 * MIGRATION STATUS:
 * This module is currently in preparation for replacing both formValidation.ts and validationUtils.ts.
 * It is not yet used across the application. To use this module instead of the separate validation modules:
 * 
 * 1. Update import statements in components:
 *    - Replace: import { useFormValidation } from '@/utils/formValidation';
 *    - With:    import { useFormValidation } from '@/utils/validationModule';
 * 
 * 2. Update the utils/index.ts to export from this module instead of the separate ones
 * 
 * 3. Once all components have been migrated, the separate validation modules can be removed
 * 
 * @module validationModule
 */

import { useState, useEffect } from 'react';
import { createPrefixedLogger } from './loggingUtils';

const logger = createPrefixedLogger('validation');

/**
 * ===========================================================================
 * SHARED VALIDATION PATTERNS AND MESSAGES
 * ===========================================================================
 */

/**
 * Regular expression patterns for common validations
 */
export const ValidationPatterns = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^(\+?30)?\s*[0-9]{3}\s*[0-9]{7,8}$/,
  afm: /^[0-9]{9}$/,
  mobile: /^(\+?30)?\s*69\d{8}$/,
  number: /^[0-9]+$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  url: /^(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+([\/\w-]*)*\/?$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
  greekDate: /^\d{2}\/\d{2}\/\d{4}$/
};

/**
 * Validation messages in Greek
 */
export const ValidationMessages = {
  required: 'Παρακαλώ συμπληρώστε αυτό το πεδίο',
  requiredSelect: 'Παρακαλώ επιλέξτε μια τιμή',
  email: 'Παρακαλώ συμπληρώστε έγκυρο email',
  pattern: 'Η μορφή δεν είναι σωστή',
  minLength: (length: number) => `Ελάχιστο μήκος: ${length} χαρακτήρες`,
  maxLength: (length: number) => `Μέγιστο μήκος: ${length} χαρακτήρες`,
  phone: 'Παρακαλώ συμπληρώστε έγκυρο αριθμό τηλεφώνου',
  mobile: 'Παρακαλώ συμπληρώστε έγκυρο αριθμό κινητού τηλεφώνου',
  afm: 'Το ΑΦΜ πρέπει να αποτελείται από 9 ψηφία',
  number: 'Παρακαλώ εισάγετε έναν αριθμό',
  url: 'Παρακαλώ εισάγετε έγκυρη διεύθυνση URL',
  date: 'Παρακαλώ εισάγετε έγκυρη ημερομηνία',
  custom: (message: string) => message,
  invalidValue: 'Παρακαλώ εισάγετε έγκυρη τιμή'
};

/**
 * English validation messages for code documentation examples
 */
export const ValidationMessagesEN = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  phone: 'Please enter a valid phone number',
  afm: 'Tax ID must have 9 digits',
  // Add more as needed
};

/**
 * ===========================================================================
 * CORE VALIDATION FUNCTIONS
 * ===========================================================================
 */

/**
 * Result of a validation check
 */
export interface ValidationResult {
  /** Whether the validation passed */
  isValid: boolean;
  /** Error message if validation failed */
  message: string;
}

/**
 * A function that validates a value and returns a ValidationResult
 */
export type ValidationFunction = (value: string) => ValidationResult;

/**
 * Create a successful validation result
 */
export function validResult(): ValidationResult {
  return { isValid: true, message: '' };
}

/**
 * Create a failed validation result
 * 
 * @param message - Error message
 */
export function invalidResult(message: string): ValidationResult {
  return { isValid: false, message };
}

/**
 * Validates that a value is not empty
 * 
 * @param value - The value to validate
 * @param customMessage - Optional custom error message
 * @returns Validation result
 */
export function validateRequired(value: string, customMessage?: string): ValidationResult {
  if (!value || value.trim() === '') {
    return invalidResult(customMessage || ValidationMessages.required);
  }
  return validResult();
}

/**
 * Validates that a value matches a regular expression pattern
 * 
 * @param value - The value to validate
 * @param pattern - The regular expression pattern
 * @param customMessage - Optional custom error message
 * @returns Validation result
 */
export function validatePattern(value: string, pattern: RegExp, customMessage?: string): ValidationResult {
  if (!value) {
    return validResult(); // Empty value is valid unless required is specified
  }
  
  if (!pattern.test(value)) {
    return invalidResult(customMessage || ValidationMessages.pattern);
  }
  
  return validResult();
}

/**
 * Validates that a value has a length within specified limits
 * 
 * @param value - The value to validate
 * @param minLength - Minimum allowed length
 * @param maxLength - Maximum allowed length
 * @returns Validation result
 */
export function validateLength(
  value: string, 
  minLength?: number, 
  maxLength?: number
): ValidationResult {
  if (!value) {
    return validResult(); // Empty value is valid unless required is specified
  }
  
  if (minLength !== undefined && value.length < minLength) {
    return invalidResult(ValidationMessages.minLength(minLength));
  }
  
  if (maxLength !== undefined && value.length > maxLength) {
    return invalidResult(ValidationMessages.maxLength(maxLength));
  }
  
  return validResult();
}

/**
 * Validates an email address
 * 
 * @param email - Email to validate
 * @param customMessage - Optional custom error message
 * @returns Validation result
 */
export function validateEmail(email: string, customMessage?: string): ValidationResult {
  if (!email) {
    return validResult(); // Empty email is valid unless required is specified
  }
  
  return validatePattern(
    email,
    ValidationPatterns.email,
    customMessage || ValidationMessages.email
  );
}

/**
 * Validates a phone number
 * 
 * @param phone - Phone number to validate
 * @param requireMobilePrefix - Whether to require mobile prefix (69)
 * @param customMessage - Optional custom error message
 * @returns Validation result
 */
export function validatePhone(
  phone: string, 
  requireMobilePrefix = false,
  customMessage?: string
): ValidationResult {
  if (!phone) {
    return validResult(); // Empty phone is valid unless required is specified
  }
  
  // Remove spaces, hyphens, and parentheses
  const normalizedPhone = phone.replace(/[\s\-()]/g, '');
  
  // If mobile prefix is required, use the mobile pattern
  const pattern = requireMobilePrefix 
    ? ValidationPatterns.mobile 
    : ValidationPatterns.phone;
  
  return validatePattern(
    normalizedPhone,
    pattern,
    customMessage || (requireMobilePrefix 
      ? ValidationMessages.mobile 
      : ValidationMessages.phone)
  );
}

/**
 * Validates a Greek Tax ID (ΑΦΜ)
 * 
 * @param afm - Tax ID to validate
 * @param customMessage - Optional custom error message
 * @returns Validation result
 */
export function validateAfm(afm: string, customMessage?: string): ValidationResult {
  if (!afm) {
    return validResult(); // Empty AFM is valid unless required is specified
  }
  
  // First check the pattern
  const patternResult = validatePattern(
    afm,
    ValidationPatterns.afm,
    customMessage || ValidationMessages.afm
  );
  
  if (!patternResult.isValid) {
    return patternResult;
  }
  
  // Implementation of AFM validation algorithm could be added here
  // Currently just checking if it's 9 digits
  
  return validResult();
}

/**
 * Validates a URL
 * 
 * @param url - URL to validate
 * @param requireProtocol - Whether to require http/https protocol
 * @param customMessage - Optional custom error message
 * @returns Validation result
 */
export function validateUrl(
  url: string, 
  requireProtocol = false,
  customMessage?: string
): ValidationResult {
  if (!url) {
    return validResult(); // Empty URL is valid unless required is specified
  }
  
  // If protocol is required but not present, consider invalid
  if (requireProtocol && !/^https?:\/\//i.test(url)) {
    return invalidResult(customMessage || ValidationMessages.url);
  }
  
  // Add protocol if missing for validation purposes
  let testUrl = url;
  if (!/^https?:\/\//i.test(url)) {
    testUrl = `https://${url}`;
  }
  
  try {
    // Use URL constructor for validation
    new URL(testUrl);
    return validResult();
  } catch (e) {
    return invalidResult(customMessage || ValidationMessages.url);
  }
}

/**
 * Runs multiple validation functions on a value and returns the first error
 * 
 * @param value - The value to validate
 * @param validators - Array of validation functions to apply
 * @returns The first validation error or valid result
 */
export function validateMultiple(
  value: string,
  validators: ValidationFunction[]
): ValidationResult {
  for (const validator of validators) {
    const result = validator(value);
    if (!result.isValid) {
      return result;
    }
  }
  return validResult();
}

/**
 * ===========================================================================
 * FORM VALIDATION
 * ===========================================================================
 */

/**
 * Validation rule for a form field
 */
export interface ValidationRule {
  required?: boolean;
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  customValidation?: (value: string) => boolean;
  errorMessage?: string;
}

/**
 * Validation status for a form field
 */
export interface ValidationStatus {
  isValid: boolean;
  errorMessage: string;
}

/**
 * Form validation state tracking validation status for each field
 */
export interface FormValidationState {
  [fieldName: string]: ValidationStatus;
}

/**
 * Custom hook for form validation
 * 
 * @param initialState - Initial form values
 * @returns Form validation utilities
 */
export function useFormValidation(initialState: Record<string, string> = {}) {
  const [values, setValues] = useState(initialState);
  const [validationRules, setValidationRules] = useState<Record<string, ValidationRule>>({});
  const [formValidation, setFormValidation] = useState<FormValidationState>({});
  
  /**
   * Set validation rules for a field
   */
  const setFieldValidation = (fieldName: string, rules: ValidationRule) => {
    setValidationRules(prev => ({
      ...prev,
      [fieldName]: rules
    }));
  };
  
  /**
   * Validate a single field
   */
  const validateField = (name: string, value: string): ValidationStatus => {
    const rules = validationRules[name];
    
    if (!rules) {
      return { isValid: true, errorMessage: '' };
    }
    
    // Check required
    if (rules.required && (!value || value.trim() === '')) {
      return {
        isValid: false,
        errorMessage: rules.errorMessage || ValidationMessages.required
      };
    }
    
    // Skip other validations if empty (and not required)
    if (!value || value.trim() === '') {
      return { isValid: true, errorMessage: '' };
    }
    
    // Check pattern
    if (rules.pattern && !rules.pattern.test(value)) {
      return {
        isValid: false,
        errorMessage: rules.errorMessage || ValidationMessages.pattern
      };
    }
    
    // Check min length
    if (rules.minLength && value.length < rules.minLength) {
      return {
        isValid: false,
        errorMessage: rules.errorMessage || ValidationMessages.minLength(rules.minLength)
      };
    }
    
    // Check max length
    if (rules.maxLength && value.length > rules.maxLength) {
      return {
        isValid: false,
        errorMessage: rules.errorMessage || ValidationMessages.maxLength(rules.maxLength)
      };
    }
    
    // Custom validation
    if (rules.customValidation && !rules.customValidation(value)) {
      return {
        isValid: false,
        errorMessage: rules.errorMessage || ValidationMessages.invalidValue
      };
    }
    
    return { isValid: true, errorMessage: '' };
  };
  
  /**
   * Handle form input changes
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setValues(prev => ({
      ...prev,
      [name]: value
    }));
    
    const validationResult = validateField(name, value);
    
    setFormValidation(prev => ({
      ...prev,
      [name]: validationResult
    }));
  };
  
  /**
   * Validate all form fields
   */
  const validateForm = (): boolean => {
    const newValidation: FormValidationState = {};
    let isValid = true;
    
    // Validate each field
    for (const [fieldName, fieldValue] of Object.entries(values)) {
      const validationResult = validateField(fieldName, fieldValue);
      newValidation[fieldName] = validationResult;
      
      if (!validationResult.isValid) {
        isValid = false;
      }
    }
    
    setFormValidation(newValidation);
    return isValid;
  };
  
  /**
   * Set a field error manually
   */
  const setFieldError = (fieldName: string, errorMessage: string) => {
    setFormValidation(prev => ({
      ...prev,
      [fieldName]: { isValid: false, errorMessage }
    }));
  };
  
  /**
   * Reset the form
   */
  const resetForm = (newValues = initialState) => {
    setValues(newValues);
    setFormValidation({});
  };
  
  return {
    values,
    setValues,
    errors: formValidation,
    setFieldValidation,
    validateField,
    handleChange,
    validateForm,
    setFieldError,
    resetForm
  };
}

/**
 * ===========================================================================
 * HTML FORM ELEMENT VALIDATION
 * ===========================================================================
 */

/**
 * Set up custom validation messages for form elements
 * This overrides the browser's default validation messages with localized messages
 */
export function setupCustomValidationMessages(): void {
  try {
    // Setup input validation
    const originalInputValidation = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'validationMessage'
    );

    Object.defineProperty(HTMLInputElement.prototype, 'validationMessage', {
      get: function() {
        if (!this.validity.valid) {
          if (this.validity.valueMissing) {
            return ValidationMessages.required;
          } else if (this.validity.typeMismatch) {
            if (this.type === 'email') {
              return ValidationMessages.email;
            } else if (this.type === 'number') {
              return ValidationMessages.number;
            } else if (this.type === 'url') {
              return ValidationMessages.url;
            } else if (this.type === 'date') {
              return ValidationMessages.date;
            }
            return ValidationMessages.invalidValue;
          } else if (this.validity.patternMismatch) {
            if (this.getAttribute('pattern') === ValidationPatterns.afm.toString()) {
              return ValidationMessages.afm;
            } else if (this.getAttribute('pattern') === ValidationPatterns.phone.toString()) {
              return ValidationMessages.phone;
            }
            return ValidationMessages.pattern;
          } else if (this.validity.tooShort) {
            const minLength = this.getAttribute('minlength');
            return ValidationMessages.minLength(minLength ? parseInt(minLength, 10) : 0);
          } else if (this.validity.tooLong) {
            const maxLength = this.getAttribute('maxlength');
            return ValidationMessages.maxLength(maxLength ? parseInt(maxLength, 10) : 0);
          }
        }
        return originalInputValidation?.get?.call(this) || '';
      },
      configurable: true
    });

    // Setup textarea validation
    const originalTextareaValidation = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      'validationMessage'
    );

    Object.defineProperty(HTMLTextAreaElement.prototype, 'validationMessage', {
      get: function() {
        if (!this.validity.valid) {
          if (this.validity.valueMissing) {
            return ValidationMessages.required;
          } else if (this.validity.tooShort) {
            const minLength = this.getAttribute('minlength');
            return ValidationMessages.minLength(minLength ? parseInt(minLength, 10) : 0);
          } else if (this.validity.tooLong) {
            const maxLength = this.getAttribute('maxlength');
            return ValidationMessages.maxLength(maxLength ? parseInt(maxLength, 10) : 0);
          }
        }
        return originalTextareaValidation?.get?.call(this) || '';
      },
      configurable: true
    });

    // Setup select validation
    const originalSelectValidation = Object.getOwnPropertyDescriptor(
      HTMLSelectElement.prototype,
      'validationMessage'
    );

    Object.defineProperty(HTMLSelectElement.prototype, 'validationMessage', {
      get: function() {
        if (!this.validity.valid && this.validity.valueMissing) {
          return ValidationMessages.requiredSelect;
        }
        return originalSelectValidation?.get?.call(this) || '';
      },
      configurable: true
    });
  } catch (e) {
    logger.error('Failed to set up custom validation messages', e);
  }
}

/**
 * Set a custom validation message for a form element
 * 
 * @param event - Form event
 * @param message - Custom validation message
 */
export function setCustomValidationMessage(
  event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  message: string = ''
): void {
  const element = event.target as HTMLInputElement;
  element.setCustomValidity(message);
}

/**
 * Check if all required fields in a form are filled
 * 
 * @param form - Form element
 * @returns Whether all required fields are filled
 */
export function checkRequiredFields(form: HTMLFormElement): boolean {
  const requiredInputs = form.querySelectorAll('[required]');
  
  for (let i = 0; i < requiredInputs.length; i++) {
    const input = requiredInputs[i] as HTMLInputElement;
    if (!input.value.trim()) {
      input.focus();
      return false;
    }
  }
  
  return true;
}

/**
 * ===========================================================================
 * EXPORT VALIDATION MODULE
 * ===========================================================================
 */

/**
 * Unified validation module for easy imports
 */
export const validation = {
  // Core validation
  validateRequired,
  validatePattern,
  validateLength,
  validateEmail,
  validatePhone,
  validateAfm,
  validateUrl,
  validateMultiple,
  
  // Form validation
  useFormValidation,
  setupCustomValidationMessages,
  setCustomValidationMessage,
  checkRequiredFields,
  
  // Constants
  patterns: ValidationPatterns,
  messages: ValidationMessages,
  
  // Helper functions
  validResult,
  invalidResult
};

export default validation; 