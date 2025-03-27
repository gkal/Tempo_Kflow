import { useState, useEffect, useMemo, useCallback, lazy, Suspense, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SearchBar } from "@/components/ui/search-bar";
import { Button } from "@/components/ui/button";
import { Plus, Eye, Pencil, Trash2, ArrowLeft, Edit, Filter, EyeOff, ChevronRight, ChevronDown, Check, ChevronLeft } from "lucide-react";
import { CloseButton } from "@/components/ui/close-button";
import { DataTableWrapper } from '../DataTableWrapper';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from "@/lib/AuthContext";
import { formatDateTime } from "@/utils/formatUtils";
import CustomerForm from "./CustomerForm";
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
import { toast } from "@/components/ui/use-toast";
import {
  GlobalTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/GlobalTooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GlobalDropdown } from "@/components/ui/GlobalDropdown";
import { CustomerContextMenu } from "./CustomerContextMenu";
import React from "react";
import { CustomerDialog } from "./CustomerDialog";
import { openNewOfferDialog, openEditOfferDialog } from './OfferDialogManager';
import { TruncateWithTooltip } from "@/components/ui/GlobalTooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useRealtimeSubscription } from "@/lib/useRealtimeSubscription";
import { debounce } from "lodash";

// Just outside the component, before the export statement
const APP_VERSION = "1.6.0"; // Updated with server-side pagination and virtualized rendering on July 24, 2024

export default function CustomersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // These must match exactly what's allowed in the database
  const customerTypeOptions = ["Εταιρεία", "Ιδιώτης", "Δημόσιο", "Οικοδομές", "Εκτακτος Πελάτης", "Εκτακτη Εταιρία"];
  
  // Add all required state variables
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({});
  const [customerOffers, setCustomerOffers] = useState<Record<string, any[]>>({});
  const [loadingOffers, setLoadingOffers] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [searchColumn, setSearchColumn] = useState('company_name');
  const [sortColumn, setSortColumn] = useState('company_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCustomerTypes, setSelectedCustomerTypes] = useState<string[]>([]);
  const [availableCustomerTypes, setAvailableCustomerTypes] = useState(customerTypeOptions);
  const [totalCount, setTotalCount] = useState(0);
  const [offerToDelete, setOfferToDelete] = useState<{customerId: string, offerId: string} | null>(null);
  const [showDeleteOfferDialog, setShowDeleteOfferDialog] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [lastUpdatedCustomerId, setLastUpdatedCustomerId] = useState<string | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, string>>({});
  const [isResizing, setIsResizing] = useState(false);
  const [visibleRowCount, setVisibleRowCount] = useState(50);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  
  // Add pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isFetchingPage, setIsFetchingPage] = useState(false);
  
  // Add necessary refs
  const requestIdCounter = useRef(0);
  const fetchThrottleRef = useRef(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRequestIdRef = useRef(0);
  const deletionInProgressRef = useRef(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  // Add a ref to track if we're in a fetch already
  const isCurrentlyFetchingRef = useRef(false);
  // Add a ref to track initialization
  const initialFetchDoneRef = useRef(false);
  
  // Add refs to track previous filter state
  const prevSearchTermRef = useRef("");
  const prevStatusFilterRef = useRef("all");
  const prevCustomerTypesRef = useRef<string[]>([]);
  
  // Add a flag to prevent duplicate initialization
  const didInitializeRef = useRef(false);
  
  // Add Customer interface
  interface Customer {
    id: string;
    company_name?: string;
    first_name?: string;
    last_name?: string;
    status: string;
    offers_count?: number;
    offers?: any[]; // Add offers array to store customer offers
    isExpanded?: boolean; // Track expanded state
    offersCount?: number; // Add offersCount property
    [key: string]: any; // Index signature for other properties
  }
  
  // Add a custom sorting function - MOVED UP to fix "Cannot access before initialization" error
  const customSort = (a, b) => {
    if (!a.company_name || !b.company_name) return 0;
    const nameA = a.company_name.toLowerCase(); // Convert to lowercase
    const nameB = b.company_name.toLowerCase(); // Convert to lowercase
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
  };
  
  // Compute derived state
  const sortedCustomers = useMemo(() => {
    return [...filteredCustomers].sort((a, b) => {
      const result = customSort(a, b);
      return sortDirection === 'asc' ? result : -result;
    });
  }, [filteredCustomers, sortColumn, sortDirection]);
  
  // Add search columns definition
  const searchColumns = [
    { accessor: 'company_name', header: 'Επωνυμία' },
    { accessor: 'first_name', header: 'Όνομα' },
    { accessor: 'last_name', header: 'Επώνυμο' },
    { accessor: 'tax_id', header: 'ΑΦΜ' },
    { accessor: 'email', header: 'Email' },
    { accessor: 'phone', header: 'Τηλέφωνο' }
  ];
  
  // Define isAdminOrSuperUser
  const isAdminOrSuperUser = useMemo(() => {
    // Check if user has admin or super user permissions
    const userRole = user?.role?.toLowerCase() || '';
    return userRole === 'admin' || userRole === 'superuser' || userRole === 'super user';
  }, [user]);
  
  // Define the handleSort function
  const handleSort = useCallback((column: string) => {
    setSortColumn(column);
    setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
  }, []);
  
  // Define handleColumnChange
  const handleColumnChange = useCallback((column: string) => {
    setSearchColumn(column);
  }, []);
  
  // Function to fetch customer offers
  const fetchCustomerOffers = useCallback(async (customerId: string, forceRefresh = false) => {
    if (!customerId) return;
    
    // Skip if already loading or if we already have the data and aren't forcing a refresh
    if (loadingOffers[customerId] || (!forceRefresh && customerOffers[customerId]?.length > 0)) {
      return;
    }
    
    // Set loading state for this customer
    setLoadingOffers(prev => ({
      ...prev,
      [customerId]: true
    }));
    
    try {
      // Fetch offers for this customer
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('customer_id', customerId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Update customer offers state
      setCustomerOffers(prev => ({
        ...prev,
        [customerId]: data || []
      }));
      
    } catch (error) {
      console.error(`Error fetching offers for customer ${customerId}:`, error);
      toast({
        title: "Σφάλμα",
        description: "Δεν ήταν δυνατή η φόρτωση των προσφορών.",
        variant: "destructive",
      });
    } finally {
      // Clear loading state for this customer
      setLoadingOffers(prev => ({
        ...prev,
        [customerId]: false
      }));
    }
  }, [loadingOffers, customerOffers]);
  
  // Format functions defined inside the component where they have access to state
  const formatStatus = (status: string) => {
    switch (status) {
      case "wait_for_our_answer":
        return "Αναμονή για απάντησή μας";
      case "wait_for_customer_answer":
        return "Αναμονή για απάντηση πελάτη";
      case "ready":
        return "Ολοκληρώθηκε";
      default:
        return status;
    }
  };

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

  // Format source for display
  const formatSource = (source: string) => {
    switch (source) {
      case "Email":
        return "Email";
      case "Phone":
      case "Telephone":
        return "Τηλέφωνο";
      case "Website":
      case "Site":
        return "Ιστοσελίδα";
      case "In Person":
      case "Physical":
        return "Φυσική παρουσία";
      default:
        return source;
    }
  };

  // Customer type filter component
  interface CustomerTypeFilterProps {
    availableTypes: string[];
    selectedTypes: string[];
    onChange: (types: string[]) => void;
  }

  const CustomerTypeFilter: React.FC<CustomerTypeFilterProps> = ({ 
    availableTypes, 
    selectedTypes, 
    onChange 
  }) => {
    const allSelected = selectedTypes.length === 0;
    const [isOpen, setIsOpen] = useState(false);
    
    const handleToggleType = (type: string) => {
      let newSelectedTypes: string[];
      
      if (selectedTypes.includes(type)) {
        // If already selected, remove it
        newSelectedTypes = selectedTypes.filter(t => t !== type);
      } else {
        // If not selected, add it
        newSelectedTypes = [...selectedTypes, type];
      }
      
      onChange(newSelectedTypes);
    };
    
    const handleSelectAll = () => {
      // If anything is selected, clear selection
      onChange([]);
    };

    // Determine if filter is active
    const isFilterActive = selectedTypes.length > 0;

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className={`h-9 px-4 flex items-center gap-2 w-[102px] justify-between ${
              isFilterActive 
                ? 'bg-[#52796f] text-white border-0 shadow-[0_0_35px_8px_rgba(82,121,111,0.95)] filter-glow-extreme scale-105' 
                : 'hover:bg-[#354f52] bg-[#2f3e46] border-0 text-[#cad2c5]'
            }`}
            title="Φίλτρο Τύπων Πελατών"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm">Τύπος</span>
            </div>
            {isFilterActive ? 
              <div className="w-4 h-4 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-yellow-300"
                >
                  <path d="M9 18h6"></path>
                  <path d="M10 22h4"></path>
                  <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"></path>
                </svg>
              </div>
              : 
              <div className="w-4 h-4"></div>
            }
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-56 p-0 bg-[#2f3e46] border border-[#52796f] text-[#cad2c5] shadow-md overflow-hidden"
          align="center"
          sideOffset={8}
          style={{ boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)" }}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div 
            className="bg-[#2f3e46] text-[#cad2c5]"
            style={{ padding: "0", margin: "0" }}
          >
            <button
              className="w-full text-left bg-[#2f3e46] text-[#cad2c5] hover:bg-[#354f52] transition-colors duration-150 px-3 py-2 flex items-center gap-2 cursor-pointer"
              onClick={handleSelectAll}
              style={{ border: "none", outline: "none" }}
            >
              {allSelected ? (
                <Check className="h-4 w-4 mr-2 text-[#84a98c]" />
              ) : (
                <div className="w-4 h-4 mr-2" />
              )}
              <span className="text-sm">Όλοι οι τύποι</span>
            </button>
            
            <div className="h-px bg-[#52796f]/30 mx-3 my-1" style={{ margin: "4px 12px" }}></div>
            
            {customerTypeOptions.map((type) => (
              <button
                key={type}
                className="w-full text-left bg-[#2f3e46] text-[#cad2c5] hover:bg-[#354f52] transition-colors duration-150 px-3 py-2 flex items-center gap-2 cursor-pointer"
                onClick={() => handleToggleType(type)}
                style={{ border: "none", outline: "none" }}
              >
                {selectedTypes.includes(type) ? (
                  <Check className="h-4 w-4 mr-2 text-[#84a98c]" />
                ) : (
                  <div className="w-4 h-4 mr-2" />
                )}
                <span className="text-sm">{type}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  // Add custom animation style at the top of the file
  const progressAnimationStyle = {
    "@keyframes progress": {
      "0%": { transform: "translateX(-100%)" },
      "50%": { transform: "translateX(0%)" },
      "100%": { transform: "translateX(100%)" }
    },
    ".animate-progress": {
      animation: "progress 1.5s ease-in-out infinite"
    },
    ".custom-scrollbar": {
      scrollbarWidth: "thin",
      scrollbarColor: "#52796f #2f3e46"
    },
    ".custom-scrollbar::-webkit-scrollbar": {
      width: "6px"
    },
    ".custom-scrollbar::-webkit-scrollbar-track": {
      background: "#2f3e46"
    },
    ".custom-scrollbar::-webkit-scrollbar-thumb": {
      backgroundColor: "#52796f",
      borderRadius: "20px"
    },
    ".custom-scrollbar::-webkit-scrollbar-thumb:hover": {
      backgroundColor: "#84a98c"
    },
    "@keyframes filterGlow": {
      "0%": { boxShadow: "0 0 15px rgba(82,121,111,0.7)" },
      "50%": { boxShadow: "0 0 25px rgba(82,121,111,0.9)" },
      "100%": { boxShadow: "0 0 15px rgba(82,121,111,0.7)" }
    },
    ".filter-glow": {
      animation: "filterGlow 1.5s ease-in-out infinite"
    },
    "@keyframes filterGlowExtreme": {
      "0%": { boxShadow: "0 0 20px 3px rgba(82,121,111,0.8)" },
      "25%": { boxShadow: "0 0 35px 8px rgba(82,121,111,0.95)" },
      "50%": { boxShadow: "0 0 45px 12px rgba(132,169,140,0.9)" },
      "75%": { boxShadow: "0 0 35px 8px rgba(82,121,111,0.95)" },
      "100%": { boxShadow: "0 0 20px 3px rgba(82,121,111,0.8)" }
    },
    ".filter-glow-extreme": {
      animation: "filterGlowExtreme 2s ease-in-out infinite"
    }
  }

  // Define the props interface for CustomerRow
  interface CustomerRowProps {
    row: any;
    index: number;
    defaultRow: React.ReactElement;
    isExpanded: boolean;
    offers: any[];
    isLoading: boolean;
    columns: any[];
    isAdminOrSuperUser: boolean;
    formatDateTime: (date: string) => string;
    formatSource: (source: string) => string;
    formatStatus: (status: string) => string;
    formatResult: (result: string) => string;
    handleEditOffer: (customerId: string, offerId: string) => void;
    handleDeleteOffer: (customerId: string, offerId: string) => void;
    onCreateOffer: (customerId: string, source: string) => void;
  }

  // Create a memoized row component to prevent unnecessary re-renders
  const CustomerRow = React.memo(({ 
    row, 
    index, 
    defaultRow, 
    isExpanded, 
    offers, 
    isLoading, 
    columns, 
    isAdminOrSuperUser, 
    formatDateTime, 
    formatSource, 
    formatStatus, 
    formatResult, 
    handleEditOffer, 
    handleDeleteOffer, 
    onCreateOffer
  }: CustomerRowProps) => {
    // Safety check - if row is undefined, return the default row
    if (!row || !defaultRow) {
      return defaultRow || null;
    }
    
    // Ensure the row has the data-customer-id attribute
    const rowWithDataAttr = React.cloneElement(defaultRow, {
      'data-customer-id': row.id
    });
    
    // Create the expanded row with the same data-customer-id attribute
    const expandedRow = isExpanded ? (
      <tr className="bg-[#2f3e46] border-t border-b border-[#52796f]" data-customer-id={row.id}>
        <td colSpan={columns.length}>
          <div className="pl-[70px]">
            {isLoading ? (
              <div className="flex justify-center items-center py-4">
                <LoadingSpinner fullScreen={false} />
              </div>
            ) : offers.length === 0 ? (
              <div className="py-4 text-[#84a98c] flex flex-col items-center justify-center gap-3">
                <div className="text-center">
                  Δεν υπάρχουν προσφορές για αυτόν τον πελάτη
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-2 pr-4">
                  {/* Removed the title "Προσφορές" and the "Νέα Προσφορά" button */}
                </div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#3a5258] text-[#a8c5b5]">
                      <th className="px-2 py-2 text-left text-xs font-medium w-[160px]">Ημερομηνία</th>
                      <th className="px-3 py-2 text-left text-xs font-medium w-[100px]">Ζήτηση Πελάτη</th>
                      <th className="px-3 py-2 text-left text-xs font-medium w-[100px]">Ποσό</th>
                      <th className="px-3 py-2 text-left text-xs font-medium w-[140px]">Κατάσταση</th>
                      <th className="px-3 py-2 text-left text-xs font-medium w-[100px]">Αποτέλεσμα</th>
                      <th className="px-3 py-2 text-center text-xs font-medium w-[50px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {offers.map((offer) => (
                      <tr 
                        key={offer.id} 
                        className={`
                          border-t border-[#52796f]/30 
                          bg-[#2f3e46]
                          hover:bg-[#354f52] cursor-pointer
                          transition-colors duration-150
                        `}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditOffer(row.id, offer.id);
                        }}
                      >
                        <td className="px-2 py-2 text-xs text-[#cad2c5] w-[120px]">{formatDateTime(offer.created_at)}</td>
                        <td className="px-3 py-2 text-xs text-[#cad2c5] w-[100px]">
                          {offer.requirements 
                            ? <TruncateWithTooltip 
                                text={offer.requirements} 
                                maxLength={50} 
                                maxWidth={800}
                                multiLine={false}
                                maxLines={2}
                              /> 
                            : "-"}
                        </td>
                        <td className="px-3 py-2 text-xs text-[#cad2c5] w-[100px]">
                          {offer.amount 
                            ? <TruncateWithTooltip 
                                text={offer.amount} 
                                maxLength={50} 
                                maxWidth={800}
                                multiLine={false}
                                maxLines={2}
                              /> 
                            : "-"}
                        </td>
                        <td className="px-3 py-2 text-xs w-[140px]">
                          <span className={`
                            ${offer.offer_result === "wait_for_our_answer" ? "text-yellow-400" : 
                              offer.offer_result === "wait_for_customer_answer" ? "text-blue-400" : 
                              offer.offer_result === "ready" ? "text-green-400" : "text-gray-400"}
                          `}>
                            {formatStatus(offer.offer_result)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs w-[100px]">
                          <span className={`
                            ${offer.result === "success" ? "text-green-400" : 
                              offer.result === "failed" ? "text-red-400" : 
                              offer.result === "cancel" ? "text-yellow-400" :
                              offer.result === "waiting" ? "text-purple-400" : "text-gray-400"}
                          `}>
                            {formatResult(offer.result)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-center w-[50px]">
                          {isAdminOrSuperUser && (
                            <GlobalTooltip content="Διαγραφή προσφοράς">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteOffer(row.id, offer.id);
                                }}
                                className="h-6 w-6 hover:bg-[#354f52] text-red-500 hover:text-red-400"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </GlobalTooltip>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </td>
      </tr>
    ) : null;
    
    return (
      <>
        {rowWithDataAttr}
        {expandedRow}
      </>
    );
  }, (prevProps, nextProps) => {
    // Custom comparison function to prevent unnecessary re-renders
    // Only re-render if these specific props change
    return (
      prevProps.row?.id === nextProps.row?.id &&
      prevProps.isExpanded === nextProps.isExpanded &&
      prevProps.offers === nextProps.offers &&
      prevProps.isLoading === nextProps.isLoading &&
      prevProps.row?.offersCount === nextProps.row?.offersCount
    );
  });

  // Ensure CustomerRow has a display name for better debugging
  CustomerRow.displayName = 'CustomerRow';

  // Define the props interface directly in this file
  interface OffersDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customerId: string;
    offerId?: string;
    onSave: () => void;
    defaultSource?: string;
  }

  // Add this useDebounce hook if it doesn't exist
  function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
      const timer = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      return () => {
        clearTimeout(timer);
      };
    }, [value, delay]);

    return debouncedValue;
  }

  // Add a performance measurement utility for diagnostics
  const measurePerformance = (label: string, startTime: number): string => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    return `${label}: ${duration.toFixed(2)}ms`;
  };

  // Move toggleCustomerStatus function before columns definition
  const toggleCustomerStatus = async (customer) => {
    try {
      const newStatus = customer.status === 'active' ? 'inactive' : 'active';
      
      // Update in database
      await supabase
        .from('customers')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', customer.id);
      
      // Update the customers array
      const updatedCustomers = customers.map(c => 
        c.id === customer.id ? {...c, status: newStatus} : c
      );
      setCustomers(updatedCustomers);
      
      // Handle filtered customers based on status filter
      if (statusFilter !== 'all' && statusFilter !== newStatus) {
        // If the new status doesn't match the filter, remove from filtered view
        setFilteredCustomers(prevFiltered => 
          prevFiltered.filter(c => c.id !== customer.id)
        );
        
        // Show success message with additional info about filter
        toast({
          title: "Επιτυχής ενημέρωση",
          description: `${newStatus === 'active' 
            ? 'Ο πελάτης ενεργοποιήθηκε' 
            : 'Ο πελάτης απενεργοποιήθηκε'} με επιτυχία! (Αφαιρέθηκε από την τρέχουσα προβολή)`,
          variant: "default",
        });
      } else {
        // If the status matches the filter or we're showing all, update in the filtered view
        setFilteredCustomers(prevFiltered => 
          prevFiltered.map(c => c.id === customer.id ? {...c, status: newStatus} : c)
        );
        
        // Set the last updated customer ID for highlighting
        setLastUpdatedCustomerId(customer.id);
        
        // Clear the highlight after 2 seconds
        setTimeout(() => {
          setLastUpdatedCustomerId(null);
        }, 2000);
        
        // Show standard success message
        toast({
          title: "Επιτυχής ενημέρωση",
          description: newStatus === 'active' 
            ? 'Ο πελάτης ενεργοποιήθηκε με επιτυχία!' 
            : 'Ο πελάτης απενεργοποιήθηκε με επιτυχία!',
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error updating customer status:", error);
      toast({
        title: "Σφάλμα",
        description: 'Σφάλμα κατά την ενημέρωση της κατάστασης του πελάτη',
        variant: "destructive",
      });
    }
  };

  // Move toggleCustomerExpanded function before it's used
  const toggleCustomerExpanded = useCallback(async (customerId: string) => {
    // Find the customer to check offer count
    const customer = customers.find(c => c.id === customerId);
    if (!customer || (customer.offersCount || 0) === 0) {
      // Don't expand customers with no offers
      return;
    }
    
    const isCurrentlyExpanded = expandedCustomers[customerId] || false;
    
    // Immediately update UI state for better responsiveness
    setExpandedCustomers(prev => ({
      ...prev,
      [customerId]: !isCurrentlyExpanded
    }));
    
    setCustomers(prev => 
      prev.map(customer => 
        customer.id === customerId 
          ? { ...customer, isExpanded: !isCurrentlyExpanded } 
          : customer
      )
    );
    
    setFilteredCustomers(prev => 
      prev.map(customer => 
        customer.id === customerId 
          ? { ...customer, isExpanded: !isCurrentlyExpanded } 
          : customer
      )
    );
    
    // Then fetch data if needed (asynchrously, after UI is updated)
    if (!isCurrentlyExpanded && !customerOffers[customerId]) {
      fetchCustomerOffers(customerId);
    }
  }, [customers, expandedCustomers, customerOffers, fetchCustomerOffers]);

  // Define handlers for offers early to avoid reference issues
  const handleCreateOffer = useCallback((customerId: string, source: string = "Email") => {
    // Open the dialog
    openNewOfferDialog(customerId, source, () => {
      // Update the offers for this specific customer
      fetchCustomerOffers(customerId);
      
      // Set the expanded state to true for this customer
      setExpandedCustomers(prev => ({
        ...prev,
        [customerId]: true
      }));
    });
  }, [fetchCustomerOffers]);

  const handleEditOffer = useCallback((customerId: string, offerId: string) => {
    openEditOfferDialog(customerId, offerId, async () => {
      // Force refresh the offers after edit
      await fetchCustomerOffers(customerId, true);
      
      setExpandedCustomers(prev => ({
        ...prev,
        [customerId]: true
      }));
    });
  }, [fetchCustomerOffers]);

  const handleDeleteOffer = useCallback((customerId: string, offerId: string) => {
    setOfferToDelete({ customerId, offerId });
    setShowDeleteOfferDialog(true);
  }, []);

  // Add the confirmDeleteOffer function 
  const confirmDeleteOffer = useCallback(async () => {
    if (!offerToDelete) return;
    
    try {
      // Try soft delete first
      let error = null;
      try {
        const response = await supabase.rpc('soft_delete_record', {
          table_name: 'offers',
          record_id: offerToDelete.offerId
        });
        error = response.error;
      } catch (softDeleteError) {
        // If soft delete is not available, fallback to regular delete
        const response = await supabase
          .from('offers')
          .delete()
          .eq('id', offerToDelete.offerId);
        error = response.error;
      }
      
      if (error) throw error;
      
      // Immediately update the UI by removing the offer from the state
      setCustomerOffers(prev => {
        const updatedOffers = { ...prev };
        if (updatedOffers[offerToDelete.customerId]) {
          updatedOffers[offerToDelete.customerId] = updatedOffers[offerToDelete.customerId]
            .filter(offer => offer.id !== offerToDelete.offerId);
        }
        return updatedOffers;
      });
      
      // Update the offers count in the customers list
      const newOffersCount = (customerOffers[offerToDelete.customerId]?.length || 1) - 1;
      
      setCustomers(prev => 
        prev.map(customer => 
          customer.id === offerToDelete.customerId 
            ? { ...customer, offersCount: newOffersCount } 
            : customer
        )
      );
      
      setFilteredCustomers(prev => 
        prev.map(customer => 
          customer.id === offerToDelete.customerId 
            ? { ...customer, offersCount: newOffersCount } 
            : customer
        )
      );
      
      // Show success toast
      toast({
        title: "Επιτυχία",
        description: "Η προσφορά διαγράφηκε επιτυχώς",
        variant: "default",
      });
    } catch (error) {
      console.error("Error deleting offer:", error);
      toast({
        title: "Σφάλμα",
        description: "Δεν ήταν δυνατή η διαγραφή της προσφοράς",
        variant: "destructive",
      });
    } finally {
      setShowDeleteOfferDialog(false);
      setOfferToDelete(null);
    }
  }, [offerToDelete, customerOffers]);

  // Now define columns with access to all the required functions
  const columns = useMemo(() => [
    {
      header: "",
      accessor: "expand",
      width: "50px",
      cell: (_, row) => {
        // Only show expand button if customer has offers
        if (!row.offersCount || row.offersCount === 0) {
          return <div className="w-8 h-8"></div>;
        }
        
        const isExpanded = expandedCustomers[row.id] || false;
        
        return (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              toggleCustomerExpanded(row.id);
            }}
            className={`h-8 w-8 rounded-full transition-colors ${
              isExpanded 
                ? "bg-[#52796f] text-white" 
                : "bg-transparent text-[#84a98c] hover:bg-[#52796f] hover:text-white"
            }`}
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <div className="flex items-center">
                <ChevronRight className="h-5 w-5" />
                <span className="text-sm">{row.offersCount}</span>
              </div>
            )}
          </Button>
        );
      }
    },
    { 
      header: "Επωνυμία", 
      accessor: "company_name",
      width: "250px",
      cell: (value, row) => {
        // If first_name and last_name exists but not company_name, show them instead
        if ((!value || value === "") && row.first_name && row.last_name) {
          return <span>{row.first_name} {row.last_name}</span>;
        }
        return <span>{value || "—"}</span>;
      }
    },
    { 
      header: "Τύπος", 
      accessor: "customer_type",
      width: "150px"
    },
    { 
      header: "ΑΦΜ", 
      accessor: "afm",
      width: "100px"
    },
    { 
      header: "Email", 
      accessor: "email",
      width: "150px"
    },
    { 
      header: "Τηλέφωνο", 
      accessor: "telephone",
      width: "150px"
    },
    { 
      header: "Διεύθυνση", 
      accessor: "address",
      width: "200px"
    },
    {
      header: "Ημερομηνία",
      accessor: "created_at",
      width: "150px",
      cell: (value) => value ? formatDateTime(value) : "—"
    },
    {
      header: "Ενέργειες",
      accessor: "actions",
      width: "100px",
      cell: (_, row) => (
        <div className="flex items-center gap-1 justify-end">
          <GlobalTooltip content={`${row.status === 'active' ? 'Απενεργοποίηση' : 'Ενεργοποίηση'} Πελάτη`}>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                toggleCustomerStatus(row);
              }}
              className={`h-6 w-6 hover:bg-[#354f52] ${
                row.status === 'active' ? 'text-green-500 hover:text-green-400' : 'text-red-500 hover:text-red-400'
              }`}
            >
              {row.status === 'active' ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
          </GlobalTooltip>
          
          {isAdminOrSuperUser && (
            <GlobalTooltip content="Διαγραφή Πελάτη">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setCustomerToDelete(row);
                    setShowDeleteAlert(true);
                }}
                className="h-6 w-6 hover:bg-[#354f52] text-red-500 hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </GlobalTooltip>
          )}
          </div>
      )
    },
  ], [expandedCustomers, isAdminOrSuperUser, navigate, setSelectedCustomer, setShowDialog, toggleCustomerExpanded]);

  // Create a memoized row renderer function to prevent unnecessary re-renders
  const renderCustomerRow = useCallback((customer, index) => {
    const isExpanded = expandedCustomers[customer.id] || false;
    
    return (
      <CustomerContextMenu
        key={`context-${customer.id || index}`} 
        customerId={customer.id}
        onCreateOffer={handleCreateOffer}
      >
        <React.Fragment key={customer.id || index}>
          <tr 
            className={`
              bg-transparent
              hover:bg-[#3d5a5e] cursor-pointer 
              transition-colors duration-150 border-b border-[#52796f]/30
              ${lastUpdatedCustomerId === customer.id ? 'bg-[#52796f]/40 hover:bg-[#52796f]/50' : ''}
            `}
            onClick={() => navigate(`/customers/${customer.id}`)}
            data-customer-id={customer.id}
          >
            {columns.map((col, colIdx) => (
              <td 
                key={colIdx} 
                className="p-2 text-[#cad2c5] text-sm font-normal whitespace-nowrap"
                style={{
                  width: columnWidths[col.accessor] || col.width || 'auto',
                  minWidth: columnWidths[col.accessor] || col.width || 'auto',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                <div className="overflow-hidden text-ellipsis">
                  {col.accessor === "expand" && col.cell 
                    ? col.cell(null, customer) 
                    : col.cell 
                      ? col.cell(customer[col.accessor], customer)
                      : customer[col.accessor] || "-"}
                </div>
              </td>
            ))}
          </tr>
          
          {/* Handle expanded rows - only render if expanded */}
          {isExpanded && renderExpandedRow(customer)}
        </React.Fragment>
      </CustomerContextMenu>
    );
  }, [columns, expandedCustomers, lastUpdatedCustomerId, navigate, columnWidths, handleCreateOffer]);

  // Separate the expanded row rendering for better code organization
  const renderExpandedRow = useCallback((customer) => {
    const offers = customerOffers[customer.id] || [];
    const isLoading = loadingOffers[customer.id] || false;
    
    return (
      <tr className="bg-[#2f3e46] border-t border-b border-[#52796f]">
        <td colSpan={columns.length}>
          <div className="pl-[70px] pr-4 py-3">
            {isLoading ? (
              <div className="flex justify-center items-center py-4">
                <LoadingSpinner fullScreen={false} />
              </div>
            ) : offers.length === 0 ? (
              <div className="py-4 text-[#84a98c] flex flex-col items-center justify-center gap-3">
                <div className="text-center">
                  Δεν υπάρχουν προσφορές για αυτόν τον πελάτη
                </div>
              </div>
            ) : (
              <div>
                <table className="w-full border-collapse rounded-md overflow-hidden">
                  <thead>
                    <tr className="bg-[#3a5258] text-[#a8c5b5]">
                      <th className="px-2 py-2 text-left text-xs font-semibold w-[160px]">Ημερομηνία</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold w-[100px]">Ζήτηση Πελάτη</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold w-[100px]">Ποσό</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold w-[140px]">Κατάσταση</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold w-[100px]">Αποτέλεσμα</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold w-[50px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Only render the first 20 offers for performance */}
                    {offers.slice(0, 20).map((offer) => renderOfferRow(customer.id, offer))}
                    
                    {/* Show a message if there are more offers */}
                    {offers.length > 20 && (
                      <tr className="bg-[#354f52]/30">
                        <td colSpan={6} className="px-4 py-2 text-xs text-center text-[#84a98c]">
                          + {offers.length - 20} ακόμα προσφορές...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  }, [columns, customerOffers, loadingOffers]);

  // Separate the offer row rendering for better code organization
  const renderOfferRow = useCallback((customerId, offer) => {
    return (
      <tr 
        key={offer.id} 
        className={`
          border-t border-[#52796f]/30 
          bg-transparent
          hover:bg-[#354f52] cursor-pointer
          transition-colors duration-150
        `}
        onClick={(e) => {
          e.stopPropagation();
          handleEditOffer(customerId, offer.id);
        }}
      >
        <td className="px-2 py-1.5 text-xs text-[#cad2c5] w-[160px] font-medium">
          <div className="overflow-hidden text-ellipsis">
            {formatDateTime(offer.created_at)}
          </div>
        </td>
        <td className="px-3 py-1.5 text-xs text-[#cad2c5] w-[100px]">
          {offer.requirements 
            ? <TruncateWithTooltip 
                text={offer.requirements} 
                maxLength={50} 
                maxWidth={800}
                multiLine={false}
                maxLines={2}
              /> 
            : "-"}
        </td>
        <td className="px-3 py-1.5 text-xs text-[#cad2c5] w-[100px] font-medium">
          {offer.amount 
            ? <TruncateWithTooltip 
                text={offer.amount} 
                maxLength={50} 
                maxWidth={800}
                multiLine={false}
                maxLines={2}
              /> 
            : "-"}
        </td>
        <td className="px-3 py-2 text-xs w-[140px]">
          <span className={`
            ${offer.offer_result === "wait_for_our_answer" ? "text-yellow-400" : 
              offer.offer_result === "wait_for_customer_answer" ? "text-blue-400" : 
              offer.offer_result === "ready" ? "text-green-400" : "text-gray-400"}
            font-medium
          `}>
            {formatStatus(offer.offer_result)}
          </span>
        </td>
        <td className="px-3 py-2 text-xs w-[100px]">
          <span className={`
            ${offer.result === "success" ? "text-green-400" : 
              offer.result === "failed" ? "text-red-400" : 
              offer.result === "cancel" ? "text-yellow-400" :
              offer.result === "waiting" ? "text-purple-400" : "text-gray-400"}
            font-medium
          `}>
            {formatResult(offer.result)}
          </span>
        </td>
        <td className="px-3 py-2 text-xs text-center w-[50px]">
          {isAdminOrSuperUser && (
            <GlobalTooltip content="Διαγραφή προσφοράς">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteOffer(customerId, offer.id);
                }}
                className="h-6 w-6 hover:bg-[#354f52] text-red-500 hover:text-red-400"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </GlobalTooltip>
          )}
        </td>
      </tr>
    );
  }, [isAdminOrSuperUser, handleEditOffer, handleDeleteOffer]);

  // Function to handle scroll event for infinite scrolling
  const handleTableScroll = useCallback(() => {
    if (loading || isLoadingMore) return;
    
    const container = tableContainerRef.current;
    if (!container) return;
    
    // Use cached values for scrollHeight and height when possible
    const scrollPosition = container.scrollTop;
    const containerHeight = container.clientHeight;
    const totalHeight = container.scrollHeight;
    const scrollPercentage = (scrollPosition + containerHeight) / totalHeight;
    
    // Only trigger when scrolled to 80% of the container and we have more items to load
    if (scrollPercentage > 0.8 && filteredCustomers.length > visibleRowCount) {
      // Use a more efficient approach to update visible rows by adding fixed increments
      const increment = 30; // Load 30 more rows at a time
      const newCount = Math.min(visibleRowCount + increment, filteredCustomers.length);
      
      if (newCount > visibleRowCount) {
        console.log(`📑 Loading more rows: ${visibleRowCount} → ${newCount}`);
        setIsLoadingMore(true);
        
        // Use requestAnimationFrame for smoother rendering
        requestAnimationFrame(() => {
          setVisibleRowCount(newCount);
          setTimeout(() => setIsLoadingMore(false), 50);
        });
      }
    }
  }, [loading, isLoadingMore, filteredCustomers.length, visibleRowCount]);

  // Add debounced scroll handler to improve performance
  const debouncedHandleTableScroll = useCallback(
    debounce(() => handleTableScroll(), 100),
    [handleTableScroll]
  );

  // Add event listener for table scrolling with debounce
  useEffect(() => {
    const container = tableContainerRef.current;
    if (container) {
      container.addEventListener('scroll', debouncedHandleTableScroll);
      return () => {
        container.removeEventListener('scroll', debouncedHandleTableScroll);
        // Cancel any pending debounced calls
        debouncedHandleTableScroll.cancel();
      };
    }
  }, [debouncedHandleTableScroll]);

  // Modify the table rendering function to use infinite scrolling
  const renderDirectTable = useCallback(() => {
    // Render loading state
    if (loading) {
      return (
        <div className="flex items-center justify-center py-16 bg-[#2f3e46] rounded-lg border border-[#52796f]">
          <LoadingSpinner fullScreen={false} />
          <span className="ml-3 text-[#cad2c5]">Φόρτωση πελατών...</span>
        </div>
      );
    }
    
    // If no customers found after loading
    if (sortedCustomers.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 bg-[#2f3e46] rounded-lg border border-[#52796f]">
          <span className="text-[#cad2c5] mb-2">Δεν βρέθηκαν πελάτες.</span>
          <span className="text-[#84a98c] text-sm">Δοκιμάστε να αλλάξετε τα φίλτρα αναζήτησης.</span>
        </div>
      );
    }
    
    // Slice only the visible portion of data for infinite scrolling
    const visibleCustomers = sortedCustomers.slice(0, visibleRowCount);
    const hasMoreToLoad = visibleRowCount < sortedCustomers.length;
    
    // Fallback to original direct table implementation to preserve all functionality
    return (
      <div className="rounded-lg border border-[#52796f]">
        <div 
          ref={tableContainerRef}
          className="custom-table-scrollbar" 
          style={{ 
            height: "550px", 
            overflowY: "auto",
            overflowX: "auto",
            msOverflowStyle: "scrollbar",
            scrollbarWidth: "thin",
            scrollbarColor: "#52796f #2f3e46"
          }}
        >
          <table className="border-collapse bg-transparent" style={{ minWidth: "100%" }}>
            <thead className="bg-[#2f3e46] sticky top-0 z-10" style={{ boxShadow: '0 1px 0 #52796f' }}>
              <tr>
                {columns.map((col, idx) => (
                  <th 
                    key={idx} 
                    className={`
                      text-center text-[#84a98c] py-2 px-3 text-sm font-medium select-none
                      ${col.accessor !== "expand" && col.accessor !== "actions" ? "cursor-pointer hover:text-white" : ""}
                      relative
                    `}
                    style={{ 
                      width: columnWidths[col.accessor] || col.width || 'auto',
                      minWidth: columnWidths[col.accessor] || col.width || 'auto',
                      position: 'relative',
                    }}
                    onClick={(e) => {
                      // Only handle sort click if we're not resizing
                      if (!isResizing) {
                        col.accessor !== "expand" && col.accessor !== "actions" && handleSort(col.accessor);
                      }
                    }}
                  >
                    <div className="flex items-center justify-center">
                      <span>{col.header}</span>
                      {col.accessor === sortColumn && col.accessor !== "expand" && col.accessor !== "actions" && (
                        <span className="text-white ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                    {col.accessor !== "expand" && col.accessor !== "actions" && (
                      <div
                        className="absolute top-0 right-0 h-full w-4 cursor-col-resize flex items-center justify-center z-10"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const startX = e.clientX;
                          const startWidth = parseInt(columnWidths[col.accessor] || col.width || '100px', 10);
                          
                          const onMouseMove = (moveEvent) => {
                            moveEvent.preventDefault();
                            moveEvent.stopPropagation();
                            const width = Math.max(80, startWidth + (moveEvent.clientX - startX));
                            setColumnWidths(prev => ({
                              ...prev,
                              [col.accessor]: `${width}px`
                            }));
                          };
                          
                          const onMouseUp = () => {
                            document.removeEventListener('mousemove', onMouseMove);
                            document.removeEventListener('mouseup', onMouseUp);
                            document.body.style.cursor = '';
                            
                            // Small delay to prevent click event from triggering sort
                            setTimeout(() => {
                              setIsResizing(false);
                            }, 100);
                          };
                          
                          setIsResizing(true);
                          document.addEventListener('mousemove', onMouseMove);
                          document.addEventListener('mouseup', onMouseUp);
                          document.body.style.cursor = 'col-resize';
                        }}
                      >
                        <div className="w-[1px] h-2/5 bg-[#52796f] hover:bg-[#84a98c] rounded-full"></div>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#52796f]/30">
              {/* Only render the visible rows (infinite scrolling) */}
              {visibleCustomers.map((customer, index) => (
                <CustomerContextMenu
                  key={`context-${customer.id || index}`} 
                  customerId={customer.id}
                  onCreateOffer={handleCreateOffer}
                >
                  <React.Fragment key={customer.id || index}>
                    <tr 
                      className={`
                        bg-transparent
                        hover:bg-[#3d5a5e] cursor-pointer 
                        transition-colors duration-150 border-b border-[#52796f]/30
                        ${lastUpdatedCustomerId === customer.id ? 'bg-[#52796f]/40 hover:bg-[#52796f]/50' : ''}
                      `}
                      onClick={() => navigate(`/customers/${customer.id}`)}
                      data-customer-id={customer.id}
                    >
                      {columns.map((col, colIdx) => (
                        <td 
                          key={colIdx} 
                          className="p-2 text-[#cad2c5] text-sm font-normal whitespace-nowrap"
                          style={{
                            width: columnWidths[col.accessor] || col.width || 'auto',
                            minWidth: columnWidths[col.accessor] || col.width || 'auto',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          <div className="overflow-hidden text-ellipsis">
                            {col.accessor === "expand" && col.cell 
                              ? col.cell(null, customer) 
                              : col.cell 
                                ? col.cell(customer[col.accessor], customer)
                                : customer[col.accessor] || "-"}
                          </div>
                        </td>
                      ))}
                    </tr>
                    
                    {/* Handle expanded rows */}
                    {(expandedCustomers[customer.id] || false) && (
                      <tr className="bg-[#2f3e46] border-t border-b border-[#52796f]">
                        <td colSpan={columns.length}>
                          <div className="pl-[70px] pr-4 py-3">
                            {loadingOffers[customer.id] ? (
                              <div className="flex justify-center items-center py-4">
                                <LoadingSpinner fullScreen={false} />
                              </div>
                            ) : (customerOffers[customer.id]?.length || 0) === 0 ? (
                              <div className="py-4 text-[#84a98c] flex flex-col items-center justify-center gap-3">
                                <div className="text-center">
                                  Δεν υπάρχουν προσφορές για αυτόν τον πελάτη
                                </div>
                              </div>
                            ) : (
                              <div>
                                <table className="w-full border-collapse rounded-md overflow-hidden">
                                  <thead>
                                    <tr className="bg-[#3a5258] text-[#a8c5b5]">
                                      <th className="px-2 py-2 text-left text-xs font-semibold w-[160px]">Ημερομηνία</th>
                                      <th className="px-3 py-2 text-left text-xs font-semibold w-[100px]">Ζήτηση Πελάτη</th>
                                      <th className="px-3 py-2 text-left text-xs font-semibold w-[100px]">Ποσό</th>
                                      <th className="px-3 py-2 text-left text-xs font-semibold w-[140px]">Κατάσταση</th>
                                      <th className="px-3 py-2 text-left text-xs font-semibold w-[100px]">Αποτέλεσμα</th>
                                      <th className="px-3 py-2 text-center text-xs font-semibold w-[50px]"></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {/* Only show the first 10 offers for performance */}
                                    {customerOffers[customer.id]?.slice(0, 10).map((offer, offerIdx) => (
                                      <tr 
                                        key={offer.id} 
                                        className={`
                                          border-t border-[#52796f]/30 
                                          bg-transparent
                                          hover:bg-[#354f52] cursor-pointer
                                          transition-colors duration-150
                                        `}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditOffer(customer.id, offer.id);
                                        }}
                                      >
                                        <td className="px-2 py-1.5 text-xs text-[#cad2c5] w-[160px] font-medium">
                                          <div className="overflow-hidden text-ellipsis">
                                            {formatDateTime(offer.created_at)}
                                          </div>
                                        </td>
                                        <td className="px-3 py-1.5 text-xs text-[#cad2c5] w-[100px]">
                                          {offer.requirements 
                                            ? <TruncateWithTooltip 
                                                text={offer.requirements} 
                                                maxLength={50} 
                                                maxWidth={800}
                                                multiLine={false}
                                                maxLines={2}
                                              /> 
                                            : "-"}
                                        </td>
                                        <td className="px-3 py-1.5 text-xs text-[#cad2c5] w-[100px] font-medium">
                                          {offer.amount 
                                            ? <TruncateWithTooltip 
                                                text={offer.amount} 
                                                maxLength={50} 
                                                maxWidth={800}
                                                multiLine={false}
                                                maxLines={2}
                                              /> 
                                            : "-"}
                                        </td>
                                        <td className="px-3 py-2 text-xs w-[140px]">
                                          <span className={`
                                            ${offer.offer_result === "wait_for_our_answer" ? "text-yellow-400" : 
                                              offer.offer_result === "wait_for_customer_answer" ? "text-blue-400" : 
                                              offer.offer_result === "ready" ? "text-green-400" : "text-gray-400"}
                                            font-medium
                                          `}>
                                            {formatStatus(offer.offer_result)}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 text-xs w-[100px]">
                                          <span className={`
                                            ${offer.result === "success" ? "text-green-400" : 
                                              offer.result === "failed" ? "text-red-400" : 
                                              offer.result === "cancel" ? "text-yellow-400" :
                                              offer.result === "waiting" ? "text-purple-400" : "text-gray-400"}
                                            font-medium
                                          `}>
                                            {formatResult(offer.result)}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 text-xs text-center w-[50px]">
                                          {isAdminOrSuperUser && (
                                            <GlobalTooltip content="Διαγραφή προσφοράς">
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteOffer(customer.id, offer.id);
                                                }}
                                                className="h-6 w-6 hover:bg-[#354f52] text-red-500 hover:text-red-400"
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </GlobalTooltip>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                    
                                    {/* Show count of additional offers */}
                                    {(customerOffers[customer.id]?.length || 0) > 10 && (
                                      <tr className="bg-[#354f52]/30">
                                        <td colSpan={6} className="px-4 py-2 text-xs text-center text-[#84a98c]">
                                          + {customerOffers[customer.id].length - 10} ακόμα προσφορές...
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                </CustomerContextMenu>
              ))}
              
              {/* Loading indicator for infinite scrolling */}
              {isLoadingMore && (
                <tr>
                  <td colSpan={columns.length} className="text-center py-3">
                    <div className="flex justify-center items-center py-2">
                      <div className="w-5 h-5 border-2 border-[#52796f] border-t-transparent rounded-full animate-spin"></div>
                      <span className="ml-2 text-[#84a98c] text-sm">Φόρτωση περισσότερων...</span>
                    </div>
                  </td>
                </tr>
              )}
              
              {/* Show message with remaining count */}
              {hasMoreToLoad && !isLoadingMore && (
                <tr>
                  <td colSpan={columns.length} className="text-center py-3 text-[#84a98c]">
                    + {sortedCustomers.length - visibleRowCount} περισσότεροι πελάτες... (κάντε κύλιση για να δείτε περισσότερους)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }, [
    columns, 
    customerOffers, 
    loadingOffers, 
    sortedCustomers, 
    visibleRowCount, 
    expandedCustomers, 
    loading, 
    isLoadingMore, 
    lastUpdatedCustomerId, 
    handleCreateOffer, 
    handleEditOffer, 
    handleDeleteOffer, 
    isAdminOrSuperUser, 
    columnWidths, 
    isResizing, 
    handleSort, 
    sortColumn, 
    sortDirection, 
    navigate
  ]);

  // Add a cache for query results
  const customerCacheRef = useRef<{
    key: string;
    data: Customer[];
    timestamp: number;
  } | null>(null);

  // Update fetchCustomers with proper pagination support
  const fetchCustomers = useCallback(async () => {
    // Skip if we're already fetching
    if (isCurrentlyFetchingRef.current) {
      console.log('🔄 Fetch already in progress, skipping');
      return;
    }

    try {
      // Use request ID tracking to prevent duplicate parallel fetches
      const requestId = ++requestIdCounter.current;
      
      // Calculate pagination parameters
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      
      // Generate cache key based on current filters and pagination
      const cacheKey = `${statusFilter}:${searchTerm}:${searchColumn}:${selectedCustomerTypes.join(',')}:${from}-${to}`;
      
      // Check if we have a valid cache (less than 30 seconds old)
      const now = Date.now();
      if (customerCacheRef.current && 
          customerCacheRef.current.key === cacheKey && 
          now - customerCacheRef.current.timestamp < 30000) {
        console.log('📋 Using cached customer data');
        
        // Use cached data
        setCustomers(customerCacheRef.current.data);
        setFilteredCustomers(customerCacheRef.current.data);
        setLoading(false);
        return;
      }
      
      // Start timing for performance metrics
      const startTime = performance.now();
      
      // Only process the most recent request, cancel older ones
      if (fetchThrottleRef.current) {
        console.log('🚫 Fetch throttled - skipping duplicate request');
        return;
      }
      
      // Set tracking flag
      isCurrentlyFetchingRef.current = true;
      setIsFetchingPage(true);
      
      console.log(`🔍 Starting customer fetch... [page=${currentPage}, size=${pageSize}, status=${statusFilter}, types=${selectedCustomerTypes.join(',')}]`);
      setLoading(true);
      
      // Set throttle flag to prevent duplicate requests
      fetchThrottleRef.current = true;
      
      // Reset throttle after a delay
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      
      fetchTimeoutRef.current = setTimeout(() => {
        fetchThrottleRef.current = false;
        fetchTimeoutRef.current = null;
      }, 800);
      
      // First fetch count for pagination info
      let countQuery = supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .filter('deleted_at', 'is', null);
        
      // Apply filters to count query
      if (selectedCustomerTypes.length > 0 && selectedCustomerTypes.length < availableCustomerTypes.length) {
        countQuery = countQuery.in('customer_type', selectedCustomerTypes);
      }
      
      if (statusFilter !== 'all') {
        countQuery = countQuery.eq('status', statusFilter);
      }
      
      if (searchTerm && searchColumn) {
        countQuery = countQuery.ilike(searchColumn, `%${searchTerm}%`);
      }
      
      // Execute count query first
      const countResponse = await countQuery;
      
      if (countResponse.error) {
        throw countResponse.error;
      }
      
      // Get total count and calculate total pages
      const count = countResponse.count || 0;
      setTotalRecords(count);
      setTotalPages(Math.max(1, Math.ceil(count / pageSize)));
      
      // Adjust current page if it exceeds total pages
      if (currentPage > Math.max(1, Math.ceil(count / pageSize))) {
        setCurrentPage(1);
      }
      
      // Build the data query with pagination
      let query = supabase
        .from('customers')
        .select('*, primary_contact_id')
        .filter('deleted_at', 'is', null)
        .range(from, to);
      
      // Apply customer type filter if any are selected
      if (selectedCustomerTypes.length > 0 && selectedCustomerTypes.length < availableCustomerTypes.length) {
        query = query.in('customer_type', selectedCustomerTypes);
        console.log(`🔍 Filtering by customer types: ${selectedCustomerTypes.join(', ')}`);
      }
      
      // Add status filter if not 'all'
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
        console.log(`🔍 Filtering by status: ${statusFilter}`);
      }

      // Apply search filter if searchTerm exists
      if (searchTerm && searchColumn) {
        query = query.ilike(searchColumn, `%${searchTerm}%`);
        console.log(`🔍 Searching in ${searchColumn} for: ${searchTerm}`);
      }
      
      // Execute the query with order
      const response = await query.order('company_name');
      
      // If another request has started, abandon this one
      if (requestId < lastRequestIdRef.current) {
        console.log(`📋 Abandoning stale request ${requestId}, current is ${lastRequestIdRef.current}`);
        isCurrentlyFetchingRef.current = false;
        setIsFetchingPage(false);
        return;
      }
      
      // Update the last processed request ID
      lastRequestIdRef.current = requestId;
      
      console.log('📊 Query response:', response);
      
      if (response.error) {
        throw response.error;
      }
      
      // Process data
      const responseData = response.data || [];
      console.log(`📋 Found ${responseData.length} customers (page ${currentPage}/${totalPages}) of total ${count} records`);
      
      // Efficiently fetch offer counts using a batch operation
      const customerIds = responseData.map(customer => customer.id);
      let offerCountMap = {};
      
      if (customerIds.length > 0) {
        try {
          const { data: offerCountsData, error: countError } = await supabase
            .from('offers')
            .select('customer_id, id')
            .in('customer_id', customerIds)
            .is('deleted_at', null)
            .or('result.is.null,result.eq.pending,result.eq.,result.eq.none');
          
          if (!countError && offerCountsData) {
            // Group counts by customer ID
            offerCountMap = offerCountsData.reduce((acc, offer) => {
              if (!acc[offer.customer_id]) {
                acc[offer.customer_id] = 0;
              }
              acc[offer.customer_id]++;
              return acc;
            }, {});
          }
        } catch (countingError) {
          console.error("Error counting offers:", countingError);
        }
      }
      
      // Add offer counts to customers efficiently
      const processedData = responseData.map(customer => ({
        ...customer,
        offersCount: offerCountMap[customer.id] || 0
      }));
      
      // Cache the results
      customerCacheRef.current = {
        key: cacheKey,
        data: processedData,
        timestamp: now
      };
      
      // Update state all at once to reduce renders
      setCustomers(processedData);
      setFilteredCustomers(processedData);
      setTotalCount(processedData.length);
      
      const endTime = performance.now();
      console.log(`⏱️ ${measurePerformance('Customer fetch', startTime)}`);
      console.log(`✅ Customer rendering complete: ${processedData.length} customers ready to display`);
      
      // Immediately set loading to false
      setLoading(false);
      setIsFetchingPage(false);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Σφάλμα",
        description: "Δεν ήταν δυνατή η φόρτωση των πελατών.",
        variant: "destructive",
      });
      // Ensure loading state is removed
      setLoading(false);
      setIsFetchingPage(false);
      
      // Clear throttle flag on error to allow retry
      fetchThrottleRef.current = false;
    } finally {
      // Always clear the fetch flag
      isCurrentlyFetchingRef.current = false;
    }
  }, [
    currentPage,
    pageSize,
    searchTerm, 
    searchColumn, 
    selectedCustomerTypes, 
    availableCustomerTypes, 
    statusFilter,
    requestIdCounter,
    fetchThrottleRef,
    fetchTimeoutRef,
    lastRequestIdRef,
    measurePerformance
  ]);
  
  // Function to handle page changes
  const handlePageChange = useCallback((newPage: number) => {
    if (newPage === currentPage || newPage < 1 || newPage > totalPages || isFetchingPage) {
      return;
    }
    
    console.log(`📑 Changing page: ${currentPage} → ${newPage}`);
    setCurrentPage(newPage);
    
    // Reset expanded state for new page
    setExpandedCustomers({});
    
    // Reset throttle to allow immediate fetch
    fetchThrottleRef.current = false;
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = null;
    }
  }, [currentPage, totalPages, isFetchingPage, fetchThrottleRef, fetchTimeoutRef]);
  
  // Function to handle page size changes
  const handlePageSizeChange = useCallback((newSize: number) => {
    if (newSize === pageSize || isFetchingPage) {
      return;
    }
    
    console.log(`📏 Changing page size: ${pageSize} → ${newSize}`);
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page when changing page size
    
    // Reset expanded state for new page size
    setExpandedCustomers({});
    
    // Reset throttle to allow immediate fetch
    fetchThrottleRef.current = false;
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = null;
    }
  }, [pageSize, isFetchingPage, fetchThrottleRef, fetchTimeoutRef]);

  // Handle search term and filter changes with proper debouncing
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // This effect handles search and filter changes
  useEffect(() => {
    // Skip initial render - let the initialization effect handle it
    if (!initialFetchDoneRef.current) return;
    
    // Check if filters actually changed by comparing with previous values
    const searchChanged = debouncedSearchTerm !== prevSearchTermRef.current;
    const statusChanged = statusFilter !== prevStatusFilterRef.current;
    const typesChanged = 
      selectedCustomerTypes.length !== prevCustomerTypesRef.current.length || 
      selectedCustomerTypes.some(type => !prevCustomerTypesRef.current.includes(type));
    
    // Only fetch if something actually changed
    if (searchChanged || statusChanged || typesChanged) {
      console.log(`🔄 Filter genuinely changed: search="${debouncedSearchTerm}" status="${statusFilter}" types=${selectedCustomerTypes.join(',')}`);
      
      // Update refs with current values for next comparison
      prevSearchTermRef.current = debouncedSearchTerm;
      prevStatusFilterRef.current = statusFilter;
      prevCustomerTypesRef.current = [...selectedCustomerTypes];
      
      // Only fetch if not already fetching
      if (!isCurrentlyFetchingRef.current) {
        // Reset throttle to allow fetch
        fetchThrottleRef.current = false;
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
          fetchTimeoutRef.current = null;
        }
        
        // Fetch with new filters
        fetchCustomers();
      }
    }
  }, [debouncedSearchTerm, statusFilter, selectedCustomerTypes]); // Removed fetchCustomers from deps

  // Separate initialization effect
  useEffect(() => {
    // Skip if already initialized
    if (didInitializeRef.current) {
      console.log('🚫 Initialization already completed, skipping duplicate');
      return;
    }
    
    // Mark as initialized immediately
    didInitializeRef.current = true;
    
    // Initial fetch on mount
    console.log('🔄 Component mounted, doing initial fetch');
    
    // Store references to avoid eslint warnings with the empty deps array
    const fetchCustomersRef = fetchCustomers;
    const throttleRef = fetchThrottleRef;
    const timeoutRef = fetchTimeoutRef;
    const fetchingRef = isCurrentlyFetchingRef;
    const initDoneRef = initialFetchDoneRef;
    const prevSearchRef = prevSearchTermRef;
    const prevStatusRef = prevStatusFilterRef;
    const prevTypesRef = prevCustomerTypesRef;
    
    // Do the initial fetch
    fetchCustomersRef();
    
    // Initialize filter tracking refs with current values
    prevSearchRef.current = searchTerm;
    prevStatusRef.current = statusFilter;
    prevTypesRef.current = [...selectedCustomerTypes];
    
    // Mark initialization as complete after a delay to prevent immediate re-render
    setTimeout(() => {
      initDoneRef.current = true;
      console.log('✅ Component initialization completed');
    }, 300); // Increased to ensure all initial processing is done
    
    // Set up realtime subscription for customers table
    const subscription = supabase
      .channel('customers-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'customers' 
      }, (payload) => {
        console.log('🔄 Realtime update triggered');
        // Only fetch if not already fetching
        if (!fetchingRef.current) {
          // Reset throttle for realtime updates
          throttleRef.current = false;
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          fetchCustomersRef();
        }
      })
      .subscribe();
    
    return () => {
      // Clean up subscription and timeouts when component unmounts
      subscription.unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []); // Empty dependency array, runs only on mount

  // Handle customer type filter change
  const handleCustomerTypeChange = useCallback((types: string[]) => {
    setSelectedCustomerTypes(types);
    
    // Reset throttle to allow immediate fetch
    fetchThrottleRef.current = false;
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = null;
    }
    // We don't call fetchCustomers here as it's handled by the useEffect
  }, [fetchThrottleRef, fetchTimeoutRef]);

  // Handle status filter change
  const handleStatusFilterChange = useCallback((status: string) => {
    if (statusFilter !== status) {
      setStatusFilter(status);
      
      // Reset throttle to allow immediate fetch
      fetchThrottleRef.current = false;
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }
      // We don't call fetchCustomers here as it's handled by the useEffect
    }
  }, [statusFilter, fetchThrottleRef, fetchTimeoutRef]);

  return (
    <div className="p-4">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-[#cad2c5] mb-2">
          Διαχείριση Πελατών
        </h1>
        <Button
          onClick={() => {
            setSelectedCustomer(null);
            setShowDialog(true);
          }}
          className="bg-transparent hover:bg-[#52796f] text-[#84a98c] hover:text-[#cad2c5] flex items-center gap-2 transition-colors font-normal"
        >
          <Plus className="h-4 w-4 text-white" />
          Νέος Πελάτης
        </Button>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="w-1/4">
          {/* Keep area empty as per original */}
        </div>
        
        <div className="flex-1 flex justify-center items-center gap-2">
          <SearchBar
            placeholder="Αναζήτηση..."
            value={searchTerm}
            onChange={setSearchTerm}
            options={searchColumns.map(col => ({ value: col.accessor, label: col.header }))}
            selectedColumn={searchColumn}
            onColumnChange={handleColumnChange}
          />
          <CustomerTypeFilter
            availableTypes={availableCustomerTypes}
            selectedTypes={selectedCustomerTypes}
            onChange={handleCustomerTypeChange}
          />
        </div>
        
        <div className="flex items-center gap-2 w-1/4 justify-end">
          {/* Status filters styled as in the DataTableBase */}
          <div className="flex items-center gap-2">
            <div 
              onClick={() => handleStatusFilterChange("all")}
              className="relative inline-block min-w-[70px]"
            >
              <span className={`cursor-pointer text-xs px-2 py-1 rounded-full transition-all ring-1 block text-center
                ${statusFilter === "all" 
                  ? "bg-blue-500/20 text-blue-400 font-medium shadow-[0_0_8px_2px_rgba(59,130,246,0.3)] ring-blue-400/50" 
                  : "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 ring-transparent"}`}
              >
                Όλοι
              </span>
            </div>
            
            <div 
              onClick={() => handleStatusFilterChange("active")}
              className="relative inline-block min-w-[70px]"
            >
              <span className={`cursor-pointer text-xs px-2 py-1 rounded-full transition-all ring-1 block text-center
                ${statusFilter === "active" 
                  ? "bg-green-500/20 text-green-400 font-medium shadow-[0_0_8px_2px_rgba(74,222,128,0.3)] ring-green-400/50" 
                  : "bg-green-500/10 text-green-400 hover:bg-green-500/20 ring-transparent"}`}
              >
                Ενεργός
              </span>
            </div>
            
            <div 
              onClick={() => handleStatusFilterChange("inactive")}
              className="relative inline-block min-w-[70px]"
            >
              <span className={`cursor-pointer text-xs px-2 py-1 rounded-full transition-all ring-1 block text-center
                ${statusFilter === "inactive" 
                  ? "bg-red-500/20 text-red-400 font-medium shadow-[0_0_8px_2px_rgba(248,113,113,0.3)] ring-red-400/50" 
                  : "bg-red-500/10 text-red-400 hover:bg-red-500/20 ring-transparent"}`}
              >
                Ανενεργός
              </span>
            </div>
          </div>
        </div>
      </div>

      {renderDirectTable()}
      
      {!loading && (
        <div className="mt-4 text-sm text-[#84a98c] text-right">
          Βρέθηκαν <span className="text-white font-medium">{totalCount}</span> εγγραφές.
        </div>
      )}
      
      <CustomerDialog
        open={showDialog}
        onOpenChange={(open) => setShowDialog(open)}
        customer={selectedCustomer ? {
          ...selectedCustomer,
          id: typeof selectedCustomer.id === 'string' 
            ? selectedCustomer.id 
            : String(selectedCustomer.id)
        } : undefined}
        refreshData={fetchCustomers}
      />

      {/* Delete Customer Confirmation */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent 
          className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5]"
          aria-describedby="delete-customer-description"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#cad2c5]">Διαγραφή Πελάτη</AlertDialogTitle>
            <AlertDialogDescription id="delete-customer-description" className="text-[#84a98c]">
              Είστε σίγουροι ότι θέλετε να διαγράψετε αυτόν τον πελάτη; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#354f52] text-[#cad2c5] hover:bg-[#354f52]/90">
              Άκυρο
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={async () => {
                if (!customerToDelete || isDeletingCustomer) return;
                
                try {
                  setIsDeletingCustomer(true);
                  deletionInProgressRef.current = true;
                  
                  // Try soft delete first using RPC
                  let error = null;
                  try {
                    const response = await supabase.rpc('soft_delete_record', {
                      table_name: 'customers',
                      record_id: customerToDelete.id
                    });
                    error = response.error;
                  } catch (softDeleteError) {
                    // If soft delete is not available, fallback to regular delete
                    const response = await supabase
                      .from('customers')
                      .delete()
                      .eq('id', customerToDelete.id);
                    error = response.error;
                  }
                  
                  if (error) throw error;
                  
                  // Update the UI to remove the deleted customer
                  setCustomers(prev => prev.filter(c => c.id !== customerToDelete.id));
                  setFilteredCustomers(prev => prev.filter(c => c.id !== customerToDelete.id));
                  
                  // Show success message
                  toast({
                    title: "Επιτυχία",
                    description: "Ο πελάτης διαγράφηκε επιτυχώς",
                    variant: "default",
                  });
                  
                  setDeleteSuccess(true);
                } catch (error) {
                  console.error("Error deleting customer:", error);
                  toast({
                    title: "Σφάλμα",
                    description: "Δεν ήταν δυνατή η διαγραφή του πελάτη",
                    variant: "destructive",
                  });
                } finally {
                  setIsDeletingCustomer(false);
                  deletionInProgressRef.current = false;
                  setShowDeleteAlert(false);
                  setCustomerToDelete(null);
                }
              }}
              disabled={isDeletingCustomer}
            >
              {isDeletingCustomer ? "Διαγραφή..." : "Διαγραφή"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Offer Confirmation */}
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
            >
              Διαγραφή
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
