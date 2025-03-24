/**
 * Validation Utilities
 * 
 * A comprehensive set of utility functions for validating data beyond form validation.
 * These utilities provide reusable validation logic for common data types across
 * the application, ensuring consistent data validation.
 * 
 * Relationship with formValidation.ts:
 * - formValidation.ts: Provides React-specific form validation hooks and rules
 * - validationUtils.ts: Provides pure validation functions for data validation
 * 
 * Files using these utilities:
 * - src/components/customers/*.tsx: Customer form validation
 * - src/components/offers/*.tsx: Offer creation/editing validation
 * - src/components/tasks/*.tsx: Task form validation
 * - src/components/settings/*.tsx: Settings form validation
 * 
 * Benefits:
 * - Consistent validation across the application
 * - Type-safe validation functions
 * - Support for complex validation scenarios
 * - Custom validation with meaningful error messages
 * 
 * @module validationUtils
 */

import { ValidationPatterns } from './formValidation';
import logger from './loggingUtils';

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
 * Check if a string is a valid email
 * 
 * @param email - Email to validate
 * @returns Validation result
 * 
 * Used in:
 * - src/components/customers/CustomerForm.tsx
 * - src/components/settings/UserManagementDialog.tsx
 */
export function validateEmail(email: string): ValidationResult {
  if (!email) {
    return invalidResult('Email is required');
  }
  
  // Use the email pattern from ValidationPatterns
  const emailPattern = ValidationPatterns.email;
  if (!emailPattern.test(email)) {
    return invalidResult('Invalid email format');
  }
  
  return validResult();
}

/**
 * Check if a string is a valid URL
 * 
 * @param url - URL to validate
 * @param requireProtocol - Whether to require http/https protocol
 * @returns Validation result
 * 
 * Used in:
 * - src/components/customers/CustomerForm.tsx
 * - src/components/offers/OfferForm.tsx
 */
export function validateUrl(url: string, requireProtocol = true): ValidationResult {
  if (!url) {
    return validResult(); // URLs are typically optional
  }
  
  // Add protocol if missing and required
  let testUrl = url;
  if (requireProtocol && !/^https?:\/\//i.test(url)) {
    testUrl = `https://${url}`;
  }
  
  try {
    // Use URL constructor for validation
    new URL(testUrl);
    return validResult();
  } catch (e) {
    return invalidResult('Invalid URL format');
  }
}

/**
 * Check if a string is a valid Greek Tax ID (AFM)
 * 
 * @param afm - AFM to validate
 * @returns Validation result
 * 
 * Used in:
 * - src/components/customers/CustomerForm.tsx
 * - src/components/contacts/ContactDialog.tsx
 */
export function validateAfm(afm: string): ValidationResult {
  if (!afm) {
    return invalidResult('Tax ID is required');
  }
  
  // Remove spaces
  afm = afm.replace(/\s/g, '');
  
  // Check format using the pattern from ValidationPatterns
  if (!ValidationPatterns.afm.test(afm)) {
    return invalidResult('Tax ID must be 9 digits');
  }
  
  // Validate checksum (Greek AFM validation algorithm)
  // Assuming the 9th digit is the check digit
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += parseInt(afm[i]) * Math.pow(2, 8 - i);
  }
  
  sum = sum % 11;
  if (sum === 10) sum = 0;
  
  // Check if the calculated check digit matches the provided one
  if (sum !== parseInt(afm[8])) {
    return invalidResult('Invalid Tax ID checksum');
  }
  
  return validResult();
}

/**
 * Check if a string is a valid Greek VAT number
 * 
 * @param vat - VAT number to validate
 * @returns Validation result
 * 
 * Used in:
 * - src/components/customers/CustomerForm.tsx
 */
export function validateVat(vat: string): ValidationResult {
  // For Greek VAT numbers, they're the same as AFM
  return validateAfm(vat);
}

/**
 * Check if a string is a valid Greek phone number
 * 
 * @param phone - Phone number to validate
 * @param requireMobilePrefix - Whether to require mobile prefix (6xx)
 * @returns Validation result
 * 
 * Used in:
 * - src/components/customers/CustomerForm.tsx
 * - src/components/contacts/ContactDialog.tsx
 */
export function validatePhone(phone: string, requireMobilePrefix = false): ValidationResult {
  if (!phone) {
    return validResult(); // Phone might be optional
  }
  
  // Remove non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Check basic format
  if (!ValidationPatterns.phone.test(digits)) {
    return invalidResult('Phone number must be 10 digits');
  }
  
  // Check if mobile prefix is required
  if (requireMobilePrefix && !digits.startsWith('6')) {
    return invalidResult('Mobile phone must start with 6');
  }
  
  return validResult();
}

/**
 * Check if a string is a valid date
 * 
 * @param dateStr - Date string to validate
 * @param format - Expected format (YYYY-MM-DD, DD/MM/YYYY, etc.)
 * @returns Validation result
 * 
 * Used in:
 * - src/components/offers/OfferForm.tsx
 * - src/components/tasks/TaskDialog.tsx
 */
export function validateDate(dateStr: string, format = 'YYYY-MM-DD'): ValidationResult {
  if (!dateStr) {
    return invalidResult('Date is required');
  }
  
  let date: Date;
  try {
    // Convert to standard format if needed
    if (format === 'DD/MM/YYYY') {
      const [day, month, year] = dateStr.split('/').map(Number);
      date = new Date(year, month - 1, day);
    } else {
      date = new Date(dateStr);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    
    return validResult();
  } catch (e) {
    logger.error('Date validation error', e);
    return invalidResult('Invalid date format');
  }
}

/**
 * Check if a number is within a valid range
 * 
 * @param value - Number to validate
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns Validation result
 * 
 * Used in:
 * - src/components/offers/OfferDetailForm.tsx
 */
export function validateRange(value: number, min?: number, max?: number): ValidationResult {
  if (value === undefined || value === null) {
    return invalidResult('Value is required');
  }
  
  if (min !== undefined && value < min) {
    return invalidResult(`Value must be at least ${min}`);
  }
  
  if (max !== undefined && value > max) {
    return invalidResult(`Value must be at most ${max}`);
  }
  
  return validResult();
}

/**
 * Check if a value is a valid positive number
 * 
 * @param value - Value to validate
 * @param allowZero - Whether to allow zero
 * @returns Validation result
 * 
 * Used in:
 * - src/components/offers/OfferDetailForm.tsx
 */
export function validatePositiveNumber(value: number | string, allowZero = false): ValidationResult {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) {
    return invalidResult('Value must be a number');
  }
  
  if (allowZero ? num < 0 : num <= 0) {
    return invalidResult(`Value must be ${allowZero ? 'zero or ' : ''}positive`);
  }
  
  return validResult();
}

/**
 * Check if a value is a valid percentage
 * 
 * @param value - Value to validate
 * @returns Validation result
 * 
 * Used in:
 * - src/components/offers/OfferForm.tsx
 */
export function validatePercentage(value: number | string): ValidationResult {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) {
    return invalidResult('Percentage must be a number');
  }
  
  if (num < 0 || num > 100) {
    return invalidResult('Percentage must be between 0 and 100');
  }
  
  return validResult();
}

/**
 * Check if a string contains only alphanumeric characters
 * 
 * @param value - String to validate
 * @param allowSpaces - Whether to allow spaces
 * @returns Validation result
 */
export function validateAlphanumeric(value: string, allowSpaces = false): ValidationResult {
  if (!value) {
    return validResult();
  }
  
  const pattern = allowSpaces ? /^[a-zA-Z0-9\s]*$/ : /^[a-zA-Z0-9]*$/;
  
  if (!pattern.test(value)) {
    return invalidResult(`Only ${allowSpaces ? 'alphanumeric characters and spaces' : 'alphanumeric characters'} are allowed`);
  }
  
  return validResult();
}

/**
 * Run multiple validations and return the first error
 * 
 * @param validators - Array of validation functions to run
 * @returns First validation error or success
 * 
 * @example
 * ```typescript
 * const validate = (value: string) => {
 *   return validateMultiple(value, [
 *     (v) => validateRequired(v),
 *     (v) => validateEmail(v),
 *     (v) => validateLength(v, 5, 100)
 *   ]);
 * };
 * ```
 */
export function validateMultiple(
  value: any,
  validators: Array<(value: any) => ValidationResult>
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
 * Check if a value is not empty
 * 
 * @param value - Value to check
 * @returns Validation result
 */
export function validateRequired(value: any): ValidationResult {
  if (value === undefined || value === null || value === '') {
    return invalidResult('Value is required');
  }
  
  if (Array.isArray(value) && value.length === 0) {
    return invalidResult('At least one item is required');
  }
  
  if (typeof value === 'object' && Object.keys(value).length === 0) {
    return invalidResult('Object cannot be empty');
  }
  
  return validResult();
}

/**
 * Check if a string meets length requirements
 * 
 * @param value - String to validate
 * @param min - Minimum length
 * @param max - Maximum length
 * @returns Validation result
 */
export function validateLength(value: string, min?: number, max?: number): ValidationResult {
  if (value === undefined || value === null) {
    return validResult(); // Handle required check separately
  }
  
  const strValue = String(value);
  
  if (min !== undefined && strValue.length < min) {
    return invalidResult(`Must be at least ${min} characters`);
  }
  
  if (max !== undefined && strValue.length > max) {
    return invalidResult(`Must be at most ${max} characters`);
  }
  
  return validResult();
}

// Export a default object with all validators
export default {
  validateEmail,
  validateUrl,
  validateAfm,
  validateVat,
  validatePhone,
  validateDate,
  validateRange,
  validatePositiveNumber,
  validatePercentage,
  validateAlphanumeric,
  validateMultiple,
  validateRequired,
  validateLength
}; 