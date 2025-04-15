import { Database } from '@/types/supabase';

/**
 * Represents a customer form link record in the database
 */
export interface CustomerFormLink {
  id: string;
  customer_id: string;
  token: string;
  form_data: Record<string, any> | null;
  status: FormLinkStatus;
  notes: string | null;
  is_used: boolean;
  is_deleted: boolean;
  created_at: string;
  expires_at: string;
  submitted_at: string | null;
  approved_at: string | null;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  approved_by: string | null;
  updated_at: string | null;
  external_project_id?: string | null; // Added for cross-project functionality
}

/**
 * Possible status values for a form link
 */
export type FormLinkStatus = 'pending' | 'submitted' | 'approved' | 'rejected';

/**
 * Options for generating a form link
 */
export interface FormLinkGenerationOptions {
  customerId: string;
  expirationHours?: number; // Default will be 72 hours if not specified
  createdById?: string; // User ID of the creator
  externalProjectId?: string; // ID of external project that will use this link
  callbackUrl?: string; // URL to notify when form is submitted
}

/**
 * Response when creating a new form link
 */
export interface FormLinkCreationResponse {
  success: boolean;
  data?: {
    id: string;
    token: string;
    url: string;
    expiresAt: string;
    externalProjectId?: string;
  };
  error?: string;
}

/**
 * Result of validating a form link token
 */
export interface FormLinkValidationResult {
  isValid: boolean;
  reason?: string;
  formLink?: CustomerFormLink;
  customer?: Database['public']['Tables']['customers']['Row'];
}

/**
 * Filter options for retrieving form links
 */
export interface FormLinkFilterOptions {
  customerId?: string;
  status?: FormLinkStatus | FormLinkStatus[];
  isUsed?: boolean;
  isExpired?: boolean; // Will check if expires_at is in the past
  createdAfter?: string; // ISO date string
  createdBefore?: string; // ISO date string
  createdBy?: string; // User ID of the creator
  externalProjectId?: string; // ID of external project
}

/**
 * Sorting options for form links
 */
export interface FormLinkSortOptions {
  field: keyof CustomerFormLink;
  direction: 'asc' | 'desc';
}

/**
 * Pagination options for form links
 */
export interface FormLinkPaginationOptions {
  page: number;
  pageSize: number;
}

/**
 * Response when retrieving form links
 */
export interface FormLinkListResponse {
  success: boolean;
  data?: {
    formLinks: CustomerFormLink[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  error?: string;
}

/**
 * Response when retrieving a single form link
 */
export interface FormLinkResponse {
  success: boolean;
  data?: CustomerFormLink;
  error?: string;
}

/**
 * Options for updating a form link
 */
export interface FormLinkUpdateOptions {
  formLinkId: string;
  updatedBy?: string; // User ID of the updater
  status?: FormLinkStatus;
  notes?: string;
  externalProjectId?: string;
  callbackUrl?: string;
  // Other fields that can be updated
}

/**
 * Response when updating a form link
 */
export interface FormLinkUpdateResponse {
  success: boolean;
  data?: CustomerFormLink;
  error?: string;
}

/**
 * Response when submitting a form
 */
export interface FormSubmissionResponse {
  success: boolean;
  data?: {
    formLinkId: string;
    submittedAt: string;
    status: FormLinkStatus;
  };
  error?: string;
} 