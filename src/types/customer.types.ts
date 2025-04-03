// Customer offer type definition
export interface CustomerOffer {
  id: string;
  name: string;
  value: string;
  date: string;
  status: string;
  requirements?: string;
  result?: string;
}

// Customer type definition
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
  [key: string]: any;
}

// Customer filter type
export type CustomerFilter = 'all' | 'active' | 'inactive';

// Search column definition
export interface SearchColumn {
  accessor: string;
  header: string;
}

// Filter button definition
export interface FilterButton {
  label: string;
  value: string;
  onClick: () => void;
  isActive: boolean;
} 