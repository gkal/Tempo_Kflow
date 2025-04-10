/**
 * Form link data structure
 */
export interface FormLink {
  id: string;
  offer_id: string;
  token: string;
  is_used: boolean;
  created_at: string;
  expires_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
}

/**
 * Input for creating a new form link
 */
export interface CreateFormLinkInput {
  offer_id: string;
  expiration_hours: number;
}

/**
 * Response for a validated form link
 */
export interface FormLinkValidationResult {
  isValid: boolean;
  isExpired: boolean;
  isUsed: boolean;
  offer_id?: string;
  message?: string;
}

/**
 * Form link with offer data
 */
export interface FormLinkWithOffer extends FormLink {
  offer: {
    id: string;
    offer_number: string;
    customer_id: string;
    date_created: string;
    status: string;
    [key: string]: any; // For additional offer fields
  };
} 