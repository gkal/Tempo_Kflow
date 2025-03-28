import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { TruncateWithTooltip, TooltipProvider } from "@/components/ui/GlobalTooltip";
import { VirtualDataTable, Column } from "@/components/ui/virtual-table/VirtualDataTable";
import { Plus, Eye, EyeOff, Loader2, Trash2, ChevronRight, ChevronDown } from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { format } from "date-fns";
import { createColumnHelper, ColumnDef } from "@tanstack/react-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
    return new Intl.DateTimeFormat('el-GR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
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
  
  // Delete offer dialog state
  const [showDeleteOfferDialog, setShowDeleteOfferDialog] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<string | null>(null);
  const [customerIdForDelete, setCustomerIdForDelete] = useState<string | null>(null);
  const [isDeletingOffer, setIsDeletingOffer] = useState(false);
  
  // Delete customer dialog state
  const [showDeleteCustomerDialog, setShowDeleteCustomerDialog] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);
  
  // Check user permissions
  const isAdminUser = user?.role?.toLowerCase() === 'admin';
  const isAdminOrSuperUser = isAdminUser || 
                           user?.role === 'Super User' ||
                           user?.role?.toLowerCase() === 'super user';
  
  // Function to map database customers to our Customer type
  const mapDatabaseCustomers = (dbCustomers: any[]): Customer[] => {
    return dbCustomers.map(dbCustomer => {
      // Add debug logging for AAA customer
      if (dbCustomer.company_name && dbCustomer.company_name.toLowerCase().includes('aaa')) {
        console.log('Raw AAA Customer Data:', dbCustomer);
        console.log('Total offers for AAA:', dbCustomer.offers?.length || 0);
        
        // Log details about each offer
        if (dbCustomer.offers && dbCustomer.offers.length > 0) {
          console.log('Offer details:');
          dbCustomer.offers.forEach((offer: any, index: number) => {
            console.log(`Offer ${index + 1}:`, {
              id: offer.id, 
              deleted_at: offer.deleted_at, 
              result: offer.result
            });
          });
          
          // Count only non-deleted offers
          const nonDeletedOffers = dbCustomer.offers.filter((offer: any) => !offer.deleted_at);
          console.log('Non-deleted offers count:', nonDeletedOffers.length);
          
          // Count only open offers (non-deleted and no result)
          const openOffers = dbCustomer.offers.filter((offer: any) => !offer.deleted_at && !offer.result);
          console.log('Open offers count:', openOffers.length);
        }
      }
      
      return {
        id: dbCustomer.id,
        company_name: dbCustomer.company_name || '',
        email: dbCustomer.email || '',
        telephone: dbCustomer.telephone || '',
        status: dbCustomer.status || 'inactive',
        created_at: dbCustomer.created_at,
        customer_type: dbCustomer.customer_type || '',
        address: dbCustomer.address || '',
        afm: dbCustomer.afm || '',
        offers_count: dbCustomer.offers?.filter((offer: any) => !offer.result && !offer.deleted_at).length || 0,
        offers: dbCustomer.offers?.filter((offer: any) => !offer.deleted_at).map((offer: any) => ({
          id: offer.id,
          name: `Προσφορά ${typeof offer.id === 'number' || typeof offer.id === 'string' ? String(offer.id).slice(0, 4) : ''}`,
          value: offer.amount ? String(offer.amount) : '',
          date: offer.created_at,
          status: offer.offer_result || 'pending',
          requirements: offer.requirements || '',
          result: offer.result || ''
        })) || []
      };
    });
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
              requirements,
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
        requirements: offer.requirements || '',
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
      enableResizing: true,
      size: 300,
      cell: ({ row }) => {
        const customer = row;
        const offersCount = customer.offers_count || 0;
        const isExpanded = expandedCustomerIds[customer.id] || false;
        
        return (
          <div className="flex items-center gap-1 justify-start">
            <div className="flex items-center min-w-[40px] pl-2">
              {offersCount > 0 ? (
                <div 
                  className={`flex items-center justify-center relative group cursor-pointer hover:bg-[#52796f]/60 rounded-full w-10 h-8 transition-colors duration-200 ${isExpanded ? 'bg-[#52796f]/30' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleExpandCustomer(customer.id);
                  }}
                >
                  <span className="absolute inset-0 rounded-full bg-[#52796f]/0 group-hover:bg-[#52796f]/30 transition-colors duration-200"></span>
                  <div className="flex items-center justify-center">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-[#84a98c] relative z-10" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-[#84a98c] relative z-10" />
                    )}
                    <span className="ml-1 text-sm text-[#84a98c] group-hover:text-white relative z-10 font-medium">{offersCount}</span>
                  </div>
                </div>
              ) : (
                <span className="invisible">0</span>
              )}
            </div>
            <span className="text-[#cad2c5]">{customer.company_name}</span>
          </div>
        );
      },
      meta: {
        className: 'text-left',
        headerClassName: 'relative flex justify-center'
      },
    },
    {
      accessorKey: 'customer_type',
      header: 'Τύπος',
      enableSorting: true,
      sortDescFirst: false,
      enableResizing: true,
      size: 150,
      cell: ({ row }) => row.customer_type || "—",
      meta: {
        className: 'text-left whitespace-nowrap overflow-hidden text-ellipsis',
        headerClassName: 'relative flex justify-center'
      },
    },
    {
      accessorKey: 'telephone',
      header: 'Τηλέφωνο',
      enableSorting: true,
      sortDescFirst: false,
      enableResizing: true,
      size: 150,
      cell: ({ row }) => row.telephone || "—",
      meta: {
        className: 'text-left whitespace-nowrap overflow-hidden text-ellipsis',
        headerClassName: 'relative flex justify-center'
      },
    },
    {
      accessorKey: 'email',
      header: 'Email',
      enableSorting: true,
      sortDescFirst: false,
      enableResizing: true,
      size: 200,
      cell: ({ row }) => row.email || "—",
      meta: {
        className: 'text-left whitespace-nowrap overflow-hidden text-ellipsis',
        headerClassName: 'relative flex justify-center'
      },
    },
    {
      accessorKey: 'afm',
      header: 'ΑΦΜ',
      enableSorting: true,
      sortDescFirst: false,
      enableResizing: true,
      size: 120,
      cell: ({ row }) => row.afm || "—",
      meta: {
        className: 'text-left whitespace-nowrap overflow-hidden text-ellipsis',
        headerClassName: 'relative flex justify-center'
      },
    },
    {
      accessorKey: 'address',
      header: 'Διεύθυνση',
      enableSorting: true,
      sortDescFirst: false,
      enableResizing: true,
      size: 250,
      cell: ({ row }) => {
        return row.address || "—";
      },
      meta: {
        className: 'text-left whitespace-nowrap overflow-hidden text-ellipsis',
        headerClassName: 'relative flex justify-center'
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Ημερομηνία Δημιουργίας',
      enableSorting: true,
      sortDescFirst: false,
      enableResizing: true,
      size: 200,
      cell: ({ row }) => formatDateTime(row.created_at),
      meta: {
        className: 'text-left whitespace-nowrap overflow-hidden text-ellipsis',
        headerClassName: 'relative flex justify-center'
      },
    },
    {
      accessorKey: 'status',
      header: 'Ενεργείες',
      enableSorting: true,
      sortDescFirst: false,
      enableResizing: true,
      size: 150,
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
            
            {isAdminOrSuperUser && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-[#354f52] text-red-500 hover:text-red-400"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteCustomer(row);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
      meta: {
        className: 'text-right',
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

    // Handle offer deletion click
    const handleDeleteClick = (offerId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      setOfferToDelete(offerId);
      setCustomerIdForDelete(customerId);
      setShowDeleteOfferDialog(true);
    };
    
    // Render offers table
    return (
      <div className="overflow-visible pl-[70px] pr-4 py-4 relative">
        <div className="bg-[#2f3e46] rounded-md border border-[#52796f] shadow-sm w-[1000px]">
          <table className="w-full border-collapse table-fixed">
            <colgroup>
              <col className="w-[150px]" />
              <col className="w-[200px]" />
              <col className="w-[200px]" />
              <col className="w-[150px]" />
              <col className="w-[100px]" />
              {isAdminOrSuperUser && <col className="w-[80px]" />}
            </colgroup>
            <thead className="bg-[#2f3e46] relative z-10 after:absolute after:content-[''] after:left-0 after:right-0 after:bottom-0 after:h-[1px] after:bg-[#52796f]">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-[#84a98c] border-r border-[#52796f]">Ημερομηνία</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-[#84a98c] border-r border-[#52796f]">Ζήτηση Πελάτη</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-[#84a98c] border-r border-[#52796f]">Ποσό</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-[#84a98c] border-r border-[#52796f]">Κατάσταση</th>
                <th className={`px-2 py-2 text-left text-xs font-medium text-[#84a98c] ${isAdminOrSuperUser ? 'border-r border-[#52796f]' : ''}`}>Αποτέλεσμα</th>
                {isAdminOrSuperUser && (
                  <th className="px-2 py-2 text-center text-xs font-medium text-[#84a98c]">Ενέργειες</th>
                )}
              </tr>
            </thead>
            <tbody>
              {offers.map((offer) => (
                <tr 
                  key={offer.id} 
                  className="border-t border-[#52796f]/30 bg-[#2f3e46] hover:bg-[#354f52]/50 cursor-pointer transition-colors duration-150"
                  onClick={() => navigate(`/offers/${offer.id}`)}
                >
                  <td className="px-2 py-2 text-xs text-[#cad2c5] border-r border-[#52796f]">{formatDate(offer.date)}</td>
                  <td className="px-2 py-2 text-xs text-[#cad2c5] border-r border-[#52796f]">
                    {offer.requirements ? (
                      <TruncateWithTooltip 
                        text={offer.requirements} 
                        maxLength={30}
                        maxWidth={800}
                        multiLine={false}
                        maxLines={1}
                        position="top"
                        className="cursor-pointer"
                      />
                    ) : <span className="text-xs text-[#52796f]">-</span>}
                  </td>
                  <td className="px-2 py-2 text-xs text-[#cad2c5] border-r border-[#52796f]">
                    {offer.value ? (
                      <TruncateWithTooltip 
                        text={offer.value} 
                        maxLength={30}
                        maxWidth={800}
                        multiLine={false}
                        maxLines={1}
                        position="top"
                        className="cursor-pointer"
                      />
                    ) : <span className="text-xs text-[#52796f]">-</span>}
                  </td>
                  <td className="px-2 py-2 text-xs text-[#cad2c5] border-r border-[#52796f]">
                    <span className={getStatusClass(offer.status)}>
                      {formatStatus(offer.status) || <span className="text-xs text-[#52796f]">-</span>}
                    </span>
                  </td>
                  <td className={`px-2 py-2 text-xs text-[#cad2c5] ${isAdminOrSuperUser ? 'border-r border-[#52796f]' : ''}`}>
                    <span className={getResultClass(offer.result)}>
                      {formatResult(offer.result || '') || <span className="text-xs text-[#52796f]">-</span>}
                    </span>
                  </td>
                  {isAdminOrSuperUser && (
                    <td className="px-2 py-2 text-xs text-center">
                      <button
                        onClick={(e) => handleDeleteClick(offer.id, e)}
                        className="p-1 rounded-full hover:bg-[#354f52] text-red-500 hover:text-red-400 transition-colors"
                        aria-label="Διαγραφή προσφοράς"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }, [customerOffers, loadingOffers, navigate, isAdminOrSuperUser]);
  
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
  
  // Handle offer delete confirmation
  const confirmDeleteOffer = useCallback(async () => {
    if (!offerToDelete || !customerIdForDelete || isDeletingOffer) return;
    
    try {
      setIsDeletingOffer(true);
      let hasErrors = false;
      let offerDetails: any[] = [];
      
      // 1. FETCH PHASE - Gather all data we need to delete
      
      // First check if there are any offer details to delete
      const { data: details, error: detailsError } = await supabase
        .from('offer_details')
        .select('id')
        .eq('offer_id', offerToDelete)
        .is('deleted_at', null);
        
      if (detailsError) {
        console.error('Error checking offer details:', detailsError);
        hasErrors = true;
      } else if (details) {
        offerDetails = details;
      }
      
      // If there were any errors during the data fetching phase, abort
      if (hasErrors) {
        toast({
          title: "Σφάλμα",
          description: "Δεν ήταν δυνατή η ανάκτηση των απαραίτητων δεδομένων για διαγραφή",
          variant: "destructive"
        });
        return;
      }
      
      // 2. DELETION PHASE - Delete in order (children first, then parents)
      const now = new Date().toISOString();
      
      // First delete any associated offer details if they exist
      if (offerDetails.length > 0) {
        const { error: deleteDetailsError } = await supabase
          .from('offer_details')
          .update({ deleted_at: now } as any)
          .in('id', offerDetails.map(d => d.id));
          
        if (deleteDetailsError) {
          console.error('Error soft deleting offer details:', deleteDetailsError);
          toast({
            title: "Σφάλμα",
            description: "Δεν ήταν δυνατή η διαγραφή των λεπτομερειών προσφοράς",
            variant: "destructive"
          });
          return; // Abort if we can't delete offer details
        }
      }
      
      // Then soft delete the main offer
      const { error: deleteOfferError } = await supabase
        .from('offers')
        .update({ deleted_at: now })
        .eq('id', offerToDelete);
        
      if (deleteOfferError) {
        console.error('Error soft deleting offer:', deleteOfferError);
        toast({
          title: "Σφάλμα",
          description: "Δεν ήταν δυνατή η διαγραφή της προσφοράς",
          variant: "destructive"
        });
        return; // Abort if we can't delete the offer
      }
      
      // 3. UI UPDATE PHASE - Only if all operations succeeded
      
      // Update the local state to remove the deleted offer
      setCustomerOffers(prevOffers => {
        const updatedOffers = { ...prevOffers };
        if (updatedOffers[customerIdForDelete]) {
          updatedOffers[customerIdForDelete] = updatedOffers[customerIdForDelete].filter(offer => offer.id !== offerToDelete);
        }
        return updatedOffers;
      });
      
      // Update the customer offers count
      setCustomers(prevCustomers => {
        return prevCustomers.map(c => {
          if (c.id === customerIdForDelete) {
            return {
              ...c,
              offers_count: Math.max(0, (c.offers_count || 1) - 1)
            };
          }
          return c;
        });
      });
      
      toast({
        title: "Επιτυχία",
        description: "Η προσφορά διαγράφηκε με επιτυχία",
        variant: "default"
      });
    } catch (err) {
      console.error('Error handling offer deletion:', err);
      toast({
        title: "Σφάλμα",
        description: "Προέκυψε σφάλμα κατά τη διαγραφή της προσφοράς",
        variant: "destructive"
      });
    } finally {
      setIsDeletingOffer(false);
      setShowDeleteOfferDialog(false);
      setOfferToDelete(null);
      setCustomerIdForDelete(null);
    }
  }, [offerToDelete, customerIdForDelete, isDeletingOffer]);
  
  // Add handleDeleteCustomer function
  const handleDeleteCustomer = useCallback((customer: Customer) => {
    setCustomerToDelete(customer);
    setShowDeleteCustomerDialog(true);
  }, []);

  // Add confirmDeleteCustomer function
  const confirmDeleteCustomer = useCallback(async () => {
    if (!customerToDelete || isDeletingCustomer) return;
    
    try {
      setIsDeletingCustomer(true);
      const customerId = customerToDelete.id;
      const now = new Date().toISOString();
      let hasErrors = false;
      
      // 1. First fetch all contacts for this customer
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('id')
        .eq('customer_id', customerId)
        .is('deleted_at', null);
        
      if (contactsError) {
        console.error('Error fetching contacts:', contactsError);
        hasErrors = true;
      }
      
      // 2. Fetch all offers for this customer
      const { data: offers, error: offersError } = await supabase
        .from('offers')
        .select('id')
        .eq('customer_id', customerId)
        .is('deleted_at', null);
        
      if (offersError) {
        console.error('Error fetching offers:', offersError);
        hasErrors = true;
      }
      
      let offerDetails: any[] = [];
      
      // 3. If we have offers, fetch all offer details
      if (offers && offers.length > 0) {
        // Get all offer IDs
        const offerIds = offers.map(o => o.id);
        
        // Fetch offer details for those offers
        const { data: details, error: detailsError } = await supabase
          .from('offer_details')
          .select('id')
          .in('offer_id', offerIds)
          .is('deleted_at', null);
          
        if (detailsError) {
          console.error('Error fetching offer details:', detailsError);
          hasErrors = true;
        } else if (details) {
          offerDetails = details;
        }
      }
      
      // If there were any errors during the data fetching phase, abort
      if (hasErrors) {
        toast({
          title: "Σφάλμα",
          description: "Δεν ήταν δυνατή η ανάκτηση των απαραίτητων δεδομένων για διαγραφή",
          variant: "destructive"
        });
        return;
      }
      
      // Now start deleting, in reverse order (children first, then parents)
      
      // 4. Delete offer details if any
      if (offerDetails.length > 0) {
        const { error: deleteDetailsError } = await supabase
          .from('offer_details')
          .update({ deleted_at: now } as any)
          .in('id', offerDetails.map(d => d.id));
          
        if (deleteDetailsError) {
          console.error('Error soft deleting offer details:', deleteDetailsError);
          toast({
            title: "Σφάλμα",
            description: "Δεν ήταν δυνατή η διαγραφή των λεπτομερειών προσφορών",
            variant: "destructive"
          });
          return; // Abort if we can't delete offer details
        }
      }
      
      // 5. Delete offers if any
      if (offers && offers.length > 0) {
        const { error: deleteOffersError } = await supabase
          .from('offers')
          .update({ deleted_at: now })
          .in('id', offers.map(o => o.id));
          
        if (deleteOffersError) {
          console.error('Error soft deleting offers:', deleteOffersError);
          toast({
            title: "Σφάλμα",
            description: "Δεν ήταν δυνατή η διαγραφή των προσφορών",
            variant: "destructive"
          });
          return; // Abort if we can't delete offers
        }
      }
      
      // 6. Delete contacts if any
      if (contacts && contacts.length > 0) {
        const { error: deleteContactsError } = await supabase
          .from('contacts')
          .update({ deleted_at: now } as any)
          .in('id', contacts.map(c => c.id));
          
        if (deleteContactsError) {
          console.error('Error soft deleting contacts:', deleteContactsError);
          toast({
            title: "Σφάλμα",
            description: "Δεν ήταν δυνατή η διαγραφή των επαφών",
            variant: "destructive"
          });
          return; // Abort if we can't delete contacts
        }
      }
      
      // 7. Finally, soft delete the customer
      const { error: deleteCustomerError } = await supabase
        .from('customers')
        .update({ deleted_at: now })
        .eq('id', customerId);
        
      if (deleteCustomerError) {
        console.error('Error soft deleting customer:', deleteCustomerError);
        toast({
          title: "Σφάλμα",
          description: "Δεν ήταν δυνατή η διαγραφή του πελάτη",
          variant: "destructive"
        });
        return; // Abort if we can't delete the customer
      }
      
      // Only update UI and show success if everything succeeded
      
      // 8. Update UI to remove the deleted customer
      setCustomers(prev => prev.filter(c => c.id !== customerId));
      
      toast({
        title: "Επιτυχία",
        description: "Ο πελάτης διαγράφηκε με επιτυχία",
        variant: "default"
      });
    } catch (err) {
      console.error('Error handling customer deletion:', err);
      toast({
        title: "Σφάλμα",
        description: "Προέκυψε σφάλμα κατά τη διαγραφή του πελάτη",
        variant: "destructive"
      });
    } finally {
      setIsDeletingCustomer(false);
      setShowDeleteCustomerDialog(false);
      setCustomerToDelete(null);
    }
  }, [customerToDelete, isDeletingCustomer]);
  
  return (
    <TooltipProvider delayDuration={0}>
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
            stabilizeExpandedRows={true}
          />
        </div>
      </div>

      {/* Delete Offer Confirmation Dialog */}
      <AlertDialog open={showDeleteOfferDialog} onOpenChange={setShowDeleteOfferDialog}>
        <AlertDialogContent 
          className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5]"
          aria-describedby="delete-offer-description"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#cad2c5]">Διαγραφή Προσφοράς</AlertDialogTitle>
            <AlertDialogDescription id="delete-offer-description" className="text-[#84a98c]">
              Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την προσφορά; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#354f52] text-[#cad2c5] hover:bg-[#354f52]/90">
              Άκυρο
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmDeleteOffer}
              disabled={isDeletingOffer}
            >
              {isDeletingOffer ? "Διαγραφή..." : "Διαγραφή"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Customer Confirmation Dialog */}
      <AlertDialog open={showDeleteCustomerDialog} onOpenChange={setShowDeleteCustomerDialog}>
        <AlertDialogContent 
          className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5]"
          aria-describedby="delete-customer-description"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#cad2c5]">Διαγραφή Πελάτη</AlertDialogTitle>
            <AlertDialogDescription id="delete-customer-description" className="text-[#84a98c]">
              Είστε σίγουροι ότι θέλετε να διαγράψετε τον πελάτη "{customerToDelete?.company_name}"; 
              Αυτή η ενέργεια θα διαγράψει επίσης όλες τις επαφές και προσφορές. Δεν μπορεί να αναιρεθεί.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#354f52] text-[#cad2c5] hover:bg-[#354f52]/90">
              Άκυρο
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmDeleteCustomer}
              disabled={isDeletingCustomer}
            >
              {isDeletingCustomer ? "Διαγραφή..." : "Διαγραφή"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
};

export default ReusableCustomersPage; 