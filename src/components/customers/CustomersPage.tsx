import { useState, useEffect, useMemo, useCallback, lazy, Suspense, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SearchBar } from "@/components/ui/search-bar";
import { Button } from "@/components/ui/button";
import { Plus, Eye, Pencil, Trash2, ArrowLeft, Edit, Filter, EyeOff, ChevronRight, ChevronDown } from "lucide-react";
import { CloseButton } from "@/components/ui/close-button";
import { DataTableBase } from "@/components/ui/data-table-base";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { formatDateTime } from "@/lib/utils";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

// Add Customer interface
interface Customer {
  id: string;
  company_name?: string;
  first_name?: string;
  last_name?: string;
  status: string;
  offers_count?: number;
  [key: string]: any;
  offers?: any[]; // Add offers array to store customer offers
  isExpanded?: boolean; // Track expanded state
  offersCount?: number; // Add offersCount property
}

// Add a custom sorting function
const customSort = (a, b) => {
  const nameA = a.company_name.toLowerCase(); // Convert to lowercase
  const nameB = b.company_name.toLowerCase(); // Convert to lowercase
  if (nameA < nameB) return -1;
  if (nameA > nameB) return 1;
  return 0;
};

// ActionCell component has been removed as it's no longer used

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
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#84a98c]"></div>
            </div>
          ) : offers.length === 0 ? (
            <div className="text-center py-4 text-[#84a98c]">
              Δεν υπάρχουν προσφορές για αυτόν τον πελάτη
            </div>
          ) : (
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
                    className="border-t border-[#52796f]/30 hover:bg-[#354f52]/30 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditOffer(row.id, offer.id);
                    }}
                  >
                    <td className="px-2 py-2 text-xs text-[#cad2c5] w-[160px]">{formatDateTime(offer.created_at)}</td>
                    <td className="px-3 py-2 text-xs text-[#cad2c5] w-[100px] group relative">
                      <div className="truncate">
                        {offer.requirements && offer.requirements.length > 50 
                          ? <>{offer.requirements.substring(0, 50)}<span className="text-blue-400">....</span></>
                          : offer.requirements || "-"}
                      </div>
                      {offer.requirements && offer.requirements.length > 50 && (
                        <span className="hidden group-hover:block absolute left-0 top-full bg-[#2f3e46] border border-[#52796f] p-2 rounded-md z-10 whitespace-normal min-w-[200px] max-w-[300px] text-[#cad2c5]">
                          {offer.requirements}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-[#cad2c5] w-[100px] group relative">
                      <div className="truncate">
                        {offer.amount && offer.amount.length > 50 
                          ? <>{offer.amount.substring(0, 50)}<span className="text-blue-400">...</span></>
                          : offer.amount || "-"}
                      </div>
                      {offer.amount && offer.amount.length > 50 && (
                        <span className="hidden group-hover:block absolute left-0 top-full bg-[#2f3e46] border border-[#52796f] p-2 rounded-md z-10 whitespace-normal min-w-[200px] max-w-[300px] text-[#cad2c5]">
                          {offer.amount}
                        </span>
                      )}
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
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
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
                            </TooltipTrigger>
                            <TooltipContent className="bg-[#2f3e46] text-[#cad2c5] border-[#52796f]">
                              <p>Διαγραφή προσφοράς</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

export default function CustomersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Define searchColumns here, before it's used in any hooks
  const searchColumns = [
    { header: "Επωνυμία", accessor: "company_name" },
    { header: "Τύπος", accessor: "customer_type" },
    { header: "ΑΦΜ", accessor: "afm" },
    { header: "Email", accessor: "email" },
    { header: "Τηλέφωνο", accessor: "telephone" },
    { header: "Διεύθυνση", accessor: "address" },
  ];
  
  // Add this useEffect inside the component function
  useEffect(() => {
    // Suppress specific accessibility warnings
    const originalConsoleWarn = console.warn;
    console.warn = function(message, ...args) {
      if (typeof message === 'string' && (
        message.includes('Missing `Description` or `aria-describedby`') ||
        message.includes('aria-describedby={undefined}')
      )) {
        // Suppress these specific warnings
        return;
      }
      originalConsoleWarn.apply(console, [message, ...args]);
    };

    return () => {
      console.warn = originalConsoleWarn; // Restore original console.warn on unmount
    };
  }, []);
  
  // Make role check case-insensitive
  const isAdminUser = user?.role?.toLowerCase() === 'admin';
  const isAdminOrSuperUser = isAdminUser || 
                            user?.role === 'Super User' ||
                            user?.role?.toLowerCase() === 'super user';
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchColumn, setSearchColumn] = useState("company_name");
  const [showDialog, setShowDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [formValid, setFormValid] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [statusFilter, setStatusFilter] = useState("active"); // "active", "inactive", "all"
  const [options, setOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const [lastUpdatedCustomerId, setLastUpdatedCustomerId] = useState<string | null>(null);
  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({});
  const [customerOffers, setCustomerOffers] = useState<Record<string, any[]>>({});
  const [loadingOffers, setLoadingOffers] = useState<Record<string, boolean>>({});
  const [showDeleteOfferDialog, setShowDeleteOfferDialog] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<{ customerId: string, offerId: string } | null>(null);

  // State to track if the dialog is ready to be shown
  const [isDialogReady, setIsDialogReady] = useState(false);
  
  // State to store the loaded component
  const [OffersDialogComponent, setOffersDialogComponent] = useState<React.ComponentType<any> | null>(null);
  
  // Add a ref to track if we're already showing a dialog
  const dialogActiveRef = useRef(false);
  
  // Add a new ref to track the scroll position
  const scrollPositionRef = useRef(0);
  
  // Add these near the top of the component with other state declarations
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  
  // Add these near the top of the component with other state declarations
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  
  // Add a function to set up real-time subscriptions
  const setupRealtimeSubscriptions = useCallback(() => {
    if (!realtimeEnabled) return;
    
    // Subscribe to changes in the offers table
    const offersSubscription = supabase
      .channel('offers-changes')
      .on('postgres_changes', {
        event: '*', 
        schema: 'public',
        table: 'offers'
      }, (payload) => {
        // Handle different types of changes
        if (payload.eventType === 'INSERT') {
          // A new offer was created
          const newOffer = payload.new;
          if (newOffer.customer_id) {
            // Refresh offers for this customer if it's expanded
            if (expandedCustomers[newOffer.customer_id]) {
              fetchCustomerOffers(newOffer.customer_id, true);
            }
            
            // Update the offers count for this customer
            updateCustomerOffersCount(newOffer.customer_id);
          }
        } else if (payload.eventType === 'UPDATE') {
          // An offer was updated
          const updatedOffer = payload.new;
          if (updatedOffer.customer_id) {
            // Refresh offers for this customer if it's expanded
            if (expandedCustomers[updatedOffer.customer_id]) {
              fetchCustomerOffers(updatedOffer.customer_id, true);
            }
          }
        } else if (payload.eventType === 'DELETE') {
          // An offer was deleted
          const deletedOffer = payload.old;
          if (deletedOffer.customer_id) {
            // Refresh offers for this customer if it's expanded
            if (expandedCustomers[deletedOffer.customer_id]) {
              fetchCustomerOffers(deletedOffer.customer_id, true);
            }
            
            // Update the offers count for this customer
            updateCustomerOffersCount(deletedOffer.customer_id);
          }
        }
      })
      .subscribe();
    
    // Subscribe to changes in the customers table
    const customersSubscription = supabase
      .channel('customers-changes')
      .on('postgres_changes', {
        event: '*', 
        schema: 'public',
        table: 'customers'
      }, (payload) => {
        // Handle different types of changes
        if (payload.eventType === 'UPDATE') {
          // A customer was updated
          const updatedCustomer = payload.new;
          
          // Update the customer in our local state
          setCustomers(prev => 
            prev.map(customer => 
              customer.id === updatedCustomer.id 
                ? { ...customer, ...updatedCustomer, isExpanded: customer.isExpanded } 
                : customer
            )
          );
          
          setFilteredCustomers(prev => 
            prev.map(customer => 
              customer.id === updatedCustomer.id 
                ? { ...customer, ...updatedCustomer, isExpanded: customer.isExpanded } 
                : customer
            )
          );
          
          // Highlight the updated customer
          setLastUpdatedCustomerId(updatedCustomer.id);
          
          // Clear the highlight after 2 seconds
          setTimeout(() => {
            setLastUpdatedCustomerId(null);
          }, 2000);
        } else if (payload.eventType === 'INSERT') {
          // A new customer was created
          fetchCustomers();
        } else if (payload.eventType === 'DELETE') {
          // A customer was deleted
          const deletedCustomer = payload.old;
          
          // Remove the customer from our local state
          setCustomers(prev => 
            prev.filter(customer => customer.id !== deletedCustomer.id)
          );
          
          setFilteredCustomers(prev => 
            prev.filter(customer => customer.id !== deletedCustomer.id)
          );
        }
      })
      .subscribe();
    
    // Return a cleanup function to unsubscribe when component unmounts
    return () => {
      supabase.removeChannel(offersSubscription);
      supabase.removeChannel(customersSubscription);
    };
  }, [expandedCustomers, realtimeEnabled]);
  
  // Add a function to update customer offers count
  const updateCustomerOffersCount = useCallback(async (customerId) => {
    try {
      // Get the count of active offers for this customer
      const { data, error } = await supabase
        .from("offers")
        .select("id")
        .eq("customer_id", customerId)
        .or('result.is.null,result.eq.pending,result.eq.,result.eq.none');
      
      if (error) throw error;
      
      const offersCount = data?.length || 0;
      
      // Update the customer in our local state
      setCustomers(prev => 
        prev.map(customer => 
          customer.id === customerId 
            ? { ...customer, offersCount } 
            : customer
        )
      );
      
      setFilteredCustomers(prev => 
        prev.map(customer => 
          customer.id === customerId 
            ? { ...customer, offersCount } 
            : customer
        )
      );
    } catch (error) {
      console.error("Error updating customer offers count:", error);
    }
  }, []);
  
  // Set up real-time subscriptions when component mounts
  useEffect(() => {
    const cleanup = setupRealtimeSubscriptions();
    return cleanup;
  }, [setupRealtimeSubscriptions]);

  // Update the fetchCustomerOffers function to be more efficient
  const fetchCustomerOffers = useCallback(async (customerId: string, forceRefresh = false) => {
    try {
      // Only use cache if we have data and don't need a force refresh
      if (!forceRefresh && customerOffers[customerId]) {
        return;
      }

      setLoadingOffers(prev => ({ ...prev, [customerId]: true }));
      
      const { data, error } = await supabase
        .from('offers')
        .select(`
          id,
          created_at,
          requirements,
          amount,
          offer_result,
          result,
          assigned_user:users!assigned_to(fullname),
          created_user:users!created_by(fullname),
          contact:contacts(full_name, position)
        `)
        .eq("customer_id", customerId)
        .or('result.is.null,result.eq.pending,result.eq.,result.eq.none')
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setCustomerOffers(prev => ({
        ...prev,
        [customerId]: data || []
      }));
      
      const offersCount = data?.length || 0;
      
      setCustomers(prev => 
        prev.map(customer => 
          customer.id === customerId 
            ? { ...customer, offersCount } 
            : customer
        )
      );
      
      setFilteredCustomers(prev => 
        prev.map(customer => 
          customer.id === customerId 
            ? { ...customer, offersCount } 
            : customer
        )
      );
      
    } catch (error) {
      console.error("Error fetching offers for customer:", error);
      toast({
        title: "Σφάλμα",
        description: "Δεν ήταν δυνατή η φόρτωση των προσφορών.",
        variant: "destructive",
      });
    } finally {
      setLoadingOffers(prev => ({ ...prev, [customerId]: false }));
    }
  }, [customerOffers]);

  // Update fetchCustomers to prefetch offers for visible customers
  const fetchCustomers = async (customersToExpand: string[] = []) => {
    try {
      setLoading(true);
      
      const from = page * pageSize;
      const to = from + pageSize - 1;
      
      // First get all customers with their active offers count
      let query = supabase
        .from("customers")
        .select(`
          *,
          offers:offers(
            id,
            result
          )
        `, { count: "exact" });
      
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      
      if (searchTerm) {
        query = query.ilike(`${searchColumn}`, `%${searchTerm}%`);
      }
      
      const { data: customersData, count, error: customersError } = await query
        .range(from, to)
        .order('company_name', { ascending: true });

      if (customersError) throw customersError;

      // Filter active offers client-side
      const customersWithData = (customersData as Customer[])?.map(customer => {
        const activeOffers = customer.offers?.filter(offer => 
          !offer.result || 
          offer.result === 'pending' || 
          offer.result === '' || 
          offer.result === 'none'
        ) || [];

        return {
          ...customer,
          isExpanded: expandedCustomers[customer.id] || customersToExpand.includes(customer.id),
          offers: customerOffers[customer.id] || [],
          offersCount: activeOffers.length
        };
      }) || [];
      
      setCustomers(customersWithData);
      setFilteredCustomers(customersWithData);
      setTotalCount(count || 0);
      
      // Prefetch offers for all visible customers with active offers
      customersWithData.forEach(customer => {
        if (customer.offersCount > 0) {
          fetchCustomerOffers(customer.id);
        }
      });
      
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  };

  // Update toggleCustomerExpanded to use cached data
  const toggleCustomerExpanded = async (customerId: string) => {
    const isCurrentlyExpanded = expandedCustomers[customerId] || false;
    
    // If we're expanding and don't have offers yet, fetch them
    if (!isCurrentlyExpanded && !customerOffers[customerId]) {
      await fetchCustomerOffers(customerId);
    }
    
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
        return status;
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

  // Move toggleCustomerStatus function before columns definition
  // Add toggleCustomerStatus function inside the component
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

  // Now define columns after the toggleCustomerStatus function
  // Memoize the columns to prevent unnecessary re-renders
  const columns = useMemo(() => [
    {
      header: "ΠΡ",
      accessor: "expand",
      width: "30px",
      cell: (value, row) => {
        if (!row) return null;
        
        const isExpanded = row.isExpanded || false;
        const offersCount = row.offersCount || 0;
        
        // Only show the expand arrow if there are offers
        if (offersCount === 0) {
          return null;
        }
        
        return (
          <div 
            className="flex items-center justify-center w-full h-full"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleCustomerExpanded(row.id);
            }}
          >
            <div className="flex items-center justify-center relative group cursor-pointer hover:bg-[#52796f]/60 rounded-full w-10 h-7 transition-colors duration-200">
              <span className="absolute inset-0 rounded-full bg-[#52796f]/0 group-hover:bg-[#52796f]/30 transition-colors duration-200"></span>
              <div className="flex items-center justify-center">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-[#84a98c] group-hover:text-white relative z-10" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-[#84a98c] group-hover:text-white relative z-10" />
                )}
                <span className="ml-0.5 text-xs text-[#84a98c] group-hover:text-white relative z-10">{offersCount}</span>
              </div>
            </div>
          </div>
        );
      }
    },
    { 
      header: "Επωνυμία", 
      accessor: "company_name",
      width: "22%"
    },
    { 
      header: "Τύπος", 
      accessor: "customer_type",
      width: "10%"
    },
    { 
      header: "ΑΦΜ", 
      accessor: "afm",
      width: "10%"
    },
    { 
      header: "Email", 
      accessor: "email",
      width: "15%"
    },
    { 
      header: "Τηλέφωνο", 
      accessor: "telephone",
      width: "13%"
    },
    { 
      header: "Διεύθυνση", 
      accessor: "address",
      width: "20%"
    },
    {
      header: "Ημ/νία Δημιουργίας",
      accessor: "created_at",
      cell: (value) => formatDateTime(value),
      width: "13%"
    },
    {
      header: "Κατάσταση",
      accessor: "status",
      sortable: true,
      width: "100px",
      cell: (value, row) => {
        if (!row) return null;
        
        return (
          <div className="flex justify-center" title={value === "active" ? "Ενεργός" : "Ανενεργός"}>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                toggleCustomerStatus(row);
              }}
              className={`h-8 w-8 hover:bg-[#354f52] ${value === "active" ? "text-green-400" : "text-red-400"}`}
              disabled={!isAdminOrSuperUser}
            >
              {value === "active" ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
          </div>
        );
      },
    },
    {
      header: "",
      accessor: "actions",
      width: "60px",
      cell: (value, row) => {
        if (!row || !isAdminOrSuperUser) return null;
        
        return (
          <div className="flex justify-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Set the customer to delete and show the confirmation dialog
                      setCustomerToDelete(row);
                      setShowDeleteDialog(true);
                    }}
                    className="h-8 w-8 hover:bg-[#354f52] text-red-500 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-[#2f3e46] text-[#cad2c5] border-[#52796f]">
                  <p>{isAdminUser ? "Διαγραφή πελάτη" : "Απενεργοποίηση πελάτη"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      },
    },
  ], [isAdminOrSuperUser, toggleCustomerExpanded, toggleCustomerStatus]);

  const handleColumnChange = (column: string) => {
    setSelectedColumn(column);
    setSearchColumn(column); // Update the searchColumn state as well
  };

  // Add the handleDeleteOffer function before renderCustomRow
  const handleDeleteOffer = (customerId: string, offerId: string) => {
    setOfferToDelete({ customerId, offerId });
    setShowDeleteOfferDialog(true);
  };

  // Update the confirmDeleteOffer function to handle the case when the last offer is deleted
  const confirmDeleteOffer = async () => {
    if (!offerToDelete) return;
    
    try {
      const { error } = await supabase
        .from('offers')
        .delete()
        .eq('id', offerToDelete.offerId);
      
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
    } catch (error) {
      console.error("Error deleting offer:", error);
    } finally {
      setShowDeleteOfferDialog(false);
      setOfferToDelete(null);
    }
  };

  // Custom row renderer to add expandable offers section
  const renderCustomRow = useCallback((row, index, defaultRow) => {
    if (!row) return defaultRow; // Early return with defaultRow instead of null
    
    // Use the row's isExpanded property directly instead of looking it up
    const isExpanded = row.isExpanded || false;
    const offers = customerOffers[row.id] || [];
    const isLoading = loadingOffers[row.id] || false;
    
    // Create the CustomerRow component
    const customerRowComponent = (
      <CustomerRow
        key={row.id}
        row={row}
        index={index}
        defaultRow={defaultRow}
        isExpanded={isExpanded}
        offers={offers}
        isLoading={isLoading}
        columns={columns}
        isAdminOrSuperUser={isAdminOrSuperUser}
        formatDateTime={formatDateTime}
        formatSource={formatSource}
        formatStatus={formatStatus}
        formatResult={formatResult}
        handleEditOffer={handleEditOffer}
        handleDeleteOffer={handleDeleteOffer}
        onCreateOffer={handleCreateOffer}
      />
    );
    
    // Wrap with context menu
    return (
      <CustomerContextMenu 
        key={`context-${row.id}`} 
        customerId={row.id}
        onCreateOffer={handleCreateOffer}
      >
        {customerRowComponent}
      </CustomerContextMenu>
    );
  }, [customerOffers, loadingOffers, columns, isAdminOrSuperUser, handleEditOffer, handleDeleteOffer, handleCreateOffer]);

  // Fetch customers when user or filters change
  useEffect(() => {
    if (user) {
      fetchCustomers();
    }
  }, [user, refreshTrigger, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize dropdown options once on component mount
  useEffect(() => {
    // Convert searchColumns to the format expected by the GlobalDropdown
    const dropdownOptions = searchColumns.map(col => ({
      value: col.accessor,
      label: col.header
    }));
    setOptions(dropdownOptions);
    
    // Initialize selectedColumn only once when the component mounts
    if (!selectedColumn && searchColumn) {
      setSelectedColumn(searchColumn);
    }
  }, []); // Empty dependency array means this runs only once when component mounts

  // Handle search filtering
  useEffect(() => {
    if (searchTerm) {
      const filtered = customers.filter(customer => {
        const value = customer[searchColumn];
        if (!value) return false;
        return value.toString().toLowerCase().includes(searchTerm.toLowerCase());
      });
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers);
    }
  }, [searchTerm, searchColumn, customers]);

  const handleEditCustomer = (customer) => {
    setSelectedCustomer(customer);
    setShowDialog(true);
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;

    try {
      const { error } = await supabase
        .from("customers")
        .update({
          status: "inactive",
          modified_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", customerToDelete.id);

      if (error) throw error;
      await fetchCustomers();
    } catch (error) {
      console.error("Error deactivating customer:", error);
    } finally {
      setShowDeleteDialog(false);
      setCustomerToDelete(null);
    }
  };

  const handleDelete = async (customerId) => {
    if (!customerId) return;
    
    try {
      // Make role check case-insensitive
      const isAdminUser = user?.role?.toLowerCase() === 'admin';
      
      if (isAdminUser) {
        // For admin users: Perform actual deletion
        
        // First delete all offers associated with this customer
        const { error: offersError } = await supabase
          .from('offers')
          .delete()
          .eq('customer_id', customerId);
        
        if (offersError) {
          console.error("Error deleting customer offers:", offersError);
          throw new Error("Failed to delete customer offers");
        }
        
        // Set primary_contact_id to null to break the circular reference
        const { error: updateError } = await supabase
          .from('customers')
          .update({ primary_contact_id: null })
          .eq('id', customerId);
        
        if (updateError) {
          console.error("Error updating customer primary contact:", updateError);
          throw new Error("Failed to update customer primary contact");
        }
        
        // Then delete all contacts associated with this customer
        const { error: contactsError } = await supabase
          .from('contacts')
          .delete()
          .eq('customer_id', customerId);
        
        if (contactsError) {
          console.error("Error deleting customer contacts:", contactsError);
          throw new Error("Failed to delete customer contacts");
        }
        
        // Finally delete the customer
        const { error: customerError } = await supabase
          .from('customers')
          .delete()
          .eq('id', customerId);
        
        if (customerError) {
          console.error("Error deleting customer:", customerError);
          throw new Error("Failed to delete customer");
        }
        
        // Update the customers array
        setCustomers(prevCustomers => 
          prevCustomers.filter(c => c.id !== customerId)
        );
        
        // Update the filtered customers array
        setFilteredCustomers(prevFiltered => 
          prevFiltered.filter(c => c.id !== customerId)
        );
        
        toast({
          title: "Επιτυχής διαγραφή",
          description: 'Ο πελάτης, οι επαφές και οι προσφορές του διαγράφηκαν οριστικά με επιτυχία!',
          variant: "default",
        });
      } else {
        // For non-admin users: Just deactivate
        await supabase
          .from('customers')
          .update({ 
            status: 'inactive',
            updated_at: new Date().toISOString()
          })
          .eq('id', customerId);
        
        // Update the customers array
        setCustomers(prevCustomers => 
          prevCustomers.map(c => 
            c.id === customerId ? {...c, status: 'inactive'} : c
          )
        );
        
        // Handle filtered customers based on status filter
        if (statusFilter !== 'all' && statusFilter !== 'inactive') {
          // If we're not showing inactive customers, remove from filtered view
          setFilteredCustomers(prevFiltered => 
            prevFiltered.filter(c => c.id !== customerId)
          );
        } else {
          // Otherwise update in the filtered view
          setFilteredCustomers(prevFiltered => 
            prevFiltered.map(c => c.id === customerId ? {...c, status: 'inactive'} : c)
          );
        }
        
        toast({
          title: "Επιτυχής απενεργοποίηση",
          description: 'Ο πελάτης απενεργοποιήθηκε με επιτυχία!',
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast({
        title: "Σφάλμα",
        description: 'Σφάλμα κατά τη διαγραφή του πελάτη: ' + (error.message || 'Άγνωστο σφάλμα'),
        variant: "destructive",
      });
    }
  };

  // Find the refreshData function that's causing the error
  const refreshData = () => {
    // Make sure we're not trying to access properties of null or undefined
    // and that we're passing a string ID, not an object
    if (selectedCustomer && selectedCustomer.id) {
      // If you're using the ID directly, make sure it's a string
      const customerId = typeof selectedCustomer.id === 'string' 
        ? selectedCustomer.id 
        : String(selectedCustomer.id);
        
      // Use the string ID in your API calls
      // ... your existing code ...
    } else {
      // If there's no selected customer, just fetch all customers
      fetchCustomers();
    }
  };

  // Define refreshCustomers early in the component
  function refreshCustomers() {
    fetchCustomers();
  }
  
  // Update the handleCreateOffer function to expand the row after adding an offer
  function handleCreateOffer(customerId, source = "Email") {
    // Open the dialog
    openNewOfferDialog(customerId, source, () => {
      // Update the offers for this specific customer
      fetchCustomerOffers(customerId);
      
      // Set the expanded state to true for this customer
      setExpandedCustomers(prev => ({
        ...prev,
        [customerId]: true
      }));
      
      setCustomers(prev => 
        prev.map(customer => 
          customer.id === customerId 
            ? { ...customer, isExpanded: true } 
            : customer
        )
      );
      
      setFilteredCustomers(prev => 
        prev.map(customer => 
          customer.id === customerId 
            ? { ...customer, isExpanded: true } 
            : customer
        )
      );
    });
  }
  
  function handleEditOffer(customerId, offerId) {
    openEditOfferDialog(customerId, offerId, async () => {
      // Force refresh the offers after edit
      await fetchCustomerOffers(customerId, true);
      
      setExpandedCustomers(prev => ({
        ...prev,
        [customerId]: true
      }));
      
      setCustomers(prev => 
        prev.map(customer => 
          customer.id === customerId 
            ? { ...customer, isExpanded: true } 
            : customer
        )
      );
      
      setFilteredCustomers(prev => 
        prev.map(customer => 
          customer.id === customerId 
            ? { ...customer, isExpanded: true } 
            : customer
        )
      );
    });
  }
  
  // Replace the handleSaveOffer function
  const handleSaveOffer = useCallback(() => {
    refreshCustomers();
  }, []);
  
  // Replace the handleCloseOfferDialog function
  const handleCloseOfferDialog = useCallback(() => {
    // Nothing needed here since the dialog manager handles closing
  }, []);
  
  // Replace the handleOpenOfferDialog function
  const handleOpenOfferDialog = useCallback((customerId: string, source: string = "Email", offerId?: string) => {
    if (offerId) {
      openEditOfferDialog(customerId, offerId, refreshCustomers);
    } else {
      openNewOfferDialog(customerId, source, refreshCustomers);
    }
  }, [refreshCustomers]);

  // If showing the form, render it instead of the customer list
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
          {/* Empty div to maintain layout */}
        </div>
        
        <div className="flex-1 flex justify-center">
          <SearchBar
            placeholder="Αναζήτηση..."
            value={searchTerm}
            onChange={setSearchTerm}
            options={options}
            selectedColumn={selectedColumn}
            onColumnChange={handleColumnChange}
          />
        </div>
        
        <div className="flex items-center gap-2 w-1/4 justify-end">
          {/* Status filters styled as in the DataTableBase */}
          <div className="flex items-center gap-2">
            <div 
              onClick={() => {
                setStatusFilter("all");
                setRefreshTrigger(prev => prev + 1);
              }}
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
              onClick={() => {
                setStatusFilter("active");
                setRefreshTrigger(prev => prev + 1);
              }}
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
              onClick={() => {
                setStatusFilter("inactive");
                setRefreshTrigger(prev => prev + 1);
              }}
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

      <DataTableBase
        key={`customers-table-${statusFilter}`}
        columns={columns}
        data={filteredCustomers}
        isLoading={loading}
        defaultSortColumn="company_name"
        searchTerm={searchTerm}
        searchColumn={searchColumn}
        onRowClick={(row) => navigate(`/customers/${row.id}`)}
        containerClassName="bg-[#354f52] rounded-lg border border-[#52796f] overflow-hidden"
        rowClassName="hover:bg-[#354f52]/50 cursor-pointer group"
        highlightedRowId={lastUpdatedCustomerId}
        renderRow={renderCustomRow}
        showOfferMessage={true}
      />

      {/* Add CustomerDialog component */}
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
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent 
          className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5]"
          aria-describedby="delete-customer-description"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#cad2c5]">
              {isAdminUser 
                ? "Οριστική Διαγραφή Πελάτη" 
                : customerToDelete?.status === 'active' 
                  ? "Απενεργοποίηση Πελάτη"
                  : "Ενεργοποίηση Πελάτη"}
            </AlertDialogTitle>
            <AlertDialogDescription id="delete-customer-description" className="text-[#84a98c]">
              {isAdminUser
                ? `Είστε σίγουροι ότι θέλετε να διαγράψετε οριστικά τον πελάτη "${customerToDelete?.company_name}", όλες τις επαφές του και όλες τις προσφορές του; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.`
                : customerToDelete?.status === 'active'
                  ? `Είστε σίγουροι ότι θέλετε να απενεργοποιήσετε τον πελάτη "${customerToDelete?.company_name}";`
                  : `Είστε σίγουροι ότι θέλετε να ενεργοποιήσετε τον πελάτη "${customerToDelete?.company_name}";`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#354f52] text-[#cad2c5] hover:bg-[#354f52]/90">
              Άκυρο
            </AlertDialogCancel>
            <AlertDialogAction
              className={`text-white ${
                isAdminUser 
                  ? "bg-red-600 hover:bg-red-700" 
                  : customerToDelete?.status === 'active'
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-600 hover:bg-green-700"
              }`}
              onClick={() => {
                if (isAdminUser) {
                  handleDelete(customerToDelete?.id);
                } else {
                  toggleCustomerStatus(customerToDelete);
                }
                setShowDeleteDialog(false);
              }}
            >
              {isAdminUser 
                ? "Διαγραφή" 
                : customerToDelete?.status === 'active'
                  ? "Απενεργοποίηση"
                  : "Ενεργοποίηση"}
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