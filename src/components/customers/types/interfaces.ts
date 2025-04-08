/**
 * Types for customer-related components
 */

/**
 * Customer offer data structure
 */
export interface CustomerOffer {
  id: string;
  name: string;
  value: string;
  date: string;
  status: string;
  requirements?: string;
  result?: string;
}

/**
 * Customer data structure
 */
export interface Customer {
  id: string;
  company_name?: string;
  email?: string;
  telephone?: string;
  status: string;
  created_at?: string;
  customer_type?: string;
  offers_count?: number;
  offers?: CustomerOffer[];
  address?: string;
  afm?: string;
  doy?: string;
  town?: string;
  postal_code?: string;
  notes?: string;
  primary_contact_id?: string;
  // Any additional fields
  [key: string]: any;
}

/**
 * Props for offer table row component
 */
export interface OfferTableRowProps {
  offer: any;
  customerId: string;
  onEdit: (customerId: string, offerId: string) => void;
  formatDateTime: (date: string | Date) => string;
  formatStatus: (status: string) => string;
  formatResult: (result: string) => string;
  isAdminOrSuperUser: boolean;
  onDelete: (customerId: string, offerId: string) => void;
} 