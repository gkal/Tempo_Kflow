import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import OffersDialog from './OffersDialog';

interface OffersDialogPortalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  offerId?: string;
  onSave: () => void;
  defaultSource?: string;
}

export default function OffersDialogPortal(props: OffersDialogPortalProps) {
  const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);
  
  useEffect(() => {
    // Create a portal element if it doesn't exist
    let element = document.getElementById('offers-dialog-portal');
    if (!element) {
      element = document.createElement('div');
      element.id = 'offers-dialog-portal';
      document.body.appendChild(element);
    }
    
    setPortalElement(element);
    
    return () => {
      // Clean up the portal element when the component unmounts
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
    };
  }, []);
  
  if (!portalElement) {
    return null;
  }
  
  // Render the dialog in the portal
  return ReactDOM.createPortal(
    <OffersDialog {...props} />,
    portalElement
  );
} 