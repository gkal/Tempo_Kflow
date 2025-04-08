/**
 * CustomerActionsHandler component
 * Extracted from CustomersPage.tsx to improve modularity
 * Handles dialog operations for customer actions (delete offer, delete customer)
 */

import React from "react";
import { Customer, CustomerOffer } from "./types/interfaces";
import { ModernDeleteConfirmation } from '@/components/ui/ModernDeleteConfirmation';
import { supabase } from "@/lib/supabaseClient";

interface CustomerActionsHandlerProps {
  // Delete offer props
  showDeleteOfferDialog: boolean;
  setShowDeleteOfferDialog: React.Dispatch<React.SetStateAction<boolean>>;
  offerToDelete: string | null;
  customerIdForDelete: string | null;
  setOfferToDelete: React.Dispatch<React.SetStateAction<string | null>>;
  setCustomerIdForDelete: React.Dispatch<React.SetStateAction<string | null>>;
  
  // Delete customer props
  showDeleteCustomerDialog: boolean;
  setShowDeleteCustomerDialog: React.Dispatch<React.SetStateAction<boolean>>;
  customerToDelete: Customer | null;
  setCustomerToDelete: React.Dispatch<React.SetStateAction<Customer | null>>;
  
  // Component state
  expandedCustomerIds: Record<string, boolean>;
  setExpandedCustomerIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  customerOffers: Record<string, CustomerOffer[]>;
  setCustomerOffers: React.Dispatch<React.SetStateAction<Record<string, CustomerOffer[]>>>;
}

export const CustomerActionsHandler: React.FC<CustomerActionsHandlerProps> = ({
  // Delete offer props
  showDeleteOfferDialog,
  setShowDeleteOfferDialog,
  offerToDelete,
  customerIdForDelete,
  setOfferToDelete,
  setCustomerIdForDelete,
  
  // Delete customer props
  showDeleteCustomerDialog,
  setShowDeleteCustomerDialog,
  customerToDelete,
  setCustomerToDelete,
  
  // Component state
  expandedCustomerIds,
  setExpandedCustomerIds,
  customers,
  setCustomers,
  customerOffers,
  setCustomerOffers
}) => {
  return (
    <>
      {/* Delete Offer Confirmation Dialog */}
      <ModernDeleteConfirmation
        open={showDeleteOfferDialog}
        onOpenChange={setShowDeleteOfferDialog}
        title="Διαγραφή Προσφοράς"
        description="Είστε βέβαιοι ότι θέλετε να διαγράψετε αυτή την προσφορά και τις λεπτομέρειές της; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί."
        itemToDelete={offerToDelete || ""}
        successMessage="Η προσφορά διαγράφηκε επιτυχώς!"
        errorMessage="Δεν ήταν δυνατή η διαγραφή της προσφοράς"
        deleteButtonLabel="Διαγραφή"
        cancelButtonLabel="Ακύρωση"
        destructive={true}
        onDelete={async () => {
          if (!offerToDelete || !customerIdForDelete) return;
          
          try {
            console.log(`🔴 [ACTION] Deleting offer ${offerToDelete} for customer ${customerIdForDelete}`);
            
            // REAL-TIME APPROACH: Only send the delete request to the server,
            // let the real-time subscription handle the UI update
            const { error } = await supabase
              .from('offers')
              .update({ deleted_at: new Date().toISOString() })
              .eq('id', offerToDelete);
            
            if (error) throw error;
            
            // No direct UI updates - real-time events will handle it
            console.log(`🔴 [ACTION] Delete request sent, waiting for real-time update`);
            
          } catch (error) {
            console.error("[RT-ERROR] Error deleting offer:", error);
            throw error; // Rethrow to show error in dialog
          }
        }}
        onSuccess={() => {
          // Reset state after successful deletion
          setOfferToDelete(null);
          setCustomerIdForDelete(null);
        }}
      />

      {/* Delete Customer Confirmation Dialog */}
      <ModernDeleteConfirmation
        open={showDeleteCustomerDialog}
        onOpenChange={setShowDeleteCustomerDialog}
        title="Διαγραφή Πελάτη"
        description="Είστε βέβαιοι ότι θέλετε να διαγράψετε αυτόν τον πελάτη και όλες τις προσφορές του; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί."
        itemToDelete={customerToDelete?.company_name || ""}
        successMessage="Ο πελάτης διαγράφηκε επιτυχώς!"
        errorMessage="Δεν ήταν δυνατή η διαγραφή του πελάτη"
        deleteButtonLabel="Διαγραφή"
        cancelButtonLabel="Ακύρωση"
        destructive={true}
        size="lg"
        onDelete={async () => {
          if (!customerToDelete) return;
          
          try {
            console.log(`🔵 Deleting customer ${customerToDelete.id}`);
            
            // Soft delete the customer by setting deleted_at
            const { error } = await supabase
              .from('customers')
              .update({ deleted_at: new Date().toISOString() })
              .eq('id', customerToDelete.id);
            
            if (error) throw error;
            
            // Update local state to remove the customer from the UI
            setCustomers(prev => prev.filter(c => c.id !== customerToDelete.id));
            
            // Remove from expandedCustomerIds if expanded
            if (expandedCustomerIds[customerToDelete.id]) {
              setExpandedCustomerIds(prev => {
                const updated = { ...prev };
                delete updated[customerToDelete.id];
                return updated;
              });
            }
            
            // Remove from customerOffers
            setCustomerOffers(prev => {
              const updated = { ...prev };
              delete updated[customerToDelete.id];
              return updated;
            });
          } catch (error) {
            console.error("Error deleting customer:", error);
            throw error; // Rethrow to show error in dialog
          }
        }}
        onSuccess={() => {
          // Reset state after successful deletion
          setCustomerToDelete(null);
        }}
      />
    </>
  );
}; 