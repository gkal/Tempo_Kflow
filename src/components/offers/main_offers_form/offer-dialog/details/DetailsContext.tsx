import React, { createContext, useState, useCallback, useContext } from 'react';
import { 
  OfferDetail, 
  ServiceCategory, 
  ServiceSubcategory, 
  MeasurementUnit 
} from '@/types/offer-details';
import { OfferDialogContext } from '../OfferDialogContext';

export interface DetailsContextType {
  // Data states
  details: OfferDetail[];
  setDetails: React.Dispatch<React.SetStateAction<OfferDetail[]>>;
  selectedDetails: OfferDetail[];
  setSelectedDetails: React.Dispatch<React.SetStateAction<OfferDetail[]>>;
  categories: ServiceCategory[];
  setCategories: React.Dispatch<React.SetStateAction<ServiceCategory[]>>;
  subcategories: ServiceSubcategory[];
  setSubcategories: React.Dispatch<React.SetStateAction<ServiceSubcategory[]>>;
  units: MeasurementUnit[];
  setUnits: React.Dispatch<React.SetStateAction<MeasurementUnit[]>>;
  
  // UI states
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  dialogLoading: boolean;
  setDialogLoading: React.Dispatch<React.SetStateAction<boolean>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  formValidationError: string;
  setFormValidationError: React.Dispatch<React.SetStateAction<string>>;
  markedForDeletion: Set<string>;
  setMarkedForDeletion: React.Dispatch<React.SetStateAction<Set<string>>>;
  
  // Dialog states
  showSelectionDialog: boolean;
  setShowSelectionDialog: React.Dispatch<React.SetStateAction<boolean>>;
  showDeleteDialog: boolean;
  setShowDeleteDialog: React.Dispatch<React.SetStateAction<boolean>>;
  confirmingSelection: boolean;
  setConfirmingSelection: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Selection states
  selectedItems: {
    categoryId: string;
    subcategoryId: string;
    subcategoryName: string;
    unitId: string;
    price: number;
  }[];
  setSelectedItems: React.Dispatch<React.SetStateAction<{
    categoryId: string;
    subcategoryId: string;
    subcategoryName: string;
    unitId: string;
    price: number;
  }[]>>;
  currentCategoryId: string | null;
  setCurrentCategoryId: React.Dispatch<React.SetStateAction<string | null>>;
  detailToDelete: OfferDetail | null;
  setDetailToDelete: React.Dispatch<React.SetStateAction<OfferDetail | null>>;
  
  // Functions
  resetState: () => void;
  handleDeleteMarked: () => Promise<void>;
  handleUnitChange: (detailId: string, unitId: string, isUIOnly: boolean) => Promise<void>;
  handlePriceChange: (detailId: string, price: number, isUIOnly: boolean) => Promise<void>;
  handleDialogOpenChange: (open: boolean) => void;
  cleanupDialogPortals: () => void;
  handleSelectionConfirm: () => Promise<void>;
  
  // Utility functions
  truncateText: (text: string, maxLength?: number) => React.ReactNode;
  renderCategoryOption: (id: string) => React.ReactNode;
  renderSubcategoryOption: (id: string) => React.ReactNode;
  renderUnitOption: (id: string) => string;
  getFullCategoryName: (id: string) => string;
  getFullSubcategoryName: (id: string) => string;
  getFullUnitName: (id: string) => string;
  
  // Refs
  tooltipMountedRef: React.RefObject<boolean>;
  instanceIdRef: React.RefObject<string>;
}

export const DetailsContext = createContext<DetailsContextType | null>(null);

export const useDetailsContext = () => {
  const context = useContext(DetailsContext);
  if (!context) {
    throw new Error('useDetailsContext must be used within a DetailsContextProvider');
  }
  return context;
};

// Register global window function for offer details save functions
declare global {
  interface Window {
    offerDetailsSaveFunctions: {
      [key: string]: ((realOfferId: string) => Promise<boolean>) | null;
    };
    _lastSaveDetailsFn: ((realOfferId: string) => Promise<boolean>) | null;
    _updateSaveDetailsFnBackup: (fn: ((realOfferId: string) => Promise<boolean>) | null) => boolean;
    _getSaveDetailsFnBackup: () => ((realOfferId: string) => Promise<boolean>) | null;
  }
}

// Create a global registry to persist the save function across tab switches
if (typeof window !== 'undefined') {
  // Initialize the global registry if it doesn't exist
  if (!window.offerDetailsSaveFunctions) {
    window.offerDetailsSaveFunctions = {};
  }
  
  // Initialize backup mechanism if it doesn't exist
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