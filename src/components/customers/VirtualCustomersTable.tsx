import React, { useState, useCallback, useMemo, useEffect } from "react";
import { createColumnHelper, ColumnDef } from "@tanstack/react-table";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { format } from "date-fns";
import { el } from "date-fns/locale";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Plus,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Mail,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableWrapper } from "@/components/ui/virtual-table/TableWrapper";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";

// Interfaces for Customer and Offer
export interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string;
  tax_id: string;
  phone: string;
  email: string;
  address: string;
  postal_code: string;
  city: string;
  customer_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  notes: string;
  offers_count?: number;
}

export interface Offer {
  id: string;
  customer_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  source: string;
  
  // Properties from our interface that might not exist in the DB
  notes?: string;
  offer_number?: string;
  total_amount?: number;
  reference?: string;
  
  // Properties from the actual DB that we might use
  requirements?: string;
  amount?: number;
  offer_result?: string;
  result?: string;
  assigned_to?: string;
  customer_comments?: string;
  deleted_at?: string;
}

export interface CustomerFilters {
  searchTerm: string;
  searchColumn: string;
  statusFilter: string;
  customerTypes: string[];
}

interface VirtualCustomersTableProps {
  onCreateCustomer: () => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customer: Customer) => void;
  onCreateOffer: (customerId: string, source?: string) => void;
  onEditOffer: (customerId: string, offerId: string) => void;
  onDeleteOffer: (customerId: string, offerId: string) => void;
}

// Helper function for formatting dates
const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    return format(date, 'dd MMM yyyy', { locale: el });
  } catch (error) {
    return '-';
  }
};

// Generate mock data for testing purposes
const generateMockCustomerData = (count: number) => {
  console.log(`Generating ${count} mock customers`);
  return Array(count).fill(null).map((_, i) => ({
    id: `mock-${i}`,
    company_name: `Test Company ${i}`,
    first_name: `John`,
    last_name: `Doe ${i}`,
    tax_id: `12345${i}`,
    phone: `210-1234${i}`,
    email: `test${i}@example.com`,
    address: `Fake Street ${i}`,
    postal_code: `1234${i}`,
    city: "Athens",
    customer_type: i % 2 === 0 ? "Εταιρεία" : "Ιδιώτης",
    status: i % 3 === 0 ? "inactive" : "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    notes: `Some notes for customer ${i}`,
    offers_count: i % 5
  }));
};

export default function VirtualCustomersTable({
  onCreateCustomer,
  onEditCustomer,
  onDeleteCustomer,
  onCreateOffer,
  onEditOffer,
  onDeleteOffer,
}: VirtualCustomersTableProps) {
  // Auth context for permissions
  const { user, isAdmin } = useAuth();
  
  // State for expanded customer rows (to show offers)
  const [expandedCustomerIds, setExpandedCustomerIds] = useState<Set<string>>(new Set());
  const [customerOffers, setCustomerOffers] = useState<Record<string, Offer[]>>({});
  const [isLoadingOffers, setIsLoadingOffers] = useState<Record<string, boolean>>({});
  
  // Create column helper
  const columnHelper = createColumnHelper<Customer>();
  
  // Check permissions for administrative actions - only use isAdmin since isSuperuser doesn't exist
  const canPerformAdminActions = isAdmin;
  
  // Function to fetch customer data with filters
  const fetchCustomers = useCallback(async ({ 
    pageIndex, 
    pageSize, 
    filters 
  }: { 
    pageIndex: number; 
    pageSize: number; 
    filters: CustomerFilters 
  }) => {
    console.log("Fetching customers:", { pageIndex, pageSize, filters });
    
    try {
      const { 
        searchTerm, 
        searchColumn, 
        statusFilter, 
        customerTypes 
      } = filters;
      
      console.log("Supabase query created (but using mock data)");
      
      // Generate mock data with proper count
      const mockData = generateMockCustomerData(pageSize);
      console.log("Generated mock data:", mockData.length, mockData[0]);
      
      // Simulate delay for testing
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return {
        data: mockData,
        totalCount: 100 // Simulate having 100 total records
      };
      
    } catch (err) {
      console.error('Error fetching customers:', err);
      toast({
        title: "Σφάλμα",
        description: "Δεν ήταν δυνατή η ανάκτηση των πελατών",
        variant: "destructive",
      });
      
      // Return empty data in case of error
      return {
        data: [],
        totalCount: 0
      };
    }
  }, []);
  
  // Generate mock offer data
  const generateMockOffers = (customerId: string, count: number): Offer[] => {
    return Array(count).fill(null).map((_, i) => ({
      id: `offer-${customerId}-${i}`,
      customer_id: customerId,
      status: ['pending', 'accepted', 'rejected', 'draft'][Math.floor(Math.random() * 4)],
      notes: `Mock offer note ${i} for customer ${customerId}`,
      created_at: new Date(Date.now() - i * 86400000).toISOString(), // Each one day older
      updated_at: new Date().toISOString(),
      source: ['Email', 'Phone', 'In Person'][Math.floor(Math.random() * 3)],
      offer_number: `OF-${Math.floor(Math.random() * 10000)}`,
      total_amount: Math.floor(Math.random() * 10000) / 100,
      reference: `REF-${Math.floor(Math.random() * 1000)}`
    }));
  };
  
  // Function to fetch customer offers
  const fetchCustomerOffers = useCallback(async (customerId: string) => {
    try {
      setIsLoadingOffers(prev => ({ ...prev, [customerId]: true }));
      
      console.log(`Generating mock offers for customer ${customerId}`);
      
      // Wait a bit to simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Generate 1-5 mock offers
      const mockOfferCount = Math.floor(Math.random() * 5) + 1;
      const mockOffers = generateMockOffers(customerId, mockOfferCount);
      
      // Store the mock offers
      setCustomerOffers(prev => ({ 
        ...prev, 
        [customerId]: mockOffers 
      }));
      
      console.log(`Generated ${mockOffers.length} mock offers for customer ${customerId}`);
      
    } catch (err) {
      console.error(`Error fetching offers for customer ${customerId}:`, err);
      toast({
        title: "Σφάλμα",
        description: "Δεν ήταν δυνατή η ανάκτηση των προσφορών",
        variant: "destructive",
      });
    } finally {
      setIsLoadingOffers(prev => ({ ...prev, [customerId]: false }));
    }
  }, []);
  
  // Handle row expansion to show offers
  const handleToggleExpand = useCallback((customerId: string) => {
    setExpandedCustomerIds(prev => {
      const newSet = new Set(prev);
      
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
        
        // Fetch offers if not already loaded
        if (!customerOffers[customerId]) {
          fetchCustomerOffers(customerId);
        }
      }
      
      return newSet;
    });
  }, [customerOffers, fetchCustomerOffers]);
  
  // Check if a customer row is expanded
  const isCustomerExpanded = useCallback((customerId: string) => {
    return expandedCustomerIds.has(customerId);
  }, [expandedCustomerIds]);
  
  // Update customer status
  const handleUpdateCustomerStatus = useCallback(async (customerId: string, newStatus: string) => {
    try {
      // For mock implementation, just show success toast
      toast({
        title: "Επιτυχία",
        description: "Η κατάσταση του πελάτη ενημερώθηκε",
        variant: "default",
      });
    } catch (err) {
      console.error('Error updating customer status:', err);
      toast({
        title: "Σφάλμα",
        description: "Δεν ήταν δυνατή η ενημέρωση της κατάστασης του πελάτη",
        variant: "destructive",
      });
    }
  }, []);
  
  // Define columns for the table
  const columns = useMemo<ColumnDef<Customer>[]>(() => [
    // Expand/Collapse column
    {
      id: 'expander',
      size: 35,
      header: '',
      cell: ({ row }) => {
        const customer = row.original;
        const isExpanded = isCustomerExpanded(customer.id);
        
        return (
          <div 
            className="w-full h-full flex items-center justify-center cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleExpand(customer.id);
            }}
            aria-label={isExpanded ? "Collapse row" : "Expand row"}
          >
            {customer.offers_count && customer.offers_count > 0 ? (
              <>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-[#84a98c]" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-[#84a98c]" />
                )}
                <span className="sr-only">
                  {isExpanded ? "Collapse" : "Expand"}
                </span>
              </>
            ) : (
              <div className="w-4 h-4" />
            )}
          </div>
        );
      }
    },
    
    // Customer name/company
    {
      accessorKey: 'company_name',
      header: 'Επωνυμία / Όνομα',
      size: 250,
      cell: ({ row }) => {
        const customer = row.original;
        const companyName = customer.company_name;
        const fullName = `${customer.first_name} ${customer.last_name}`.trim();
        
        return (
          <div className="flex flex-col">
            <span className="font-medium truncate">
              {companyName || fullName || '(Χωρίς όνομα)'}
            </span>
            {companyName && fullName && (
              <span className="text-xs text-[#84a98c] truncate">
                {fullName}
              </span>
            )}
          </div>
        );
      }
    },
    
    // Tax ID
    {
      accessorKey: 'tax_id',
      header: 'ΑΦΜ',
      size: 120,
      cell: ({ row }) => {
        const customer = row.original;
        return (
          <span className="text-[#cad2c5] text-sm">
            {customer.tax_id || '-'}
          </span>
        );
      }
    },
    
    // Phone
    {
      accessorKey: 'phone',
      header: 'Τηλέφωνο',
      size: 150,
      cell: ({ row }) => {
        const customer = row.original;
        return (
          <span className="text-[#cad2c5] text-sm">
            {customer.phone || '-'}
          </span>
        );
      }
    },
    
    // Email
    {
      accessorKey: 'email',
      header: 'Email',
      size: 200,
      cell: ({ row }) => {
        const customer = row.original;
        return customer.email ? (
          <div className="flex items-center">
            <span className="text-[#cad2c5] text-sm truncate max-w-[180px]">
              {customer.email}
            </span>
            {customer.email && (
              <a 
                href={`mailto:${customer.email}`} 
                className="ml-2 text-[#84a98c] hover:text-[#cad2c5]"
                onClick={(e) => e.stopPropagation()}
                aria-label={`Send email to ${customer.email}`}
                tabIndex={0}
              >
                <Mail className="h-4 w-4" />
              </a>
            )}
          </div>
        ) : (
          <span className="text-gray-500">-</span>
        );
      }
    },
    
    // Customer type
    {
      accessorKey: 'customer_type',
      header: 'Τύπος',
      size: 150,
      cell: ({ row }) => {
        const customer = row.original;
        return (
          <span className="text-[#cad2c5] text-sm">
            {customer.customer_type || '-'}
          </span>
        );
      }
    },
    
    // Offers count
    {
      id: 'offers_count',
      header: 'Προσφορές',
      size: 120,
      cell: ({ row }) => {
        const customer = row.original;
        const offersCount = customer.offers_count || 0;
        
        return (
          <div className="flex items-center justify-center">
            <Badge
              className={`${
                offersCount > 0
                  ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 ring-1 ring-blue-500/50'
                  : 'bg-gray-500/20 text-gray-400 ring-1 ring-gray-500/50'
              } rounded-full px-2 py-0 text-xs font-medium`}
            >
              {offersCount}
            </Badge>
          </div>
        );
      }
    },
    
    // Status
    {
      accessorKey: 'status',
      header: 'Κατάσταση',
      size: 120,
      cell: ({ row }) => {
        const customer = row.original;
        
        return (
          <div className="flex justify-center">
            <Badge
              className={`${
                customer.status === 'active'
                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 ring-1 ring-green-500/50'
                  : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 ring-1 ring-red-500/50'
              } px-2 py-0.5 text-xs font-medium rounded-full`}
            >
              {customer.status === 'active' ? 'Ενεργός' : 'Ανενεργός'}
            </Badge>
          </div>
        );
      }
    },
    
    // Created Date
    {
      accessorKey: 'created_at',
      header: 'Ημ/νία Δημιουργίας',
      size: 150,
      cell: ({ row }) => {
        const customer = row.original;
        return (
          <span className="text-[#cad2c5] text-sm">
            {formatDate(customer.created_at)}
          </span>
        );
      }
    },
    
    // Actions
    {
      id: 'actions',
      header: '',
      size: 50,
      cell: ({ row }) => {
        const customer = row.original;
        
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-8 w-8 p-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4 text-[#84a98c]" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5]"
              >
                {/* View details in new tab */}
                <DropdownMenuItem
                  className="cursor-pointer hover:bg-[#354f52] text-[#cad2c5]"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`/customers/${customer.id}`, '_blank');
                  }}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  <span>Άνοιγμα σε νέα καρτέλα</span>
                </DropdownMenuItem>
                
                {/* Create offer */}
                <DropdownMenuItem
                  className="cursor-pointer hover:bg-[#354f52] text-[#cad2c5]"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateOffer(customer.id);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span>Νέα Προσφορά</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator className="bg-[#52796f]/30" />
                
                {/* Edit customer */}
                <DropdownMenuItem
                  className="cursor-pointer hover:bg-[#354f52] text-[#cad2c5]"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditCustomer(customer);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  <span>Επεξεργασία</span>
                </DropdownMenuItem>
                
                {/* Toggle status */}
                {canPerformAdminActions && (
                  <DropdownMenuItem
                    className="cursor-pointer hover:bg-[#354f52] text-[#cad2c5]"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newStatus = customer.status === 'active' ? 'inactive' : 'active';
                      handleUpdateCustomerStatus(customer.id, newStatus);
                    }}
                  >
                    {customer.status === 'active' ? (
                      <>
                        <XCircle className="mr-2 h-4 w-4 text-red-400" />
                        <span>Απενεργοποίηση</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4 text-green-400" />
                        <span>Ενεργοποίηση</span>
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuSeparator className="bg-[#52796f]/30" />
                
                {/* Delete customer */}
                {canPerformAdminActions && (
                  <DropdownMenuItem
                    className="cursor-pointer hover:bg-red-900/30 text-red-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteCustomer(customer);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Διαγραφή</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      }
    }
  ], [handleToggleExpand, isCustomerExpanded, onCreateOffer, onEditCustomer, handleUpdateCustomerStatus, onDeleteCustomer, canPerformAdminActions]);
  
  // Render expanded row with offers
  const renderExpandedRow = useCallback((customer: Customer) => {
    const offers = customerOffers[customer.id] || [];
    const isLoading = isLoadingOffers[customer.id] || false;
    
    if (isLoading) {
      return (
        <div className="py-4 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-t-transparent border-[#84a98c] rounded-full animate-spin mr-2"></div>
          <span className="text-[#84a98c]">Φόρτωση προσφορών...</span>
        </div>
      );
    }
    
    if (offers.length === 0) {
      return (
        <div className="py-6 text-center">
          <p className="text-[#84a98c] mb-3">Δεν υπάρχουν προσφορές για αυτόν τον πελάτη</p>
          <Button
            variant="outline"
            size="sm"
            className="bg-[#354f52] hover:bg-[#52796f] text-[#cad2c5] border-[#52796f]"
            onClick={() => onCreateOffer(customer.id)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Νέα Προσφορά
          </Button>
        </div>
      );
    }
    
    return (
      <div className="py-2">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-[#cad2c5] font-medium">Πρόσφατες Προσφορές</h3>
          <Button
            variant="outline"
            size="sm"
            className="bg-[#354f52] hover:bg-[#52796f] text-[#cad2c5] border-[#52796f]"
            onClick={() => onCreateOffer(customer.id)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Νέα Προσφορά
          </Button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#2f3e46]/80 text-[#84a98c]">
                <th className="text-left p-2 text-xs">Αρ. Προσφοράς</th>
                <th className="text-left p-2 text-xs">Ημερομηνία</th>
                <th className="text-left p-2 text-xs">Πηγή</th>
                <th className="text-left p-2 text-xs">Σημειώσεις</th>
                <th className="text-center p-2 text-xs">Κατάσταση</th>
                <th className="text-right p-2 text-xs">Ποσό (€)</th>
                <th className="text-right p-2 text-xs">Ενέργειες</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((offer) => (
                <tr 
                  key={offer.id} 
                  className="border-b border-[#52796f]/20 hover:bg-[#354f52]/30"
                >
                  <td className="p-2 text-sm">{offer.offer_number || '-'}</td>
                  <td className="p-2 text-sm">{formatDate(offer.created_at)}</td>
                  <td className="p-2 text-sm">{offer.source || 'Email'}</td>
                  <td className="p-2 text-sm">
                    <div className="max-w-[300px] truncate">
                      {offer.notes || '-'}
                    </div>
                  </td>
                  <td className="p-2 text-sm text-center">
                    <Badge
                      className={`${
                        offer.status === 'pending' 
                          ? 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/30' 
                          : offer.status === 'accepted' 
                            ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'
                            : offer.status === 'rejected'
                              ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
                              : 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30'
                      } px-2 py-0.5 text-xs rounded-full`}
                    >
                      {offer.status === 'pending' && (
                        <Clock className="h-3 w-3 mr-1 inline-block" />
                      )}
                      {offer.status === 'accepted' && (
                        <CheckCircle2 className="h-3 w-3 mr-1 inline-block" />
                      )}
                      {offer.status === 'rejected' && (
                        <XCircle className="h-3 w-3 mr-1 inline-block" />
                      )}
                      {offer.status === 'draft' && (
                        <FileText className="h-3 w-3 mr-1 inline-block" />
                      )}
                      {offer.status === 'pending' && 'Εκκρεμεί'}
                      {offer.status === 'accepted' && 'Αποδοχή'}
                      {offer.status === 'rejected' && 'Απόρριψη'}
                      {offer.status === 'draft' && 'Πρόχειρο'}
                      {!['pending', 'accepted', 'rejected', 'draft'].includes(offer.status) && offer.status}
                    </Badge>
                  </td>
                  <td className="p-2 text-sm text-right">
                    {offer.total_amount 
                      ? new Intl.NumberFormat('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(offer.total_amount)
                      : '-'
                    }
                  </td>
                  <td className="p-2 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 bg-transparent hover:bg-[#354f52]"
                        onClick={() => onEditOffer(customer.id, offer.id)}
                        title="Επεξεργασία Προσφοράς"
                      >
                        <Edit className="h-3.5 w-3.5 text-[#84a98c]" />
                        <span className="sr-only">Επεξεργασία</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 bg-transparent hover:bg-[#354f52]"
                        onClick={() => onDeleteOffer(customer.id, offer.id)}
                        title="Διαγραφή Προσφοράς"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        <span className="sr-only">Διαγραφή</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {offers.length > 0 && customer.offers_count && customer.offers_count > offers.length && (
            <div className="mt-2 text-right">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-[#84a98c] hover:text-[#cad2c5] hover:bg-[#354f52]"
                onClick={() => window.open(`/customers/${customer.id}`, '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Προβολή όλων των προσφορών ({customer.offers_count})
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }, [customerOffers, isLoadingOffers, onCreateOffer, onEditOffer, onDeleteOffer]);

  return (
    <TableWrapper
      columns={columns}
      fetchData={fetchCustomers}
      initialPageSize={50}
      renderExpanded={renderExpandedRow}
      noDataMessage="Δεν βρέθηκαν πελάτες"
      loadingMessage="Φόρτωση πελατών..."
      errorMessage="Σφάλμα κατά την φόρτωση πελατών"
      keyExtractor={(customer) => customer.id}
      onRowClick={(customer) => onEditCustomer(customer)}
      title="Πελάτες"
      description="Διαχείριση πελατών και προσφορών"
      initialFilters={{
        searchTerm: '',
        searchColumn: 'company_name',
        statusFilter: 'all',
        customerTypes: []
      }}
    />
  );
} 