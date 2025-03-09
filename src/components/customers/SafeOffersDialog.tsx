import React from 'react';
import OffersDialog from './OffersDialog';

interface OffersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  offerId?: string;
  onSave: () => void;
  defaultSource?: string;
}

export default function SafeOffersDialog(props: OffersDialogProps) {
  // Ensure all required props are present
  if (!props || !props.open || !props.onOpenChange || !props.customerId || !props.onSave) {
    console.error("SafeOffersDialog received invalid props", props);
    return null;
  }
  
  // Pass props to the actual OffersDialog
  return <OffersDialog {...props} />;
} 