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
      <td colSpan={columns.length} className="p-0">
        <div className="p-3 pl-8">
          {isLoading ? (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#84a98c]"></div>
            </div>
          ) : offers.length === 0 ? (
            <div className="text-center py-4 text-[#84a98c]">
              Δεν υπάρχουν προσφορές για αυτόν τον πελάτη
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
                    <th className="px-3 py-2 text-center text-xs font-medium w-10"></th>
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
                            offer.result === "cancel" ? "text-yellow-400" :
                            offer.result === "waiting" ? "text-purple-400" : "text-gray-400"}
                        `}>
                          {formatResult(offer.result)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-center">
                        {isAdminOrSuperUser && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    // Just stop propagation - this is the most important part
                                    e.stopPropagation();
                                    
                                    // Simple approach - directly call the handler
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
  
  // Define fetchCustomerOffers function first
  const fetchCustomerOffers = useCallback(async (customerId: string) => {
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
        .or('result.is.null,result.eq.pending') // Only fetch offers where result is null or 'pending'
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Store the offers in state
      setCustomerOffers(prev => ({
        ...prev,
        [customerId]: data || []
      }));
      
      // Update the offersCount for this customer without triggering a full reload
      const offersCount = data?.length || 0;
      
      // If there are no offers, automatically collapse the row
      if (offersCount === 0) {
        setExpandedCustomers(prev => ({
          ...prev,
          [customerId]: false
        }));
      }
      
      // Update customers state with the new offersCount
      setCustomers(prev => 
        prev.map(customer => 
          customer.id === customerId 
            ? { ...customer, offersCount, isExpanded: offersCount > 0 ? customer.isExpanded : false } 
            : customer
        )
      );
      
      // Update filteredCustomers state with the new offersCount
      setFilteredCustomers(prev => 
        prev.map(customer => 
          customer.id === customerId 
            ? { ...customer, offersCount, isExpanded: offersCount > 0 ? customer.isExpanded : false } 
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
  }, []);
  
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
      
      // Also update the expanded state in the customers and filteredCustomers arrays
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
    openEditOfferDialog(customerId, offerId, () => {
      // Instead of refreshing all customers, just fetch the offers for this specific customer
      fetchCustomerOffers(customerId);
      
      // Make sure the row is expanded to show the updated offer
      setExpandedCustomers(prev => ({
        ...prev,
        [customerId]: true
      }));
      
      // Also update the expanded state in the customers and filteredCustomers arrays
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
    // Just refresh all customers
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
      header: "Προσφορές",
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
      
      // Update the offers list for this customer
      await fetchCustomerOffers(offerToDelete.customerId);
      
      toast({
        title: "Επιτυχής διαγραφή",
        description: "Η προσφορά διαγράφηκε με επιτυχία!",
        variant: "default",
      });
    } catch (error) {
      console.error("Error deleting offer:", error);
      toast({
        title: "Σφάλμα",
        description: "Δεν ήταν δυνατή η διαγραφή της προσφοράς.",
        variant: "destructive",
      });
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

  // Update the fetchCustomers function to accept a parameter for customers to expand
  const fetchCustomers = async (customersToExpand: string[] = []) => {
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
        const customersWithData = customersData?.map(customer => {
          // Check if this customer should be expanded (either from current state or from parameter)
          const shouldBeExpanded = expandedCustomers[customer.id] || customersToExpand.includes(customer.id);
          const offersCount = countsMap[customer.id] || 0;
          
          return {
            ...customer,
            isExpanded: shouldBeExpanded,
            offers: customerOffers[customer.id] || [],
            offersCount
          };
        }) || [];
        
        // Update both states at once
        setCustomers(customersWithData);
        setFilteredCustomers(customersWithData);
        
        // Also update the expandedCustomers state to include any newly expanded customers
        if (customersToExpand.length > 0) {
          setExpandedCustomers(prev => {
            const newState = { ...prev };
            customersToExpand.forEach(id => {
              newState[id] = true;
            });
            return newState;
          });
        }
      } else {
        // Convert the array of counts to a map for easier lookup
        const countsMap = {};
        offerCounts?.forEach(item => {
          countsMap[item.customer_id] = item.count;
        });

        // Add isExpanded property and offersCount to each customer in a single step
        const customersWithData = customersData?.map(customer => {
          // Check if this customer should be expanded (either from current state or from parameter)
          const shouldBeExpanded = expandedCustomers[customer.id] || customersToExpand.includes(customer.id);
          const offersCount = countsMap[customer.id] || 0;
          
          return {
            ...customer,
            isExpanded: shouldBeExpanded,
            offers: customerOffers[customer.id] || [],
            offersCount
          };
        }) || [];
        
        // Update both states at once
        setCustomers(customersWithData);
        setFilteredCustomers(customersWithData);
        
        // Also update the expandedCustomers state to include any newly expanded customers
        if (customersToExpand.length > 0) {
          setExpandedCustomers(prev => {
            const newState = { ...prev };
            customersToExpand.forEach(id => {
              newState[id] = true;
            });
            return newState;
          });
        }
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