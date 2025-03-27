export interface CustomerOffer {
  id: string;
  name: string;
  value: number;
  date: string;
  status: string;
  requirements?: string;
  result?: string;
}

export interface Customer {
  id: string;
  company_name?: string;
  first_name?: string;
  last_name?: string;
  afm?: string;
  telephone?: string;
  email?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  customer_type?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
  notes?: string;
  offers_count?: number;
  offersCount?: number;
  isExpanded?: boolean;
  offers?: CustomerOffer[];
  [key: string]: any;
} 