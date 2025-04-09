/**
 * Customer form utilities
 * Extracted from CustomerForm.tsx to improve modularity
 */

import { CustomerFormData, CustomerFormSubmissionData, Customer, CUSTOMER_TYPE_MAP } from '../types/CustomerTypes';
import { createPrefixedLogger } from '@/utils/loggingUtils';

// Create a logger for this utilities file
const logger = createPrefixedLogger('CustomerFormUtils');

/**
 * CSS styles for select elements and notes textarea
 */
export const formStyles = `
  select {
    -webkit-appearance: none !important;
    -moz-appearance: none !important;
    appearance: none !important;
    background-color: #2f3e46 !important;
    color: #cad2c5 !important;
    border: none !important;
    outline: none !important;
  }
  
  select:focus {
    box-shadow: 0 0 0 1px #52796f !important;
    border: none !important;
  }
  
  select:hover {
    box-shadow: 0 0 0 1px #52796f !important;
    border: none !important;
  }
  
  select option {
    background-color: #2f3e46 !important;
    color: #cad2c5 !important;
    border: none !important;
  }
  
  select option:checked,
  select option:hover,
  select option:focus {
    background-color: #52796f !important;
    color: #cad2c5 !important;
  }

  .notes-textarea {
    height: 75px !important;
    min-height: 75px !important;
    max-height: 75px !important;
    padding: 5px 8px !important;
    resize: none !important;
    overflow-y: auto !important;
    line-height: 1.4 !important;
    font-size: 13px !important;
  }
`;

/**
 * Convert customer data from the database to form data
 */
export const customerToFormData = (customer: any): CustomerFormData => {
  return {
    company_name: customer.company_name || "",
    afm: customer.afm || "",
    doy: customer.doy || "",
    customer_type: CUSTOMER_TYPE_MAP[customer.customer_type] || customer.customer_type || "Εταιρεία",
    address: customer.address || "",
    postal_code: customer.postal_code || "",
    town: customer.town || "",
    telephone: customer.telephone || "",
    email: customer.email || "",
    webpage: customer.webpage || "",
    fax_number: customer.fax_number || "",
    notes: customer.notes || "",
    primary_contact_id: customer.primary_contact_id || ""
  };
};

/**
 * Prepare form data for submission
 */
export const prepareSubmissionData = (
  formData: CustomerFormData, 
  userId?: string
): CustomerFormSubmissionData => {
  return {
    customer_type: formData.customer_type,
    company_name: formData.company_name,
    afm: formData.afm,
    doy: formData.doy,
    address: formData.address,
    postal_code: formData.postal_code,
    town: formData.town,
    telephone: formData.telephone,
    email: formData.email,
    webpage: formData.webpage,
    fax_number: formData.fax_number,
    notes: formData.notes,
    primary_contact_id: formData.primary_contact_id,
    status: "active",
    created_by: userId,
    modified_by: userId
  };
};

/**
 * Get duplicate match message based on match reasons
 */
export const getDuplicateMatchReasons = (matchReasons: any): string => {
  const reasons = [];
  
  if (matchReasons.companyName) reasons.push('Όνομα εταιρείας');
  if (matchReasons.telephone) reasons.push('Τηλέφωνο');
  if (matchReasons.afm) reasons.push('ΑΦΜ');
  
  return reasons.join(', ');
};

/**
 * Initialize empty form data
 */
export const getInitialFormData = (): CustomerFormData => {
  return {
    company_name: "",
    afm: "",
    doy: "",
    customer_type: "Εταιρεία",
    address: "",
    postal_code: "",
    town: "",
    telephone: "",
    email: "",
    webpage: "",
    fax_number: "",
    notes: "",
    primary_contact_id: ""
  };
}; 