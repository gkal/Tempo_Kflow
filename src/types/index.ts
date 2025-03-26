export interface CustomerOffer {
  id: string;
  name: string;
  value: number;
  date: string;
  status: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalValue: number;
  isActive: boolean;
  offers?: CustomerOffer[];
} 