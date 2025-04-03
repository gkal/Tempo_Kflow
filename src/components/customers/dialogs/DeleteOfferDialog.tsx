import React from 'react';
import { ModernDeleteConfirmation } from '@/components/ui/ModernDeleteConfirmation';
import { supabase } from '@/lib/supabaseClient';

interface DeleteOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offerId: string | null;
  customerId: string | null;
  onSuccess: () => void;
}

export const DeleteOfferDialog: React.FC<DeleteOfferDialogProps> = ({
  open,
  onOpenChange,
  offerId,
  customerId,
  onSuccess
}) => {
  return (
    <ModernDeleteConfirmation
      open={open}
      onOpenChange={onOpenChange}
      title="Διαγραφή Προσφοράς"
      description="Είστε βέβαιοι ότι θέλετε να διαγράψετε αυτή την προσφορά και τις λεπτομέρειές της; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί."
      successMessage="Η προσφορά διαγράφηκε επιτυχώς!"
      errorMessage="Δεν ήταν δυνατή η διαγραφή της προσφοράς"
      deleteButtonLabel="Διαγραφή"
      cancelButtonLabel="Ακύρωση"
      destructive={true}
      onDelete={async () => {
        if (!offerId || !customerId) return;
        
        try {
          console.log(`🔴 [ACTION] Deleting offer ${offerId} for customer ${customerId}`);
          
          // REAL-TIME APPROACH: Only send the delete request to the server,
          // let the real-time subscription handle the UI update
          const { error } = await supabase
            .from('offers')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', offerId);
          
          if (error) throw error;
          
          // No direct UI updates - real-time events will handle it
          console.log(`🔴 [ACTION] Delete request sent, waiting for real-time update`);
          
        } catch (error) {
          console.error("[RT-ERROR] Error deleting offer:", error);
          throw error; // Rethrow to show error in dialog
        }
      }}
      onSuccess={onSuccess}
    />
  );
}; 