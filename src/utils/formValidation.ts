/**
 * Form Validation Utilities
 * 
 * A comprehensive set of utilities for form validation across the application.
 * Includes:
 * - Custom validation messages in Greek
 * - Validation rules for common input types
 * - Type-safe validation hooks
 * 
 * Relationship with validationUtils.ts:
 * - formValidation.ts (this file): Provides React-specific form validation hooks and form handling
 * - validationUtils.ts: Provides pure validation functions that can be used outside of React components
 * 
 * Files using these utilities:
 * - src/components/customers/CustomerForm.tsx: Customer form validation
 * - src/components/offers/OfferForm.tsx: Offer creation form
 * - src/components/auth/LoginForm.tsx: Login validation
 * - src/components/settings/ProfileSettings.tsx: User profile form
 */
import { useState, useEffect } from 'react';

/**
 * Greek validation messages for different validation states
 */
export const ValidationMessages = {
  required: 'Παρακαλώ συμπληρώστε αυτό το πεδίο',
  requiredSelect: 'Παρακαλώ επιλέξτε μια τιμή',
  email: 'Παρακαλώ συμπληρώστε έγκυρο email',
  pattern: 'Η μορφή δεν είναι σωστή',
  minLength: (length: number) => `Ελάχιστο μήκος: ${length} χαρακτήρες`,
  maxLength: (length: number) => `Μέγιστο μήκος: ${length} χαρακτήρες`,
  phone: 'Παρακαλώ συμπληρώστε έγκυρο αριθμό τηλεφώνου',
  afm: 'Το ΑΦΜ πρέπει να αποτελείται από 8 ψηφία',
  number: 'Παρακαλώ εισάγετε έναν αριθμό',
  url: 'Παρακαλώ εισάγετε έγκυρη διεύθυνση URL',
  date: 'Παρακαλώ εισάγετε έγκυρη ημερομηνία',
  custom: (message: string) => message,
  invalidValue: 'Παρακαλώ εισάγετε έγκυρη τιμή'
};

/**
 * Regular expression patterns for common validations
 */
export const ValidationPatterns = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^(\+?30)?\s*[0-9]{3}\s*[0-9]{8,}$/,
  afm: /^[0-9]{8}$/,
  number: /^[0-9]+$/,
  alphanumeric: /^[a-zA-Z0-9]+$/
};

/**
 * Set up custom validation messages for form elements
 * This overrides the browser's default validation messages with Greek translations
 */
export function setupCustomValidationMessages(): void {
  const setupInputValidation = () => {
    const originalValidationMessage = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'validationMessage'
    );

    try {
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
          return originalValidationMessage?.get?.call(this) || '';
        },
        configurable: true
      });
    } catch (e) {
      console.error('Failed to override validationMessage', e);
    }
  };

  const setupTextareaValidation = () => {
    const originalValidationMessage = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      'validationMessage'
    );

    try {
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
          return originalValidationMessage?.get?.call(this) || '';
        },
        configurable: true
      });
    } catch (e) {
      console.error('Failed to override validationMessage for textarea', e);
    }
  };

  const setupSelectValidation = () => {
    const originalValidationMessage = Object.getOwnPropertyDescriptor(
      HTMLSelectElement.prototype,
      'validationMessage'
    );

    try {
      Object.defineProperty(HTMLSelectElement.prototype, 'validationMessage', {
        get: function() {
          if (!this.validity.valid && this.validity.valueMissing) {
            return ValidationMessages.requiredSelect;
          }
          return originalValidationMessage?.get?.call(this) || '';
        },
        configurable: true
      });
    } catch (e) {
      console.error('Failed to override validationMessage for select', e);
    }
  };

  // Execute all setups
  setupInputValidation();
  setupTextareaValidation();
  setupSelectValidation();
}

/**
 * Interface for using the useFormValidation hook
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
 * Type for validation status of a form field
 */
export interface ValidationStatus {
  isValid: boolean;
  errorMessage: string;
}

/**
 * Type for the validation state of an entire form
 */
export interface FormValidationState {
  [fieldName: string]: ValidationStatus;
}

/**
 * Custom hook for form validation
 */
export function useFormValidation(initialState: Record<string, string> = {}) {
  const [values, setValues] = useState(initialState);
  const [validationState, setValidationState] = useState<FormValidationState>({});
  const [validationRules, setValidationRules] = useState<Record<string, ValidationRule>>({});
  const [isFormValid, setIsFormValid] = useState(true);

  // Define validation rules for fields
  const setFieldValidation = (fieldName: string, rules: ValidationRule) => {
    setValidationRules(prev => ({
      ...prev,
      [fieldName]: rules
    }));
  };

  // Validate a single field
  const validateField = (name: string, value: string): ValidationStatus => {
    const rules = validationRules[name];
    
    if (!rules) {
      return { isValid: true, errorMessage: '' };
    }

    // Check if field is required and empty
    if (rules.required && !value.trim()) {
      return {
        isValid: false,
        errorMessage: rules.errorMessage || ValidationMessages.required
      };
    }

    // Check pattern validation
    if (rules.pattern && value && !rules.pattern.test(value)) {
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

    // Custom validation logic
    if (rules.customValidation && !rules.customValidation(value)) {
      return {
        isValid: false,
        errorMessage: rules.errorMessage || ValidationMessages.custom('Μη έγκυρη τιμή')
      };
    }

    return { isValid: true, errorMessage: '' };
  };

  // Update form values and validate
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setValues(prev => ({ ...prev, [name]: value }));
    
    const validationResult = validateField(name, value);
    setValidationState(prev => ({
      ...prev,
      [name]: validationResult
    }));
  };

  // Validate the entire form
  const validateForm = (): boolean => {
    const newValidationState: FormValidationState = {};
    let formIsValid = true;

    // Validate each field with rules
    Object.keys(validationRules).forEach(field => {
      const fieldValue = values[field] || '';
      const validationResult = validateField(field, fieldValue);
      
      newValidationState[field] = validationResult;
      
      if (!validationResult.isValid) {
        formIsValid = false;
      }
    });

    setValidationState(newValidationState);
    setIsFormValid(formIsValid);
    
    return formIsValid;
  };

  // Reset the form to initial state
  const resetForm = (newValues = initialState) => {
    setValues(newValues);
    setValidationState({});
    setIsFormValid(true);
  };

  // Check overall form validity whenever validation state changes
  useEffect(() => {
    const formValid = Object.values(validationState).every(status => status.isValid);
    setIsFormValid(formValid);
  }, [validationState]);

  return {
    values,
    setValues,
    handleChange,
    validationState,
    isFormValid,
    validateForm,
    setFieldValidation,
    resetForm
  };
}

/**
 * Utility to set custom validation message on form field event
 */
export function setCustomValidationMessage(
  event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  message: string = ''
) {
  const target = event.currentTarget;
  target.setCustomValidity(message);
}

/**
 * Helper function to check if all required form fields are filled
 */
export function checkRequiredFields(form: HTMLFormElement): boolean {
  const requiredInputs = form.querySelectorAll('[required]');
  let isValid = true;
  
  requiredInputs.forEach(input => {
    const element = input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    if (!element.value) {
      isValid = false;
      
      // Focus the first empty required field
      element.focus();
      
      // Stop checking after finding the first empty field
      return;
    }
  });
  
  return isValid;
} 