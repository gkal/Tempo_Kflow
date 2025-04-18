import React from 'react';
import { ModernDeleteConfirmation } from '@/components/ui/ModernDeleteConfirmation';
import { supabase } from '@/lib/supabaseClient';
import { Customer } from '@/types/customer.types';

interface DeleteCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onSuccess: () => void;
}

export const DeleteCustomerDialog: React.FC<DeleteCustomerDialogProps> = ({
  open,
  onOpenChange,
  customer,
  onSuccess
}) => {
  return (
    <ModernDeleteConfirmation
      open={open}
      onOpenChange={onOpenChange}
      title="Διαγραφή Πελάτη"
      description="Είστε βέβαιοι ότι θέλετε να διαγράψετε αυτόν τον πελάτη και όλες τις προσφορές του; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί."
      successMessage="Ο πελάτης διαγράφηκε επιτυχώς!"
      errorMessage="Δεν ήταν δυνατή η διαγραφή του πελάτη"
      deleteButtonLabel="Διαγραφή"
      cancelButtonLabel="Ακύρωση"
      destructive={true}
      size="lg"
      onDelete={async () => {
        if (!customer) return;
        
        try {
          console.log(`🔵 Deleting customer ${customer.id}`);
          
          // Soft delete the customer by setting deleted_at
          const { error } = await supabase
            .from('customers')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', customer.id);
          
          if (error) throw error;
          
          // No direct UI updates - real-time events will handle it
          console.log(`🔵 Delete request sent, waiting for real-time update`);
          
        } catch (error) {
          console.error("Error deleting customer:", error);
          throw error; // Rethrow to show error in dialog
        }
      }}
      onSuccess={onSuccess}
    />
  );
}; 
