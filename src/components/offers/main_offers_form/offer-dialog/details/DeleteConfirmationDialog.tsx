import React from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AccessibleAlertDialogContent } from "@/components/ui/DialogUtilities";
import { useDetailsContext } from './DetailsContext';

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({ 
  open, 
  onOpenChange,
  onConfirm
}) => {
  return (
    <AlertDialog 
      open={open} 
      onOpenChange={onOpenChange}
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-description"
    >
      <AccessibleAlertDialogContent
        title="Διαγραφή"
        aria-describedby="delete-dialog-description"
      >
        <AlertDialogHeader>
          <AlertDialogTitle id="delete-dialog-title">Διαγραφή</AlertDialogTitle>
          <AlertDialogDescription id="delete-dialog-description">
            Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το στοιχείο;
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex justify-end space-x-2 mt-4">
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Διαγραφή
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-[#cad2c5]"
          >
            Ακύρωση
          </Button>
        </div>
      </AccessibleAlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteConfirmationDialog; 