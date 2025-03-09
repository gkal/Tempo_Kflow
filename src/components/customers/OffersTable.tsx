import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DataTableBase } from "@/components/ui/data-table-base";
import { SearchBar } from "@/components/ui/search-bar";
import { CloseButton } from "@/components/ui/close-button";
import { Plus, Edit, Trash2 } from "lucide-react";
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

interface OffersTableProps {
  customerId: string;
  onClose: () => void;
}

export default function OffersTable({
  customerId,
  onClose,
}: OffersTableProps) {
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
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOffers(data || []);
      setFilteredOffers(data || []);
    } catch (error) {
      console.error("Error fetching offers:", error);
      toast({
        title: "Σφάλμα",
        description: "Δεν ήταν δυνατή η φόρτωση των προσφορών.",
        variant: "destructive",
      });
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
    if (!offerToDelete) return;

    try {
      const { error } = await supabase
        .from("offers")
        .delete()
        .eq("id", offerToDelete);

      if (error) throw error;

      toast({
        title: "Επιτυχής διαγραφή",
        description: "Η προσφορά διαγράφηκε με επιτυχία.",
      });

      // Refresh data
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Error deleting offer:", error);
      toast({
        title: "Σφάλμα",
        description: "Δεν ήταν δυνατή η διαγραφή της προσφοράς.",
        variant: "destructive",
      });
    } finally {
      setShowDeleteDialog(false);
      setOfferToDelete(null);
    }
  };

  const refreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
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
    if (!text) return "-";
    if (text.length <= maxLength) return text;
    
    return (
      <div className="flex items-center">
        <span className="truncate max-w-[300px] inline-block">
          {text.substring(0, maxLength)}
        </span>
        <span className="text-blue-400 ml-1 flex-shrink-0" title="Περισσότερο κείμενο">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="19" cy="12" r="1"></circle>
            <circle cx="5" cy="12" r="1"></circle>
          </svg>
        </span>
      </div>
    );
  };

  // Define columns for the DataTable
  const columns = [
    {
      header: "Ημ/νία Δημιουργίας",
      accessor: "created_at",
      cell: (value) => formatDateTime(value),
      width: "140px"
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
      cell: (value) => value || "-",
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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
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
              </TooltipTrigger>
              <TooltipContent>
                <p>Επεξεργασία</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
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
              </TooltipTrigger>
              <TooltipContent>
                <p>Διαγραφή</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
    },
  ];

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
          className="bg-[#52796f] hover:bg-[#52796f]/90 text-[#cad2c5] ml-4"
        >
          <Plus className="h-4 w-4 mr-2" />
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
        rowClassName="hover:bg-[#354f52]/50 cursor-pointer group"
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
        <AlertDialogContent aria-describedby="delete-offer-description">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Offer</AlertDialogTitle>
            <AlertDialogDescription id="delete-offer-description">
              Are you sure you want to delete this offer? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-[#cad2c5]">
              Άκυρο
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOffer}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Διαγραφή
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 