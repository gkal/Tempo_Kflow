import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface NewCustomerDialogProps {
  open: boolean;
  onClose: () => void;
  // Add any other props you need
}

const NewCustomerDialog: React.FC<NewCustomerDialogProps> = ({ open, onClose, ...props }) => {
  // Ensure the description ID is unique and matches
  const descriptionId = "new-customer-dialog-description";
  const titleId = "new-customer-dialog-title";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl bg-[#2f3e46] border-[#52796f] text-[#cad2c5]"
        aria-describedby={descriptionId} // Ensure this is set
        aria-labelledby={titleId} // Ensure this is set
      >
        <DialogHeader>
          <DialogTitle id={titleId} className="text-[#cad2c5]">
            Νέος Πελάτης
          </DialogTitle>
          <DialogDescription id={descriptionId}> {/* Ensure this ID matches */}
            Συμπληρώστε τα παρακάτω πεδία για να δημιουργήσετε έναν νέο πελάτη.
          </DialogDescription>
        </DialogHeader>
        {/* Rest of the dialog content */}
      </DialogContent>
    </Dialog>
  );
};

export default NewCustomerDialog; 