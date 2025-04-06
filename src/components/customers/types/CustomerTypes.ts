// Customer-related type definitions
// Extracted from CustomersPage.tsx to improve modularity

export interface CustomerOffer {
  id: string;
  name: string;
  value: string;
  date: string;
  status: string;
  requirements?: string;
  result?: string;
}

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
  // Any additional fields
  [key: string]: any;
}

// Type for expanded customer IDs tracking
export interface ExpandedCustomerIds {
  [key: string]: boolean;
}

// Type for customer offers mapping
export interface CustomerOffersMap {
  [customerId: string]: CustomerOffer[];
}
