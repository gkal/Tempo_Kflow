import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight, ChevronDown, Edit, Trash2 } from "lucide-react";
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from "@/lib/AuthContext";
import { formatDateTime } from "@/utils/formatUtils";
import { SearchBar } from "@/components/ui/search-bar";
import { DataTableBase } from "@/components/ui/data-table-base";
import { ErrorDialog } from "@/components/ui/error-dialog";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { openNewOfferDialog, openEditOfferDialog } from '../../customers/OfferDialogManager';
import { Badge } from "@/components/ui/badge";
import { TruncateWithTooltip } from "@/components/ui/GlobalTooltip";
import { GlobalTooltip } from "@/components/ui/GlobalTooltip";

// Customer interface
interface Customer {
  id: string;
  company_name?: string;
  address?: string;
  telephone?: string;
  status?: string;
  [key: string]: any;
  isExpanded?: boolean;
  offersCount?: number;
}

// Offer interface
interface Offer {
  id: string;
  customer_id: string;
  requirements?: string;
  amount?: string;
  offer_result?: string;
  result?: string;
  created_at: string;
  created_by?: string;
  assigned_to?: string;
  source?: string;
  assigned_user?: { fullname: string }[];
  created_user?: { fullname: string }[];
  [key: string]: any;
}

// Define interface for OfferTableRow props
interface OfferTableRowProps {
  offer: any;
  customerId: string;
  onEdit: (customerId: string, offerId: string) => void;
  formatDateTime: (date: string | Date) => string;
  formatStatus: (status: string) => string;
  formatResult: (result: string) => string;
  isAdminOrSuperUser: boolean;
  onDelete: (customerId: string, offerId: string) => void;
}

export default function CustomerOffersPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [customerOffers, setCustomerOffers] = useState<Record<string, Offer[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadingOffers, setLoadingOffers] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [searchColumn, setSearchColumn] = useState("company_name");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [offerStatusFilter, setOfferStatusFilter] = useState("all");
  const [offerResultFilter, setOfferResultFilter] = useState("all");
  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<string | null>(null);
  const [customerIdToDelete, setCustomerIdToDelete] = useState<string | null>(null);
  const [customersWithOffers, setCustomersWithOffers] = useState<string[]>([]);
  const [isLoadingAllOffers, setIsLoadingAllOffers] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [filteredOffers, setFilteredOffers] = useState<Offer[]>([]);
  
  // Error dialog state
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorTitle, setErrorTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  
  // Refs for real-time subscription
  const subscriptionRef = useRef<any>(null);
  const isInitialLoadRef = useRef(true);
  const lastChangeTimeRef = useRef<number>(Date.now());
  
  // Check if user is admin or super user
  const isAdminOrSuperUser = user?.role === "Admin" || user?.role === "Super User";

  // Show error dialog
  const showError = (title: string, message: string) => {
    setErrorTitle(title);
    setErrorMessage(message);
    setErrorDialogOpen(true);
  };

  // Show success message
  const showSuccess = (title: string, message: string) => {
    setErrorTitle(title);
    setErrorMessage(message);
    setErrorDialogOpen(true);
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
      case "pending":
        return "Σε εξέλιξη";
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
      case "phone":
        return "Τηλέφωνο";
      case "email":
        return "Email";
      case "site":
        return "Ιστοσελίδα";
      case "personal":
        return "Προσωπική επαφή";
      case "other":
        return "Άλλο";
      default:
        return source || "—";
    }
  };

  // Fetch all offers to determine which customers have offers
  const fetchAllOffers = useCallback(async (statusFilter = offerStatusFilter, resultFilter = offerResultFilter) => {
    try {
      setIsLoadingAllOffers(true);
      
      // Start with a basic query
      let query = supabase
        .from('offers')
        .select(`
          id,
          customer_id,
          offer_result,
          result
        `)
        .is("deleted_at", null); // Filter out soft-deleted records
      
      // Apply filters - important to use separate if statements to ensure both filters are applied
      if (statusFilter !== "all") {
        query = query.eq("offer_result", statusFilter);
      }
      
      // Apply result filter if not "all"
      if (resultFilter !== "all") {
        // Handle special case for 'waiting' (Σε εξέλιξη)
        if (resultFilter === "pending" || resultFilter === "waiting") {
          query = query.eq("result", "waiting");
        } else {
          query = query.eq("result", resultFilter);
        }
      }

      // Execute the query
      const { data, error } = await query;

      if (error) {
        throw error;
      }
      
      // Get unique customer IDs that have offers matching the filters
      const customerIds = [...new Set(data?.map(offer => offer.customer_id) || [])];
      setCustomersWithOffers(customerIds);
      
      // Update filtered customers to only show those with offers matching the filters
      const filteredCustomersList = customers.filter(customer => customerIds.includes(customer.id));
      setFilteredCustomers(filteredCustomersList);
      
    } catch (error) {
      showError("Σφάλμα", "Δεν ήταν δυνατή η φόρτωση των προσφορών.");
    } finally {
      setIsLoadingAllOffers(false);
    }
  }, [customers]);

  // Fetch customer offers - optimized version
  const fetchCustomerOffers = useCallback(async (customerId: string, forceRefresh = false, statusFilter: string, resultFilter: string) => {
    try {
      // Create a cache key based on the customer ID and filters
      const cacheKey = `${customerId}-${statusFilter}-${resultFilter}`;
      
      // Check if we have cached data for this specific combination
      if (!forceRefresh && customerOffers[cacheKey]) {
        // Use cached data but still update the UI to show it's associated with this customer
        setCustomerOffers(prev => ({
          ...prev,
          [customerId]: customerOffers[cacheKey]
        }));
        return;
      }

      // Show loading state
      setLoadingOffers(prev => ({ ...prev, [customerId]: true }));
      
      // Prepare the query - use a more efficient select with fewer fields
      let query = supabase
        .from('offers')
        .select(`
          id,
          customer_id,
          created_at,
          requirements,
          amount,
          offer_result,
          result,
          source,
          assigned_user:users!assigned_to(fullname),
          created_user:users!created_by(fullname)
        `)
        .eq("customer_id", customerId)
        .is("deleted_at", null); // Filter out soft-deleted records
      
      // Apply filters efficiently
      if (statusFilter && statusFilter !== "all") {
        query = query.eq("offer_result", statusFilter);
      }
      
      if (resultFilter && resultFilter !== "all") {
        if (resultFilter === "pending" || resultFilter === "waiting") {
          query = query.eq("result", "waiting");
        } else {
          query = query.eq("result", resultFilter);
        }
      }

      // Execute the query
      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) {
        throw error;
      }
      
      // Store the result in the cache using both the customer ID and the cache key
      const offersData = (data || []) as unknown as Offer[];
      setCustomerOffers(prev => {
        // Create a new object with all previous entries
        const newState = { ...prev };
        // Update both keys with the same data
        newState[customerId] = offersData;
        newState[cacheKey] = offersData;
        return newState;
      });
      
      // Update customer counts in a single batch update
      const offersCount = offersData.length || 0;
      const updateCustomer = (customer) => 
        customer.id === customerId 
          ? { ...customer, offersCount } 
          : customer;
      
      setCustomers(prev => prev.map(updateCustomer));
      setFilteredCustomers(prev => prev.map(updateCustomer));
      
    } catch (error) {
      showError("Σφάλμα", "Δεν ήταν δυνατή η φόρτωση των προσφορών.");
    } finally {
      setLoadingOffers(prev => ({ ...prev, [customerId]: false }));
    }
  }, [customerOffers]);

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      
      // First get all customers
      let query = supabase
        .from("customers")
        .select(`
          id,
          company_name,
          address,
          telephone
        `);
      
      if (searchTerm) {
        query = query.ilike(`${searchColumn}`, `%${searchTerm}%`);
      }
      
      const { data: customersData, error: customersError } = await query
        .order('company_name', { ascending: true });

      if (customersError) {
        throw customersError;
      }

      // Process customers
      const customersWithData = (customersData as Customer[])?.map(customer => {
        return {
          ...customer,
          isExpanded: expandedCustomers[customer.id] || false,
          offersCount: 0
        };
      }) || [];
      
      setCustomers(customersWithData);
      
      // On initial load, show all customers with offers (no filtering)
      
      // Fetch all offers to determine which customers have any offers
      const { data: allOffers, error: offersError } = await supabase
        .from('offers')
        .select('id, customer_id, offer_result, result')
        .is("deleted_at", null); // Filter out soft-deleted offers
      
      if (offersError) {
        throw offersError;
      }
      
      if (allOffers && allOffers.length > 0) {
        // Get unique customer IDs that have any offers
        const customerIdsWithOffers = [...new Set(allOffers.map(offer => offer.customer_id))];
        setCustomersWithOffers(customerIdsWithOffers);
        
        // If filters are applied, filter the offers
        if (offerStatusFilter !== "all" || offerResultFilter !== "all") {
          
          // Filter offers based on status and result
          let filteredOffers = [...allOffers];
          
          if (offerStatusFilter !== "all") {
            filteredOffers = filteredOffers.filter(offer => offer.offer_result === offerStatusFilter);
          }
          
          if (offerResultFilter !== "all") {
            if (offerResultFilter === "pending" || offerResultFilter === "waiting") {
              // For "Σε εξέλιξη" check if result is "waiting"
              filteredOffers = filteredOffers.filter(offer => offer.result === "waiting");
            } else {
              filteredOffers = filteredOffers.filter(offer => offer.result === offerResultFilter);
            }
          }
          
          // Get unique customer IDs from filtered offers
          const filteredCustomerIds = [...new Set(filteredOffers.map(offer => offer.customer_id))];
          
          // Filter customers based on filtered offers
          const filtered = customersWithData.filter(customer => 
            filteredCustomerIds.includes(customer.id)
          );
          setFilteredCustomers(filtered);
        } else {
          // Show all customers with offers
          const filtered = customersWithData.filter(customer => 
            customerIdsWithOffers.includes(customer.id)
          );
          setFilteredCustomers(filtered);
        }
      } else {
        setFilteredCustomers([]);
      }
      
      // Prefetch offers for expanded customers
      customersWithData.forEach(customer => {
        if (customer.isExpanded) {
          fetchCustomerOffers(customer.id, true, offerStatusFilter, offerResultFilter);
        }
      });
      
    } catch (error) {
      showError("Σφάλμα", "Δεν ήταν δυνατή η φόρτωση των πελατών.");
    } finally {
      setLoading(false);
    }
  };

  // Toggle customer expanded state - optimized version
  const toggleCustomerExpanded = useCallback((customerId: string) => {
    const isCurrentlyExpanded = expandedCustomers[customerId] || false;
    const newExpandedState = !isCurrentlyExpanded;
    
    // Batch all state updates together
    setExpandedCustomers(prev => ({
      ...prev,
      [customerId]: newExpandedState
    }));
    
    // Use a single function for both updates to ensure consistency
    const updateCustomerExpanded = (customer) => 
      customer.id === customerId 
        ? { ...customer, isExpanded: newExpandedState } 
        : customer;
    
    setCustomers(prev => prev.map(updateCustomerExpanded));
    setFilteredCustomers(prev => prev.map(updateCustomerExpanded));
    
    // Prefetch data if expanding
    if (newExpandedState) {
      // Use the current filter values
      fetchCustomerOffers(customerId, false, offerStatusFilter, offerResultFilter);
    }
  }, [expandedCustomers, offerStatusFilter, offerResultFilter, fetchCustomerOffers]);

  // Handle search
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    
    if (!value) {
      setFilteredCustomers(customers);
      return;
    }
    
    const filtered = customers.filter(customer => {
      const fieldValue = customer[searchColumn];
      if (!fieldValue) return false;
      
      return String(fieldValue).toLowerCase().includes(value.toLowerCase());
    });
    
    setFilteredCustomers(filtered);
  };

  // Handle column change for search
  const handleColumnChange = (column: string) => {
    setSearchColumn(column);
    
    // Re-apply search with new column
    if (searchTerm) {
      handleSearch(searchTerm);
    }
  };

  // Handle edit offer
  const handleEditOffer = (customerId: string, offerId: string) => {
    openEditOfferDialog(customerId, offerId, () => {
      fetchCustomerOffers(customerId, true, offerStatusFilter, offerResultFilter);
      setRefreshTrigger(prev => prev + 1);
    });
  };

  // Handle delete offer click
  const handleDeleteClick = (customerId: string, offerId: string) => {
    setOfferToDelete(offerId);
    setCustomerIdToDelete(customerId);
    setShowDeleteDialog(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!offerToDelete || !customerIdToDelete) return;
    
    try {
      // Try soft delete first
      let error = null;
      try {
        const response = await supabase.rpc('soft_delete_record', {
          table_name: 'offers',
          record_id: offerToDelete
        });
        error = response.error;
      } catch (softDeleteError) {
        // If soft delete is not available, fallback to regular delete
        const response = await supabase
          .from("offers")
          .delete()
          .eq("id", offerToDelete);
        error = response.error;
      }

      if (error) throw error;

      // Update customer offers state
      setCustomerOffers(prev => {
        const updatedOffers = { ...prev };
        if (updatedOffers[customerIdToDelete]) {
          updatedOffers[customerIdToDelete] = updatedOffers[customerIdToDelete]
            .filter(offer => offer.id !== offerToDelete);
        }
        return updatedOffers;
      });

      // Update customers state to reflect new offer count
      setCustomers(prev => prev.map(customer => {
        if (customer.id === customerIdToDelete) {
          const currentOffers = customer.offersCount || 0;
          return { ...customer, offersCount: Math.max(0, currentOffers - 1) };
        }
        return customer;
      }));

      // Update filtered customers state
      setFilteredCustomers(prev => prev.map(customer => {
        if (customer.id === customerIdToDelete) {
          const currentOffers = customer.offersCount || 0;
          return { ...customer, offersCount: Math.max(0, currentOffers - 1) };
        }
        return customer;
      }));

      showSuccess("Επιτυχία", "Η προσφορά διαγράφηκε επιτυχώς");
      
      // Refresh data after state updates
      fetchCustomerOffers(customerIdToDelete, true, offerStatusFilter, offerResultFilter);
      setRefreshTrigger(prev => prev + 1);
      
    } catch (error) {
      showError("Σφάλμα", "Δεν ήταν δυνατή η διαγραφή της προσφοράς.");
    } finally {
      setShowDeleteDialog(false);
      setOfferToDelete(null);
      setCustomerIdToDelete(null);
    }
  };

  // Handle create new offer
  const handleCreateOffer = (customerId: string, source: string = "Email") => {
    openNewOfferDialog(customerId, source, () => {
      fetchCustomerOffers(customerId, true, offerStatusFilter, offerResultFilter);
      setRefreshTrigger(prev => prev + 1);
    });
  };

  // Handle status filter change
  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    setRefreshTrigger(prev => prev + 1);
  };

  // Handle offer status filter change
  const handleOfferStatusChange = (status: string) => {
    // Update the state first
    setOfferStatusFilter(status);
    
    // Use the new status value directly in the function calls
    // Call fetchAllOffers with the new status value and current result filter
    fetchAllOffers(status, offerResultFilter);
    
    // Refresh offers for all expanded customers with the new filters
    Object.keys(expandedCustomers).forEach(customerId => {
      if (expandedCustomers[customerId]) {
        // Use a timeout to ensure this runs after state updates
        setTimeout(() => {
          fetchCustomerOffers(customerId, true, status, offerResultFilter);
        }, 0);
      }
    });
  };

  // Handle offer result filter change
  const handleOfferResultChange = (result: string) => {
    // If "pending" is selected, use "waiting" which is the correct value in the database
    if (result === "pending") {
      result = "waiting";
    }
    
    // Update the state first
    setOfferResultFilter(result);
    
    // Call fetchAllOffers with current status filter and the new result value
    fetchAllOffers(offerStatusFilter, result);
    
    // Refresh offers for all expanded customers with the new filters
    const expandedCustomerIds = Object.keys(expandedCustomers).filter(id => expandedCustomers[id]);
    
    expandedCustomerIds.forEach(customerId => {
      // Use a timeout to ensure this runs after state updates
      setTimeout(() => {
        fetchCustomerOffers(customerId, true, offerStatusFilter, result);
      }, 0);
    });
  };

  // Handle delete cancel
  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setOfferToDelete(null);
    setCustomerIdToDelete(null);
  };

  // Set up real-time subscriptions for offers table
  useEffect(() => {
    if (!user) return;
    
    // Clean up previous subscription if it exists
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }
    
    // Subscribe to changes in the offers table
    const subscription = supabase
      .channel('offers-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'offers' 
        }, 
        (payload) => {
          // Prevent refresh during initial load
          if (isInitialLoadRef.current) {
            return;
          }
          
          // Prevent multiple refreshes in quick succession
          const now = Date.now();
          if (now - lastChangeTimeRef.current < 1000) {
            return;
          }
          
          lastChangeTimeRef.current = now;
          
          // Check if the change was made by the current user
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          
          // If this is a record we just modified, don't trigger a refresh
          if (payload.eventType === 'UPDATE' && newRecord && newRecord.updated_by === user.id) {
            return;
          }
          
          // If this is a record we just created, don't trigger a refresh
          if (payload.eventType === 'INSERT' && newRecord && newRecord.created_by === user.id) {
            return;
          }
          
          // If this is a record we just deleted, don't trigger a refresh
          if (payload.eventType === 'DELETE' && oldRecord && oldRecord.updated_by === user.id) {
            return;
          }
          
          // Refresh the data
          setRefreshTrigger(prev => prev + 1);
        }
      )
      .subscribe();
    
    // Store the subscription reference
    subscriptionRef.current = subscription;
    
    // Cleanup subscription on unmount
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [user]);

  // Reset initial load flag after first load
  useEffect(() => {
    if (loading === false && isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
    }
  }, [loading]);

  // Fetch customers when component mounts or filters change
  useEffect(() => {
    if (user) {
      fetchCustomers();
    }
  }, [user, refreshTrigger]);

  // Define search options
  const searchOptions = [
    { value: "company_name", label: "Επωνυμία" },
    { value: "address", label: "Διεύθυνση" },
    { value: "telephone", label: "Τηλέφωνο" }
  ];

  // Define the customer row renderer - optimized version without hooks
  const renderCustomerRow = useCallback((row: any, index: number, defaultRow: JSX.Element): React.ReactNode => {
    if (!row) return defaultRow;
    
    const isExpanded = row.isExpanded || false;
    
    // Only create the expanded row if the row is actually expanded
    if (!isExpanded) {
      return defaultRow;
    }
    
    const offers = customerOffers[row.id] || [];
    const isLoadingOffers = loadingOffers[row.id] || false;
    
    // Create the content based on loading state and offers
    let content: JSX.Element;
    if (isLoadingOffers) {
      content = (
        <div className="flex justify-center items-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#84a98c]"></div>
        </div>
      );
    } else if (offers.length === 0) {
      content = (
        <div className="text-center py-4 text-[#84a98c]">
          Δεν υπάρχουν προσφορές για αυτόν τον πελάτη
        </div>
      );
    } else {
      content = (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#3a5258] text-[#a8c5b5]">
              <th key="date-header" className="px-2 py-2 text-left text-xs font-medium w-[120px]">Ημερομηνία</th>
              <th key="request-header" className="px-3 py-2 text-left text-xs font-medium w-[100px]">Ζήτηση Πελάτη</th>
              <th key="amount-header" className="px-3 py-2 text-left text-xs font-medium w-[100px]">Ποσό</th>
              <th key="status-header" className="px-3 py-2 text-left text-xs font-medium w-[140px]">Κατάσταση</th>
              <th key="result-header" className="px-3 py-2 text-left text-xs font-medium w-[100px]">Αποτέλεσμα</th>
              <th key="actions-header" className="px-3 py-2 text-center text-xs font-medium w-[50px]"></th>
            </tr>
          </thead>
          <tbody>
            {offers.map((offer) => (
              <tr 
                key={`offer-row-${offer.id}`}
                className="border-t border-[#52796f]/30 hover:bg-[#354f52]/30 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditOffer(row.id, offer.id);
                }}
              >
                <td key={`date-${offer.id}`} className="px-2 py-2 text-xs text-[#cad2c5] w-[120px]">{formatDateTime(offer.created_at)}</td>
                <td key={`request-${offer.id}`} className="px-3 py-2 text-xs text-[#cad2c5] w-[100px]">
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
                <td key={`amount-${offer.id}`} className="px-3 py-2 text-xs text-[#cad2c5] w-[100px]">
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
                <td key={`status-${offer.id}`} className="px-3 py-2 text-xs w-[140px]">
                  <span className={`
                    ${offer.offer_result === "wait_for_our_answer" ? "text-yellow-400" : 
                      offer.offer_result === "wait_for_customer_answer" ? "text-blue-400" : 
                      offer.offer_result === "ready" ? "text-green-400" : "text-gray-400"}
                  `}>
                    {formatStatus(offer.offer_result)}
                  </span>
                </td>
                <td key={`result-${offer.id}`} className="px-3 py-2 text-xs w-[100px]">
                  <span className={`
                    ${offer.result === "success" ? "text-green-400" : 
                      offer.result === "failed" ? "text-red-400" : 
                      offer.result === "cancel" ? "text-yellow-400" :
                      offer.result === "waiting" ? "text-purple-400" : "text-gray-400"}
                  `}>
                    {formatResult(offer.result)}
                  </span>
                </td>
                <td key={`actions-${offer.id}`} className="px-3 py-2 text-xs text-center w-[50px]">
                  {isAdminOrSuperUser && (
                    <GlobalTooltip content="Διαγραφή προσφοράς">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(row.id, offer.id);
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
      );
    }
    
    // Create the expanded row with the same data-customer-id attribute
    const expandedRow = (
      <tr key={`expanded-row-${row.id}`} className="bg-[#2f3e46] border-t border-b border-[#52796f]" data-customer-id={row.id}>
        <td key={`expanded-cell-${row.id}`} colSpan={4}>
          <div className="pl-[70px]">
            {content}
          </div>
        </td>
      </tr>
    );
    
    return (
      <React.Fragment key={`row-group-${row.id}`}>
        {defaultRow}
        {expandedRow}
      </React.Fragment>
    );
  }, [customerOffers, loadingOffers, handleEditOffer, formatDateTime, formatStatus, formatResult, isAdminOrSuperUser, handleDeleteClick]);

  // Define columns for the data table
  const columns = useMemo(() => [
    {
      header: "",
      accessor: "expand",
      sortable: false,
      cell: (value, row) => {
        if (!row) return null;
        
        const isExpanded = row.isExpanded || false;
        
        return (
          <div className="flex items-center justify-center w-full h-full">
            <GlobalTooltip content={isExpanded ? "Συρρίξτε για κλείσιμο" : "Συρρίξτε για ανάπτυξη"}>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  // No need for setTimeout - directly toggle the expanded state
                  // The fetchCustomerOffers is now called inside toggleCustomerExpanded
                  toggleCustomerExpanded(row.id);
                }}
                className="h-8 w-8 hover:bg-[#52796f]/60 hover:text-white transition-colors duration-200 rounded-full text-[#cad2c5] flex items-center justify-center relative group"
              >
                <span className="absolute inset-0 rounded-full bg-[#52796f]/0 group-hover:bg-[#52796f]/30 transition-colors duration-200"></span>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 relative z-10" />
                ) : (
                  <ChevronRight className="h-4 w-4 relative z-10" />
                )}
              </Button>
            </GlobalTooltip>
          </div>
        );
      },
    },
    {
      header: "Επωνυμία",
      accessor: "company_name",
      sortable: true,
      cell: (value, row) => {
        return (
          <div>
            <div className="font-medium">{value || "—"}</div>
            {row.isExpanded && row.offersCount > 0 && (
              <div className="text-xs text-[#84a98c]">
                {row.offersCount} προσφορές
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: "Διεύθυνση",
      accessor: "address",
      sortable: true,
      cell: (value) => {
        return value || "—";
      },
    },
    {
      header: "Τηλέφωνο",
      accessor: "telephone",
      sortable: true,
      cell: (value) => {
        return value || "—";
      },
    },
  ], [expandedCustomers, offerStatusFilter, offerResultFilter]);

  return (
    <div className="p-4">
      <div className="mb-4">
        <div className="flex flex-col space-y-4">
          {/* Global Offer Filters */}
          <div className="flex flex-wrap justify-center gap-8 bg-[#2f3e46] rounded-lg p-6 mx-auto">
            {/* Result Filters */}
            <div className="flex flex-col space-y-2 bg-[#2a3942] p-4 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.25)] border border-[#52796f]/30">
              <div className="text-[#cad2c5] text-sm font-medium text-center">
                Αποτέλεσμα Προσφορών
              </div>
              <div className="flex flex-wrap gap-2">
                <div 
                  onClick={() => handleOfferResultChange("all")}
                  className="relative inline-block"
                >
                  <span className={`cursor-pointer text-xs px-3 py-1.5 rounded-full transition-all block text-center
                    ${offerResultFilter === "all" 
                      ? "bg-blue-500/20 text-blue-300 font-medium shadow-[0_0_8px_rgba(59,130,246,0.5)] ring-1 ring-blue-400/50" 
                      : "bg-[#354f52] text-[#cad2c5] hover:bg-[#3a5258]"}`}
                  >
                    Όλα
                  </span>
                </div>
                
                <div 
                  onClick={() => handleOfferResultChange("success")}
                  className="relative inline-block"
                >
                  <span className={`cursor-pointer text-xs px-3 py-1.5 rounded-full transition-all block text-center
                    ${offerResultFilter === "success" 
                      ? "bg-green-500/20 text-green-300 font-medium shadow-[0_0_8px_rgba(34,197,94,0.5)] ring-1 ring-green-400/50" 
                      : "bg-[#354f52] text-[#cad2c5] hover:bg-[#3a5258]"}`}
                  >
                    Επιτυχία
                  </span>
                </div>
                
                <div 
                  onClick={() => handleOfferResultChange("failed")}
                  className="relative inline-block"
                >
                  <span className={`cursor-pointer text-xs px-3 py-1.5 rounded-full transition-all block text-center
                    ${offerResultFilter === "failed" 
                      ? "bg-red-500/20 text-red-300 font-medium shadow-[0_0_8px_rgba(239,68,68,0.5)] ring-1 ring-red-400/50" 
                      : "bg-[#354f52] text-[#cad2c5] hover:bg-[#3a5258]"}`}
                  >
                    Αποτυχία
                  </span>
                </div>
                
                <div 
                  onClick={() => handleOfferResultChange("waiting")}
                  className="relative inline-block"
                >
                  <span className={`cursor-pointer text-xs px-3 py-1.5 rounded-full transition-all block text-center
                    ${offerResultFilter === "waiting" 
                      ? "bg-purple-500/20 text-purple-300 font-medium shadow-[0_0_8px_rgba(168,85,247,0.5)] ring-1 ring-purple-400/50" 
                      : "bg-[#354f52] text-[#cad2c5] hover:bg-[#3a5258]"}`}
                  >
                    Σε εξέλιξη
                  </span>
                </div>
                
                <div 
                  onClick={() => handleOfferResultChange("none")}
                  className="relative inline-block"
                >
                  <span className={`cursor-pointer text-xs px-3 py-1.5 rounded-full transition-all block text-center
                    ${offerResultFilter === "none" 
                      ? "bg-gray-500/20 text-gray-300 font-medium shadow-[0_0_8px_rgba(156,163,175,0.5)] ring-1 ring-gray-400/50" 
                      : "bg-[#354f52] text-[#cad2c5] hover:bg-[#3a5258]"}`}
                  >
                    Κανένα
                  </span>
                </div>
              </div>
            </div>
            
            {/* Status Filters */}
            <div className="flex flex-col space-y-2 bg-[#2a3942] p-4 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.25)] border border-[#52796f]/30">
              <div className="text-[#cad2c5] text-sm font-medium text-center">
                Κατάσταση Προσφορών
              </div>
              <div className="flex flex-wrap gap-2">
                <div 
                  onClick={() => handleOfferStatusChange("all")}
                  className="relative inline-block"
                >
                  <span className={`cursor-pointer text-xs px-3 py-1.5 rounded-full transition-all block text-center
                    ${offerStatusFilter === "all" 
                      ? "bg-blue-500/20 text-blue-300 font-medium shadow-[0_0_8px_rgba(59,130,246,0.5)] ring-1 ring-blue-400/50" 
                      : "bg-[#354f52] text-[#cad2c5] hover:bg-[#3a5258]"}`}
                  >
                    Όλες
                  </span>
                </div>
                
                <div 
                  onClick={() => handleOfferStatusChange("wait_for_our_answer")}
                  className="relative inline-block"
                >
                  <span className={`cursor-pointer text-xs px-3 py-1.5 rounded-full transition-all block text-center
                    ${offerStatusFilter === "wait_for_our_answer" 
                      ? "bg-yellow-500/20 text-yellow-300 font-medium shadow-[0_0_8px_rgba(234,179,8,0.5)] ring-1 ring-yellow-400/50" 
                      : "bg-[#354f52] text-[#cad2c5] hover:bg-[#3a5258]"}`}
                  >
                    Αναμονή μας
                  </span>
                </div>
                
                <div 
                  onClick={() => handleOfferStatusChange("wait_for_customer_answer")}
                  className="relative inline-block"
                >
                  <span className={`cursor-pointer text-xs px-3 py-1.5 rounded-full transition-all block text-center
                    ${offerStatusFilter === "wait_for_customer_answer" 
                      ? "bg-blue-500/20 text-blue-300 font-medium shadow-[0_0_8px_rgba(59,130,246,0.5)] ring-1 ring-blue-400/50" 
                      : "bg-[#354f52] text-[#cad2c5] hover:bg-[#3a5258]"}`}
                  >
                    Αναμονή πελάτη
                  </span>
                </div>
                
                <div 
                  onClick={() => handleOfferStatusChange("ready")}
                  className="relative inline-block"
                >
                  <span className={`cursor-pointer text-xs px-3 py-1.5 rounded-full transition-all block text-center
                    ${offerStatusFilter === "ready" 
                      ? "bg-green-500/20 text-green-300 font-medium shadow-[0_0_8px_rgba(34,197,94,0.5)] ring-1 ring-green-400/50" 
                      : "bg-[#354f52] text-[#cad2c5] hover:bg-[#3a5258]"}`}
                  >
                    Ολοκληρωμένες
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {isLoadingAllOffers && (
        <div className="flex justify-center items-center mb-4 text-[#84a98c]">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#84a98c] mr-2"></div>
          <span>Φιλτράρισμα προσφορών...</span>
        </div>
      )}
      
      <DataTableBase
        columns={columns}
        data={filteredCustomers}
        isLoading={loading || isLoadingAllOffers}
        defaultSortColumn="company_name"
        defaultSortDirection="asc"
        searchTerm={searchTerm}
        searchColumn={searchColumn}
        onRowClick={(row) => {
          if (row && row.id) {
            // Simplified row click handler - just call toggleCustomerExpanded
            toggleCustomerExpanded(row.id);
          }
        }}
        containerClassName="bg-[#354f52] rounded-lg border border-[#52796f] overflow-hidden"
        rowClassName="hover:bg-[#52796f]/20 cursor-pointer transition-colors duration-200"
        renderRow={renderCustomerRow}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#2f3e46] border border-[#52796f] text-[#cad2c5]">
          <AlertDialogHeader>
            <AlertDialogTitle>Διαγραφή Προσφοράς</AlertDialogTitle>
            <AlertDialogDescription className="text-[#84a98c]">
              Είστε βέβαιοι ότι θέλετε να διαγράψετε αυτή την προσφορά; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#354f52] text-[#cad2c5] hover:bg-[#354f52]/90 hover:text-[#cad2c5]">
              Άκυρο
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Διαγραφή
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Error Dialog */}
      <ErrorDialog
        open={errorDialogOpen}
        onOpenChange={setErrorDialogOpen}
        title={errorTitle}
        description={errorMessage}
      />
    </div>
  );
} 