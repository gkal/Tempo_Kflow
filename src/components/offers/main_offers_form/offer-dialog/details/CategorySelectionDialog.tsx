import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import { useDetailsContext } from './DetailsContext';
import { Skeleton } from '@/components/ui/skeleton';
import { ServiceCategory, ServiceSubcategory } from '@/types/offer-details';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/GlobalTooltip";
import ErrorBoundary from '@/components/ErrorBoundary';
import { fetchSubcategories } from './DetailsService';

const CategorySelectionDialog: React.FC = () => {
  const {
    // Data states
    categories,
    subcategories,
    setSubcategories,
    
    // UI states
    dialogLoading,
    setDialogLoading,
    error,
    
    // Dialog states
    showSelectionDialog,
    setShowSelectionDialog,
    confirmingSelection,
    setConfirmingSelection,
    
    // Selection states
    selectedItems,
    setSelectedItems,
    currentCategoryId,
    setCurrentCategoryId,
    
    // Functions
    handleDialogOpenChange,
    handleSelectionConfirm,
    
    // Utility functions
    truncateText,
    renderCategoryOption,
    renderSubcategoryOption,
    getFullCategoryName,
    
    // Refs
    tooltipMountedRef
  } = useDetailsContext();

  // Handle category click
  const handleCategoryClick = async (categoryId: string) => {
    try {
      setDialogLoading(true);
      setCurrentCategoryId(categoryId);
      
      // Fetch subcategories for the selected category
      const subCategoriesData = await fetchSubcategories(categoryId);
      setSubcategories(prevSubcategories => {
        // Filter out subcategories from this category (if any) to avoid duplicates
        const filteredSubcategories = prevSubcategories.filter(
          sub => sub.category_id !== categoryId
        );
        // Add the newly fetched subcategories
        return [...filteredSubcategories, ...subCategoriesData];
      });
    } catch (error) {
      console.error("Error fetching subcategories:", error);
    } finally {
      setDialogLoading(false);
    }
  };

  // Close the dialog properly with cleanup
  const handleClose = () => {
    setSelectedItems([]);
    setCurrentCategoryId(null);
    setShowSelectionDialog(false);
  };

  // Handle subcategory selection
  const handleSubcategorySelect = (subcategoryId: string) => {
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
          unitId: "", // Will be populated from context
          price: 0
        }
      ]);
    }
  };

  // Simple tooltip wrapper component that uses the global tooltip
  const SafeTooltipWrapper = ({ content, children }: { content: string, children: React.ReactNode }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent>
        {content}
      </TooltipContent>
    </Tooltip>
  );

  return (
    <Dialog 
      open={showSelectionDialog} 
      onOpenChange={(open) => {
        if (!open && !confirmingSelection) {
          handleClose();
        }
      }}
      aria-labelledby="details-selection-dialog-title"
    >
      <DialogContent 
        className="bg-[#2f3e46] border border-[#52796f] text-[#cad2c5] max-w-5xl w-[90vw] max-h-[80vh] h-[600px] flex flex-col rounded-lg shadow-lg"
        onEscapeKeyDown={(e) => {
          // Prevent default escape key behavior and handle manually
          e.preventDefault();
          if (!confirmingSelection) {
            handleClose();
          }
        }}
      >
        <DialogHeader className="flex-shrink-0 flex justify-between items-center">
          <DialogTitle id="details-selection-dialog-title" className="text-[#a8c5b5]">Επιλογή Λεπτομερειών</DialogTitle>
          <DialogClose asChild onClick={handleClose}>
            <Button variant="ghost" className="h-8 w-8 p-0 text-[#a8c5b5] hover:text-white hover:bg-[#354f52]" aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </DialogHeader>
        
        <div className="flex flex-col space-y-4 py-4 flex-grow overflow-hidden px-2">
          <div className="flex space-x-4 h-[450px] flex-shrink-0">
            {/* Categories List */}
            <div className="w-1/3 border border-[#52796f] rounded-md overflow-hidden flex-shrink-0 shadow-md">
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
                        <TooltipProvider>
                          <SafeTooltipWrapper content={category.category_name}>
                            <span className="block truncate text-xs font-medium">
                              {category.category_name.length > 30 
                                ? `${category.category_name.substring(0, 30)}...` 
                                : category.category_name}
                            </span>
                          </SafeTooltipWrapper>
                        </TooltipProvider>
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
            <div className="w-2/3 border border-[#52796f] rounded-md overflow-hidden flex-shrink-0 shadow-md">
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
                                        <TooltipProvider>
                                          <SafeTooltipWrapper 
                                            content={subcategory.subcategory_name}
                                          >
                                            <span>
                                              {subcategory.subcategory_name.substring(0, 60)}
                                              <span className="ml-1 ellipsis-blue">...</span>
                                            </span>
                                          </SafeTooltipWrapper>
                                        </TooltipProvider>
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
                : 'bg-[#84a98c] text-white hover:bg-[#52796f] focus:outline-none focus:ring-2 focus:ring-[#52796f] focus:ring-offset-2 focus:ring-offset-[#2f3e46]'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Προσθήκη στην Προσφορά</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CategorySelectionDialog; 