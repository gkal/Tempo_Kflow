import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from "@/lib/AuthContext";
import { formatDateTime } from "@/utils/formatUtils";
import { Button } from "@/components/ui/button";
import { DataTableBase } from "@/components/ui/data-table-base";
import { SearchBar } from "@/components/ui/search-bar";
import { CloseButton } from "@/components/ui/close-button";
import { Plus, Edit, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import OffersDialog from "./OffersDialog";
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
import { TruncateWithTooltip } from "@/components/ui/GlobalTooltip";
import { GlobalTooltip } from "@/components/ui/GlobalTooltip";

// Add a ref type for the component
export interface OffersTableRef {
  refreshData: () => void;
  updateOfferInList: (updatedOffer: any) => void;
  removeOfferFromList: (offerId: string) => void;
  addOfferToList: (newOffer: any) => void;
}

interface OffersTableProps {
  customerId: string;
  onClose: () => void;
}

// Convert to forwardRef to expose methods
const OffersTable = forwardRef<OffersTableRef, OffersTableProps>(({
  customerId,
  onClose,
}, ref) => {
  const { user } = useAuth();
  const [offers, setOffers] = useState<any[]>([]);
  const [filteredOffers, setFilteredOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchColumn, setSearchColumn] = useState("requirements");
  const [showDialog, setShowDialog] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [expandedOffers, setExpandedOffers] = useState<Record<string, boolean>>({});
  const [offerHistory, setOfferHistory] = useState<Record<string, any[]>>({});
  const [loadingHistory, setLoadingHistory] = useState<Record<string, boolean>>({});

  // Add a function to add a new offer to the list
  const addOfferToList = (newOffer) => {
    console.log('📋 Adding offer to list:', newOffer.id);
    
    // Check if the offer already exists before adding
    setOffers(prevOffers => {
      // Check if this offer already exists
      const existingOfferIndex = prevOffers.findIndex(offer => offer.id === newOffer.id);
      
      if (existingOfferIndex >= 0) {
        console.log('⚠️ Offer already exists, updating instead of adding');
        // Update the existing offer
        const updatedOffers = [...prevOffers];
        updatedOffers[existingOfferIndex] = newOffer;
        return updatedOffers;
      }
      
      // Add as a new offer
      return [newOffer, ...prevOffers];
    });
    
    // Do the same for filtered offers
    setFilteredOffers(prevOffers => {
      // Check if this offer already exists
      const existingOfferIndex = prevOffers.findIndex(offer => offer.id === newOffer.id);
      
      if (existingOfferIndex >= 0) {
        // Update the existing offer
        const updatedOffers = [...prevOffers];
        updatedOffers[existingOfferIndex] = newOffer;
        return updatedOffers;
      }
      
      return [newOffer, ...prevOffers];
    });
  };

  // Add a function to update a specific offer without refreshing the entire list
  const updateOfferInList = (updatedOffer) => {
    console.log('🔄 Updating offer in list:', updatedOffer.id);
    
    setOffers(prevOffers => 
      prevOffers.map(offer => 
        offer.id === updatedOffer.id ? updatedOffer : offer
      )
    );
    
    setFilteredOffers(prevOffers => 
      prevOffers.map(offer => 
        offer.id === updatedOffer.id ? updatedOffer : offer
      )
    );
  };

  // Add a function to remove a specific offer without refreshing the entire list
  const removeOfferFromList = (offerId) => {
    console.log('🗑️ Removing offer from list:', offerId);
    
    setOffers(prevOffers => prevOffers.filter(offer => offer.id !== offerId));
    setFilteredOffers(prevOffers => prevOffers.filter(offer => offer.id !== offerId));
  };

  // Increment the refresh trigger to fetch new data
  const refreshData = () => {
    console.log('🔄 Refreshing all offers data');
    setRefreshTrigger((prev) => prev + 1);
  };

  // Enhance the real-time subscription implementation
  useEffect(() => {
    // Define a function to log real-time updates
    const logRealtimeEvent = (eventType: string, payload: any) => {
      console.log(`🔄 Real-time ${eventType} event in OffersTable:`, payload);
    };

    // Set up channel with improved error handling and logging
    const offersSubscription = supabase
      .channel('customer-offers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'offers',
          filter: `customer_id=eq.${customerId}`
        },
        (payload) => {
          // Log every real-time event
          logRealtimeEvent(payload.eventType, payload);

          if (payload.eventType === 'INSERT') {
            if (payload.new) {
              console.log('🆕 Adding new offer to UI:', payload.new.id);
              
              // Enhanced version of addOfferToList that fetches all related data
              const fetchAndAddOffer = async () => {
                try {
                  // Fetch the complete offer with related data
                  const { data, error } = await supabase
                    .from("offers")
                    .select(`
                      *,
                      assigned_user:users!assigned_to(fullname),
                      created_user:users!created_by(fullname)
                    `)
                    .eq("id", payload.new.id)
                    .single();
                  
                  if (error) {
                    console.error('Error fetching complete offer data:', error);
                    return;
                  }
                  
                  if (data) {
                    console.log('✅ Successfully fetched complete offer data:', data);
                    addOfferToList(data);
                  }
                } catch (err) {
                  console.error('Error in fetchAndAddOffer:', err);
                  // Fall back to adding the basic offer data
                  addOfferToList(payload.new);
                }
              };
              
              fetchAndAddOffer();
            } else {
              console.log('⚠️ INSERT event without new data, refreshing all data');
              refreshData();
            }
          } else if (payload.eventType === 'UPDATE') {
            if (payload.new) {
              console.log('🔄 Updating offer in UI:', payload.new.id);
              
              // Similar approach for update - fetch complete data
              const fetchAndUpdateOffer = async () => {
                try {
                  const { data, error } = await supabase
                    .from("offers")
                    .select(`
                      *,
                      assigned_user:users!assigned_to(fullname),
                      created_user:users!created_by(fullname)
                    `)
                    .eq("id", payload.new.id)
                    .single();
                  
                  if (error) {
                    console.error('Error fetching updated offer data:', error);
                    return;
                  }
                  
                  if (data) {
                    console.log('✅ Successfully fetched updated offer data:', data);
                    updateOfferInList(data);
                  }
                } catch (err) {
                  console.error('Error in fetchAndUpdateOffer:', err);
                  // Fall back to updating with basic data
                  updateOfferInList(payload.new);
                }
              };
              
              fetchAndUpdateOffer();
            } else {
              console.log('⚠️ UPDATE event without new data, refreshing all data');
              refreshData();
            }
          } else if (payload.eventType === 'DELETE') {
            if (payload.old && payload.old.id) {
              console.log('🗑️ Removing offer from UI:', payload.old.id);
              removeOfferFromList(payload.old.id);
            } else {
              console.log('⚠️ DELETE event without old data, refreshing all data');
              refreshData();
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`🔌 Subscription status for offers: ${status}`);
      });

    // Improved cleanup to ensure proper unsubscription
    return () => {
      console.log('🔌 Unsubscribing from offers real-time updates');
      offersSubscription.unsubscribe();
    };
  }, [customerId, refreshData, addOfferToList, updateOfferInList, removeOfferFromList]);

  // Define search columns
  const searchColumns = [
    { value: "requirements", label: "Απαιτήσεις" },
    { value: "amount", label: "Ποσό" },
    { value: "source", label: "Πηγή" },
    { value: "offer_result", label: "Κατάσταση" },
    { value: "result", label: "Αποτέλεσμα" },
    { value: "assigned_to", label: "Ανατέθηκε σε" },
  ];

  useEffect(() => {
    fetchOffers();
    fetchCustomerName();
  }, [customerId, refreshTrigger]);

  const fetchCustomerName = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("company_name")
        .eq("id", customerId)
        .single();

      if (error) throw error;
      setCustomerName(data?.company_name || "");
    } catch (error) {
      console.error("Error fetching customer name:", error);
    }
  };

  const fetchOffers = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("offers")
        .select(`
          *,
          assigned_user:users!assigned_to(fullname),
          created_user:users!created_by(fullname)
        `)
        .eq("customer_id", customerId)
        .is("deleted_at", null)
        .or('result.is.null,result.eq.pending,result.eq.,result.eq.none')
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }
      
      // Preserve expanded state for existing offers
      const currentExpandedState = { ...expandedOffers };
      
      // Update offers without losing expanded state
      setOffers(data || []);
      setFilteredOffers(data || []);
    } catch (error) {
      console.error("Error fetching offers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setFilteredOffers(offers);
      return;
    }

    const filtered = offers.filter((offer) => {
      let value;
      
      // Handle special cases
      if (searchColumn === "assigned_to" && offer.assigned_user) {
        return offer.assigned_user.fullname
          .toLowerCase()
          .includes(term.toLowerCase());
      }
      
      // Get the value to search in
      value = offer[searchColumn];
      if (!value) return false;

      return String(value).toLowerCase().includes(term.toLowerCase());
    });

    setFilteredOffers(filtered);
  };

  const handleColumnChange = (column: string) => {
    setSearchColumn(column);
    handleSearch(searchTerm);
  };

  const handleAddOffer = () => {
    setSelectedOffer(null);
    setShowDialog(true);
  };

  const handleEditOffer = (id: string) => {
    setSelectedOffer(id);
    setShowDialog(true);
  };

  const handleDeleteClick = (id: string) => {
    setOfferToDelete(id);
    setShowDeleteDialog(true);
  };

  const handleDeleteOffer = async () => {
    if (offerToDelete) {
      try {
        const { error } = await supabase
          .from("offers")
          .delete()
          .eq("id", offerToDelete);

        if (error) throw error;

        // Remove the offer from the list without a full refresh
        removeOfferFromList(offerToDelete);
      } catch (error) {
        console.error("Error deleting offer:", error);
      } finally {
        setShowDeleteDialog(false);
        setOfferToDelete(null);
      }
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
      case "pending":
        return "Σε εξέλιξη";
      case "waiting":
        return "Αναμονή";
      case "none":
        return "Κανένα";
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
      case "Telephone":
        return "Τηλέφωνο";
      case "Website":
      case "Site":
        return "Ιστοσελίδα";
      case "Physical":
      case "In Person":
        return "Φυσική παρουσία";
      default:
        return source;
    }
  };

  // Function to truncate text with ellipsis and add indicator
  const truncateText = (text: string, maxLength: number) => {
    if (!text) return '-';
    
    if (text.length <= maxLength) {
      return text;
    }
    
    return (
      <TruncateWithTooltip 
        text={text} 
        maxLength={maxLength} 
        maxWidth={800}
        multiLine={false}
        maxLines={2}
      />
    );
  };

  // Add function to fetch offer history
  const fetchOfferHistory = async (offerId: string) => {
    try {
      setLoadingHistory(prev => ({ ...prev, [offerId]: true }));
      
      const { data, error } = await supabase
        .from('offer_history')
        .select(`
          *,
          user:users!created_by(fullname)
        `)
        .eq('offer_id', offerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setOfferHistory(prev => ({
        ...prev,
        [offerId]: data || []
      }));
    } catch (error) {
      console.error('Error fetching offer history:', error);
    } finally {
      setLoadingHistory(prev => ({ ...prev, [offerId]: false }));
    }
  };

  // Add function to toggle offer expansion
  const toggleOfferExpanded = (offerId: string) => {
    setExpandedOffers(prev => {
      const newState = { ...prev, [offerId]: !prev[offerId] };
      if (newState[offerId] && !offerHistory[offerId]) {
        fetchOfferHistory(offerId);
      }
      return newState;
    });
  };

  // Add function to format history entry
  const formatHistoryEntry = (entry: any) => {
    const timestamp = formatDateTime(entry.created_at);
    const user = entry.user?.fullname || 'Unknown';
    let description = '';

    switch (entry.change_type) {
      case 'created':
        description = 'Δημιουργήθηκε η προσφορά';
        break;
      case 'status_changed':
        description = `Η κατάσταση άλλαξε από "${formatStatus(entry.previous_data?.status)}" σε "${formatStatus(entry.new_data?.status)}"`;
        break;
      case 'amount_changed':
        description = `Το ποσό άλλαξε από "${entry.previous_data?.amount || '-'}" σε "${entry.new_data?.amount || '-'}"`;
        break;
      case 'assigned_changed':
        description = 'Άλλαξε η ανάθεση της προσφοράς';
        break;
      case 'comment_added':
        const comment = entry.comments || '';
        description = `Προστέθηκε σχόλιο: "${comment.length > 30 ? comment.substring(0, 30) + '...' : comment}"`;
        break;
      case 'updated':
        description = 'Ενημερώθηκαν τα στοιχεία της προσφοράς';
        break;
      default:
        description = 'Έγινε αλλαγή στην προσφορά';
    }

    return { timestamp, user, description };
  };

  // Modify the DataTableBase component to include custom row rendering
  const renderCustomRow = (row: any, index: number, defaultRow: React.ReactElement) => {
    const isExpanded = expandedOffers[row.id] || false;
    const history = offerHistory[row.id] || [];
    const isLoading = loadingHistory[row.id] || false;

    return (
      <div key={row.id}>
        {defaultRow}
        {isExpanded && (
          <div className="bg-[#2f3e46] border-t border-b border-[#52796f]">
            <div className="p-4 pl-12">
              <h3 className="text-sm font-semibold text-[#a8c5b5] mb-4">Ιστορικό Προσφοράς</h3>
              
              {isLoading ? (
                <div className="flex justify-center items-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#84a98c]" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-4 text-[#84a98c]">
                  Δεν υπάρχει διαθέσιμο ιστορικό
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((entry) => {
                    const { timestamp, user, description } = formatHistoryEntry(entry);
                    return (
                      <div 
                        key={entry.id}
                        className="flex items-start space-x-3 text-sm"
                      >
                        <div className="w-32 flex-shrink-0 text-[#84a98c]">{timestamp}</div>
                        <div className="w-40 flex-shrink-0 text-[#84a98c]">{user}</div>
                        <div className="flex-1 text-[#cad2c5]">{truncateText(description, 50)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Define columns for the DataTable
  const columns = [
    {
      header: "",
      accessor: "expand",
      width: "40px",
      cell: (value, row) => {
        const isExpanded = expandedOffers[row.id] || false;
        return (
          <div 
            className="flex items-center justify-center w-full h-full"
            onClick={(e) => {
              e.stopPropagation();
              toggleOfferExpanded(row.id);
            }}
          >
            <div className="flex items-center justify-center relative group cursor-pointer hover:bg-[#52796f]/60 rounded-full w-7 h-7 transition-colors duration-200">
              <span className="absolute inset-0 rounded-full bg-[#52796f]/0 group-hover:bg-[#52796f]/30 transition-colors duration-200"></span>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-[#84a98c] group-hover:text-white relative z-10" />
              ) : (
                <ChevronRight className="h-4 w-4 text-[#84a98c] group-hover:text-white relative z-10" />
              )}
            </div>
          </div>
        );
      }
    },
    {
      header: "Ημ/νία Δημιουργίας",
      accessor: "created_at",
      cell: (value) => formatDateTime(value),
      width: "120px"
    },
    {
      header: "Πηγή",
      accessor: "source",
      cell: (value) => formatSource(value),
      width: "120px"
    },
    {
      header: "Απαιτήσεις",
      accessor: "requirements",
      cell: (value) => truncateText(value, 50),
      width: "300px"
    },
    {
      header: "Ποσό",
      accessor: "amount",
      cell: (value) => truncateText(value, 50),
      width: "80px"
    },
    {
      header: "Κατάσταση",
      accessor: "offer_result",
      width: "160px",
      cell: (value) => {
        const statusText = formatStatus(value);
        let statusClass = "";

        switch (value) {
          case "wait_for_our_answer":
            statusClass = "text-yellow-400";
            break;
          case "wait_for_customer_answer":
            statusClass = "text-blue-400";
            break;
          case "ready":
            statusClass = "text-green-400";
            break;
          default:
            statusClass = "text-gray-400";
        }

        return <span className={statusClass}>{statusText}</span>;
      },
    },
    {
      header: "Αποτέλεσμα",
      accessor: "result",
      width: "120px",
      cell: (value) => {
        const resultText = formatResult(value);
        let resultClass = "";

        switch (value) {
          case "success":
            resultClass = "text-green-400";
            break;
          case "failed":
            resultClass = "text-red-400";
            break;
          case "cancel":
            resultClass = "text-yellow-400";
            break;
          case "pending":
            resultClass = "text-blue-400";
            break;
          case "waiting":
            resultClass = "text-purple-400";
            break;
          case "none":
            resultClass = "text-gray-400";
            break;
          default:
            resultClass = "text-gray-400";
        }

        return <span className={resultClass}>{resultText}</span>;
      },
    },
    {
      header: "Ανατέθηκε σε",
      accessor: "assigned_user",
      width: "140px",
      cell: (value) => (value ? value.fullname : "-"),
    },
    {
      header: "Ενέργειες",
      accessor: "id",
      width: "100px",
      cell: (value, row) => (
        <div className="flex items-center justify-center space-x-2">
          <GlobalTooltip content="Επεξεργασία">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleEditOffer(value);
              }}
              className="h-8 w-8 hover:bg-[#354f52] text-[#cad2c5]"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </GlobalTooltip>

          <GlobalTooltip content="Διαγραφή">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick(value);
              }}
              className="h-8 w-8 hover:bg-[#354f52] text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </GlobalTooltip>
        </div>
      ),
    },
  ];

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    refreshData,
    updateOfferInList,
    removeOfferFromList,
    addOfferToList
  }));

  return (
    <div className="w-full h-full flex flex-col p-4">
      <div className="flex justify-center mb-4">
        <SearchBar
          onChange={handleSearch}
          value={searchTerm}
          options={searchColumns}
          selectedColumn={searchColumn}
          onColumnChange={handleColumnChange}
          className="w-2/3"
        />
        <Button
          onClick={handleAddOffer}
          className="bg-transparent hover:bg-[#52796f] text-[#84a98c] hover:text-[#cad2c5] flex items-center gap-2 transition-colors font-normal ml-4"
        >
          <Plus className="h-4 w-4 text-white" />
          Νέα Προσφορά
        </Button>
      </div>

      <DataTableBase
        columns={columns}
        data={filteredOffers}
        isLoading={loading}
        defaultSortColumn="created_at"
        defaultSortDirection="desc"
        searchTerm={searchTerm}
        searchColumn={searchColumn}
        containerClassName="bg-[#354f52] rounded-lg border border-[#52796f] overflow-hidden flex-1"
        rowClassName="hover:bg-[#354f52]/50 group"
        renderRow={renderCustomRow}
      />

      {/* Offer Dialog */}
      <OffersDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        customerId={customerId}
        offerId={selectedOffer || undefined}
        onSave={refreshData}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent aria-describedby="delete-offer-description" aria-labelledby="delete-offer-title">
          <AlertDialogHeader>
            <AlertDialogTitle id="delete-offer-title">Delete Offer</AlertDialogTitle>
            <AlertDialogDescription id="delete-offer-description">
              Are you sure you want to delete this offer? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={handleDeleteOffer}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Διαγραφή
            </AlertDialogAction>
            <AlertDialogCancel className="bg-transparent border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-[#cad2c5]">
              Άκυρο
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

export default OffersTable; 