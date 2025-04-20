/**
 * Types and interfaces for customer-related components
 * Extracted from CustomerForm.tsx to improve modularity
 */

/**
 * Props for the CustomerForm component
 */
export interface CustomerFormProps {
  customerId?: string;
  onSave?: (newCustomerId?: string, companyName?: string) => void;
  onCancel?: () => void;
  viewOnly?: boolean;
  onValidityChange?: (isValid: boolean) => void;
  onError?: (errorMessage: string) => void;
  keepDialogOpen?: boolean;
}

/**
 * Data structure for customer form submission
 */
export interface CustomerFormSubmissionData {
  customer_type: string;
  company_name: string;
  afm: string;
  doy: string;
  address: string;
  postal_code: string;
  town: string;
  telephone: string;
  email: string;
  webpage: string;
  fax_number: string;
  notes: string;
  primary_contact_id: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string | null;
  status?: string | null;
  deleted_at?: string | null;
  contact_name?: string | null;
  phone?: string | null;
  created_by?: string;
  modified_by?: string;
}

/**
 * Customer data structure
 */
export interface Customer {
  id: string;
  company_name: string;
  telephone: string;
  afm: string;
  doy?: string;
  email?: string;
  address?: string;
  town?: string;
  postal_code?: string;
  deleted?: boolean;
  score?: number;
  matchReasons?: {
    companyName?: boolean;
    telephone?: boolean;
    afm?: boolean;
  };
  originalScores?: {
    phoneSimilarity: number;
    nameSimilarity: number;
    afmSimilarity: number;
  };
}

/**
 * Form data structure for the customer form
 */
export interface CustomerFormData {
  company_name: string;
  afm: string;
  doy: string;
  customer_type: string;
  address: string;
  postal_code: string;
  town: string;
  telephone: string;
  email: string;
  webpage: string;
  fax_number: string;
  notes: string;
  primary_contact_id: string;
}

/**
 * Map of normalized customer types that match the database constraint
 */
export const CUSTOMER_TYPE_MAP = {
  "Εταιρεία": "Εταιρεία",
  "Ιδιώτης": "Ιδιώτης",
  "Δημόσιο": "Δημόσιο",
  "Οικοδομές": "Οικοδομές",
  "Εκτακτος Πελάτης": "Εκτακτος Πελάτης",
  "Εκτακτη Εταιρία": "Εκτακτη Εταιρία"
};

/**
 * List of valid customer types that satisfy the database check constraint
 */
export const VALID_CUSTOMER_TYPES = [
  "Εταιρεία", 
  "Ιδιώτης", 
  "Δημόσιο", 
  "Οικοδομές", 
  "Εκτακτος Πελάτης", 
  "Εκτακτη Εταιρία"
];

/**
 * Display options for customer types - these are what users see
 */
export const CUSTOMER_TYPE_OPTIONS = [
  "Εταιρεία", 
  "Ιδιώτης", 
  "Δημόσιο", 
  "Οικοδομές",
  "Εκτακτος Πελάτης",
  "Εκτακτη Εταιρία"
];

/**
 * Customer offer data structure
 */
export interface CustomerOffer {
  id: string;
  offer_number?: string;
  total_amount?: number;
  created_at?: string;
  status?: string;
  customer_id?: string;
  name?: string;
  requirements?: string;
}

export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  customer_id: string;
} 