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
import { TooltipProvider } from '@/components/ui/GlobalTooltip';

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
    // Don't do anything if there's no dialogId (offer ID)
    if (!dialogId) {
      setLoading(false);
      return;
    }
    
    // Function to fetch offer details
    const fetchData = async () => {
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
        
        // Store the details
        setDetails(offerDetails);
        
        // Load all subcategories for used categories
        const uniqueCategoryIds = [...new Set(offerDetails.map(detail => detail.category_id))];
        
        // Fetch subcategories for each category
        const subcategoryPromises = uniqueCategoryIds.map(categoryId => 
          fetchSubcategories(categoryId)
        );
        
        const allSubcategoriesArrays = await Promise.all(subcategoryPromises);
        const allSubcategories = allSubcategoriesArrays.flat();
        
        // Store subcategories
        setSubcategories(allSubcategories);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching offer details:', err);
        setError('Σφάλμα φόρτωσης στοιχείων προσφοράς');
        setLoading(false);
      }
    };
    
    fetchData();
    
  }, [dialogId]); // Dependencies: dialogId only, so it reloads when the offer ID changes

  // Register the saveDetailsToDatabase function
  useEffect(() => {
    if (!registerSaveDetails) return;
    
    const saveDetailsToDatabase = async (realOfferId: string): Promise<boolean> => {
      try {
        if (!user?.id) {
          console.error('User ID not found');
          return false;
        }
        
        // Handle marked for deletion items
        if (markedForDeletion.size > 0) {
          const deletionPromises = Array.from(markedForDeletion).map(async (detailId) => {
            await deleteOfferDetail(detailId);
          });
          
          await Promise.all(deletionPromises);
        }
        
        // Add new selected details
        if (selectedDetails.length > 0) {
          const addPromises = selectedDetails.map(async (detail) => {
            // Skip items that are marked for deletion
            if (detail.id && markedForDeletion.has(detail.id)) {
              return null;
            }
            
            // Construct the data for the new detail - only include essential fields
            const detailData = {
              offer_id: realOfferId,
              category_id: detail.category_id,
              subcategory_id: detail.subcategory_id || '',
              unit_id: detail.unit_id || '',
              price: detail.price || 0,
              quantity: 1, // Always set quantity to 1
              notes: detail.notes
              // total is excluded as it's a generated column
            };
            
            // Add the detail to the database
            return addOfferDetail(realOfferId, detailData, user.id);
          });
          
          await Promise.all(addPromises.filter(Boolean));
        }
        
        return true;
      } catch (error) {
        console.error('Error saving offer details:', error);
        return false;
      }
    };
    
    // Register the save function
    registerSaveDetails(saveDetailsToDatabase);
    
    // Cleanup function to unregister when component unmounts
    return () => {
      registerSaveDetails(null);
    };
  }, [registerSaveDetails, selectedDetails, markedForDeletion, user, deleteOfferDetail, addOfferDetail]);

  // Register the tab reset function
  useEffect(() => {
    // Register the resetState function with the parent context's registerTabReset method
    if (registerTabReset) {
      registerTabReset('details', resetState);
    }
    
    // Cleanup function to unregister when component unmounts
    return () => {
      if (offerDialogContext.unregisterTabReset) {
        offerDialogContext.unregisterTabReset('details');
      }
    };
  }, [registerTabReset, resetState, offerDialogContext]);

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

  // Handle selection confirmation - simplified to just add items without confirmation
  const handleSelectionConfirm = useCallback(async () => {
    try {
      // Check if we have any selected items
      if (selectedItems.length === 0) {
        setShowSelectionDialog(false);
        return;
      }
      
      // Skip confirmation step - process directly
      
      // Filter out items that already exist in the details or selectedDetails
      const itemsToAdd = selectedItems.filter(item => {
        // Check if this item already exists in the details list
        const existsInDetails = details.some(
          detail => detail.category_id === item.categoryId && 
                   detail.subcategory_id === item.subcategoryId &&
                   !detail.is_deleted
        );
        
        // Check if this item already exists in the selectedDetails list
        const existsInSelectedDetails = selectedDetails.some(
          detail => detail.category_id === item.categoryId && 
                   detail.subcategory_id === item.subcategoryId
        );
        
        // Only add items that don't exist in either list
        return !existsInDetails && !existsInSelectedDetails;
      });
      
      // Sort items by subcategory name for consistent ordering
      const sortedItemsToAdd = [...itemsToAdd].sort((a, b) => {
        const subcategoryA = subcategories.find(s => s.id === a.subcategoryId);
        const subcategoryB = subcategories.find(s => s.id === b.subcategoryId);
        const nameA = subcategoryA?.subcategory_name.toLowerCase() || '';
        const nameB = subcategoryB?.subcategory_name.toLowerCase() || '';
        return nameA.localeCompare(nameB);
      });
      
      // Create new detail objects for UI display only if there are any to add
      if (sortedItemsToAdd.length > 0) {
        const newSelectedDetails = sortedItemsToAdd.map(item => {
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
        
        // Add new items to the list
        setSelectedDetails(prev => [...newSelectedDetails, ...prev]);
      }
      
      // Reset selection state
      setSelectedItems([]);
      setCurrentCategoryId(null);
      
      // Close the dialog window immediately
      setShowSelectionDialog(false);
    } catch (error) {
      console.error("Error handling selection:", error);
      setError("Σφάλμα κατά την φόρτωση δεδομένων. Παρακαλώ δοκιμάστε ξανά.");
    }
  }, [categories, currentCategoryId, details, dialogId, selectedDetails, selectedItems, setCurrentCategoryId, setError, setSelectedDetails, setSelectedItems, setShowSelectionDialog, subcategories, units]);

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

  // Handle unit change - now only updates UI state, no database saves
  const handleUnitChange = useCallback(async (detailId: string, unitId: string, isUIOnly: boolean = false): Promise<void> => {
    setDetails(prevDetails => {
      const updatedDetails = [...prevDetails];
      const detailIndex = updatedDetails.findIndex(detail => {
        const foundId = detail.id || detail.subcategory_id;
        return foundId === detailId;
      });

      if (detailIndex !== -1) {
        updatedDetails[detailIndex] = {
          ...updatedDetails[detailIndex],
          unit_id: unitId
        };
      }
      return updatedDetails;
    });
    
    // If it's a UI-only item, update in selectedDetails as well
    if (isUIOnly) {
      setSelectedDetails(prevDetails => 
        prevDetails.map(detail => {
          if (detail.id === detailId || detail.subcategory_id === detailId) {
            return { ...detail, unit_id: unitId };
          }
          return detail;
        })
      );
    }
  }, [setSelectedDetails]);

  // Handle price change - now only updates UI state, no database saves
  const handlePriceChange = useCallback(async (detailId: string, price: number | undefined, isUIOnly: boolean) => {
    if (isUIOnly) {
      // Update UI-only item
      setSelectedDetails(prevDetails => 
        prevDetails.map(detail => 
          (detail.id === detailId || detail.subcategory_id === detailId) 
            ? { ...detail, price: price === undefined ? 0 : price }
            : detail
        )
      );
      return;
    }
    
    // Update local state only, no database save
    setDetails(prevDetails => 
      prevDetails.map(detail => 
        (detail.id === detailId) 
          ? { ...detail, price: price === undefined ? 0 : price }
          : detail
      )
    );
  }, [setSelectedDetails, setDetails]);

  // Handle dialog open/close events
  const handleDialogOpenChange = useCallback((open: boolean) => {
    console.log(`Dialog open change requested: ${open ? 'OPEN' : 'CLOSE'}`);
    if (!open) {
      // Clean up state when dialog is closed
      setSelectedItems([]);
      setCurrentCategoryId(null);
    }
    setShowSelectionDialog(open);
  }, [setSelectedItems, setCurrentCategoryId, setShowSelectionDialog]);

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
    if (!id) return "Επιλέξτε μονάδα";
    const unit = units.find(u => u.id === id);
    return unit ? unit.name : "Επιλέξτε μονάδα";
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