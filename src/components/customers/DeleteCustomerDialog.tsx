import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useFormRegistration } from '@/lib/FormContext';

interface DeleteCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDelete: () => void;
  customerName?: string;
}

export default function DeleteCustomerDialog({
  open,
  onOpenChange,
  onConfirmDelete,
  customerName = "this customer"
}: DeleteCustomerDialogProps) {
  // Register this form when it's open
  useFormRegistration(
    `Διαγραφή Πελάτη: ${customerName}`, 
    open
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Customer</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {customerName}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="mt-4 flex justify-end space-x-2">
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              onConfirmDelete();
              onOpenChange(false);
            }}
          >
            Delete
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 