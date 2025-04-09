/**
 * Customer form validation utilities
 * Extracted from CustomerForm.tsx to improve modularity
 */

import { CustomerFormData } from '../types/CustomerTypes';
import { validateEmail, validatePhone } from '@/utils/validationUtils';
import { createPrefixedLogger } from '@/utils/loggingUtils';

// Create a logger for validation
const logger = createPrefixedLogger('CustomerValidation');

/**
 * Validate if a string is not empty
 */
export const validateNotEmpty = (value: string): boolean => {
  return value.trim() !== '';
};

/**
 * Checks if a form has the required fields filled
 */
export const isFormValid = (formData: CustomerFormData, phoneValue: string): boolean => {
  // Get trimmed values for validation
  const companyNameValue = formData.company_name.trim();
  const telephoneValue = phoneValue.trim();
  
  // Check both required fields individually
  const hasCompanyName = companyNameValue !== '';
  const hasTelephone = telephoneValue !== '';
  
  // Both fields must be filled for the form to be valid
  return hasCompanyName && hasTelephone;
};

/**
 * Validates all fields in the customer form
 * Returns an object with field names as keys and error messages as values
 */
export const validateCustomerForm = (formData: CustomerFormData, phoneValue: string): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  // Required fields
  if (!validateNotEmpty(formData.company_name)) {
    errors.company_name = 'Το όνομα εταιρείας είναι υποχρεωτικό';
  }
  
  if (!validateNotEmpty(phoneValue)) {
    errors.telephone = 'Το τηλέφωνο είναι υποχρεωτικό';
  } else if (!validatePhone(phoneValue)) {
    errors.telephone = 'Μη έγκυρος αριθμός τηλεφώνου';
  }
  
  // Optional fields with format validation
  if (validateNotEmpty(formData.email) && !validateEmail(formData.email)) {
    errors.email = 'Μη έγκυρη διεύθυνση email';
  }
  
  // AFM validation (9 digits)
  if (validateNotEmpty(formData.afm) && !/^\d{9}$/.test(formData.afm)) {
    errors.afm = 'Το ΑΦΜ πρέπει να αποτελείται από 9 ψηφία';
  }
  
  // Return all validation errors
  return errors;
};

/**
 * Check for potential duplicate customers 
 */
export const checkForDuplicates = async (
  formData: CustomerFormData, 
  checkFunction: (data: any) => Promise<any[]>
): Promise<any[]> => {
  try {
    // Only check if we have some minimum data
    if (!formData.company_name && !formData.telephone && !formData.afm) {
      return [];
    }
    
    // Prepare data for duplicate check
    const checkData = {
      companyName: formData.company_name,
      telephone: formData.telephone,
      afm: formData.afm
    };
    
    // Call the provided check function
    const matches = await checkFunction(checkData);
    return matches || [];
  } catch (error) {
    logger.error('Error checking for duplicates:', error);
    return [];
  }
}; 