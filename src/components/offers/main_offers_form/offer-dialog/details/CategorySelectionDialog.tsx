import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, X, ArrowLeft } from 'lucide-react';
import { useDetailsContext } from './DetailsContext';
import { Skeleton } from '@/components/ui/skeleton';
import { ServiceCategory, ServiceSubcategory } from '@/types/offer-details';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger,
  TruncateWithTooltip 
} from "@/components/ui/GlobalTooltip";
import ErrorBoundary from '@/components/ErrorBoundary';
import { fetchSubcategories } from './DetailsService';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CloseButton } from '@/components/ui/close-button';

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

  // If the dialog is not open, don't render anything
  if (!showSelectionDialog) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 pointer-events-auto"
      onClick={(e) => {
        // Only close if clicking the backdrop (not the card)
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
      style={{ 
        zIndex: 9999,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Card className="bg-[#2f3e46] border border-[#52796f] text-[#cad2c5] max-w-5xl w-[90vw] max-h-[80vh] h-[550px] flex flex-col rounded-lg shadow-lg pointer-events-auto"
        style={{ 
          zIndex: 10000,
          position: 'relative',
          marginTop: 0
        }}
      >
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="icon" 
                className="mr-2"
                onClick={handleClose}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <CardTitle id="details-selection-dialog-title" className="text-[#a8c5b5] text-left">
                Επιλογή Λεπτομερειών
              </CardTitle>
            </div>
            <div className="relative" style={{ zIndex: 10002 }}>
              <CloseButton onClick={handleClose} />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex flex-col space-y-4 flex-grow overflow-hidden px-4">
          <div className="flex space-x-6 h-[350px] flex-shrink-0">
            {/* Categories List */}
            <div className="w-[38%] border border-[#52796f] rounded-md overflow-hidden flex-shrink-0 shadow-md">
              <div className="bg-[#354f52] px-3 py-2 border-b border-[#52796f]">
                <h3 className="text-[#a8c5b5] text-base font-medium">Κατηγορίες</h3>
              </div>
              <div className="overflow-y-auto h-[calc(100%-36px)] max-h-[310px] overflow-x-hidden">
                {categories.length > 0 ? (
                  <div className="divide-y divide-[#52796f]/30">
                    {categories
                      .sort((a, b) => a.category_name.toLowerCase().localeCompare(b.category_name.toLowerCase()))
                      .map((category) => (
                      <div 
                        key={category.id}
                        className={`px-3 py-1 cursor-pointer hover:bg-[#354f52]/50 ${
                          currentCategoryId === category.id ? 'bg-[#354f52]/70' : ''
                        }`}
                        onClick={() => handleCategoryClick(category.id)}
                      >
                        <TruncateWithTooltip 
                          text={category.category_name}
                          maxLength={50}
                          tooltipMaxWidth={600}
                          className="block text-xs font-medium max-w-full break-words"
                          disabled={category.category_name.length <= 50}
                        />
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
            <div className="w-[58%] border-[1px] border-[#52796f] rounded-md overflow-hidden flex-shrink-0 shadow-md">
              <div className="bg-[#354f52] px-3 py-2 border-b border-[#52796f]">
                <h3 className="text-[#a8c5b5] text-base font-medium">
                  {currentCategoryId 
                    ? `Περιγραφές: ${truncateText(categories.find(c => c.id === currentCategoryId)?.category_name || "", 20)}`
                    : "Περιγραφές"
                  }
                </h3>
              </div>
              <div className="overflow-y-auto h-[calc(100%-36px)] max-h-[310px] overflow-x-hidden">
                {currentCategoryId ? (
                  dialogLoading ? (
                    <div className="p-3 text-center">
                      <div className="animate-pulse text-[#cad2c5]/70 text-sm">Φόρτωση περιγραφών...</div>
                    </div>
                  ) : subcategories.filter(sub => sub.category_id === currentCategoryId).length > 0 ? (
                    <div className="divide-y divide-[#52796f]/30">
                      {subcategories
                        .filter(sub => sub.category_id === currentCategoryId)
                        .sort((a, b) => a.subcategory_name.toLowerCase().localeCompare(b.subcategory_name.toLowerCase()))
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
                                <TruncateWithTooltip 
                                  text={subcategory.subcategory_name}
                                  maxLength={70}
                                  tooltipMaxWidth={600}
                                  className="text-xs max-w-full break-words"
                                  disabled={subcategory.subcategory_name.length <= 70}
                                />
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
              : 'Δεν έχετε επιλέξει στοιχεία'}
          </div>
        </CardContent>
        
        <CardFooter className="border-t border-[#52796f] bg-[#2f3e46]/80 p-4 flex-shrink-0">
          <div className="flex justify-between w-full">
            <Button 
              variant="outline" 
              className="text-[#cad2c5] border-[#52796f]"
              onClick={handleClose}
            >
              Ακύρωση
            </Button>
            
            <Button 
              variant="default" 
              className={`bg-[#52796f] hover:bg-[#354f52] text-white ${
                selectedItems.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={handleSelectionConfirm}
              disabled={selectedItems.length === 0}
            >
              Προσθήκη ({selectedItems.length})
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default CategorySelectionDialog; 
