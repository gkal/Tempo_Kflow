import React, { useState, useEffect } from 'react';

// Create a singleton instance
let dialogInstance = null;
let isLoading = false;
let loadPromise = null;

// Create a function to get the singleton instance
export function getOffersDialogInstance() {
  if (!dialogInstance && !isLoading) {
    isLoading = true;
    // Use a promise to track the loading state
    loadPromise = import('./OffersDialog').then(module => {
      dialogInstance = module.default;
      console.log("OffersDialog singleton instance created");
      return module.default;
    });
  }
  return loadPromise;
}

// Create a wrapper component that uses the singleton instance
interface OffersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  offerId?: string;
  onSave: () => void;
  defaultSource?: string;
}

export default function SingletonOffersDialog(props: OffersDialogProps) {
  const [Dialog, setDialog] = useState(null);
  
  // Load the dialog instance if it's not already loaded
  useEffect(() => {
    let isMounted = true;
    
    if (!Dialog) {
      getOffersDialogInstance().then(component => {
        if (isMounted) {
          setDialog(component);
        }
      });
    }
    
    return () => {
      isMounted = false;
    };
  }, [Dialog]);
  
  // Don't render anything if the dialog instance isn't loaded yet
  if (!Dialog) {
    return null;
  }
  
  // Render the dialog instance with the provided props
  return <Dialog {...props} />;
} 