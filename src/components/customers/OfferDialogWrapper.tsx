import React, { useState, useEffect } from 'react';
import OffersDialog from './OffersDialog';

interface OfferDialogWrapperProps {
  isOpen: boolean;
  customerId: string;
  offerId?: string;
  defaultSource?: string;
  onClose: () => void;
  onSave: () => void;
}

export default function OfferDialogWrapper({
  isOpen,
  customerId,
  offerId,
  defaultSource = "Email",
  onClose,
  onSave
}: OfferDialogWrapperProps) {
  // Local state to control the dialog
  const [open, setOpen] = useState(false);
  
  // Sync with parent's isOpen prop
  useEffect(() => {
    setOpen(isOpen);
  }, [isOpen]);
  
  // Handle dialog close
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      onClose();
    }
  };
  
  // Only render the dialog when all required props are available
  if (!isOpen || !customerId) {
    return null;
  }
  
  return (
    <OffersDialog
      open={open}
      onOpenChange={handleOpenChange}
      customerId={customerId}
      offerId={offerId}
      defaultSource={defaultSource}
      onSave={onSave}
    />
  );
} 