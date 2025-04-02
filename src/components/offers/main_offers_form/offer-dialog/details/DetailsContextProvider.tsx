import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { DetailsContext } from './DetailsContext';
import { OfferDialogContext } from '../OfferDialogContext';
import { useAuth } from '@/lib/AuthContext';
import { 
  fetchOfferDetails, 
  deleteOfferDetail, 
  addOfferDetail, 
  updateOfferDetail, 
  fetchServiceCategories, 
  fetchSubcategories, 
  fetchMeasurementUnits,
  preloadCategoriesAndUnits
} from './DetailsService';
import { 
  OfferDetail, 
  ServiceCategory, 
  ServiceSubcategory, 
  MeasurementUnit 
} from '@/types/offer-details';
import { v4 as uuidv4 } from 'uuid';
import { TooltipProvider } from '@/components/ui/tooltip';

interface DetailsContextProviderProps {
  children: React.ReactNode;
}

export const DetailsContextProvider: React.FC<DetailsContextProviderProps> = ({ children }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const offerDialogContext = useContext(OfferDialogContext);
  
  if (!offerDialogContext) {
    throw new Error('DetailsContextProvider must be used within an OfferDialogContext');
  }
  
  const { 
    offerId: dialogId, 
    customerId: dialogCustomerId, 
    registerSaveDetailsToDatabase: registerSaveDetails,
    registerTabReset
  } = offerDialogContext;
  
  // Get the current tab from URL or state
  const currentTab = 'details'; // Simplified for now
  const dialogOpen = true; // Simplified for now
  
  // References
  const tooltipMountedRef = useRef<boolean>(false);
  const instanceIdRef = useRef<string>(uuidv4());
  
  // Data states
  const [details, setDetails] = useState<OfferDetail[]>([]);
  const [selectedDetails, setSelectedDetails] = useState<OfferDetail[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [subcategories, setSubcategories] = useState<ServiceSubcategory[]>([]);
  const [units, setUnits] = useState<MeasurementUnit[]>([]);
  
  // UI states
  const [loading, setLoading] = useState<boolean>(true);
  const [dialogLoading, setDialogLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [formValidationError, setFormValidationError] = useState<string>('');
  const [markedForDeletion, setMarkedForDeletion] = useState<Set<string>>(new Set());
  
  // Dialog states
  const [showSelectionDialog, setShowSelectionDialog] = useState<boolean>(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [confirmingSelection, setConfirmingSelection] = useState<boolean>(false);
  
  // Selection states
  const [selectedItems, setSelectedItems] = useState<{
    categoryId: string;
    subcategoryId: string;
    subcategoryName: string;
    unitId: string;
    price: number;
  }[]>([]);
  const [currentCategoryId, setCurrentCategoryId] = useState<string | null>(null);
  const [detailToDelete, setDetailToDelete] = useState<OfferDetail | null>(null);

  // Reset state for when the dialog opens/closes
  const resetState = useCallback(() => {
    setDetails([]);
    setSelectedDetails([]);
    setLoading(true);
    setError(null);
    setFormValidationError('');
    setMarkedForDeletion(new Set());
    setShowSelectionDialog(false);
    setShowDeleteDialog(false);
    setConfirmingSelection(false);
    setSelectedItems([]);
    setCurrentCategoryId(null);
    setDetailToDelete(null);
  }, []);

  // Load data when the dialog is open and tab is "details"
  useEffect(() => {
    if (dialogOpen && currentTab === 'details') {
      resetState();
      
      // Function to fetch offer details
      const fetchData = async () => {
        if (!dialogId) {
          setLoading(false);
          return;
        }
        
        try {
          setLoading(true);
          
          // Load categories and units in parallel
          await preloadCategoriesAndUnits({
            setCategories,
            setUnits,
            setError
          });
          
          // Load offer details
          const offerDetails = await fetchOfferDetails(dialogId);
          setDetails(offerDetails);
          
          setLoading(false);
        } catch (err) {
          console.error('Error fetching offer details:', err);
          setError('Σφάλμα φόρτωσης στοιχείων προσφοράς');
          setLoading(false);
        }
      };
      
      fetchData();
    }
  }, [dialogOpen, currentTab, dialogId, resetState]);

  // Handle cleanup when dialog is closed or tab changes
  useEffect(() => {
    return () => {
      cleanupDialogPortals();
    };
  }, []);

  // Handle cleanup of dialog portals
  const cleanupDialogPortals = useCallback(() => {
    // Remove any tooltips that might be stuck
    if (tooltipMountedRef.current) {
      const tooltips = document.querySelectorAll('[data-state="delayed-open"], [data-state="instant-open"]');
      tooltips.forEach(tooltip => {
        if (tooltip.parentNode) {
          tooltip.parentNode.removeChild(tooltip);
        }
      });
      tooltipMountedRef.current = false;
    }
  }, []);

  // Handle selection confirmation
  const handleSelectionConfirm = useCallback(async () => {
    try {
      setConfirmingSelection(true);
      setDialogLoading(true);
      
      // Check if we have any selected items
      if (selectedItems.length === 0) {
        setShowSelectionDialog(false);
        setConfirmingSelection(false);
        setDialogLoading(false);
        return;
      }
      
      // Filter out items that already exist in the details or selectedDetails
      const itemsToAdd = selectedItems.filter(item => {
        // Check if this item already exists in the details list
        const existsInDetails = details.some(
          detail => detail.category_id === item.categoryId && 
                   detail.subcategory_id === item.subcategoryId
        );
        
        // Check if this item already exists in the selectedDetails list
        const existsInSelectedDetails = selectedDetails.some(
          detail => detail.category_id === item.categoryId && 
                   detail.subcategory_id === item.subcategoryId
        );
        
        // Only add items that don't exist in either list
        return !existsInDetails && !existsInSelectedDetails;
      });
      
      // If all selected items already exist, just close the dialog without showing any message
      if (itemsToAdd.length === 0) {
        setShowSelectionDialog(false);
        setConfirmingSelection(false);
        setDialogLoading(false);
        return;
      }
      
      // Create detail objects for UI display only - maintain original order from selectedItems
      // We need to process items in reverse order to maintain the selection order
      const newSelectedDetails = [...itemsToAdd].reverse().map(item => {
        // Find the category and subcategory objects
        const category = categories.find(c => c.id === item.categoryId);
        const subcategory = subcategories.find(s => s.id === item.subcategoryId);
        
        // Default to first unit if none is selected
        const unitId = item.unitId || (units.length > 0 ? units[0].id : "");
        const unit = units.find(u => u.id === unitId);
        
        // Generate a UI-only ID with timestamp to prevent collisions
        const uiId = `ui-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        
        // Create a detail object for UI only
        return {
          id: uiId,
          offer_id: dialogId || 'pending',
          category_id: item.categoryId,
          subcategory_id: item.subcategoryId,
          unit_id: unitId,
          quantity: 1,
          price: item.price,
          total: item.price, // Price * quantity
          date_created: new Date().toISOString(),
          // Add the joined fields
          category: category,
          subcategory: subcategory,
          unit: unit
        } as OfferDetail;
      });
      
      // Add new items to the beginning of the list
      setSelectedDetails(prev => [...newSelectedDetails, ...prev]);
      
      // Reset selection state
      setSelectedItems([]);
      setCurrentCategoryId(null);
      
      // Wait a short time before closing the dialog to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Close the dialog window
      setShowSelectionDialog(false);
    } catch (error) {
      console.error("Error handling selection:", error);
      setError("Σφάλμα κατά την φόρτωση δεδομένων. Παρακαλώ δοκιμάστε ξανά.");
    } finally {
      setDialogLoading(false);
      setConfirmingSelection(false);
    }
  }, [categories, currentCategoryId, details, dialogId, selectedDetails, selectedItems, setConfirmingSelection, setCurrentCategoryId, setDialogLoading, setError, setSelectedDetails, setSelectedItems, setShowSelectionDialog, subcategories, units]);

  // Handle deletion of marked items
  const handleDeleteMarked = useCallback(async () => {
    if (!dialogId || markedForDeletion.size === 0) return;
    
    try {
      setLoading(true);
      
      // Delete each marked item
      const deletionPromises = Array.from(markedForDeletion).map(async (detailId) => {
        await deleteOfferDetail(detailId);
      });
      
      await Promise.all(deletionPromises);
      
      // Refresh details after deletion
      const updatedDetails = await fetchOfferDetails(dialogId);
      setDetails(updatedDetails);
      setMarkedForDeletion(new Set());
      
      toast({
        title: 'Επιτυχής διαγραφή',
        description: `Διαγράφηκαν ${markedForDeletion.size} στοιχεία επιτυχώς`,
      });
      
      setLoading(false);
    } catch (err) {
      console.error('Error deleting marked items:', err);
      setError('Σφάλμα διαγραφής στοιχείων');
      setLoading(false);
    }
  }, [dialogId, markedForDeletion, toast]);

  // Handle unit change
  const handleUnitChange = useCallback(async (detailId: string, unitId: string, isUIOnly: boolean) => {
    if (isUIOnly) {
      // Update UI-only item
      setSelectedDetails(prevDetails => 
        prevDetails.map(detail => 
          (detail.subcategory_id === detailId) 
            ? { ...detail, unit_id: unitId }
            : detail
        )
      );
      return;
    }
    
    if (!dialogId || !user?.id) return;
    
    try {
      // Update DB item
      await updateOfferDetail(detailId, { unit_id: unitId }, user.id);
      
      // Update local state
      setDetails(prevDetails => 
        prevDetails.map(detail => 
          (detail.id === detailId) 
            ? { ...detail, unit_id: unitId }
            : detail
        )
      );
    } catch (err) {
      console.error('Error updating unit:', err);
      toast({
        title: 'Σφάλμα',
        description: 'Δεν ήταν δυνατή η ενημέρωση της μονάδας μέτρησης',
        variant: 'destructive',
      });
    }
  }, [dialogId, toast, user?.id]);

  // Handle price change
  const handlePriceChange = useCallback(async (detailId: string, price: number, isUIOnly: boolean) => {
    if (isUIOnly) {
      // Update UI-only item
      setSelectedDetails(prevDetails => 
        prevDetails.map(detail => 
          (detail.subcategory_id === detailId) 
            ? { ...detail, price }
            : detail
        )
      );
      return;
    }
    
    if (!dialogId || !user?.id) return;
    
    try {
      // Update DB item
      await updateOfferDetail(detailId, { price }, user.id);
      
      // Update local state
      setDetails(prevDetails => 
        prevDetails.map(detail => 
          (detail.id === detailId) 
            ? { ...detail, price }
            : detail
        )
      );
    } catch (err) {
      console.error('Error updating price:', err);
      toast({
        title: 'Σφάλμα',
        description: 'Δεν ήταν δυνατή η ενημέρωση της τιμής',
        variant: 'destructive',
      });
    }
  }, [dialogId, toast, user?.id]);

  // Handle dialog open change
  const handleDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      cleanupDialogPortals();
    }
  }, [cleanupDialogPortals]);

  // Utility function to truncate text
  const truncateText = useCallback((text: string, maxLength: number = 25): React.ReactNode => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    
    return (
      <TooltipProvider>
        <span title={text} className="cursor-help">
          {text.substring(0, maxLength)}...
        </span>
      </TooltipProvider>
    );
  }, []);

  // Utility function to render category option
  const renderCategoryOption = useCallback((id: string): React.ReactNode => {
    const category = categories.find(c => c.id === id);
    return category ? category.category_name : '';
  }, [categories]);

  // Utility function to render subcategory option
  const renderSubcategoryOption = useCallback((id: string): React.ReactNode => {
    const subcategory = subcategories.find(s => s.id === id);
    return subcategory ? subcategory.subcategory_name : '';
  }, [subcategories]);

  // Utility function to render unit option
  const renderUnitOption = useCallback((id: string): string => {
    const unit = units.find(u => u.id === id);
    return unit ? unit.name : '';
  }, [units]);

  // Utility function to get full category name
  const getFullCategoryName = useCallback((id: string): string => {
    const category = categories.find(c => c.id === id);
    return category ? category.category_name : '';
  }, [categories]);

  // Utility function to get full subcategory name
  const getFullSubcategoryName = useCallback((id: string): string => {
    const subcategory = subcategories.find(s => s.id === id);
    return subcategory ? subcategory.subcategory_name : '';
  }, [subcategories]);

  // Utility function to get full unit name
  const getFullUnitName = useCallback((id: string): string => {
    const unit = units.find(u => u.id === id);
    return unit ? unit.name : '';
  }, [units]);

  // Context value
  const contextValue = {
    // Data states
    details,
    setDetails,
    selectedDetails,
    setSelectedDetails,
    categories,
    setCategories,
    subcategories,
    setSubcategories,
    units,
    setUnits,
    
    // UI states
    loading,
    setLoading,
    dialogLoading,
    setDialogLoading,
    error,
    setError,
    formValidationError,
    setFormValidationError,
    markedForDeletion,
    setMarkedForDeletion,
    
    // Dialog states
    showSelectionDialog,
    setShowSelectionDialog,
    showDeleteDialog,
    setShowDeleteDialog,
    confirmingSelection,
    setConfirmingSelection,
    
    // Selection states
    selectedItems,
    setSelectedItems,
    currentCategoryId,
    setCurrentCategoryId,
    detailToDelete,
    setDetailToDelete,
    
    // Functions
    resetState,
    handleDeleteMarked,
    handleUnitChange,
    handlePriceChange,
    handleDialogOpenChange,
    cleanupDialogPortals,
    handleSelectionConfirm,
    
    // Utility functions
    truncateText,
    renderCategoryOption,
    renderSubcategoryOption,
    renderUnitOption,
    getFullCategoryName,
    getFullSubcategoryName,
    getFullUnitName,
    
    // Refs
    tooltipMountedRef,
    instanceIdRef
  };

  return (
    <TooltipProvider>
      <DetailsContext.Provider value={contextValue}>
        {children}
      </DetailsContext.Provider>
    </TooltipProvider>
  );
};

export default DetailsContextProvider; 