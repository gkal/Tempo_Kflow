import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import CustomerForm from "./CustomerForm";
import { CloseButton } from "@/components/ui/close-button";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface CustomerDialogProps {
  open: boolean;
  onClose: () => void;
  customerId?: string;
  viewOnly?: boolean;
  onSave?: () => void;
}

export default function CustomerDialog({
  open,
  onClose,
  customerId,
  viewOnly = false,
  onSave,
}: CustomerDialogProps) {
  const handleSave = () => {
    onClose();
    if (onSave) {
      onSave();
    }
  };

  const { user } = useAuth();
  const isAdminOrSuperUser = (user as any)?.user_metadata?.role === 'admin' || 
                            (user as any)?.user_metadata?.role === 'super_user';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl bg-[#2f3e46] border-[#52796f] text-[#cad2c5]"
        aria-describedby="customer-dialog-description"
      >
        <DialogHeader>
          <DialogTitle className="text-[#cad2c5]">
            {viewOnly
              ? "Προβολή Πελάτη"
              : customerId
                ? "Επεξεργασία Πελάτη"
                : "Νέος Πελάτης"}
          </DialogTitle>
          <DialogDescription id="customer-dialog-description" className="sr-only">
            {viewOnly
              ? "Φόρμα προβολής πελάτη"
              : customerId
                ? "Φόρμα επεξεργασίας πελάτη"
                : "Φόρμα δημιουργίας νέου πελάτη"}
          </DialogDescription>
        </DialogHeader>

        <CustomerForm
          customerId={customerId}
          viewOnly={viewOnly}
          onSave={handleSave}
          onCancel={onClose}
        />

        <DeleteConfirmation
          isOpen={false}
          onClose={() => {}}
          onConfirm={() => {}}
          isDeleting={false}
        />
      </DialogContent>
    </Dialog>
  );
}

const DeleteConfirmation = ({ isOpen, onClose, onConfirm, isDeleting }) => {
  const { user } = useAuth();
  const canDelete = (user as any)?.user_metadata?.role === 'admin' || 
                   (user as any)?.user_metadata?.role === 'super_user';
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="bg-[#3a5258] border border-[#52796f] text-[#cad2c5] p-6 max-w-md mx-auto"
        aria-describedby="delete-confirmation-dialog-description"
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#cad2c5]">
            {canDelete ? "Οριστική Διαγραφή" : "Απενεργοποίηση Πελάτη"}
          </DialogTitle>
          <DialogDescription id="delete-confirmation-dialog-description" className="sr-only">
            Διάλογος επιβεβαίωσης διαγραφής πελάτη
          </DialogDescription>
          <DialogDescription className="text-[#a8c5b5] mt-2">
            {canDelete 
              ? "Είστε βέβαιοι ότι θέλετε να διαγράψετε οριστικά αυτόν τον πελάτη και όλες τις επαφές του; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί."
              : "Είστε βέβαιοι ότι θέλετε να απενεργοποιήσετε αυτόν τον πελάτη; Ο πελάτης θα παραμείνει στη βάση δεδομένων αλλά δεν θα εμφανίζεται στις αναζητήσεις."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end space-x-4 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-transparent border border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-[#cad2c5]"
          >
            Άκυρο
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {canDelete ? "Διαγραφή..." : "Απενεργοποίηση..."}
              </>
            ) : (
              canDelete ? "Διαγραφή" : "Απενεργοποίηση"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
