// Customer form utility functions and constants
import { createPrefixedLogger } from "@/utils/loggingUtils";
import { CustomerFormData, CustomerFormSubmissionData } from "../types/CustomerTypes";

// Create a logger for this utilities file
const logger = createPrefixedLogger('CustomerFormUtils');

// Map of normalized customer types that match the database constraint
export const CUSTOMER_TYPE_MAP = {
  "Εταιρεία": "Εταιρεία",
  "Ιδιώτης": "Ιδιώτης",
  "Δημόσιο": "Δημόσιο",
  "Οικοδομές": "Οικοδομές",
  "Εκτακτος Πελάτης": "Εκτακτος Πελάτης",
  "Εκτακτη Εταιρία": "Εκτακτη Εταιρία"
};

// List of valid customer types that satisfy the database check constraint
export const VALID_CUSTOMER_TYPES = ["Εταιρεία", "Ιδιώτης", "Δημόσιο", "Οικοδομές", "Εκτακτος Πελάτης", "Εκτακτη Εταιρία"];

// Display options for customer types - these are what users see
export const CUSTOMER_TYPE_OPTIONS = [
  "Εταιρεία", 
  "Ιδιώτης", 
  "Δημόσιο", 
  "Οικοδομές",
  "Εκτακτος Πελάτης",
  "Εκτακτη Εταιρία"
];

// CSS styles for the form
export const selectStyles = `
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

// Form styles for CustomerFormFields
export const formStyles = selectStyles;

// Validates if form data has minimum required fields
export const isFormValid = (companyName: string, phoneValue: string) => {
  // Get trimmed values for validation
  const companyNameValue = companyName.trim();
  const telephoneValue = phoneValue.trim();
  
  // Check both required fields individually
  const hasCompanyName = companyNameValue !== '';
  const hasTelephone = telephoneValue !== '';
  
  // Both fields must be filled for the form to be valid
  return hasCompanyName && hasTelephone;
};

// Processes form data for submission
export const processFormDataForSubmission = (formData: any, phoneValue: string, tempCustomerType: string | null, userId: string | undefined, customerId?: string) => {
  // Apply the temporary customer type immediately to ensure it's in formData
  const currentCustomerType = tempCustomerType !== null ? tempCustomerType : formData.customer_type;
  
  // CRITICAL FIX: Ensure customer_type is ALWAYS one of the allowed values BEFORE creating submission data
  const safeCustomerType = VALID_CUSTOMER_TYPES.includes(currentCustomerType) 
    ? currentCustomerType 
    : "Εταιρεία"; // Use a safe default value
  
  // Create a copy of the form data with the correct customer type and phone value
  const submissionData = {
    ...formData,
    customer_type: safeCustomerType,
    // Use the phoneValue which contains the correctly formatted number
    telephone: phoneValue,
    // For new records, ensure primary_contact_id is null, not empty string
    primary_contact_id: formData.primary_contact_id || null,
    // Add user IDs for tracking who created/modified the record
    ...(customerId ? { modified_by: userId } : { created_by: userId })
  };
  
  // Clean up the data before submission
  // Remove empty strings for fields that should be null
  Object.keys(submissionData).forEach(key => {
    if (submissionData[key] === "") {
      submissionData[key] = null;
    }
  });

  return submissionData;
};

// Returns a highlighted version of the text - implemented as a pure string function, not JSX
export const highlightMatchingText = (value: string, isMatch: boolean, highConfidence: boolean = false): string => {
  if (!value || !isMatch) return value;
  
  // Different highlight styles based on confidence level
  let highlightClass = '';
  
  if (highConfidence) {
    // High confidence match (red highlight)
    highlightClass = 'bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100 px-1 rounded-sm high-confidence';
  } else {
    // Normal confidence match (yellow highlight)
    highlightClass = 'bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 px-1 rounded-sm normal-confidence';
  }
  
  // Return a formatted string that indicates highlight should be applied
  return `<span class="${highlightClass}">${value}</span>`;
};

// Convert customer data from API to form data structure
export const customerToFormData = (customer: any): CustomerFormData => {
  return {
    company_name: customer.company_name || "",
    afm: customer.afm || "",
    doy: customer.doy || "",
    customer_type: customer.customer_type || "Εταιρεία",
    address: customer.address || "",
    postal_code: customer.postal_code || "",
    town: customer.town || "",
    telephone: customer.telephone || "",
    email: customer.email || "",
    webpage: customer.webpage || "",
    fax_number: customer.fax_number || "",
    notes: customer.notes || "",
    primary_contact_id: customer.primary_contact_id || "",
  };
};

// Get initial form data for a new customer
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
    primary_contact_id: "",
  };
};

/**
 * Format the match reasons to display to the user
 * @param matchReasons Object containing the reasons for a match
 * @returns Formatted string explaining match reasons
 */
export const getDuplicateMatchReasons = (matchReasons: {
  companyName?: boolean;
  telephone?: boolean;
  afm?: boolean;
}): string => {
  const reasons: string[] = [];
  
  if (matchReasons.companyName) {
    reasons.push("Επωνυμία");
  }
  
  if (matchReasons.telephone) {
    reasons.push("Τηλέφωνο");
  }
  
  if (matchReasons.afm) {
    reasons.push("ΑΦΜ");
  }
  
  return reasons.length > 0 
    ? reasons.join(", ") 
    : "Μερική ομοιότητα σε πολλαπλά πεδία";
}; 