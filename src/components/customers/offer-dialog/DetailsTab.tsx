import React, { useState, useEffect, useContext, useCallback } from 'react';
import { OfferDialogContext } from '../OffersDialog';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { GlobalDropdown } from "@/components/ui/GlobalDropdown";
import { GlobalTooltip, TruncateWithTooltip } from "@/components/ui/GlobalTooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import './OffersDialog.css';
import { TruncatedText } from "@/components/ui/truncated-text";

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
    
    // Also clear from localStorage
    localStorage.removeItem('offerDetailsSelectedItems');
  }, []);

  // Register the reset function with the context only once
  useEffect(() => {
    // Only register if context exists and has the registerTabReset function
    if (context?.registerTabReset) {
      // Register the reset function
      context.registerTabReset("details", resetState);
      
      // Cleanup function to unregister when component unmounts
      return () => {
        if (context.unregisterTabReset) {
          context.unregisterTabReset("details");
        }
      };
    }
  }, [context, resetState]);

  // Clear selected items from localStorage on component mount
  useEffect(() => {
    // Clear any stored selected items on mount
    localStorage.removeItem('offerDetailsSelectedItems');
    
    // Set up event listener for beforeunload to save selected items
    const handleBeforeUnload = () => {
      // Clear selected items from localStorage
      localStorage.removeItem('offerDetailsSelectedItems');
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Clear selected items from localStorage on unmount
      localStorage.removeItem('offerDetailsSelectedItems');
      // Reset all state on unmount
      setSelectedItems([]);
      setCurrentCategoryId(null);
    };
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
        
        setCategories(categoriesData);
        setUnits(unitsData);
        
        // Preload subcategories for the first few categories to improve initial load time
        if (categoriesData.length > 0) {
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
        
        setCategories(categoriesData);
        setUnits(unitsData);
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
        setSubcategories(prev => [...prev, ...subcategoriesData]);
        
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
      
      // Create detail objects for UI display only
      const newSelectedDetails = itemsToAdd.map(item => {
        // Find the category and subcategory objects
        const category = categories.find(c => c.id === item.categoryId);
        const subcategory = subcategories.find(s => s.id === item.subcategoryId);
        const unit = units.find(u => u.id === item.unitId);
        
        // Generate a UI-only ID
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
      
      // Add to selected details for UI display
      setSelectedDetails(prev => [...prev, ...newSelectedDetails]);
      
      // Clear selected items
      setSelectedItems([]);
      setCurrentCategoryId(null);
      localStorage.removeItem('offerDetailsSelectedItems');
      
      // Close the dialog window
      setShowSelectionDialog(false);
    } catch (error) {
      console.error("Error loading subcategory data:", error);
      setError("Σφάλμα κατά την φόρτωση δεδομένων. Παρακαλώ δοκιμάστε ξανά.");
      // Reset the flag in case of error
      setConfirmingSelection(false);
    } finally {
      setDialogLoading(false);
      setConfirmingSelection(false);
    }
  };

  // Handle delete button click
  const handleDeleteClick = (detail: OfferDetail) => {
    // Check if this is a database item or a UI-only item
    if (detail.id.startsWith('ui-')) {
      // This is a UI-only item, remove it from selectedDetails
      setSelectedDetails(prev => prev.filter(item => item.id !== detail.id));
    } else {
      // This is a database item
      setDetailToDelete(detail);
      // Show dialog immediately
      setShowDeleteDialog(true);
      // Reset success state
      setIsDeleteSuccessful(false);
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (!detailToDelete) {
      return;
    }
    
    // Set loading state
    setIsDeleteLoading(true);
    
    // Store the ID before deleting
    const idToDelete = detailToDelete.id;
    
    // Use a direct promise chain instead of an async function
    deleteOfferDetail(idToDelete)
      .then(() => {
        // Show success state instead of closing immediately
        setIsDeleteSuccessful(true);
        
        // Don't update state immediately to prevent UI refresh
        // Will update when dialog is closed
      })
      .catch(error => {
        console.error("Error deleting offer detail:", error);
        setError("Σφάλμα κατά τη διαγραφή λεπτομέρειας προσφοράς.");
        // Close dialog on error
        setShowDeleteDialog(false);
        setDetailToDelete(null);
      })
      .finally(() => {
        setIsDeleteLoading(false);
      });
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
  const truncateText = (text: string, maxLength: number = 20) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    
    return <TruncateWithTooltip 
      text={text} 
      maxLength={maxLength} 
      maxWidth={800}
      position="top" // Always use top position to avoid being cut off at the edges
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

  // Function to save selected details to the database
  const saveDetailsToDatabase = useCallback(async (realOfferId: string) => {
    if (!realOfferId || !user?.id) {
      return false;
    }
    
    if (selectedDetails.length === 0) {
      return true; // Return true as there's nothing to save
    }
    
    try {
      setLoading(true);
      
      // Prepare all details for batch processing
      const detailsToAdd = selectedDetails.map(detail => ({
        offer_id: realOfferId,
        category_id: detail.category_id,
        subcategory_id: detail.subcategory_id,
        unit_id: detail.unit_id,
        quantity: detail.quantity,
        price: detail.price,
        notes: detail.notes || ""
      }));
      
      // Use Promise.all to process all details in parallel
      const results = await Promise.all(
        detailsToAdd.map(detailData => 
          addOfferDetail(realOfferId, detailData, user.id)
        )
      );
      
      // Count successes
      const successCount = results.filter(Boolean).length;
      
      // Clear selected details after saving
      setSelectedDetails([]);
      
      // Refresh the list to show the newly saved details
      await fetchDetails();
      
      return successCount > 0; // Return true if at least one detail was saved successfully
    } catch (error) {
      console.error("Error saving details:", error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [selectedDetails, user, fetchDetails]);
  
  // Expose the save function to the parent component through context
  useEffect(() => {
    if (context && context.registerSaveDetailsToDatabase) {
      // Register the saveDetailsToDatabase function
      context.registerSaveDetailsToDatabase(saveDetailsToDatabase);
      
      // Cleanup function
      return () => {
        if (context.registerSaveDetailsToDatabase) {
          context.registerSaveDetailsToDatabase(null);
        }
      };
    }
  }, [context, saveDetailsToDatabase]);

  // Memoized UnitDropdown component to prevent unnecessary re-renders
  const UnitDropdown = React.memo(({ 
    detailId, 
    unitId, 
    unitName, 
    isUIOnly, 
    onUnitChange 
  }: { 
    detailId: string; 
    unitId: string; 
    unitName: string; 
    isUIOnly: boolean; 
    onUnitChange: (detailId: string, unitId: string, isUIOnly: boolean) => void;
  }) => {
    return (
      <div style={{ width: '180px' }}>
        <GlobalDropdown
          options={units.map(unit => unit.name)}
          value={unitName || ""}
          onSelect={(value) => {
            const selectedUnit = units.find(u => u.name === value);
            if (selectedUnit) {
              onUnitChange(detailId, selectedUnit.id, isUIOnly);
            }
          }}
          placeholder="Επιλέξτε μονάδα"
          className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5] text-xs truncate hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] transition-all duration-200 h-8"
        />
      </div>
    );
  });

  // Memoized PriceInput component to prevent unnecessary re-renders
  const PriceInput = React.memo(({ 
    detailId, 
    price, 
    isUIOnly, 
    onPriceChange 
  }: { 
    detailId: string; 
    price: number; 
    isUIOnly: boolean; 
    onPriceChange: (detailId: string, price: number, isUIOnly: boolean) => void;
  }) => {
    // Use local state to prevent re-renders of the parent component
    const [localPrice, setLocalPrice] = React.useState(price.toString());
    
    // Update local price when prop changes
    React.useEffect(() => {
      setLocalPrice(price.toString());
    }, [price]);
    
    // Handle input change
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Allow only numbers and decimal point
      const value = e.target.value.replace(/[^0-9.]/g, '');
      setLocalPrice(value);
    };
    
    // Handle blur to update parent only when user finishes typing
    const handleBlur = () => {
      const newPrice = parseFloat(localPrice) || 0;
      onPriceChange(detailId, newPrice, isUIOnly);
    };
    
    return (
      <div className="relative" style={{ width: '80px' }}>
        <Input
          type="text"
          value={localPrice}
          onChange={handleChange}
          onBlur={handleBlur}
          className="h-8 w-full bg-[#2f3e46] border-[#52796f] text-[#cad2c5] text-xs text-right pr-6"
        />
        <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#cad2c5] text-xs">€</span>
      </div>
    );
  });
  
  // Memoized SelectionItem component for the selection dialog
  const SelectionItem = React.memo(({ 
    item, 
    index, 
    units, 
    setSelectedItems 
  }: { 
    item: {
      categoryId: string;
      subcategoryId: string;
      subcategoryName: string;
      unitId: string;
      price: number;
    }; 
    index: number; 
    units: MeasurementUnit[];
    setSelectedItems: React.Dispatch<React.SetStateAction<{
      categoryId: string;
      subcategoryId: string;
      subcategoryName: string;
      unitId: string;
      price: number;
    }[]>>;
  }) => {
    return (
      <div className="flex items-center space-x-2 p-1 border-b border-[#52796f]/30">
        <div className="flex-1 truncate text-xs">
          {item.subcategoryName.length > 30 ? (
            <GlobalTooltip content={item.subcategoryName} position="top">
              <span>
                {item.subcategoryName.substring(0, 30)}
                <span className="ml-1 ellipsis-blue">...</span>
              </span>
            </GlobalTooltip>
          ) : (
            item.subcategoryName
          )}
        </div>
        <div className="w-24">
          <div style={{ width: '180px' }}>
            <GlobalDropdown
              options={units.map(unit => unit.name)}
              value={units.find(u => u.id === item.unitId)?.name || ""}
              onSelect={(value) => {
                const selectedUnit = units.find(u => u.name === value);
                if (selectedUnit) {
                  setSelectedItems(prev => 
                    prev.map((i, idx) => idx === index ? { ...i, unitId: selectedUnit.id } : i)
                  );
                }
              }}
              placeholder="Μονάδα"
              className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5] text-xs truncate hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] transition-all duration-200 h-8"
            />
          </div>
        </div>
        <div className="w-20">
          <div className="relative" style={{ width: '80px' }}>
            <Input
              type="text"
              value={item.price.toString()}
              onChange={(e) => {
                // Allow only numbers and decimal point
                const value = e.target.value.replace(/[^0-9.]/g, '');
                const newPrice = parseFloat(value) || 0;
                setSelectedItems(prev => 
                  prev.map((i, idx) => idx === index ? { ...i, price: newPrice } : i)
                );
              }}
              className="h-8 bg-[#2f3e46] border-[#52796f] text-[#cad2c5] text-xs text-right pr-6"
              placeholder="Τιμή"
            />
            <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#cad2c5] text-xs">€</span>
          </div>
        </div>
      </div>
    );
  });

  return (
    <div id="details-tab" className="space-y-4">
      {/* 
        Let the tab container control the height.
        This component will adapt to its parent's height.
      */}
      <div className="p-4 bg-[#354f52] rounded-md border border-[#52796f]">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-[#a8c5b5] text-sm font-medium">Λεπτομέρειες Προσφοράς</h3>
          
          {isEditing && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAddClick}
              className="h-8 px-2 bg-transparent hover:bg-[#52796f] border-none flex items-center gap-1 group"
            >
              <Plus className="h-4 w-4 text-white" />
              <span className="text-xs text-[#84a98c] group-hover:text-white">Προσθήκη</span>
            </Button>
          )}
        </div>
        
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
        <p className="text-[#cad2c5] text-xs">
            Δεν υπάρχουν λεπτομέρειες προσφοράς. {isEditing && "Πατήστε το κουμπί Προσθήκη για να προσθέσετε."}
          </p>
        ) : (
          <>
            {/* Existing details from database and selected details for UI */}
            {(details.length > 0 || selectedDetails.length > 0) && (
              <>
                <div className={`overflow-y-auto border border-[#52796f] rounded-md ${
                  details.length + selectedDetails.length > 6 ? 'max-h-[350px]' : 'h-auto'
                } mb-4`}>
                  <table className="w-full text-xs text-[#cad2c5]">
                    <thead className="details-table-header">
                      <tr className="border-b border-[#52796f]">
                        <th className="text-left py-2 px-3 font-medium text-[#84a98c]" colSpan={2}>Κατηγορία / Περιγραφή</th>
                        <th className="text-center py-2 px-3 font-medium text-[#84a98c]">Μονάδα</th>
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
                          ...details.filter(detail => detail.category_id === categoryId),
                          ...selectedDetails.filter(detail => detail.category_id === categoryId)
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
                                  <GlobalTooltip content={categoryName} position="top">
                                    <span>
                                      {categoryName.substring(0, 40)}
                                      <span className="ml-1 ellipsis-blue">...</span>
                                    </span>
                                  </GlobalTooltip>
                                ) : (
                                  categoryName
                                )}
                              </td>
                            </tr>
                            
                            {/* Subcategory rows */}
                            {categoryDetails.map((detail) => {
                              const isUIOnly = detail.id.startsWith('ui-');
                              
                              return (
                                <tr key={detail.id} className={`hover:bg-[#2f3e46] ${isUIOnly ? 'bg-[#354f52]/30' : ''}`}>
                                  <td className="w-4 py-2">
                                    {isUIOnly && (
                                      <span className="inline-block w-3 h-3 rounded-full bg-[#84a98c] ml-1" title="Προσωρινό - Δεν έχει αποθηκευτεί"></span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3">
                                    <span className="text-[#84a98c]">
                                      {detail.subcategory?.subcategory_name && detail.subcategory.subcategory_name.length > 30 ? (
                                        <GlobalTooltip content={detail.subcategory.subcategory_name} position="top">
                                          <span>
                                            {detail.subcategory.subcategory_name.substring(0, 30)}
                                            <span className="ml-1 ellipsis-blue">...</span>
                                          </span>
                                        </GlobalTooltip>
                                      ) : (
                                        detail.subcategory?.subcategory_name || '-'
                                      )}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    {isEditing ? (
                                      <UnitDropdown
                                        detailId={detail.id}
                                        unitId={detail.unit_id}
                                        unitName={detail.unit?.name || ""}
                                        isUIOnly={isUIOnly}
                                        onUnitChange={handleUnitChange}
                                      />
                                    ) : (
                                      detail.unit?.name && detail.unit.name.length > 10 ? (
                                        <GlobalTooltip content={detail.unit.name} position="top">
                                          <span>
                                            {detail.unit.name.substring(0, 10)}
                                            <span className="ml-1 ellipsis-blue">...</span>
                                          </span>
                                        </GlobalTooltip>
                                      ) : (
                                        detail.unit?.name || '-'
                                      )
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    {isEditing ? (
                                      <PriceInput
                                        detailId={detail.id}
                                        price={detail.price}
                                        isUIOnly={isUIOnly}
                                        onPriceChange={handlePriceChange}
                                      />
                                    ) : (
                                      <span>{detail.price.toFixed(2)} €</span>
                                    )}
                                  </td>
                                  {isEditing && (
                                    <td className="py-2 px-3 text-center">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleDeleteClick(detail);
                                        }}
                                        className="h-6 w-6 p-0 text-[#84a98c] hover:text-red-400 hover:bg-[#52796f]"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
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

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={showDeleteDialog} 
        onOpenChange={(open) => {
          // Prevent closing while deleting
          if (!isDeleteLoading) {
            handleDeleteDialogClose(open);
          }
        }}
      >
        <DialogContent className="bg-[#2f3e46] text-[#cad2c5] border border-[#52796f]">
          <DialogHeader>
            <DialogTitle className="text-[#84a98c]">
              {isDeleteSuccessful 
                ? "Επιτυχής Διαγραφή" 
                : "Διαγραφή Λεπτομέρειας"
              }
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {isDeleteLoading ? (
              <div className="flex flex-col items-center justify-center space-y-3 py-3">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#52796f] border-t-transparent"></div>
                <p className="text-[#cad2c5]">Η διαγραφή βρίσκεται σε εξέλιξη. Παρακαλώ περιμένετε...</p>
                <p className="text-sm text-[#84a98c]">Αυτή η διαδικασία μπορεί να διαρκέσει μερικά δευτερόλεπτα.</p>
              </div>
            ) : isDeleteSuccessful ? (
              <div className="flex flex-col items-center justify-center space-y-3 py-3">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-center text-green-500 font-medium">
                  Η λεπτομέρεια προσφοράς διαγράφηκε με επιτυχία!
                </p>
              </div>
            ) : (
              <p className="text-[#cad2c5] text-sm">
                Είστε βέβαιοι ότι θέλετε να διαγράψετε αυτή τη λεπτομέρεια προσφοράς;
                <br />
                Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
              </p>
            )}
          </div>
          <DialogFooter>
            {isDeleteSuccessful ? (
              <Button
                type="button"
                onClick={() => handleDeleteDialogClose(false)}
                className="bg-[#52796f] hover:bg-[#52796f]/90 text-white"
              >
                OK
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    handleDeleteDialogClose(false);
                  }}
                  className="bg-transparent border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-[#cad2c5]"
                  disabled={isDeleteLoading}
                >
                  Ακύρωση
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    handleDeleteConfirm();
                  }}
                  className="bg-red-600 text-white hover:bg-red-700"
                  disabled={isDeleteLoading}
                >
                  {isDeleteLoading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Διαγραφή...
                    </div>
                  ) : "Διαγραφή"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Selection Dialog */}
      <Dialog 
        open={showSelectionDialog} 
        onOpenChange={(open) => {
          if (open) {
            // If dialog is opening, just update the state
            setShowSelectionDialog(true);
          } else {
            // If dialog is closing
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
          }
        }}
      >
        <DialogContent className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5] max-w-4xl w-[800px] h-[550px] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-[#a8c5b5]">Επιλογή Λεπτομερειών</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col space-y-4 py-4 flex-grow overflow-hidden">
            <div className="flex space-x-4 h-[450px] flex-shrink-0">
              {/* Categories List */}
              <div className="w-1/3 border border-[#52796f] rounded-md overflow-hidden flex-shrink-0">
                <div className="bg-[#354f52] px-3 py-2 border-b border-[#52796f]">
                  <h3 className="text-[#a8c5b5] text-sm font-medium">Κατηγορίες</h3>
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
                          <GlobalTooltip content={category.category_name} position="top">
                            <span className="block truncate text-xs font-medium">
                              {category.category_name.length > 30 
                                ? `${category.category_name.substring(0, 30)}...` 
                                : category.category_name}
                            </span>
                          </GlobalTooltip>
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
                  <h3 className="text-[#a8c5b5] text-sm font-medium">
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
                                    {subcategory.subcategory_name.length > 40 ? (
                                      <GlobalTooltip content={subcategory.subcategory_name} position="top">
                                        <span>
                                          {subcategory.subcategory_name.substring(0, 40)}
                                          <span className="ml-1 ellipsis-blue">...</span>
                                        </span>
                                      </GlobalTooltip>
                                    ) : (
                                      subcategory.subcategory_name
                                    )}
                                  </span>
                                  {isSelected && <span className="ml-1 text-xs text-[#cad2c5]/70">(επιλεγμένο)</span>}
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
            
            {/* Selected Items */}
            {selectedItems.length > 0 && (
              <div className="border border-[#52796f] rounded-md overflow-hidden flex-shrink-0">
                <div className="bg-[#354f52] px-3 py-2 border-b border-[#52796f]">
                  <h3 className="text-[#a8c5b5] text-sm font-medium">Επιλεγμένα Στοιχεία</h3>
                </div>
                <div className="overflow-y-auto max-h-[250px]">
                  <div className="divide-y divide-[#52796f]/30">
                    {selectedItems.map((item, index) => (
                      <div key={index} className="flex items-center space-x-2 p-1 border-b border-[#52796f]/30">
                        <div className="flex-1 truncate text-xs">
                          {item.subcategoryName.length > 30 ? (
                            <GlobalTooltip content={item.subcategoryName} position="top">
                              <span>
                                {item.subcategoryName.substring(0, 30)}
                                <span className="ml-1 ellipsis-blue">...</span>
                              </span>
                            </GlobalTooltip>
                          ) : (
                            item.subcategoryName
                          )}
                        </div>
                        <div className="w-24">
                          <div style={{ width: '180px' }}>
                            <GlobalDropdown
                              options={units.map(unit => unit.name)}
                              value={units.find(u => u.id === item.unitId)?.name || ""}
                              onSelect={(value) => {
                                const selectedUnit = units.find(u => u.name === value);
                                if (selectedUnit) {
                                  setSelectedItems(prev => 
                                    prev.map((i, idx) => idx === index ? { ...i, unitId: selectedUnit.id } : i)
                                  );
                                }
                              }}
                              placeholder="Μονάδα"
                              className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5] text-xs truncate hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] transition-all duration-200 h-8"
                            />
                          </div>
                        </div>
                        <div className="w-20">
                          <div className="relative" style={{ width: '80px' }}>
                            <Input
                              type="text"
                              value={item.price.toString()}
                              onChange={(e) => {
                                // Allow only numbers and decimal point
                                const value = e.target.value.replace(/[^0-9.]/g, '');
                                const newPrice = parseFloat(value) || 0;
                                setSelectedItems(prev => 
                                  prev.map((i, idx) => idx === index ? { ...i, price: newPrice } : i)
                                );
                              }}
                              className="h-8 bg-[#2f3e46] border-[#52796f] text-[#cad2c5] text-xs text-right pr-6"
                              placeholder="Τιμή"
                            />
                            <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#cad2c5] text-xs">€</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
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
    </div>
  );
});

export default DetailsTab;
