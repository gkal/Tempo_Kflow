import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { OffersTable } from "./OffersTable";
import { StatusFilter } from "./StatusFilter";
import { ResultFilter } from "./ResultFilter";
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
import { openNewOfferDialog, openEditOfferDialog } from '../../customers/OfferDialogManager';

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
}

export default function ImprovedOffersPage() {
  const { user } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [filteredOffers, setFilteredOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [expandedOffers, setExpandedOffers] = useState<Record<string, boolean>>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<string | null>(null);
  
  // Error dialog state
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorTitle, setErrorTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  
  // Check if user is admin or super user
  const isAdminOrSuperUser = user?.role === "Admin" || user?.role === "Super User";

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
      
      // Build the query
      let query = supabase
        .from("offers")
        .select(`
          *,
          assigned_user:users!assigned_to(fullname),
          created_user:users!created_by(fullname),
          customer:customers(id, company_name)
        `);
      
      // Apply status filter if not "all"
      if (statusFilter !== "all") {
        query = query.eq("offer_result", statusFilter);
      }
      
      // Apply result filter if not "all"
      if (resultFilter !== "all") {
        query = query.eq("result", resultFilter);
      }
      
      // Execute the query
      const { data, error } = await query.order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Process the data
      const offersWithData = data || [];
      
      setOffers(offersWithData);
      applySearchFilter(offersWithData, searchTerm);
      
    } catch (error) {
      console.error("Error fetching offers:", error);
      showError("Σφάλμα", "Δεν ήταν δυνατή η φόρτωση των προσφορών");
    } finally {
      setLoading(false);
    }
  };

  // Apply search filter
  const applySearchFilter = (offersData: Offer[], term: string) => {
    if (!term) {
      setFilteredOffers(offersData);
      return;
    }
    
    const lowerTerm = term.toLowerCase();
    
    const filtered = offersData.filter(offer => {
      // Search in requirements
      if (offer.requirements && offer.requirements.toLowerCase().includes(lowerTerm)) {
        return true;
      }
      
      // Search in amount
      if (offer.amount && offer.amount.toLowerCase().includes(lowerTerm)) {
        return true;
      }
      
      // Search in customer name
      if (offer.customer && offer.customer[0]?.company_name && 
          offer.customer[0].company_name.toLowerCase().includes(lowerTerm)) {
        return true;
      }
      
      return false;
    });
    
    setFilteredOffers(filtered);
  };

  // Handle search
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    applySearchFilter(offers, value);
  };

  // Toggle expanded state for an offer
  const toggleOfferExpanded = (offerId: string) => {
    setExpandedOffers(prev => ({
      ...prev,
      [offerId]: !prev[offerId]
    }));
  };

  // Handle edit offer
  const handleEditOffer = (offerId: string) => {
    const offer = offers.find(o => o.id === offerId);
    if (offer) {
      openEditOfferDialog(offer.customer_id, offerId, () => {
        setRefreshTrigger(prev => prev + 1);
      });
    }
  };

  // Handle delete click
  const handleDeleteClick = (offerId: string) => {
    setOfferToDelete(offerId);
    setShowDeleteDialog(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!offerToDelete) return;
    
    try {
      const { error } = await supabase
        .from("offers")
        .delete()
        .eq("id", offerToDelete);
      
      if (error) throw error;
      
      showError("Επιτυχία", "Η προσφορά διαγράφηκε επιτυχώς");
      
      // Remove from state
      setOffers(prev => prev.filter(offer => offer.id !== offerToDelete));
      setFilteredOffers(prev => prev.filter(offer => offer.id !== offerToDelete));
      
    } catch (error) {
      console.error("Error deleting offer:", error);
      showError("Σφάλμα", "Δεν ήταν δυνατή η διαγραφή της προσφοράς");
    } finally {
      setShowDeleteDialog(false);
      setOfferToDelete(null);
    }
  };

  // Handle create new offer
  const handleCreateOffer = () => {
    openNewOfferDialog("", "Email", () => {
      setRefreshTrigger(prev => prev + 1);
    });
  };

  // Handle status filter change
  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    setRefreshTrigger(prev => prev + 1);
  };

  // Handle result filter change
  const handleResultChange = (result: string) => {
    setResultFilter(result);
    setRefreshTrigger(prev => prev + 1);
  };

  // Fetch offers when component mounts or filters change
  useEffect(() => {
    if (user) {
      fetchOffers();
    }
  }, [user, refreshTrigger]);

  return (
    <div className="p-4">
      <div className="mb-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-[#cad2c5]">
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
        
        <div className="flex flex-col space-y-3 mb-4">
          <StatusFilter 
            statusFilter={statusFilter} 
            onStatusChange={handleStatusChange} 
          />
          
          <ResultFilter 
            resultFilter={resultFilter} 
            onResultChange={handleResultChange} 
          />
        </div>
      </div>
      
      <OffersTable
        offers={filteredOffers}
        expandedOffers={expandedOffers}
        onToggleExpand={toggleOfferExpanded}
        onEditClick={handleEditOffer}
        onDeleteClick={handleDeleteClick}
        isAdminOrSuperUser={isAdminOrSuperUser}
        isLoading={loading}
        searchTerm={searchTerm}
        onSearchChange={handleSearch}
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