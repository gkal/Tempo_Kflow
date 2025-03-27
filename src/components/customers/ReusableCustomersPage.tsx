import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { VirtualDataTable, Column } from "@/components/ui/virtual-table/VirtualDataTable";
import { Plus, Eye, EyeOff, Loader2, Trash2, ChevronRight, ChevronDown } from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { format } from "date-fns";
import { TruncateWithTooltip } from "@/components/ui/GlobalTooltip";

// Define Customer type
interface CustomerOffer {
  id: string;
  name: string;
  value: string;
  date: string;
  status: string;
  requirements?: string;
  result?: string;
}

interface Customer {
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

// Helper function for formatting currency
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR'
  }).format(value);
};

// Helper function for formatting dates
const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    return format(date, 'dd MMM yyyy');
  } catch (error) {
    return '-';
  }
};

// Format date with time
const formatDateTime = (dateString?: string) => {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('el-GR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  } catch (error) {
    return dateString;
  }
};

// Format status for display
const formatStatus = (status: string) => {
  switch (status) {
    case "wait_for_our_answer":
      return "Αναμονή για απάντησή μας";
    case "wait_for_customer_answer":
      return "Αναμονή για απάντηση πελάτη";
    case "ready":
      return "Ολοκληρώθηκε";
    default:
      return status || "—";
  }
};

// Format result for display
const formatResult = (result: string) => {
  switch (result) {
    case "success":
      return "Επιτυχία";
    case "failed":
      return "Αποτυχία";
    case "cancel":
      return "Ακύρωση";
    case "waiting":
      return "Αναμονή";
    case "none":
      return "Κανένα";
    default:
      return result || "—";
  }
};

// Function to get status class
const getStatusClass = (status: string): string => {
  switch (status) {
    case "wait_for_our_answer":
      return "text-yellow-400";
    case "wait_for_customer_answer":
      return "text-blue-400";
    case "ready":
      return "text-green-400";
    case "completed":
      return "text-green-400";
    case "pending":
      return "text-yellow-400";
    default:
      return "text-gray-400";
  }
};

// Function to get result class
const getResultClass = (result: string): string => {
  switch (result) {
    case "success":
      return "text-green-400";
    case "failed":
      return "text-red-400";
    case "cancel":
      return "text-yellow-400";
    case "waiting":
      return "text-purple-400";
    case "pending":
      return "text-blue-400";
    case "none":
      return "text-gray-400";
    default:
      return "text-gray-400";
  }
};

// Main component
const ReusableCustomersPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCustomerIds, setExpandedCustomerIds] = useState<Record<string, boolean>>({});
  const [customerOffers, setCustomerOffers] = useState<Record<string, CustomerOffer[]>>({});
  const [loadingOffers, setLoadingOffers] = useState<Record<string, boolean>>({});
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchColumn, setSearchColumn] = useState('company_name');
  const [customerTypes, setCustomerTypes] = useState<string[]>([
    "Εταιρεία", 
    "Ιδιώτης", 
    "Δημόσιο", 
    "Οικοδομές", 
    "Εκτακτος Πελάτης", 
    "Εκτακτη Εταιρία"
  ]);
  const [selectedCustomerTypes, setSelectedCustomerTypes] = useState<string[]>([]);
  
  // Check user permissions
  const isAdminUser = user?.role?.toLowerCase() === 'admin';
  const isAdminOrSuperUser = isAdminUser || 
                           user?.role === 'Super User' ||
                           user?.role?.toLowerCase() === 'super user';
  
  // Function to map database customers to our Customer type
  const mapDatabaseCustomers = (dbCustomers: any[]): Customer[] => {
    return dbCustomers.map(dbCustomer => ({
      id: dbCustomer.id,
      company_name: dbCustomer.company_name || '',
      email: dbCustomer.email || '',
      telephone: dbCustomer.telephone || '',
      status: dbCustomer.status || 'inactive',
      created_at: dbCustomer.created_at,
      customer_type: dbCustomer.customer_type || '',
      address: dbCustomer.address || '',
      afm: dbCustomer.afm || '',
      offers_count: dbCustomer.offers?.length || 0,
      offers: dbCustomer.offers?.map((offer: any) => ({
        id: offer.id,
        name: `Προσφορά ${typeof offer.id === 'number' || typeof offer.id === 'string' ? String(offer.id).slice(0, 4) : ''}`,
        value: offer.amount ? String(offer.amount) : '',
        date: offer.created_at,
        status: offer.offer_result || 'pending',
        requirements: offer.customer_comments || '',
        result: offer.result || ''
      })) || []
    }));
  };

  // Fetch customers on component mount
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setIsLoading(true);
        
        // Remove columns that don't exist in the database
        const { data, error } = await supabase
          .from('customers')
          .select(`
            id, 
            company_name, 
            email, 
            telephone, 
            status, 
            customer_type, 
            created_at,
            address,
            afm,
            offers(
              id, 
              customer_id, 
              created_at, 
              source, 
              amount, 
              offer_result, 
              result,
              customer_comments, 
              our_comments, 
              deleted_at
            )
          `)
          .filter('deleted_at', 'is', null)
          .order('company_name', { ascending: true });
        
        if (error) throw error;
        
        const mappedCustomers = mapDatabaseCustomers(data || []);
        setCustomers(mappedCustomers);
      } catch (error) {
        console.error('Error fetching customers:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCustomers();
  }, []);
  
  // Fetch offers for a specific customer
  const fetchCustomerOffers = useCallback(async (customerId: string) => {
    // If we already have offers for this customer, don't fetch again
    if (customerOffers[customerId]) return;
    
    try {
      setLoadingOffers(prev => ({ ...prev, [customerId]: true }));
      
      const { data: offerData, error } = await supabase
        .from('offers')
        .select('*')
        .eq('customer_id', customerId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching offers:', error);
        return;
      }
      
      // Format offers data
      const formattedOffers = offerData.map(offer => ({
        id: offer.id,
        name: `Προσφορά ${typeof offer.id === 'number' || typeof offer.id === 'string' ? String(offer.id).slice(0, 4) : ''}`,
        value: offer.amount ? String(offer.amount) : '',
        date: offer.created_at,
        status: offer.offer_result || 'pending',
        requirements: offer.customer_comments || '',
        result: offer.result || ''
      }));
      
      setCustomerOffers(prev => ({ ...prev, [customerId]: formattedOffers }));
    } catch (err) {
      console.error('Error fetching offers:', err);
    } finally {
      setLoadingOffers(prev => ({ ...prev, [customerId]: false }));
    }
  }, [customerOffers]);
  
  // Toggle customer expansion
  const handleExpandCustomer = useCallback((customerId: string) => {
    setExpandedCustomerIds(prev => {
      const isCurrentlyExpanded = !!prev[customerId];
      return { ...prev, [customerId]: !isCurrentlyExpanded };
    });
    
    // Fetch offers if we expand and don't already have them
    if (!expandedCustomerIds[customerId] && !customerOffers[customerId]) {
      fetchCustomerOffers(customerId);
    }
  }, [expandedCustomerIds, customerOffers, fetchCustomerOffers]);
  
  // Handle customer click
  const handleCustomerClick = useCallback((customer: Customer) => {
    navigate(`/customers/${customer.id}`);
  }, [navigate]);
  
  // Define columns for the table
  const customerColumns = useMemo<Column<Customer>[]>(() => [
    {
      accessorKey: 'company_name',
      header: 'Επωνυμία',
      enableSorting: true,
      sortDescFirst: false,
      cell: ({ row }) => {
        const customer = row;
        const offersCount = customer.offers_count || 0;
        const isExpanded = expandedCustomerIds[customer.id] || false;
        
        return (
          <div className="flex items-center gap-3 justify-start">
            {/* Expand/Offers count */}
            {offersCount > 0 && (
              <div 
                className="flex items-center justify-center"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleExpandCustomer(customer.id);
                }}
              >
                <div className="flex items-center justify-center relative group cursor-pointer hover:bg-[#52796f]/60 rounded-full w-10 h-8 transition-colors duration-200">
                  <span className="absolute inset-0 rounded-full bg-[#52796f]/0 group-hover:bg-[#52796f]/30 transition-colors duration-200"></span>
                  <div className="flex items-center justify-center">
                    {isExpanded ? (
                      <svg 
                        width="18" 
                        height="18" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        className="h-5 w-5 text-[#84a98c] relative z-10"
                      >
                        <path d="m18 15-6-6-6 6"/>
                      </svg>
                    ) : (
                      <svg 
                        width="18" 
                        height="18" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        className="h-5 w-5 text-[#84a98c] relative z-10"
                      >
                        <path d="m9 18 6-6-6-6"/>
                      </svg>
                    )}
                    <span className="ml-1 text-sm text-[#84a98c] group-hover:text-white relative z-10">{offersCount}</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Company name */}
            <span>{customer.company_name || "—"}</span>
          </div>
        );
      },
      meta: {
        className: 'w-[300px] min-w-[300px] max-w-[300px] text-left',
        headerClassName: 'relative flex justify-center'
      },
    },
    {
      accessorKey: 'customer_type',
      header: 'Τύπος',
      enableSorting: true,
      sortDescFirst: false,
      cell: ({ row }) => row.customer_type || "—",
      meta: {
        className: 'w-[150px] min-w-[150px] max-w-[150px] text-left whitespace-nowrap overflow-hidden text-ellipsis',
        headerClassName: 'relative flex justify-center'
      },
    },
    {
      accessorKey: 'telephone',
      header: 'Τηλέφωνο',
      enableSorting: true,
      sortDescFirst: false,
      cell: ({ row }) => row.telephone || "—",
      meta: {
        className: 'w-[150px] min-w-[150px] max-w-[150px] text-left whitespace-nowrap overflow-hidden text-ellipsis',
        headerClassName: 'relative flex justify-center'
      },
    },
    {
      accessorKey: 'email',
      header: 'Email',
      enableSorting: true,
      sortDescFirst: false,
      cell: ({ row }) => row.email || "—",
      meta: {
        className: 'w-[200px] min-w-[200px] max-w-[200px] text-left whitespace-nowrap overflow-hidden text-ellipsis',
        headerClassName: 'relative flex justify-center'
      },
    },
    {
      accessorKey: 'afm',
      header: 'ΑΦΜ',
      enableSorting: true,
      sortDescFirst: false,
      cell: ({ row }) => row.afm || "—",
      meta: {
        className: 'w-[120px] min-w-[120px] max-w-[120px] text-left whitespace-nowrap overflow-hidden text-ellipsis',
        headerClassName: 'relative flex justify-center'
      },
    },
    {
      accessorKey: 'address',
      header: 'Διεύθυνση',
      enableSorting: true,
      sortDescFirst: false,
      cell: ({ row }) => {
        // Simplify address display since we don't have city and postal_code
        return row.address || "—";
      },
      meta: {
        className: 'w-[250px] min-w-[250px] max-w-[250px] text-left whitespace-nowrap overflow-hidden text-ellipsis',
        headerClassName: 'relative flex justify-center'
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Ημερομηνία Δημιουργίας',
      enableSorting: true,
      sortDescFirst: false,
      cell: ({ row }) => formatDateTime(row.created_at),
      meta: {
        className: 'w-[200px] min-w-[200px] max-w-[200px] text-left whitespace-nowrap overflow-hidden text-ellipsis',
        headerClassName: 'relative flex justify-center'
      },
    },
    {
      accessorKey: 'status',
      header: 'Κατάσταση Πελάτη',
      enableSorting: true,
      sortDescFirst: false,
      cell: ({ row }) => {
        const status = row.status;
        return (
          <div className="flex justify-end items-center gap-2">
            {status === 'active' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-green-400">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-red-500">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-[#354f52] text-red-500 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
      meta: {
        className: 'w-[150px] min-w-[150px] max-w-[150px] text-right',
        headerClassName: 'relative flex justify-center'
      },
    },
  ], [expandedCustomerIds, handleExpandCustomer]);
  
  // Define search columns
  const searchColumns = [
    { accessor: 'company_name', header: 'Επωνυμία' },
    { accessor: 'customer_type', header: 'Τύπος' },
    { accessor: 'telephone', header: 'Τηλέφωνο' },
    { accessor: 'email', header: 'Email' },
    { accessor: 'afm', header: 'ΑΦΜ' },
    { accessor: 'address', header: 'Διεύθυνση' },
  ];
  
  // Filter buttons
  const filterButtons = [
    { label: 'Όλοι', value: 'all', onClick: () => setActiveFilter('all'), isActive: activeFilter === 'all' },
    { label: 'Ενεργοί', value: 'active', onClick: () => setActiveFilter('active'), isActive: activeFilter === 'active' },
    { label: 'Ανενεργοί', value: 'inactive', onClick: () => setActiveFilter('inactive'), isActive: activeFilter === 'inactive' },
  ];
  
  // Filter customers based on activeFilter and selectedCustomerTypes
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      // Filter by status
      if (activeFilter === 'active' && customer.status !== 'active') return false;
      if (activeFilter === 'inactive' && customer.status !== 'inactive') return false;
      
      // Filter by customer type if any types are selected
      if (selectedCustomerTypes.length > 0 && !selectedCustomerTypes.includes(customer.customer_type)) {
        return false;
      }
      
      return true;
    });
  }, [customers, activeFilter, selectedCustomerTypes]);
  
  // Render expanded content
  const renderExpandedContent = useCallback((customer: Customer) => {
    const customerId = customer.id;
    const offers = customerOffers[customerId] || [];
    const isLoading = loadingOffers[customerId] || false;
    
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-4">
          <LoadingSpinner fullScreen={false} />
          <span className="ml-3 text-[#cad2c5]">Φόρτωση προσφορών...</span>
        </div>
      );
    }
    
    if (offers.length === 0) {
      return (
        <div className="py-4 text-[#84a98c] flex flex-col items-center justify-center gap-3">
          <div className="text-center">
            Δεν υπάρχουν προσφορές για αυτόν τον πελάτη
          </div>
        </div>
      );
    }
    
    // Render offers table
    return (
      <div className="overflow-hidden pl-[70px] pr-4 py-2">
        <div className="bg-[#2f3e46] rounded-md overflow-hidden">
          <table className="w-full border-collapse">
            <thead className="bg-[#354f52]">
              <tr>
                <th className="px-2 py-1 text-left text-[#cad2c5] text-xs font-medium w-[160px]">Ημερομηνία</th>
                <th className="px-3 py-1 text-left text-[#cad2c5] text-xs font-medium w-[180px]">Ζήτηση Πελάτη</th>
                <th className="px-3 py-1 text-left text-[#cad2c5] text-xs font-medium w-[100px]">Ποσό</th>
                <th className="px-3 py-1 text-left text-[#cad2c5] text-xs font-medium w-[160px]">Κατάσταση</th>
                <th className="px-3 py-1 text-left text-[#cad2c5] text-xs font-medium w-[100px]">Αποτέλεσμα</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((offer) => (
                <tr 
                  key={offer.id} 
                  className="border-t border-[#52796f]/30 bg-[#2f3e46] hover:bg-[#354f52] cursor-pointer transition-colors duration-150"
                  onClick={() => navigate(`/offers/${offer.id}`)}
                >
                  <td className="px-2 py-0.5 text-xs text-[#cad2c5] w-[160px]">{formatDate(offer.date)}</td>
                  <td className="px-3 py-0.5 text-xs text-[#cad2c5] w-[180px]">
                    {offer.requirements ? (
                      <TruncateWithTooltip 
                        text={offer.requirements} 
                        maxLength={50} 
                        maxWidth={800}
                        multiLine={false}
                        maxLines={1}
                      />
                    ) : "-"}
                  </td>
                  <td className="px-3 py-0.5 text-xs text-[#cad2c5] w-[100px]">
                    <div className="bg-[#354f52]/50 rounded px-1.5 py-0.5 border border-[#52796f]/30 max-w-[90px] overflow-hidden text-ellipsis">
                      {offer.value || "-"}
                    </div>
                  </td>
                  <td className="px-3 py-0.5 text-xs w-[160px]">
                    <span className={getStatusClass(offer.status)}>
                      {formatStatus(offer.status)}
                    </span>
                  </td>
                  <td className="px-3 py-0.5 text-xs w-[100px]">
                    <span className={getResultClass(offer.result)}>
                      {formatResult(offer.result || '')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }, [customerOffers, loadingOffers, navigate]);
  
  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  // Handle search column change
  const handleColumnChange = useCallback((value: string) => {
    setSearchColumn(value);
  }, []);

  // Handle customer type filter change
  const handleCustomerTypeChange = useCallback((types: string[]) => {
    setSelectedCustomerTypes(types);
  }, []);
  
  return (
    <TooltipProvider>
      <div className="container mx-auto px-4 py-8">
        <div className="bg-[#2f3e46] rounded-lg p-6 shadow-md">
          <div className="mb-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-[#cad2c5]">Πελάτες</h1>
              <Button
                onClick={() => navigate('/customers/new')}
                className="bg-[#84a98c] text-[#2f3e46] hover:bg-[#84a98c]/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Νέος Πελάτης
              </Button>
            </div>
          </div>

          <VirtualDataTable
            data={filteredCustomers}
            columns={customerColumns}
            isLoading={isLoading}
            onRowClick={handleCustomerClick}
            getRowId={(row) => row.id}
            renderExpandedContent={renderExpandedContent}
            expandedRowIds={expandedCustomerIds}
            onExpandRow={handleExpandCustomer}
            containerClassName="mt-4"
            showSearchBar={true}
            searchColumns={searchColumns}
            initialSearchColumn="company_name"
            filterButtons={filterButtons}
            emptyStateMessage="Δεν βρέθηκαν πελάτες"
            loadingStateMessage="Φόρτωση πελατών..."
            customerTypes={customerTypes}
            selectedCustomerTypes={selectedCustomerTypes}
            onCustomerTypeChange={handleCustomerTypeChange}
          />
        </div>
      </div>
    </TooltipProvider>
  );
};

export default ReusableCustomersPage; 