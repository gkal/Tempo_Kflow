import React, { createContext, useContext, useRef, useEffect } from 'react';
import DocumentUploadDialog, { DocumentUploadDialogRef } from './DocumentUploadDialog';

// Extend the Window interface to include our custom property
declare global {
  interface Window {
    _globalDialogManager?: GlobalDialogContextType;
  }
}

// Create a context to provide the dialog manager throughout the app
interface GlobalDialogContextType {
  openDocumentUploadDialog: (offerId: string, customerId: string, customerName: string, inOfferDialog?: boolean, onDocumentUploaded?: (() => void) | null) => void;
  closeDocumentUploadDialog: () => void;
}

const GlobalDialogContext = createContext<GlobalDialogContextType | null>(null);

// Create a wrapper component to provide dialog functionality
export const GlobalDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // References to dialog components
  const documentUploadDialogRef = useRef<DocumentUploadDialogRef>(null);

  // Define methods to control dialogs
  const openDocumentUploadDialog = (
    offerId: string, 
    customerId: string, 
    customerName: string, 
    inOfferDialog = false, 
    onDocumentUploaded: (() => void) | null = null
  ) => {
    console.log('GlobalDialogManager: Opening document upload dialog');
    documentUploadDialogRef.current?.openDialog(offerId, customerId, customerName, inOfferDialog, onDocumentUploaded);
  };

  const closeDocumentUploadDialog = () => {
    console.log('GlobalDialogManager: Closing document upload dialog');
    documentUploadDialogRef.current?.closeDialog();
  };

  // Create context value
  const contextValue: GlobalDialogContextType = {
    openDocumentUploadDialog,
    closeDocumentUploadDialog,
  };

  // Set the global instance when the component is mounted
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window._globalDialogManager = contextValue;
      globalManagerInstance = contextValue;
    }
    
    return () => {
      // Clean up on unmount (although this provider should never unmount)
      if (typeof window !== 'undefined' && window._globalDialogManager === contextValue) {
        // Don't clear if it's been replaced
        // window._globalDialogManager = undefined;
      }
    };
  }, [contextValue]);

  return (
    <GlobalDialogContext.Provider value={contextValue}>
      {children}
      <DocumentUploadDialog ref={documentUploadDialogRef} />
    </GlobalDialogContext.Provider>
  );
};

// Hook to use the dialog manager
export const useGlobalDialogs = () => {
  const context = useContext(GlobalDialogContext);
  if (!context) {
    throw new Error('useGlobalDialogs must be used within a GlobalDialogProvider');
  }
  return context;
};

// Direct access for imperative usage outside of React components
let globalManagerInstance: GlobalDialogContextType | null = null;

export const getGlobalDialogManager = (): GlobalDialogContextType => {
  if (!globalManagerInstance) {
    // Create a default implementation for non-React contexts
    globalManagerInstance = {
      openDocumentUploadDialog: (
        offerId: string, 
        customerId: string, 
        customerName: string, 
        inOfferDialog = false, 
        onDocumentUploaded: (() => void) | null = null
      ) => {
        console.warn('Global dialog manager not initialized yet, but openDocumentUploadDialog called with:', 
          { offerId, customerId, customerName, inOfferDialog });
        
        // Schedule an attempt to use it once available
        setTimeout(() => {
          if (typeof window !== 'undefined' && window._globalDialogManager) {
            window._globalDialogManager.openDocumentUploadDialog(
              offerId, 
              customerId, 
              customerName, 
              inOfferDialog, 
              onDocumentUploaded
            );
          }
        }, 100);
      },
      
      closeDocumentUploadDialog: () => {
        console.warn('Global dialog manager not initialized yet, but closeDocumentUploadDialog called');
        
        // Schedule an attempt to use it once available
        setTimeout(() => {
          if (typeof window !== 'undefined' && window._globalDialogManager) {
            window._globalDialogManager.closeDocumentUploadDialog();
          }
        }, 100);
      }
    };
  }
  
  return globalManagerInstance;
};

// Export functions to be used in non-React code (like global event handlers)
export const openDocumentUploadDialog = (
  offerId: string, 
  customerId: string, 
  customerName: string, 
  inOfferDialog = false, 
  onDocumentUploaded: (() => void) | null = null
) => {
  getGlobalDialogManager().openDocumentUploadDialog(
    offerId, 
    customerId, 
    customerName, 
    inOfferDialog, 
    onDocumentUploaded
  );
};

export const closeDocumentUploadDialog = () => {
  getGlobalDialogManager().closeDocumentUploadDialog();
};

// Global initialization
if (typeof window !== 'undefined') {
  // Create global access point
  window._globalDialogManager = getGlobalDialogManager();
}

export default GlobalDialogProvider; 