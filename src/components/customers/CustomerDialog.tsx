import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CustomerForm from "./CustomerForm";
import { CloseButton } from "@/components/ui/close-button";

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
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-[#2f3e46] border-[#52796f] text-[#cad2c5]">
        <DialogHeader className="flex justify-between items-center">
          <DialogTitle className="text-[#cad2c5]">
            {viewOnly
              ? "Προβολή Πελάτη"
              : customerId
                ? "Επεξεργασία Πελάτη"
                : "Νέος Πελάτης"}
          </DialogTitle>
          <CloseButton onClick={onClose} />
        </DialogHeader>

        <CustomerForm
          customerId={customerId}
          viewOnly={viewOnly}
          onSave={() => {
            if (onSave) onSave();
            onClose();
          }}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
