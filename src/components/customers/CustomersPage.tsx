import { useState, useEffect, useMemo, useCallback } from "react";
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
import OffersDialog from "./OffersDialog";
import React from "react";

// Add Customer interface
interface Customer {
  id: string;
  company_name?: string;
  first_name?: string;
  last_name?: string;
  status: string;
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
  handleDeleteOffer: (customerId: string, offerId: string, e: React.MouseEvent) => void;
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
      <td colSpan={columns.length} className="p-0">
        <div className="p-3">
          {isLoading ? (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#84a98c]"></div>
            </div>
          ) : offers.length === 0 ? (
            <div className="text-center py-4 text-[#84a98c]">
              Δεν υπάρχουν εκκρεμείς προσφορές για αυτόν τον πελάτη
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#3a5258] text-[#a8c5b5]">
                    <th className="px-3 py-2 text-left text-xs font-medium">Ημερομηνία</th>
                    <th className="px-3 py-2 text-left text-xs font-medium">Πηγή</th>
                    <th className="px-3 py-2 text-left text-xs font-medium">Επαφή</th>
                    <th className="px-3 py-2 text-left text-xs font-medium">Απαιτήσεις</th>
                    <th className="px-3 py-2 text-left text-xs font-medium">Ποσό</th>
                    <th className="px-3 py-2 text-left text-xs font-medium">Κατάσταση</th>
                    <th className="px-3 py-2 text-left text-xs font-medium">Αποτέλεσμα</th>
                    {isAdminOrSuperUser && (
                      <th className="px-3 py-2 text-center text-xs font-medium w-10">Ενέργειες</th>
                    )}
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
                      <td className="px-3 py-2 text-xs text-[#cad2c5]">{formatDateTime(offer.created_at)}</td>
                      <td className="px-3 py-2 text-xs text-[#cad2c5]">{formatSource(offer.source)}</td>
                      <td className="px-3 py-2 text-xs text-[#cad2c5]">
                        {offer.contact && offer.contact.length > 0 
                          ? offer.contact[0].position 
                            ? `${offer.contact[0].full_name} (${offer.contact[0].position})` 
                            : offer.contact[0].full_name
                          : "-"}
                      </td>
                      <td className="px-3 py-2 text-xs text-[#cad2c5]">{offer.requirements || "-"}</td>
                      <td className="px-3 py-2 text-xs text-[#cad2c5]">{offer.amount || "-"}</td>
                      <td className="px-3 py-2 text-xs">
                        <span className={`
                          ${offer.offer_result === "wait_for_our_answer" ? "text-yellow-400" : 
                            offer.offer_result === "wait_for_customer_answer" ? "text-blue-400" : 
                            offer.offer_result === "ready" ? "text-green-400" : "text-gray-400"}
                        `}>
                          {formatStatus(offer.offer_result)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span className={`
                          ${offer.result === "success" ? "text-green-400" : 
                            offer.result === "failed" ? "text-red-400" : 
                            offer.result === "cancel" ? "text-yellow-400" : "text-gray-400"}
                        `}>
                          {formatResult(offer.result)}
                        </span>
                      </td>
                      {isAdminOrSuperUser && (
                        <td className="px-3 py-2 text-xs text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDeleteOffer(row.id, offer.id, e)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-400 hover:bg-[#354f52]"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      )}
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

export default function CustomersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
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
  const [showForm, setShowForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [formValid, setFormValid] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [statusFilter, setStatusFilter] = useState("active"); // "active", "inactive", "all"
  const [options, setOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const [lastUpdatedCustomerId, setLastUpdatedCustomerId] = useState<string | null>(null);
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [offerCustomerId, setOfferCustomerId] = useState<string | null>(null);
  const [offerSource, setOfferSource] = useState<string>("Email");
  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({});
  const [customerOffers, setCustomerOffers] = useState<Record<string, any[]>>({});
  const [loadingOffers, setLoadingOffers] = useState<Record<string, boolean>>({});

  // Define searchColumns here, before it's used in the useEffect hook
  const searchColumns = [
    { header: "Επωνυμία", accessor: "company_name" },
    { header: "Τύπος", accessor: "customer_type" },
    { header: "ΑΦΜ", accessor: "afm" },
    { header: "Email", accessor: "email" },
    { header: "Τηλέφωνο", accessor: "telephone" },
    { header: "Διεύθυνση", accessor: "address" },
  ];

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
      default:
        return "-";
    }
  };

  // Format source for display
  const formatSource = (source: string) => {
    switch (source) {
      case "Email":
        return "Email";
      case "Phone":
        return "Τηλέφωνο";
      case "Site":
        return "Ιστοσελίδα";
      case "Physical":
        return "Φυσική Παρουσία";
      default:
        return source;
    }
  };

  // Function to handle editing an offer
  const handleEditOffer = (customerId: string, offerId: string) => {
    setOfferCustomerId(customerId);
    setSelectedCustomer({ id: customerId, offerId });
    setShowOfferDialog(true);
  };

  // Function to create an offer
  const handleCreateOffer = (customerId: string, source: string) => {
    setOfferCustomerId(customerId);
    setOfferSource(source);
    setShowOfferDialog(true);
  };

  // Function to fetch offers for a specific customer
  const fetchCustomerOffers = async (customerId: string) => {
    try {
      setLoadingOffers(prev => ({ ...prev, [customerId]: true }));
      
      const { data, error } = await supabase
        .from('offers')
        .select(`
          *,
          assigned_user:users!assigned_to(fullname),
          created_user:users!created_by(fullname),
          contact:contacts(full_name, position)
        `)
        .eq("customer_id", customerId)
        .or('result.is.null,result.eq.pending') // Fetch offers where result is null or 'pending'
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Store the offers in state
      setCustomerOffers(prev => ({
        ...prev,
        [customerId]: data || []
      }));
      
      // Update the offersCount for this customer without triggering a full reload
      const offersCount = data?.length || 0;
      
      // Update customers state with the new offersCount
      setCustomers(prev => 
        prev.map(customer => 
          customer.id === customerId 
            ? { ...customer, offersCount } 
            : customer
        )
      );
      
      // Update filteredCustomers state with the new offersCount
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
  };

  // Function to handle deleting an offer
  const handleDeleteOffer = async (customerId: string, offerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { error } = await supabase
        .from('offers')
        .delete()
        .eq('id', offerId);
        
      if (error) throw error;
      
      // Update the offers list
      await fetchCustomerOffers(customerId);
      
      toast({
        title: "Επιτυχής διαγραφή",
        description: "Η προσφορά διαγράφηκε με επιτυχία.",
      });
    } catch (error) {
      console.error("Error deleting offer:", error);
      toast({
        title: "Σφάλμα",
        description: "Δεν ήταν δυνατή η διαγραφή της προσφοράς.",
        variant: "destructive",
      });
    }
  };

  // Function to toggle expanded state without causing a full reload
  const toggleCustomerExpanded = async (customerId: string) => {
    // If we're about to expand and don't have offers yet, fetch them first
    const isCurrentlyExpanded = expandedCustomers[customerId] || false;
    const hasOffers = customerOffers[customerId]?.length > 0;
    
    if (!isCurrentlyExpanded && !hasOffers) {
      await fetchCustomerOffers(customerId);
    }
    
    // Then toggle expanded state
    setExpandedCustomers(prev => ({
      ...prev,
      [customerId]: !isCurrentlyExpanded
    }));
    
    // Update the expanded state in the customers array without triggering a full reload
    setCustomers(prev => 
      prev.map(customer => 
        customer.id === customerId 
          ? { ...customer, isExpanded: !isCurrentlyExpanded } 
          : customer
      )
    );
    
    // Update the expanded state in the filtered customers array
    setFilteredCustomers(prev => 
      prev.map(customer => 
        customer.id === customerId 
          ? { ...customer, isExpanded: !isCurrentlyExpanded } 
          : customer
      )
    );
  };

  // Memoize the columns to prevent unnecessary re-renders
  const columns = useMemo(() => [
    {
      header: "Εκκρεμείς Προσφορές",
      accessor: "expand",
      width: "40px",
      cell: (value, row) => {
        if (!row) return null;
        
        const isExpanded = row.isExpanded || false;
        const offersCount = row.offersCount || 0;
        
        // Only show the expand arrow if there are offers
        if (offersCount === 0) {
          return null;
        }
        
        return (
          <div className="flex items-center">
            <div 
              className="flex items-center cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                toggleCustomerExpanded(row.id);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-[#84a98c]" />
              ) : (
                <ChevronRight className="h-4 w-4 text-[#84a98c]" />
              )}
              <span className="ml-1 text-xs text-[#84a98c]">{offersCount}</span>
            </div>
          </div>
        );
      }
    },
    { 
      header: "Επωνυμία", 
      accessor: "company_name",
      width: "20%"
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
      width: "12%"
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
  ], [isAdminOrSuperUser, toggleCustomerExpanded]);

  const handleColumnChange = (column: string) => {
    setSelectedColumn(column);
    setSearchColumn(column); // Update the searchColumn state as well
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
  }, [customerOffers, loadingOffers, columns, isAdminOrSuperUser, handleEditOffer, handleDeleteOffer, handleCreateOffer, formatDateTime, formatSource, formatStatus, formatResult]);

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

  const handleOfferSave = () => {
    // Refresh data if needed
    toast({
      title: "Επιτυχής δημιουργία",
      description: "Η προσφορά δημιουργήθηκε με επιτυχία.",
    });
  };

  // Fetch customers when user or filters change
  useEffect(() => {
    if (user) {
      fetchCustomers();
    }
  }, [user, refreshTrigger, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      
      // Add pagination parameters
      const pageSize = 50; // Number of records per page
      const pageIndex = 0; // First page (0-indexed)
      
      // Build the query based on the status filter with pagination
      let query = supabase.from("customers").select("*");
      
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      
      // Add pagination
      query = query
        .range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1)
        .order('company_name', { ascending: true });
      
      const { data: customersData, error: customersError } = await query;

      if (customersError) throw customersError;

      // Use server-side aggregation to get offer counts efficiently
      // This query counts pending offers grouped by customer_id
      const { data: offerCounts, error: countsError } = await supabase
        .rpc('count_pending_offers_by_customer');
      
      if (countsError) {
        console.error("Error fetching offer counts:", countsError);
        // Fallback to client-side counting if the RPC function doesn't exist
        const { data: offersData, error: offersError } = await supabase
          .from('offers')
          .select('customer_id, result');
        
        if (offersError) throw offersError;
        
        // Filter offers with pending status or null result
        const pendingOffers = offersData.filter(offer => 
          offer.result === null || offer.result === 'pending'
        );
        
        // Count offers by customer ID
        const countsMap = {};
        pendingOffers.forEach(offer => {
          countsMap[offer.customer_id] = (countsMap[offer.customer_id] || 0) + 1;
        });
        
        // Add isExpanded property and offersCount to each customer in a single step
        const customersWithData = customersData?.map(customer => ({
          ...customer,
          isExpanded: expandedCustomers[customer.id] || false,
          offers: customerOffers[customer.id] || [],
          offersCount: countsMap[customer.id] || 0
        })) || [];
        
        // Update both states at once
        setCustomers(customersWithData);
        setFilteredCustomers(customersWithData);
      } else {
        // Convert the array of counts to a map for easier lookup
        const countsMap = {};
        offerCounts?.forEach(item => {
          countsMap[item.customer_id] = item.count;
        });
  
        // Add isExpanded property and offersCount to each customer in a single step
        const customersWithData = customersData?.map(customer => ({
          ...customer,
          isExpanded: expandedCustomers[customer.id] || false,
          offers: customerOffers[customer.id] || [],
          offersCount: countsMap[customer.id] || 0
        })) || [];
  
        // Update both states at once
        setCustomers(customersWithData);
        setFilteredCustomers(customersWithData);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  };

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
    setShowForm(true);
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

  const refreshCustomers = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleDelete = async (customerId) => {
    if (!customerId) return;
    
    try {
      // Make role check case-insensitive
      const isAdminUser = user?.role?.toLowerCase() === 'admin';
      
      if (isAdminUser) {
        // For admin users: Perform actual deletion
        
        // First delete all contacts associated with this customer
        await supabase
          .from('contacts')
          .delete()
          .eq('customer_id', customerId);
        
        // Then delete the customer
        await supabase
          .from('customers')
          .delete()
          .eq('id', customerId);
        
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
          description: 'Ο πελάτης διαγράφηκε οριστικά με επιτυχία!',
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
        description: 'Σφάλμα κατά τη διαγραφή του πελάτη',
        variant: "destructive",
      });
    }
  };

  // If showing the form, render it instead of the customer list
  return (
    <div className="p-4">
      {showForm ? (
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-4 p-4 bg-[#354f52] border-b border-[#52796f]">
            <h1 className="text-xl font-bold text-[#a8c5b5]">
              {selectedCustomer ? "Επεξεργασία Πελάτη" : "Νέος Πελάτης"}
            </h1>
            <div className="flex items-center space-x-2">
              <Button
                form="customer-form"
                type="submit"
                disabled={!formValid}
                className="bg-[#52796f] hover:bg-[#52796f]/90 text-white rounded-md px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Αποθήκευση
              </Button>
              <Button
                type="button"
                variant="outline"
                className="bg-[#2f3e46] text-[#cad2c5] border-[#52796f] hover:bg-[#354f52]"
                onClick={() => {
                  setShowForm(false);
                  setSelectedCustomer(null);
                }}
              >
                Άκυρο
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto relative">
            <CustomerForm
              customerId={selectedCustomer?.id}
              onSave={() => {
                refreshCustomers();
                setShowForm(false);
                setSelectedCustomer(null);
              }}
              onCancel={() => {
                setShowForm(false);
                setSelectedCustomer(null);
              }}
              onValidityChange={setFormValid}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="mb-2">
            <h1 className="text-2xl font-bold text-[#cad2c5] mb-2">
              Διαχείριση Πελατών
            </h1>
            <Button
              onClick={() => {
                setSelectedCustomer(null);
                setShowForm(true);
                setFormValid(false);
              }}
              className="bg-[#52796f] hover:bg-[#52796f]/90 text-[#cad2c5] mb-2"
            >
              <Plus className="h-4 w-4 mr-2" />
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
          />
        </>
      )}

      {/* Offer Dialog */}
      <OffersDialog
        open={showOfferDialog}
        onOpenChange={(open) => {
          setShowOfferDialog(open);
          if (!open) {
            setOfferCustomerId(null);
            setSelectedCustomer(null);
          }
        }}
        customerId={offerCustomerId || ""}
        offerId={selectedCustomer?.offerId}
        onSave={() => {
          // Refresh the offers for this customer
          if (offerCustomerId) {
            fetchCustomerOffers(offerCustomerId);
          }
          setRefreshTrigger(prev => prev + 1);
        }}
        defaultSource={offerSource}
      />

      {/* Delete Customer Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent 
          className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5]"
          aria-describedby="delete-customer-description"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isAdminUser 
                ? "Οριστική Διαγραφή Πελάτη" 
                : customerToDelete?.status === 'active' 
                  ? "Απενεργοποίηση Πελάτη"
                  : "Ενεργοποίηση Πελάτη"}
            </AlertDialogTitle>
            <AlertDialogDescription id="delete-customer-description" className="text-[#84a98c]">
              {isAdminUser
                ? `Είστε σίγουροι ότι θέλετε να διαγράψετε οριστικά τον πελάτη "${customerToDelete?.company_name}" και όλες τις επαφές του; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.`
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
    </div>
  );
}