import React, { createContext, useContext } from 'react';
import { UseFormRegister, UseFormReset, UseFormSetValue, UseFormWatch, FormState, UseFormHandleSubmit, Control } from 'react-hook-form';

// Define the form values type
export interface OfferFormValues {
  customer_id: string;
  created_at?: string;
  source?: string;
  amount?: string;
  requirements?: string;
  customer_comments?: string;
  our_comments?: string;
  offer_result?: string;
  result?: string;
  assigned_to?: string;
  hma?: boolean;
  certificate?: string;
  address?: string;
  postal_code?: string;
  town?: string;
  status?: string;
  progress?: number;
}

// Define the database offer type
export interface DatabaseOffer {
  id: string;
  customer_id: string;
  requirements: string;
  amount: string;  // Changed from number to string
  offer_result: string;
  result: string;
  created_at: string;
  updated_at: string;
  assigned_to: string;
  source: string;
  customer_comments: string;
  our_comments: string;
  created_by: string;
  updated_by: string;
  contact_id: string | null;
  deleted_at: string;
  hma: boolean;
  certificate: string;
  address: string;
  tk: string;
  town: string;
  status: string;
}

// Export the props interface so it can be imported by other files
export interface OffersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  offerId?: string;
  onSave?: (data?: any) => void;
  defaultSource?: string;
  tableRef?: React.RefObject<any>; // Use the proper type instead of any if available
}

// Create a context to share state between components
export interface OfferDialogContextType {
  offerId: string | null;
  customerId: string;
  customerName?: string;
  register: UseFormRegister<OfferFormValues>;
  watch: UseFormWatch<OfferFormValues>;
  setValue: UseFormSetValue<OfferFormValues>;
  control: Control<OfferFormValues>;
  formState: FormState<OfferFormValues>;
  handleSubmit: UseFormHandleSubmit<OfferFormValues>;
  reset: UseFormReset<OfferFormValues>;
  sourceOptions: any[];
  getSourceLabel: (val: any) => string;
  getSourceValue: (val: any) => any;
  statusOptions: any[];
  getStatusLabel: (val: any) => string;
  getStatusValue: (val: any) => any;
  resultOptions: any[];
  getResultLabel: (val: any) => string;
  getResultValue: (val: any) => any;
  userOptions: string[];
  getUserNameById: (id: string) => string;
  getUserIdByName: (name: string) => string;
  registerSaveDetailsToDatabase?: (saveFn: ((realOfferId: string) => Promise<boolean>) | null) => void;
  registerTabReset?: (tabId: string, resetFn: () => void) => void;
  unregisterTabReset?: (tabId: string) => void;
  registerDeletedDetails?: (detailIds: string | string[] | number | number[]) => void;
}

export const OfferDialogContext = createContext<OfferDialogContextType | null>(null);

// Define TypeScript interface for window extension
declare global {
  interface Window {
    offerDetailsSaveFunctions: {
      [key: string]: ((realOfferId: string) => Promise<boolean>) | null;
    };
    _lastSaveDetailsFn: ((realOfferId: string) => Promise<boolean>) | null;
    _updateSaveDetailsFnBackup: (fn: ((realOfferId: string) => Promise<boolean>) | null) => boolean;
    _getSaveDetailsFnBackup: () => ((realOfferId: string) => Promise<boolean>) | null;
    _supabaseTabId?: string;
  }
}

// Create a singleton backup for the save function that persists across rerenders
if (typeof window !== 'undefined') {
  // Initialize backup mechanism
  if (!window._lastSaveDetailsFn) {
    window._lastSaveDetailsFn = null;
  }
  
  // Add a small utility function to update the backup
  if (!window._updateSaveDetailsFnBackup) {
    window._updateSaveDetailsFnBackup = (fn) => {
      if (fn && typeof fn === 'function') {
        window._lastSaveDetailsFn = fn;
        return true;
      }
      return false;
    };
  }
  
  // Add a way to retrieve the backup
  if (!window._getSaveDetailsFnBackup) {
    window._getSaveDetailsFnBackup = () => {
      return window._lastSaveDetailsFn;
    };
  }
}

// TEMPORARY FIX: Define a hardcoded admin ID as fallback
export const ADMIN_USER_ID = '3fbf35f7-5730-47d5-b9d2-f742b24c9d26';

export const useOfferDialog = () => {
  const context = useContext(OfferDialogContext);
  if (!context) {
    throw new Error('useOfferDialog must be used within an OfferDialogProvider');
  }
  return context;
}; 