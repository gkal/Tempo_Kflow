import React, { useState, useEffect, useContext, useCallback } from 'react';
import { OfferDialogContext } from '../OffersDialog';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { 
  fetchOfferDetails,
  deleteOfferDetail,
  fetchServiceCategories,
  fetchSubcategories,
  fetchMeasurementUnits,
  addOfferDetail,
  updateOfferDetail
} from '@/services/offerDetailsService';
import { 
  OfferDetail, 
  ServiceCategory, 
  ServiceSubcategory, 
  MeasurementUnit 
} from '@/types/offer-details';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { GlobalDropdown } from "@/components/ui/GlobalDropdown";
import { GlobalTooltip, TruncateWithTooltip, SafeTooltip } from "@/components/ui/GlobalTooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import './OffersDialog.css';

/**
 * DetailsTab Component
 * 
 * This component displays and manages offer details.
 * 
 * IMPORTANT: This component does NOT save details to the database when the "Προσθήκη στην Προσφορά" 
 * button is clicked. It only updates the UI with selected items. The details will only be saved 
 * to the database when the main save button in the OffersDialog is clicked.
 * 
 * The selected details are stored in the component's state and will be displayed in the UI
 * until the dialog is closed or the form is submitted. No temporary storage or database
 * interaction happens until the main save button is clicked.
 */

// Define TypeScript interface to extend Window
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
// This will be a window-scoped object that won't be affected by React's state management
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

// Wrap the component with React.memo to prevent unnecessary re-renders
const DetailsTab = React.memo(() => {
  const context = useContext(OfferDialogContext);
  const { user } = useAuth();
  const offerId = context?.offerId;
  const isEditing = context?.isEditing;
  
  // State for offer details
  const [details, setDetails] = useState<OfferDetail[]>([]);
  const [selectedDetails, setSelectedDetails] = useState<OfferDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for delete confirmation
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [detailToDelete, setDetailToDelete] = useState<OfferDetail | null>(null);
  
  // State for selection dialog
  const [showSelectionDialog, setShowSelectionDialog] = useState(false);
  const [confirmingSelection, setConfirmingSelection] = useState(false);
  
  // State for dropdown options
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [subcategories, setSubcategories] = useState<ServiceSubcategory[]>([]);
  const [units, setUnits] = useState<MeasurementUnit[]>([]);
  const [dialogLoading, setDialogLoading] = useState(false);
  
  // State for selected items
  const [selectedItems, setSelectedItems] = useState<{
    categoryId: string;
    subcategoryId: string;
    subcategoryName: string;
    unitId: string;
    price: number;
  }[]>([]);
  
  // State for current category view
  const [currentCategoryId, setCurrentCategoryId] = useState<string | null>(null);

  // Add state variables for loading and success in deletion
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [isDeleteSuccessful, setIsDeleteSuccessful] = useState(false);

  // Add state to track deleted IDs separately
  const [manuallyDeletedIds, setManuallyDeletedIds] = useState<string[]>([]);

  // Near the top of the component where other state is defined
  const [formValidationError, setFormValidationError] = useState("");

  // Add a ref to control tooltip visibility during unmounting phase
  const tooltipMountedRef = React.useRef(true);

  // Define tabId constant
  const tabId = 'details';

  // Create a unique instance ID for this component
  const instanceIdRef = React.useRef(`details-tab-${Math.random().toString(36).substring(2, 9)}`);

  // Create a single ref to track if component is mounted
  const isMountedRef = React.useRef(false);
  const hasRegisteredRef = React.useRef(false);
  
  // Add a ref to store the previous handleFormSubmit function for comparison
  const previousHandleFormSubmitRef = React.useRef<((realOfferId: string) => Promise<boolean>) | null>(null);

  // Reset function to clear all temporary state
  const resetState = useCallback(() => {
    setSelectedItems([]);
    setCurrentCategoryId(null);
    setShowSelectionDialog(false);
    setShowDeleteDialog(false);
    setDetailToDelete(null);
    setError(null);
    setConfirmingSelection(false);
    setSelectedDetails([]);
    setManuallyDeletedIds([]);
    
    // Also clear from localStorage
    localStorage.removeItem('offerDetailsSelectedItems');
  }, []);

  // Function to fetch offer details
  const fetchDetails = useCallback(async () => {
    if (!offerId) return;
    
    try {
      setLoading(true);
      const data = await fetchOfferDetails(offerId);
      setDetails(data);
    } catch (error) {
      console.error("Error fetching offer details:", error);
      setError("Σφάλμα κατά την ανάκτηση λεπτομερειών προσφοράς.");
    } finally {
      setLoading(false);
    }
  }, [offerId]);

  // Function to save selected details to the database
  const saveDetailsToDatabase = useCallback(async (realOfferId: string) => {
    try {
      // Validate we have an offer ID and user
      if (!realOfferId) {
        console.error("Cannot save details: No offer ID provided");
        return false;
      }
      
      if (!user) {
        console.error("Cannot save details: No authenticated user");
        return false;
      }
      
      // Get the current selectedDetails directly from state to avoid closure issues
      const detailsToSave = [...selectedDetails];
      
      // Check if we have any details to save
      if (detailsToSave.length === 0) {
        return true; // Return true as this is not an error condition
      }
      
      // Process each detail individually to ensure proper error handling
      const saveResults = await Promise.all(
        detailsToSave.map(async (detail) => {
          try {
            // Check if this is a new detail or an existing one
            // Consider any ID with 'ui-' or 'temp-' prefix as new
            const isTemporaryId = !detail.id || 
                                detail.id.startsWith('temp-') || 
                                detail.id.startsWith('ui-') ||
                                !detail.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
            
            // All temporary IDs should be treated as new entries
            if (isTemporaryId) {
              // Create a new detail object with proper fields for the API
              const newDetail = {
                offer_id: realOfferId,
                category_id: detail.category_id,
                subcategory_id: detail.subcategory_id,
                unit_id: detail.unit_id,
                quantity: 1, // Always use 1 as the quantity
                price: detail.price,
                notes: detail.notes || ""
              };
              
              const result = await addOfferDetail(realOfferId, newDetail, user.id);
              return { success: !!result, id: result?.id, action: 'added' };
            } else {
              // This is a real existing database entry with a valid UUID
              const updatedDetail = {
                unit_id: detail.unit_id,
                price: detail.price,
                notes: detail.notes || ""
              };
              
              const result = await updateOfferDetail(detail.id, updatedDetail, user.id);
              return { success: true, id: detail.id, action: 'updated' };
            }
          } catch (error) {
            console.error(`Error saving detail ${detail.id || 'new'}:`, error);
            return { success: false, id: detail.id, error, action: 'failed' };
          }
        })
      );
      
      // Check if all saves were successful
      const allSuccessful = saveResults.every(result => result.success);
      
      // If everything was successful, refetch the details to make sure UI is up to date
      if (allSuccessful) {
        await fetchDetails();
        
        // Clear the selected details after they've been successfully saved
        // IMPORTANT: This ensures we don't try to save the same UI details twice
        setSelectedDetails([]);
      }
      
      return allSuccessful;
    } catch (error) {
      console.error("Error in saveDetailsToDatabase:", error);
      return false;
    }
  }, [selectedDetails, user, fetchDetails]);

  // Function to reset tab state
  const resetTab = useCallback(() => {
    // Reset the form state when tab is reset
    // DO NOT reset selectedDetails here - we need to preserve them for saving!
    setCurrentCategoryId(null);
    setSubcategories([]);
    // We still track deleted IDs
  }, []);

  // First useEffect to set mounted state - runs only once
  useEffect(() => {
    isMountedRef.current = true;
    
    // Register this component's instance
    if (typeof window !== 'undefined' && window.offerDetailsSaveFunctions) {
      window.offerDetailsSaveFunctions[instanceIdRef.current] = null;
    }
    
    return () => {
      // On unmount, ensure we clean up properly
      isMountedRef.current = false;
      hasRegisteredRef.current = false;
      
      // Use direct DOM approach to delay cleanup until after the component is truly gone
      setTimeout(() => {
        if (context?.registerSaveDetailsToDatabase) {
          context.registerSaveDetailsToDatabase(null);
        }
        
        if (context?.unregisterTabReset) {
          context.unregisterTabReset('details');
        }
        
        // Also remove from the global registry
        if (typeof window !== 'undefined' && window.offerDetailsSaveFunctions) {
          delete window.offerDetailsSaveFunctions[instanceIdRef.current];
        }
      }, 50); // Small delay to ensure proper sequence
    };
  }, []); // Empty dependency array ensures this only runs on mount/unmount

  // Create a form submit handler that will be passed to the dialog context
  const handleFormSubmit = React.useCallback(async (realOfferId: string) => {
    if (!isMountedRef.current) {
      return true;
    }
    
    // Access the latest selectedDetails directly from the component's state
    const currentSelectedDetails = selectedDetails;
    
    // Validation: If no details are selected, show validation error
    if (currentSelectedDetails.length === 0) {
      setFormValidationError("Παρακαλώ επιλέξτε τουλάχιστον ένα είδος για την προσφορά");
      return false;
    }

    try {
      // Reset any previous validation errors
      setFormValidationError("");
      
      // Save details to database when form is submitted
      // Pass the currentSelectedDetails as an argument to ensure we use the most up-to-date data
      const saveResult = await saveDetailsToDatabase(realOfferId);
      
      // Return result to inform the dialog if submission was successful
      return saveResult;
    } catch (error) {
      console.error("Error in form submit:", error);
      setFormValidationError("Παρουσιάστηκε σφάλμα κατά την αποθήκευση. Παρακαλώ δοκιμάστε ξανά.");
      return false;
    }
  }, [selectedDetails, saveDetailsToDatabase]);

  // Register handlers with context only once on initial mount
  React.useEffect(() => {
    // Only register if component is mounted, context is available, and we haven't registered yet
    if (
      isMountedRef.current && 
      !hasRegisteredRef.current &&
      context?.registerSaveDetailsToDatabase && 
      context?.registerTabReset
    ) {
      // Register form submit handler
      context.registerSaveDetailsToDatabase(handleFormSubmit);
      
      // Save the reference to the function we just registered
      previousHandleFormSubmitRef.current = handleFormSubmit;
      
      // Also store in global registry
      if (typeof window !== 'undefined' && window.offerDetailsSaveFunctions) {
        window.offerDetailsSaveFunctions[instanceIdRef.current] = handleFormSubmit;
      }
      
      // Update global backup function
      if (typeof window !== 'undefined' && window._updateSaveDetailsFnBackup) {
        window._updateSaveDetailsFnBackup(handleFormSubmit);
      }
      
      // Register reset function
      context.registerTabReset('details', () => {
        // Don't reset selectedDetails as these should persist until saved
        // Just reset the selection dialog state
        setCurrentCategoryId(null);
        setSelectedItems([]);
        setShowSelectionDialog(false);
        setDialogLoading(false);
        setFormValidationError("");
        
        // Return true to indicate successful reset
      });
      
      // Mark as registered - we only do this initial registration once
      hasRegisteredRef.current = true;
    }
  }, [context, handleFormSubmit]);

  // This effect runs only when handleFormSubmit changes
  React.useEffect(() => {
    // Skip registration if component is not mounted or context is unavailable
    if (
      !isMountedRef.current || 
      !context?.registerSaveDetailsToDatabase
    ) {
      return;
    }
    
    // Register with the context
    context.registerSaveDetailsToDatabase(handleFormSubmit);
    
    // Update our reference
    previousHandleFormSubmitRef.current = handleFormSubmit;
    
    // Also update global registry
    if (typeof window !== 'undefined' && window.offerDetailsSaveFunctions) {
      window.offerDetailsSaveFunctions[instanceIdRef.current] = handleFormSubmit;
    }
    
    // Update global backup function
    if (typeof window !== 'undefined' && window._updateSaveDetailsFnBackup) {
      window._updateSaveDetailsFnBackup(handleFormSubmit);
    }
  }, [context, handleFormSubmit]);

  // Add a special failsafe cleanup that only runs on dialog close
  useEffect(() => {
    const dialogContent = document.querySelector('.dialog-content');
    if (!dialogContent) return;

    // Create a new mutation observer
    const observer = new MutationObserver((mutations) => {
      // Check if dialog is being removed
      if (mutations.some(m => 
        m.type === 'attributes' && 
        m.attributeName === 'data-state' && 
        (m.target as HTMLElement).getAttribute('data-state') === 'closed')) {
        
        // When dialog is closing, ensure save function is cleared
        if (typeof window !== 'undefined' && window.offerDetailsSaveFunctions) {
          delete window.offerDetailsSaveFunctions[instanceIdRef.current];
        }
      }
    });

    // Start observing
    observer.observe(dialogContent, { 
      attributes: true,
      attributeFilter: ['data-state']
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  // Fetch offer details when the component mounts or offerId changes
  useEffect(() => {
    if (offerId) {
      fetchDetails();
      
      // Preload categories and units for faster dialog opening
      preloadCategoriesAndUnits();
    }
    
    // Cleanup function to clear selectedItems when component unmounts
    return () => {
      // Don't call resetState here as it causes an infinite loop
    };
  }, [offerId, fetchDetails]);

  // Preload categories and units
  const preloadCategoriesAndUnits = async () => {
    try {
      // Only fetch if we don't already have the data
      if (categories.length === 0 || units.length === 0) {
        const [categoriesData, unitsData] = await Promise.all([
          fetchServiceCategories(),
          fetchMeasurementUnits()
        ]);
        
        // Add type assertions to fix the "unknown" type errors
        setCategories(categoriesData as ServiceCategory[]);
        setUnits(unitsData as MeasurementUnit[]);
        
        // Preload subcategories for the first few categories to improve initial load time
        if (categoriesData && Array.isArray(categoriesData) && categoriesData.length > 0) {
          const categoriesToPreload = categoriesData.slice(0, 3); // Preload first 3 categories
          
          // Fetch subcategories in parallel
          const preloadPromises = categoriesToPreload.map(category => 
            fetchSubcategories(category.id)
          );
          
          // Use Promise.allSettled to continue even if some requests fail
          const results = await Promise.allSettled(preloadPromises);
          
          // Process successful results
          const successfulResults = results
            .filter((result): result is PromiseFulfilledResult<ServiceSubcategory[]> => 
              result.status === 'fulfilled'
            )
            .map(result => result.value)
            .flat();
          
          // Update subcategories state with preloaded data
          if (successfulResults.length > 0) {
            setSubcategories(successfulResults);
          }
        }
      }
    } catch (error) {
      console.error("Error preloading data:", error);
    }
  };

  // Handle add button click - open selection dialog
  const handleAddClick = async () => {
    // Clear all state when opening the dialog
    setSelectedItems([]);
    setCurrentCategoryId(null);
    setConfirmingSelection(false);
    setError(null);
    localStorage.removeItem('offerDetailsSelectedItems');
    
    // Open dialog immediately for better UX
    setShowSelectionDialog(true);
    
    try {
      // Only show loading if we need to fetch data
      const needToFetchData = categories.length === 0 || units.length === 0;
      if (needToFetchData) {
        setDialogLoading(true);
      }
      
      // Only fetch categories and units if they haven't been preloaded
      if (categories.length === 0 || units.length === 0) {
        const [categoriesData, unitsData] = await Promise.all([
          fetchServiceCategories(),
          fetchMeasurementUnits()
        ]);
        
        setCategories(categoriesData as ServiceCategory[]);
        setUnits(unitsData as MeasurementUnit[]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Σφάλμα κατά την ανάκτηση δεδομένων. Παρακαλώ δοκιμάστε ξανά.");
    } finally {
      setDialogLoading(false);
    }
  };

  // Handle category click
  const handleCategoryClick = async (categoryId: string) => {
    try {
      // Update current category immediately for better UX
      setCurrentCategoryId(categoryId);
      
      // Check if we already have subcategories for this category
      const existingSubcategories = subcategories.filter(sub => 
        sub.category_id === categoryId
      );
      
      // Only fetch if we don't have subcategories for this category
      if (existingSubcategories.length === 0) {
        // Show loading only when we need to fetch
        setDialogLoading(true);
        
        // Fetch subcategories for this category
        const subcategoriesData = await fetchSubcategories(categoryId);
        
        // Merge with existing subcategories
        setSubcategories(prev => {
          // Type guard to ensure subcategoriesData is an array
          if (subcategoriesData && Array.isArray(subcategoriesData)) {
            return [...prev, ...subcategoriesData as ServiceSubcategory[]];
          }
          return prev; // Return previous state if data is not valid
        });
        
        setDialogLoading(false);
      }
    } catch (error) {
      console.error("Error fetching subcategories:", error);
      setError("Σφάλμα κατά την ανάκτηση υποκατηγοριών. Παρακαλώ δοκιμάστε ξανά.");
      setDialogLoading(false);
    }
  };

  // Handle subcategory selection
  const handleSubcategorySelect = async (subcategoryId: string) => {
    // Check if this item is already selected
    const existingIndex = selectedItems.findIndex(
      item => item.categoryId === currentCategoryId && item.subcategoryId === subcategoryId
    );
    
    if (existingIndex >= 0) {
      // Remove from selection
      setSelectedItems(prev => prev.filter((_, index) => index !== existingIndex));
    } else {
      // Get the subcategory details to ensure we have the correct data
      const subcategory = subcategories.find(s => s.id === subcategoryId);
      
      if (!subcategory) {
        console.error(`Subcategory with ID ${subcategoryId} not found`);
        return;
      }
      
      // Add to selection with default unit and price
      setSelectedItems(prev => [
        ...prev,
        {
          categoryId: currentCategoryId,
          subcategoryId: subcategoryId,
          subcategoryName: subcategory.subcategory_name,
          unitId: units.length > 0 ? units[0].id : "",
          price: 0
        }
      ]);
    }
  };

  // Handle unit change
  const handleUnitChange = async (detailId: string, unitId: string, isUIOnly: boolean) => {
    if (isUIOnly) {
      // Update UI-only items in the selectedDetails state
      setSelectedDetails(prev => 
        prev.map(item => 
          item.id === detailId 
            ? { ...item, unit_id: unitId, unit: units.find(u => u.id === unitId) } 
            : item
        )
      );
    } else if (user?.id) {
      try {
        // For database items, update in the database
        setLoading(true);
        
        // Call the update function
        const updatedDetail = await updateOfferDetail(
          detailId,
          { unit_id: unitId },
          user.id
        );
        
        // Update the local state with the updated detail
        if (updatedDetail) {
          setDetails(prev => 
            prev.map(item => 
              item.id === detailId 
                ? { ...item, unit_id: unitId, unit: units.find(u => u.id === unitId) } 
                : item
            )
          );
        }
      } catch (error) {
        console.error("Error updating unit:", error);
        setError("Σφάλμα κατά την ενημέρωση της μονάδας.");
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle price change
  const handlePriceChange = async (detailId: string, price: number, isUIOnly: boolean) => {
    if (isUIOnly) {
      // Update UI-only items in the selectedDetails state
      setSelectedDetails(prev => 
        prev.map(item => 
          item.id === detailId 
            ? { ...item, price, total: price } 
            : item
        )
      );
    } else if (user?.id) {
      try {
        // For database items, update in the database
        setLoading(true);
        
        // Call the update function
        const updatedDetail = await updateOfferDetail(
          detailId,
          { price },
          user.id
        );
        
        // Update the local state with the updated detail
        if (updatedDetail) {
          setDetails(prev => 
            prev.map(item => 
              item.id === detailId 
                ? { ...item, price, total: price } 
                : item
            )
          );
        }
      } catch (error) {
        console.error("Error updating price:", error);
        setError("Σφάλμα κατά την ενημέρωση της τιμής.");
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle selection confirmation
  const handleSelectionConfirm = async () => {
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
        const unit = units.find(u => u.id === item.unitId);
        
        // Generate a UI-only ID with timestamp to prevent collisions
        const uiId = `ui-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Create a detail object for UI only
        return {
          id: uiId,
          offer_id: offerId || 'pending',
          category_id: item.categoryId,
          subcategory_id: item.subcategoryId,
          unit_id: item.unitId,
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
      const updatedSelectedDetails = [...newSelectedDetails, ...selectedDetails];
      setSelectedDetails(updatedSelectedDetails);
      
      // Reset selection state
      setSelectedItems([]);
      setCurrentCategoryId(null);
      localStorage.removeItem('offerDetailsSelectedItems');
      
      // Wait a short time before closing the dialog to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Close the dialog window
      setShowSelectionDialog(false);
    } catch (error) {
      console.error("Error handling selection:", error);
      setError("Σφάλμα κατά την φόρτωση δεδομένων. Παρακαλώ δοκιμάστε ξανά.");
      // Reset the flag in case of error
      setConfirmingSelection(false);
    } finally {
      setDialogLoading(false);
      setConfirmingSelection(false);
    }
  };

  // Handle delete UI item separately with useCallback
  const handleDeleteUIItem = useCallback((itemId: string) => {
    // First mark the ID for deletion to avoid race conditions
    const idToDelete = itemId;
    
    // Use RAF (requestAnimationFrame) to ensure UI updates first
    requestAnimationFrame(() => {
      setSelectedDetails(prevDetails => {
        // Filter out by ID
        return prevDetails.filter(item => item.id !== idToDelete);
      });
    });
  }, []);

  // Handle delete click
  const handleDeleteClick = (e: React.MouseEvent<HTMLElement>, item: OfferDetail, index: number) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Set the detail to delete and show confirmation dialog
    setDetailToDelete(item);
    setShowDeleteDialog(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (!detailToDelete) return;
    
    try {
      // Check if this is a real database item with a UUID
      const isRealDatabaseItem = detailToDelete.id && 
        !detailToDelete.id.startsWith('ui-') && 
        !detailToDelete.id.startsWith('temp-');
      
      // If this is a real database item, we need to mark it for deletion
      if (isRealDatabaseItem) {
        // Add to manually deleted IDs list
        setManuallyDeletedIds(prev => [...prev, detailToDelete.id]);
        
        // Find DOM element and mark as deleted if it exists
        const row = document.querySelector(`tr[data-id="${detailToDelete.id}"]`);
        if (row) {
          row.setAttribute('data-deleted', 'true');
          row.setAttribute('data-deleted-id', detailToDelete.id);
          row.classList.add('deleting-row');
        }
        
        // Register for deletion with context
        if (context?.registerDeletedDetails) {
          context.registerDeletedDetails(detailToDelete.id);
        }
      }
      
      // Remove from UI immediately
      setSelectedDetails(prev => prev.filter(d => d.id !== detailToDelete.id));
      
      // Close the dialog
      setShowDeleteDialog(false);
      
      // Reset detail to delete
      setDetailToDelete(null);
    } catch (error) {
      console.error("Error deleting detail:", error);
      setError("Σφάλμα κατά την διαγραφή. Παρακαλώ δοκιμάστε ξανά.");
    }
  };
  
  // Handle dialog close
  const handleDeleteDialogClose = (open: boolean) => {
    if (!open) {
      if (isDeleteSuccessful) {
        // Only update state when closing after success
        setDetails(prev => prev.filter(item => item.id !== detailToDelete?.id));
      }
      
      // Reset states
      setShowDeleteDialog(false);
      setDetailToDelete(null);
      setIsDeleteSuccessful(false);
    }
  };

  // Truncate text and add ellipsis if needed
  const truncateText = (text: string, maxLength: number = 30) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    
    // Only show tooltip if component is mounted
    return <TruncateWithTooltip 
      text={text} 
      maxLength={maxLength} 
      maxWidth={800}
      position="top" // Always use top position to avoid being cut off at the edges
      disabled={!tooltipMountedRef.current} // Disable tooltips when unmounting
    />;
  };

  // Render functions for dropdown options
  const renderCategoryOption = (id: string) => {
    const category = categories.find(cat => cat.id === id);
    return category ? truncateText(category.category_name, 20) : id;
  };

  const renderSubcategoryOption = (id: string) => {
    const subcategory = subcategories.find(sub => sub.id === id);
    return subcategory ? truncateText(subcategory.subcategory_name, 20) : id;
  };

  const renderUnitOption = (id: string) => {
    const unit = units.find(u => u.id === id);
    return unit ? truncateText(unit.name, 20) : id;
  };

  // Full text render functions for tooltips
  const getFullCategoryName = (id: string) => {
    const category = categories.find(cat => cat.id === id);
    return category ? category.category_name : id;
  };

  const getFullSubcategoryName = (id: string) => {
    const subcategory = subcategories.find(sub => sub.id === id);
    return subcategory ? subcategory.subcategory_name : id;
  };

  const getFullUnitName = (id: string) => {
    const unit = units.find(u => u.id === id);
    return unit ? unit.name : id;
  };

  // Add useEffect to track component mounting state for tooltips
  useEffect(() => {
    tooltipMountedRef.current = true;
    
    return () => {
      // When the component is about to unmount, disable tooltips
      tooltipMountedRef.current = false;
    };
  }, []);

  // Before the return statement, add a cleanup function to ensure tooltips are disabled before unmount
  React.useEffect(() => {
    return () => {
      // Disable tooltips right before unmounting
      tooltipMountedRef.current = false;
      
      // Add a small delay to let React process unmounting
      setTimeout(() => {
        try {
          // Find any tooltip portals left in the DOM and remove them manually
          const tooltipPortals = document.querySelectorAll('[data-radix-tooltip-portal]');
          tooltipPortals.forEach(portal => {
            try {
              if (portal && portal.parentNode) {
                portal.parentNode.removeChild(portal);
              }
            } catch (e) {
              // Silent cleanup error
            }
          });
        } catch (e) {
          // Ignore any errors in cleanup
        }
      }, 0);
    };
  }, []);

  // Function to clean up orphaned dialog portals
  const cleanupDialogPortals = useCallback(() => {
    setTimeout(() => {
      try {
        // Find any orphaned dialog portals and remove them
        const dialogPortals = document.querySelectorAll('[role="dialog"]');
        dialogPortals.forEach(portal => {
          // Check if the dialog is actually visible in the DOM but orphaned
          const rect = portal.getBoundingClientRect();
          const isOrphaned = 
            rect.width === 0 || 
            rect.height === 0 || 
            !document.body.contains(portal) ||
            portal.getAttribute('data-state') === 'closed';
          
          if (isOrphaned && portal.parentNode) {
            // Only remove if it's truly orphaned
            try {
              portal.parentNode.removeChild(portal);
            } catch (e) {
              // Silent cleanup error
            }
          }
        });
      } catch (e) {
        // Ignore any errors in cleanup
      }
    }, 100);
  }, []);

  // Add cleanup to the showSelectionDialog state change
  useEffect(() => {
    if (!showSelectionDialog) {
      cleanupDialogPortals();
    }
  }, [showSelectionDialog, cleanupDialogPortals]);

  // Also run cleanup when component unmounts
  useEffect(() => {
    return () => {
      cleanupDialogPortals();
    };
  }, [cleanupDialogPortals]);

  // Add the cleanup call to the dialog onOpenChange handler
  const handleDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      // Add a small delay before state updates to allow React to properly unmount components
      setTimeout(() => {
        if (!confirmingSelection) {
          // Always clear selections when closing without confirming
          setSelectedItems([]);
          setCurrentCategoryId(null);
          setError(null);
          setConfirmingSelection(false);
          localStorage.removeItem('offerDetailsSelectedItems');
        } else {
          // If dialog is closing by the confirm button, just reset the flag
          // The selectedItems will be cleared in handleSelectionConfirm after saving
          setConfirmingSelection(false);
        }
        setShowSelectionDialog(false);
        
        // Clean up portals after dialog is closed
        cleanupDialogPortals();
      }, 50);
    }
  }, [confirmingSelection, cleanupDialogPortals]);

  return (
    <div 
      className="h-full flex flex-col"
      data-tooltip-mounted={tooltipMountedRef.current ? "true" : "false"}
      ref={(el) => {
        if (el) {
          (el as any).tooltipMountedRef = tooltipMountedRef;
        }
      }}
    >
      {showDeleteDialog && (
        <AlertDialog open={showDeleteDialog} onOpenChange={handleDeleteDialogClose}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Διαγραφή</AlertDialogTitle>
              <AlertDialogDescription>
                Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το στοιχείο;
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end space-x-2 mt-4">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Διαγραφή
              </Button>
                <Button
                  type="button"
                  variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                className="border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-[#cad2c5]"
                >
                  Ακύρωση
                </Button>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <div className="flex-1 flex flex-col pb-4">
        {/* Details header and buttons */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-medium text-[#a8c5b5]">Λεπτομέρειες Προσφοράς</h3>
                <Button
                  type="button"
            onClick={handleAddClick}
            className="bg-[#52796f] hover:bg-[#354f52] text-[#cad2c5]"
            disabled={dialogLoading}
          >
            Προσθήκη <Plus className="ml-1 h-4 w-4" />
                </Button>
        </div>

        {/* Category selection dialog */}
        {showSelectionDialog && (
          <Dialog 
            open={showSelectionDialog} 
            onOpenChange={handleDialogOpenChange}
          >
            <DialogContent 
              className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5] max-w-4xl w-[800px] h-[550px] flex flex-col"
              onEscapeKeyDown={(e) => {
                // Prevent default escape key behavior and handle manually
                e.preventDefault();
                if (!confirmingSelection) {
                  setSelectedItems([]);
                  setCurrentCategoryId(null);
                  setError(null);
                  setConfirmingSelection(false);
                  localStorage.removeItem('offerDetailsSelectedItems');
                  setShowSelectionDialog(false);
                }
              }}
              onInteractOutside={(e) => {
                // Prevent closing on outside click by default
                e.preventDefault();
              }}
            >
              <DialogHeader className="flex-shrink-0">
                <DialogTitle className="text-[#a8c5b5]">Επιλογή Λεπτομερειών</DialogTitle>
              </DialogHeader>
              
              <div className="flex flex-col space-y-4 py-4 flex-grow overflow-hidden">
                <div className="flex space-x-4 h-[450px] flex-shrink-0">
                  {/* Categories List */}
                  <div className="w-1/3 border border-[#52796f] rounded-md overflow-hidden flex-shrink-0">
                    <div className="bg-[#354f52] px-3 py-2 border-b border-[#52796f]">
                      <h3 className="text-[#a8c5b5] text-base font-medium">Κατηγορίες</h3>
                    </div>
                    <div className="overflow-y-auto h-[calc(100%-36px)]">
                      {categories.length > 0 ? (
                        <div className="divide-y divide-[#52796f]/30">
                          {categories.map((category) => (
                            <div 
                              key={category.id}
                              className={`px-3 py-1 cursor-pointer hover:bg-[#354f52]/50 ${
                                currentCategoryId === category.id ? 'bg-[#354f52]/70' : ''
                              }`}
                              onClick={() => handleCategoryClick(category.id)}
                            >
                              <SafeTooltip content={category.category_name} position="top">
                                <span className="block truncate text-xs font-medium">
                                  {category.category_name.length > 30 
                                    ? `${category.category_name.substring(0, 30)}...` 
                                    : category.category_name}
                                </span>
                              </SafeTooltip>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 text-center text-[#cad2c5]/70 text-sm">
                          Δεν βρέθηκαν κατηγορίες
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Subcategories List */}
                  <div className="w-2/3 border border-[#52796f] rounded-md overflow-hidden flex-shrink-0">
                    <div className="bg-[#354f52] px-3 py-2 border-b border-[#52796f]">
                      <h3 className="text-[#a8c5b5] text-base font-medium">
                        {currentCategoryId 
                          ? `Περιγραφές: ${truncateText(categories.find(c => c.id === currentCategoryId)?.category_name || "", 20)}`
                          : "Περιγραφές"
                        }
                      </h3>
                    </div>
                    <div className="overflow-y-auto h-[calc(100%-36px)]">
                      {currentCategoryId ? (
                        dialogLoading ? (
                          <div className="p-3 text-center">
                            <div className="animate-pulse text-[#cad2c5]/70 text-sm">Φόρτωση περιγραφών...</div>
                          </div>
                        ) : subcategories.filter(sub => sub.category_id === currentCategoryId).length > 0 ? (
                          <div className="divide-y divide-[#52796f]/30">
                            {subcategories
                              .filter(sub => sub.category_id === currentCategoryId)
                              .map((subcategory) => {
                                const isSelected = selectedItems.some(
                                  item => item.categoryId === currentCategoryId && item.subcategoryId === subcategory.id
                                );
                                
                                return (
                                  <div 
                                    key={subcategory.id}
                                    className={`px-3 py-1 cursor-pointer hover:bg-[#354f52]/50 ${
                                      isSelected ? 'bg-[#354f52]/70' : ''
                                    }`}
                                    onClick={() => handleSubcategorySelect(subcategory.id)}
                                  >
                                    <div className="flex items-center">
                                      <div className={`w-4 h-4 mr-2 border ${isSelected ? 'bg-[#84a98c] border-[#84a98c]' : 'border-[#52796f]'} rounded flex items-center justify-center`}>
                                        {isSelected && <span className="text-white text-xs">✓</span>}
                                      </div>
                                      <span className="text-xs">
                                        {subcategory.subcategory_name.length > 60 ? (
                                          tooltipMountedRef.current ? (
                                            <ErrorBoundary
                                              fallback={
                                                <span>
                                                  {subcategory.subcategory_name.substring(0, 60)}
                                                  <span className="ml-1 ellipsis-blue">...</span>
                                                </span>
                                              }
                                            >
                                              <SafeTooltip 
                                                content={subcategory.subcategory_name} 
                                                position="top"
                                                disabled={!tooltipMountedRef.current}
                                              >
                                                <span>
                                                  {subcategory.subcategory_name.substring(0, 60)}
                                                  <span className="ml-1 ellipsis-blue">...</span>
                                                </span>
                                              </SafeTooltip>
                                            </ErrorBoundary>
                                          ) : (
                                            <span>
                                              {subcategory.subcategory_name.substring(0, 60)}
                                              <span className="ml-1 ellipsis-blue">...</span>
                                            </span>
                                          )
                                        ) : (
                                          subcategory.subcategory_name
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        ) : (
                          <div className="p-3 text-center text-[#cad2c5]/70 text-sm">
                            Δεν βρέθηκαν περιγραφές για αυτή την κατηγορία
                          </div>
                        )
                      ) : (
                        <div className="p-3 text-center text-[#cad2c5]/70 text-sm">
                          Επιλέξτε μια κατηγορία για να δείτε τις περιγραφές
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Selection Counter */}
                <div className="text-center text-sm text-[#84a98c] flex-shrink-0">
                  {selectedItems.length > 0 
                    ? `${selectedItems.length} επιλεγμένα στοιχεία` 
                    : "Δεν έχετε επιλέξει κανένα στοιχείο"}
                </div>
              </div>
              
              <div className="flex justify-end p-4 border-t border-[#52796f] mt-2">
                <button
                  onClick={handleSelectionConfirm}
                  disabled={selectedItems.length === 0}
                  className={`flex items-center gap-2 h-10 px-4 text-sm font-medium rounded-md ${
                    selectedItems.length === 0 
                      ? 'bg-[#52796f]/50 text-white/70 cursor-not-allowed' 
                      : 'bg-[#52796f] text-white hover:bg-[#52796f]/90 border-2 border-[#84a98c]'
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  <span>Προσθήκη στην Προσφορά</span>
                </button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Details list - Original implementation with table */}
        <div className="flex-1 overflow-y-auto pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-2">
              <svg className="animate-spin h-5 w-5 text-[#52796f]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : error ? (
            <div className="p-2 bg-red-900/30 text-red-300 border border-red-800 rounded-md text-xs">
              {error}
            </div>
          ) : details.length === 0 && selectedDetails.length === 0 ? (
            <div className="text-center py-8 text-[#84a98c]">
              Δεν υπάρχουν στοιχεία. Πατήστε "Προσθήκη" για να προσθέσετε στοιχεία στην προσφορά.
            </div>
          ) : (
            <>
              {/* Existing details from database and selected details for UI */}
              {(details.length > 0 || selectedDetails.length > 0) && (
                <>
                  <div className={`overflow-y-auto border border-[#52796f] rounded-md ${
                    details.length + selectedDetails.length > 6 ? 'max-h-[350px]' : 'h-auto'
                  } mb-4`}>
                    <table className="w-full text-xs text-[#cad2c5] details-table">
                      <thead className="details-table-header">
                        <tr className="border-b border-[#52796f]">
                          <th className="text-left py-2 px-3 font-medium text-[#84a98c]" colSpan={2}>Κατηγορία / Περιγραφή</th>
                          <th className="text-center py-2 px-3 font-medium text-[#84a98c] w-48">Μονάδα</th>
                          <th className="text-center py-2 px-3 font-medium text-[#84a98c]">Τιμή</th>
                          {isEditing && <th className="w-10 py-2 px-3"></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {/* Combine database and selected details */}
                        {Array.from(new Set([
                          ...details.map(detail => detail.category_id),
                          ...selectedDetails.map(detail => detail.category_id)
                        ])).map(categoryId => {
                          // Get all details for this category
                          const categoryDetails = [
                            ...selectedDetails.filter(detail => detail.category_id === categoryId),
                            ...details.filter(detail => detail.category_id === categoryId)
                          ];
                          
                          // Get the category object from the first detail
                          const category = categoryDetails[0]?.category;
                          const categoryName = category?.category_name || "-";
                          
                          return (
                            <React.Fragment key={categoryId}>
                              {/* Category row */}
                              <tr className="bg-[#354f52]/70 category-row">
                                <td colSpan={isEditing ? 5 : 4} className="py-2 px-3 font-medium">
                                  {categoryName.length > 40 ? (
                                    tooltipMountedRef.current ? (
                                      <ErrorBoundary
                                        fallback={
                                          <span>
                                            {categoryName.substring(0, 40)}
                                            <span className="ml-1 ellipsis-blue">...</span>
                                          </span>
                                        }
                                      >
                                        <SafeTooltip content={categoryName} position="top" disabled={!tooltipMountedRef.current}>
                                          <span>
                                            {categoryName.substring(0, 40)}
                                            <span className="ml-1 ellipsis-blue">...</span>
                                          </span>
                                        </SafeTooltip>
                                      </ErrorBoundary>
                                    ) : (
                                      <span>
                                        {categoryName.substring(0, 40)}
                                        <span className="ml-1 ellipsis-blue">...</span>
                                      </span>
                                    )
                                  ) : (
                                    categoryName
                                  )}
                                </td>
                              </tr>
                              
                              {/* Subcategory rows */}
                              {categoryDetails.map((detail) => {
                                const isUIOnly = detail.id.startsWith('ui-');
                                
                                return (
                                  <tr key={detail.id} 
                                    className={`hover:bg-[#2f3e46] ${isUIOnly ? 'bg-[#354f52]/30' : ''}`} 
                                    data-row-id={detail.id}>
                                    <td className="w-4 py-2">
                                      {isUIOnly && (
                                        <span className="inline-block w-3 h-3 rounded-full bg-[#84a98c] ml-1" title="Προσωρινό - Δεν έχει αποθηκευτεί"></span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3">
                                      <span className="text-[#84a98c]">
                                        {detail.subcategory?.subcategory_name && detail.subcategory.subcategory_name.length > 30 ? (
                                          tooltipMountedRef.current ? (
                                            <ErrorBoundary
                                              fallback={
                                                <span>
                                                  {detail.subcategory.subcategory_name.substring(0, 30)}
                                                  <span className="ml-1 ellipsis-blue">...</span>
                                                </span>
                                              }
                                            >
                                              <SafeTooltip 
                                                content={detail.subcategory.subcategory_name} 
                                                position="top"
                                                disabled={!tooltipMountedRef.current}
                                              >
                                                <span>
                                                  {detail.subcategory.subcategory_name.substring(0, 30)}
                                                  <span className="ml-1 ellipsis-blue">...</span>
                                                </span>
                                              </SafeTooltip>
                                            </ErrorBoundary>
                                          ) : (
                                            <span>
                                              {detail.subcategory.subcategory_name.substring(0, 30)}
                                              <span className="ml-1 ellipsis-blue">...</span>
                                            </span>
                                          )
                                        ) : (
                                          detail.subcategory?.subcategory_name || '-'
                                        )}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      {isEditing ? (
                                        <div className="flex items-center justify-center">
                                          <GlobalDropdown
                                            options={units.map(unit => unit.id)}
                                            value={detail.unit_id || ""}
                                            onSelect={(value) => handleUnitChange(detail.id, value, detail.id.startsWith('ui-'))}
                                            disabled={loading}
                                            className="w-44 mx-auto"
                                            renderOption={(id) => {
                                              const unit = units.find(u => u.id === id);
                                              return unit ? truncateText(unit.name, 30) : id;
                                            }}
                                            placeholder="Μονάδα"
                                            header="Μονάδα"
                                          />
                                        </div>
                                      ) : (
                                        detail.unit?.name && detail.unit.name.length > 10 ? (
                                          tooltipMountedRef.current ? (
                                            <ErrorBoundary
                                              fallback={
                                                <span>
                                                  {detail.unit.name.substring(0, 10)}
                                                  <span className="ml-1 ellipsis-blue">...</span>
                                                </span>
                                              }
                                            >
                                              <SafeTooltip 
                                                content={detail.unit.name} 
                                                position="top"
                                                disabled={!tooltipMountedRef.current}
                                              >
                                                <span>
                                                  {detail.unit.name.substring(0, 10)}
                                                  <span className="ml-1 ellipsis-blue">...</span>
                                                </span>
                                              </SafeTooltip>
                                            </ErrorBoundary>
                                          ) : (
                                            <span>
                                              {detail.unit.name.substring(0, 10)}
                                              <span className="ml-1 ellipsis-blue">...</span>
                                            </span>
                                          )
                                        ) : (
                                          detail.unit?.name || '-'
                                        )
                                      )}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      {isEditing ? (
                                        <div className="flex items-center justify-center">
                                          <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={detail.price.toString()}
                                            onChange={(e) => {
                                              const value = parseFloat(e.target.value);
                                              if (!isNaN(value)) {
                                                handlePriceChange(detail.id, value, detail.id.startsWith('ui-'));
                                              }
                                            }}
                                            className="bg-[#354f52] text-[#cad2c5] text-xs border-[#52796f] hover:bg-[#2f3e46] w-20 text-center"
                                          />
                                          <span className="ml-1 text-[#84a98c] text-xs">€</span>
                                        </div>
                                      ) : (
                                        <span>{detail.price.toFixed(2)} €</span>
                                      )}
                                    </td>
                                    {isEditing && (
                                      <td className="py-2 px-3 text-center">
                                        <div 
                                          className="delete-btn inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-[#354f52]/70 cursor-pointer"
                                          aria-label="Διαγραφή"
                                          title="Διαγραφή"
                                          data-ui-only={detail.id.startsWith('ui-')}
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            
                                            // Get the row directly for immediate UI feedback
                                            const row = e.currentTarget.closest('tr');
                                            if (row) {
                                              // Add visual feedback but keep row in DOM
                                              row.classList.add('deleting-row');
                                              row.style.opacity = '0.3';
                                              
                                              // Critical: Mark row with data attributes for deletion tracking
                                              row.setAttribute('data-deleted', 'true');
                                              row.setAttribute('data-deleted-id', detail.id.toString());
                                            }
                                            
                                            // Register the item for deletion with the context
                                            if (context?.registerDeletedDetails) {
                                              context.registerDeletedDetails(detail.id);
                                            }
                                            
                                            // Also track it in our local state for backup
                                            setManuallyDeletedIds(prev => [...prev, detail.id.toString()]);
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4 text-[#84a98c] hover:text-[#cad2c5]" />
                                        </div>
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export default DetailsTab;

/* The CSS styles below are causing errors and have been moved to OffersDialog.tsx */
