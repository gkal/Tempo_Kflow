import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { SearchBar } from "@/components/ui/search-bar";
import { Button } from "@/components/ui/button";
import { Plus, Eye, Edit, Trash2, Filter, ChevronRight, ChevronDown } from "lucide-react";
import { DataTableBase } from "@/components/ui/data-table-base";
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from "@/lib/AuthContext";
import { formatDateTime } from "@/utils/formatUtils";
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
import { ErrorDialog } from "@/components/ui/error-dialog";
import { GlobalTooltip } from "@/components/ui/GlobalTooltip";
import React from "react";
import { openNewOfferDialog, openEditOfferDialog } from '../customers/OfferDialogManager';
import { TruncateWithTooltip } from "@/components/ui/GlobalTooltip";
import { logDebug, logError, createPrefixedLogger } from "@/utils/loggingUtils";
import { handleSupabaseError, getUserErrorMessage } from "@/utils/errorUtils";
import { useRealtimeSubscription } from "@/lib/useRealtimeSubscription";

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
  [key: string]: any;
  isExpanded?: boolean;
  customer?: any;
}

export default function OffersPage() {
  const { user } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [filteredOffers, setFilteredOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchColumn, setSearchColumn] = useState("requirements");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all"); // "wait_for_our_answer", "wait_for_customer_answer", "ready", "all"
  const [resultFilter, setResultFilter] = useState("all"); // "success", "failed", "cancel", "pending", "waiting", "none", "all"
  const [expandedOffers, setExpandedOffers] = useState<Record<string, boolean>>({});
  const [offerCustomers, setOfferCustomers] = useState<Record<string, any>>({});
  const [loadingCustomers, setLoadingCustomers] = useState<Record<string, boolean>>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<string | null>(null);
  const [lastUpdatedOfferId, setLastUpdatedOfferId] = useState<string | null>(null);
  
  // Error dialog state
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorTitle, setErrorTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  
  // Check if user is admin or super user
  const isAdminOrSuperUser = user?.role === "Admin" || user?.role === "Super User";

  // Add state variables for loading and success
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteSuccessful, setIsDeleteSuccessful] = useState(false);

  // Create a logger for this component
  const logger = createPrefixedLogger('OffersPage');

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

  // Show error dialog
  const showError = (title: string, message: string) => {
    setErrorTitle(title);
    setErrorMessage(message);
    setErrorDialogOpen(true);
  };

  // Fetch offers from Supabase
  const fetchOffers = async () => {
    try {
      setLoading(true);
      logger.debug(`fetchOffers called with statusFilter=${statusFilter}, resultFilter=${resultFilter}`);
      
      // Build the query
      let query = supabase
        .from("offers")
        .select(`
          *,
          assigned_user:users!assigned_to(fullname),
          created_user:users!created_by(fullname),
          customer:customers(id, company_name)
        `)
        .is("deleted_at", null); // Filter out soft-deleted records
      
      logger.debug("Base query created with deleted_at filter");
      
      // Apply status filter if not "all"
      if (statusFilter !== "all") {
        query = query.eq("offer_result", statusFilter);
        logger.debug(`Added status filter: offer_result=${statusFilter}`);
      }
      
      // Apply result filter if not "all"
      if (resultFilter !== "all") {
        query = query.eq("result", resultFilter);
        logger.debug(`Added result filter: result=${resultFilter}`);
      }
      
      // Apply search filter if provided
      if (searchTerm) {
        query = query.ilike(`${searchColumn}`, `%${searchTerm}%`);
        logger.debug(`Added search filter: ${searchColumn} ILIKE %${searchTerm}%`);
      }
      
      // Execute the query
      logger.debug("Executing query...");
      const { data, error } = await query.order("created_at", { ascending: false });
      
      if (error) {
        logger.error("Query error:", error);
        throw error;
      }
      
      logger.debug(`Query returned ${data?.length || 0} offers`);
      if (data && data.length > 0) {
        logger.debug("First result:", {
          id: data[0].id,
          result: data[0].result,
          offer_result: data[0].offer_result
        });
      }
      
      // Process the data
      const offersWithData = ((data || []) as unknown as Offer[])?.map(offer => {
        return {
          ...offer,
          isExpanded: expandedOffers[offer.id] || false,
          customerData: offerCustomers[offer.id] || offer.customer || null
        };
      }) || [];
      
      setOffers(offersWithData);
      setFilteredOffers(offersWithData);
      
    } catch (error) {
      const handledError = handleSupabaseError(error, 'fetching offers');
      const { title, message } = getUserErrorMessage(handledError, 'Data Load Error');
      showError(title, message);
    } finally {
      setLoading(false);
    }
  };

  // Toggle expanded state for an offer
  const toggleOfferExpanded = (offerId: string) => {
    const isCurrentlyExpanded = expandedOffers[offerId] || false;
    
    setExpandedOffers(prev => ({
      ...prev,
      [offerId]: !isCurrentlyExpanded
    }));
    
    setOffers(prev => 
      prev.map(offer => 
        offer.id === offerId 
          ? { ...offer, isExpanded: !isCurrentlyExpanded } 
          : offer
      )
    );
    
    setFilteredOffers(prev => 
      prev.map(offer => 
        offer.id === offerId 
          ? { ...offer, isExpanded: !isCurrentlyExpanded } 
          : offer
      )
    );
  };

  // Handle search
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    
    if (!value) {
      setFilteredOffers(offers);
      return;
    }
    
    const filtered = offers.filter(offer => {
      const fieldValue = offer[searchColumn];
      if (!fieldValue) return false;
      
      return String(fieldValue).toLowerCase().includes(value.toLowerCase());
    });
    
    setFilteredOffers(filtered);
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
  const handleEditOffer = (offerId: string) => {
    const offer = offers.find(o => o.id === offerId);
    if (offer) {
      openEditOfferDialog(offer.customer_id, offerId, () => {
        setRefreshTrigger(prev => prev + 1);
        setLastUpdatedOfferId(offerId);
        
        // Clear the highlight after a delay
        setTimeout(() => {
          setLastUpdatedOfferId(null);
        }, 3000);
      });
    }
  };

  // Handle delete offer
  const handleDeleteClick = (offerId: string) => {
    setOfferToDelete(offerId);
    setShowDeleteDialog(true);
    setIsDeleteSuccessful(false);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!offerToDelete) return;
    
    setIsDeleting(true);
    
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
        logger.debug("Soft delete not available, falling back to regular delete");
        const response = await supabase
          .from("offers")
          .delete()
          .eq("id", offerToDelete);
        error = response.error;
      }
      
      if (error) throw error;
      
      // Show success state instead of closing dialog immediately
      setIsDeleteSuccessful(true);
      
      // Removed immediate state updates to avoid refreshing the UI before the user sees the success message
    } catch (error) {
      const handledError = handleSupabaseError(error, 'deleting offer');
      const { title, message } = getUserErrorMessage(handledError, 'Delete Error');
      showError(title, message);
      setShowDeleteDialog(false);
      setOfferToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle dialog close
  const handleDeleteDialogClose = () => {
    if (isDeleteSuccessful) {
      // Only perform the state updates when closing after success
      setOffers(prev => prev.filter(offer => offer.id !== offerToDelete));
      setFilteredOffers(prev => prev.filter(offer => offer.id !== offerToDelete));
    }
    
    // Reset states
    setShowDeleteDialog(false);
    setOfferToDelete(null);
    setIsDeleteSuccessful(false);
  };

  // Handle create new offer
  const handleCreateOffer = () => {
    openNewOfferDialog("", "Email", () => {
      setRefreshTrigger(prev => prev + 1);
    });
  };

  // Fetch offers when component mounts or filters change
  useEffect(() => {
    if (user) {
      fetchOffers();
    }
  }, [user, refreshTrigger, statusFilter, resultFilter]);

  // Define columns for the data table
  const columns = useMemo(() => [
    {
      header: "",
      accessor: "expand",
      id: "expand",
      width: "40px",
      cell: (value, row) => {
        if (!row) return null;
        
        const isExpanded = row.isExpanded || false;
        const hasCustomerData = row.customer && Object.keys(row.customer).length > 0;
        
        return (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              toggleOfferExpanded(row.id);
            }}
            className="h-8 w-8 hover:bg-[#354f52] text-[#cad2c5]"
            disabled={!hasCustomerData}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        );
      },
    },
    {
      header: "Πελάτης",
      accessor: "customer",
      id: "customer",
      width: "20%",
      cell: (value, row) => {
        if (!row || !value) return "—";
        
        const customer = value[0] || {};
        const companyName = customer.company_name || "";
        
        return companyName || "—";
      },
    },
    {
      header: "Ζήτηση Πελάτη",
      accessor: "requirements",
      id: "requirements",
      width: "20%",
      cell: (value) => {
        if (!value) return "—";
        
        // Truncate long text
        return value.length > 50 
          ? <TruncateWithTooltip 
              text={value} 
              maxLength={50} 
              maxWidth={800}
              multiLine={false}
              maxLines={2}
            /> 
          : value;
      },
    },
    {
      header: "Ποσό",
      accessor: "amount",
      id: "amount",
      width: "10%",
    },
    {
      header: "Κατάσταση",
      accessor: "offer_result",
      id: "offer_result",
      width: "15%",
      cell: (value) => {
        if (!value) return "—";
        
        return (
          <span className={`
            ${value === "wait_for_our_answer" ? "text-yellow-400" : 
              value === "wait_for_customer_answer" ? "text-blue-400" : 
              value === "ready" ? "text-green-400" : "text-gray-400"}
          `}>
            {formatStatus(value)}
          </span>
        );
      },
    },
    {
      header: "Αποτέλεσμα",
      accessor: "result",
      id: "result",
      width: "10%",
      cell: (value) => {
        if (!value) return "—";
        
        return (
          <span className={`
            ${value === "success" ? "text-green-400" : 
              value === "failed" ? "text-red-400" : 
              value === "cancel" ? "text-yellow-400" :
              value === "waiting" ? "text-purple-400" : "text-gray-400"}
          `}>
            {formatResult(value)}
          </span>
        );
      },
    },
    {
      header: "Ημ/νία Δημιουργίας",
      accessor: "created_at",
      id: "created_at",
      width: "15%",
      cell: (value) => formatDateTime(value),
    },
    {
      header: "Ενέργειες",
      accessor: "actions",
      id: "actions",
      width: "100px",
      cell: (value, row) => (
        <div className="flex items-center justify-center space-x-2">
          <GlobalTooltip content="Edit offer">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleEditOffer(row.id);
              }}
              className="h-8 w-8 hover:bg-[#354f52] text-[#cad2c5]"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </GlobalTooltip>

          {isAdminOrSuperUser && (
            <GlobalTooltip content="Delete offer">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(row.id);
                }}
                className="h-8 w-8 hover:bg-[#354f52] text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </GlobalTooltip>
          )}
        </div>
      ),
    },
  ], [expandedOffers, isAdminOrSuperUser]);

  // Define search options
  const searchOptions = [
    { value: "requirements", label: "Ζήτηση Πελάτη" },
    { value: "amount", label: "Ποσό" },
    { value: "offer_result", label: "Κατάσταση" },
    { value: "result", label: "Αποτέλεσμα" },
  ];

  return (
    <div className="p-4">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-[#cad2c5] mb-2">
          Διαχείριση Προσφορών
        </h1>
        <Button
          onClick={handleCreateOffer}
          className="bg-transparent hover:bg-[#52796f] text-[#84a98c] hover:text-[#cad2c5] flex items-center gap-2 transition-colors font-normal"
        >
          <Plus className="h-4 w-4 text-white" />
          Νέα Προσφορά
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
            onChange={handleSearch}
            options={searchOptions}
            selectedColumn={searchColumn}
            onColumnChange={handleColumnChange}
          />
        </div>
        
        <div className="w-1/4 flex justify-end">
          <div className="flex space-x-2">
            <div className="text-[#cad2c5] text-sm mr-2 flex items-center">
              Φίλτρα:
            </div>
            
            {/* Status filters */}
            <div className="flex space-x-2">
              <div 
                onClick={() => {
                  setStatusFilter("all");
                  setRefreshTrigger(prev => prev + 1);
                }}
                className="relative inline-block min-w-[70px]"
              >
                <span className={`cursor-pointer text-xs px-2 py-1 rounded-full transition-all ring-1 block text-center
                  ${statusFilter === "all" 
                    ? "bg-blue-500/20 text-blue-400 font-medium shadow-[0_0_8px_2px_rgba(96,165,250,0.3)] ring-blue-400/50" 
                    : "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 ring-transparent"}`}
                >
                  Όλες
                </span>
              </div>
              
              <div 
                onClick={() => {
                  setStatusFilter("wait_for_our_answer");
                  setRefreshTrigger(prev => prev + 1);
                }}
                className="relative inline-block min-w-[70px]"
              >
                <span className={`cursor-pointer text-xs px-2 py-1 rounded-full transition-all ring-1 block text-center
                  ${statusFilter === "wait_for_our_answer" 
                    ? "bg-yellow-500/20 text-yellow-400 font-medium shadow-[0_0_8px_2px_rgba(234,179,8,0.3)] ring-yellow-400/50" 
                    : "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 ring-transparent"}`}
                >
                  Αναμονή μας
                </span>
              </div>
              
              <div 
                onClick={() => {
                  setStatusFilter("wait_for_customer_answer");
                  setRefreshTrigger(prev => prev + 1);
                }}
                className="relative inline-block min-w-[70px]"
              >
                <span className={`cursor-pointer text-xs px-2 py-1 rounded-full transition-all ring-1 block text-center
                  ${statusFilter === "wait_for_customer_answer" 
                    ? "bg-blue-500/20 text-blue-400 font-medium shadow-[0_0_8px_2px_rgba(96,165,250,0.3)] ring-blue-400/50" 
                    : "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 ring-transparent"}`}
                >
                  Αναμονή πελάτη
                </span>
              </div>
              
              <div 
                onClick={() => {
                  setStatusFilter("ready");
                  setRefreshTrigger(prev => prev + 1);
                }}
                className="relative inline-block min-w-[70px]"
              >
                <span className={`cursor-pointer text-xs px-2 py-1 rounded-full transition-all ring-1 block text-center
                  ${statusFilter === "ready" 
                    ? "bg-green-500/20 text-green-400 font-medium shadow-[0_0_8px_2px_rgba(74,222,128,0.3)] ring-green-400/50" 
                    : "bg-green-500/10 text-green-400 hover:bg-green-500/20 ring-transparent"}`}
                >
                  Ολοκληρωμένες
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Result filters */}
      <div className="flex justify-end mb-4">
        <div className="flex space-x-2">
          <div className="text-[#cad2c5] text-sm mr-2 flex items-center">
            Αποτέλεσμα:
          </div>
          
          <div 
            onClick={() => {
              setResultFilter("all");
              setRefreshTrigger(prev => prev + 1);
            }}
            className="relative inline-block min-w-[70px]"
          >
            <span className={`cursor-pointer text-xs px-2 py-1 rounded-full transition-all ring-1 block text-center
              ${resultFilter === "all" 
                ? "bg-blue-500/20 text-blue-400 font-medium shadow-[0_0_8px_2px_rgba(96,165,250,0.3)] ring-blue-400/50" 
                : "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 ring-transparent"}`}
            >
              Όλα
            </span>
          </div>
          
          <div 
            onClick={() => {
              setResultFilter("success");
              setRefreshTrigger(prev => prev + 1);
            }}
            className="relative inline-block min-w-[70px]"
          >
            <span className={`cursor-pointer text-xs px-2 py-1 rounded-full transition-all ring-1 block text-center
              ${resultFilter === "success" 
                ? "bg-green-500/20 text-green-400 font-medium shadow-[0_0_8px_2px_rgba(74,222,128,0.3)] ring-green-400/50" 
                : "bg-green-500/10 text-green-400 hover:bg-green-500/20 ring-transparent"}`}
            >
              Επιτυχία
            </span>
          </div>
          
          <div 
            onClick={() => {
              setResultFilter("failed");
              setRefreshTrigger(prev => prev + 1);
            }}
            className="relative inline-block min-w-[70px]"
          >
            <span className={`cursor-pointer text-xs px-2 py-1 rounded-full transition-all ring-1 block text-center
              ${resultFilter === "failed" 
                ? "bg-red-500/20 text-red-400 font-medium shadow-[0_0_8px_2px_rgba(248,113,113,0.3)] ring-red-400/50" 
                : "bg-red-500/10 text-red-400 hover:bg-red-500/20 ring-transparent"}`}
            >
              Αποτυχία
            </span>
          </div>
          
          <div 
            onClick={() => {
              setResultFilter("pending");
              setRefreshTrigger(prev => prev + 1);
            }}
            className="relative inline-block min-w-[70px]"
          >
            <span className={`cursor-pointer text-xs px-2 py-1 rounded-full transition-all ring-1 block text-center
              ${resultFilter === "pending" 
                ? "bg-purple-500/20 text-purple-400 font-medium shadow-[0_0_8px_2px_rgba(168,85,247,0.3)] ring-purple-400/50" 
                : "bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 ring-transparent"}`}
            >
              Σε εξέλιξη
            </span>
          </div>
          
          <div 
            onClick={() => {
              setResultFilter("none");
              setRefreshTrigger(prev => prev + 1);
            }}
            className="relative inline-block min-w-[70px]"
          >
            <span className={`cursor-pointer text-xs px-2 py-1 rounded-full transition-all ring-1 block text-center
              ${resultFilter === "none" 
                ? "bg-gray-500/20 text-gray-400 font-medium shadow-[0_0_8px_2px_rgba(156,163,175,0.3)] ring-gray-400/50" 
                : "bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 ring-transparent"}`}
            >
              Κανένα
            </span>
          </div>
        </div>
      </div>

      <DataTableBase
        key={`offers-table-${statusFilter}-${resultFilter}`}
        columns={columns}
        data={filteredOffers}
        isLoading={loading}
        defaultSortColumn="created_at"
        defaultSortDirection="desc"
        searchTerm={searchTerm}
        searchColumn={searchColumn}
        onRowClick={(row) => {
          if (row && row.id) {
            handleEditOffer(row.id);
          }
        }}
        containerClassName="bg-[#354f52] rounded-lg border border-[#52796f] overflow-hidden"
        rowClassName="hover:bg-[#354f52]/50 cursor-pointer group"
        highlightedRowId={lastUpdatedOfferId}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={showDeleteDialog} 
        onOpenChange={(open) => {
          // Prevent closing the dialog while deleting
          if (!isDeleting && !open) {
            handleDeleteDialogClose();
          }
        }}
      >
        <AlertDialogContent className="bg-[#2f3e46] border border-[#52796f] text-[#cad2c5]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isDeleteSuccessful 
                ? "Επιτυχής Διαγραφή" 
                : "Διαγραφή Προσφοράς"
              }
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#84a98c]">
              {isDeleting ? (
                <div className="flex flex-col items-center justify-center space-y-3 py-3">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#52796f] border-t-transparent"></div>
                  <p className="text-[#cad2c5]">Η διαγραφή βρίσκεται σε εξέλιξη. Παρακαλώ περιμένετε...</p>
                  <p className="text-sm text-[#84a98c]">Αυτή η διαδικασία μπορεί να διαρκέσει μερικά δευτερόλεπτα.</p>
                </div>
              ) : isDeleteSuccessful ? (
                <div className="flex flex-col items-center justify-center space-y-3 py-3">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-center text-green-500 font-medium">
                    Η προσφορά διαγράφηκε με επιτυχία!
                  </p>
                </div>
              ) : (
                "Είστε βέβαιοι ότι θέλετε να διαγράψετε αυτή την προσφορά; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {isDeleteSuccessful ? (
              <Button 
                onClick={handleDeleteDialogClose}
                className="bg-[#52796f] hover:bg-[#52796f]/90 text-white"
              >
                OK
              </Button>
            ) : (
              <>
                <AlertDialogCancel 
                  className="bg-[#354f52] text-[#cad2c5] hover:bg-[#354f52]/90 hover:text-[#cad2c5]"
                  disabled={isDeleting}
                >
                  Άκυρο
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault(); // Prevent default to handle manually
                    handleDeleteConfirm();
                  }}
                  className="bg-red-600 text-white hover:bg-red-700"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Διαγραφή...
                    </>
                  ) : "Διαγραφή"}
                </AlertDialogAction>
              </>
            )}
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