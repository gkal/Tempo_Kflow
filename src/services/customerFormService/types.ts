import { Database } from '@/types/supabase';
import { CustomerFormLink, FormLinkStatus } from '../formLinkService/types';

/**
 * Customer information formatted for display in forms
 */
export interface CustomerFormInfo {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  contacts?: CustomerContactInfo[];
  createdAt: string;
}

/**
 * Customer contact information for form display
 */
export interface CustomerContactInfo {
  id: string;
  name: string;
  position?: string | null;
  email?: string | null;
  phone?: string | null;
  isPrimary: boolean;
}

/**
 * Form submission data from a customer
 */
export interface CustomerFormSubmission {
  customerData: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  serviceRequirements: string;
  serviceDetails?: {
    description: string;
    categoryId?: string;
    subcategoryId?: string;
  }[];
  additionalNotes?: string;
  preferredContactMethod?: 'email' | 'phone' | 'any';
  preferredContactTime?: string;
  attachments?: string[]; // Base64 encoded files or URLs
  formMetadata?: {
    submitTime: string;
    browserInfo?: string;
    formVersion?: string;
  };
  [key: string]: any; // Allow for additional fields
}

/**
 * Data required for form approval process
 */
export interface FormApprovalData {
  formLinkId: string;
  approverId: string;
  approvalNotes?: string;
  modifications?: Partial<CustomerFormSubmission>;
  approvalAction: 'approve' | 'reject';
  createOffer: boolean; // Whether to create an offer upon approval
}

/**
 * Result of a form submission operation
 */
export interface FormSubmissionResult {
  success: boolean;
  data?: {
    formLinkId: string;
    customerId: string;
    submittedAt: string;
    status: FormLinkStatus;
  };
  error?: string;
}

/**
 * Result of a form approval operation
 */
export interface FormApprovalResult {
  success: boolean;
  data?: {
    formLinkId: string;
    status: FormLinkStatus;
    approvedAt?: string;
    offerId?: string; // If offer was created
  };
  error?: string;
}

/**
 * Options for retrieving customer form information
 */
export interface CustomerFormInfoOptions {
  includeContacts?: boolean;
  includeInactiveContacts?: boolean;
  includeDeletedContacts?: boolean;
  maxContacts?: number;
}

/**
 * Form submission statistics
 */
export interface FormSubmissionStats {
  totalSubmissions: number;
  pendingApproval: number;
  approved: number;
  rejected: number;
  conversionRate: number; // Percentage of forms that lead to offers
  averageResponseTime?: number; // Average time between submission and approval
}

/**
 * Notification data for form submissions
 */
export interface FormSubmissionNotification {
  formLinkId: string;
  customerId: string;
  customerName: string;
  submittedAt: string;
  requiresApproval: boolean;
  priority: 'low' | 'medium' | 'high';
} 