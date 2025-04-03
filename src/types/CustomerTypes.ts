export interface CustomerOffer {
  id: string;
  customer_id: string;
  title: string;
  description: string | null;
  amount: number;
  status: string;
  created_at: string;
  updated_at: string | null;
  assigned_to: string | null;
  notes: string | null;
  [key: string]: any;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: string;
  status: string;
  created_at: string;
  updated_at: string | null;
  address: string | null;
  notes: string | null;
  [key: string]: any;
}

export type CustomerFilter = 'all' | 'active' | 'inactive';

export interface CustomerTableProps {
  customers: Customer[];
  expandedCustomerIds: string[];
  customerOffers: Record<string, CustomerOffer[]>;
  loadingOffers: Record<string, boolean>;
  isAdminOrSuperUser: boolean;
  onToggleExpand: (customerId: string) => void;
  onViewOffer: (offerId: string) => void;
  onDeleteOffer: (offerId: string) => void;
}

export interface CustomerFiltersProps {
  activeFilter: CustomerFilter;
  searchTerm: string;
  searchColumn: string;
  selectedCustomerTypes: string[];
  customerTypes: string[];
  onFilterChange: (filter: CustomerFilter) => void;
  onSearchChange: (term: string, column: string) => void;
  onCustomerTypesChange: (types: string[]) => void;
}

export interface CustomerActionsProps {
  showNewCustomerDialog: boolean;
  showDeleteCustomerDialog: boolean;
  customerToDelete: Customer | null;
  isAdminOrSuperUser: boolean;
  onNewCustomer: () => void;
  onCloseNewCustomerDialog: () => void;
  onCloseDeleteDialog: () => void;
  onConfirmDelete: () => Promise<void>;
}

export interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer;
  onSave?: (customer: Partial<Customer>) => Promise<void>;
}

export interface ModernDeleteConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  deleteButtonLabel?: string;
  cancelButtonLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<void>;
}

export interface CustomerState {
  customers: Customer[];
  isLoading: boolean;
  expandedCustomerIds: Record<string, boolean>;
  customerOffers: Record<string, CustomerOffer[]>;
  loadingOffers: Record<string, boolean>;
  activeFilter: CustomerFilter;
  searchTerm: string;
  searchColumn: string;
  selectedCustomerTypes: string[];
  customerIdBeingExpanded: string | null;
  lastRealtimeUpdate: number;
}

export interface DeleteDialogState {
  showDeleteOfferDialog: boolean;
  offerToDelete: string | null;
  customerIdForDelete: string | null;
  showDeleteCustomerDialog: boolean;
  customerToDelete: Customer | null;
  showNewCustomerDialog: boolean;
} 