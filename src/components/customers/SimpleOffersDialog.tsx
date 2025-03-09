import React, { useState, useEffect } from 'react';
import OffersDialog from './OffersDialog';

// Define the props interface
interface SimpleOffersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  offerId?: string;
  onSave: () => void;
  defaultSource?: string;
}

// Create a simple wrapper component
export default function SimpleOffersDialog(props) {
  // Don't render anything if the required props aren't provided
  if (!props || !props.open || !props.customerId) {
    return null;
  }
  
  return <OffersDialog {...props} />;
} 