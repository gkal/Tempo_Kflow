import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDetailsContext } from './DetailsContext';
import { Input } from '@/components/ui/input';
import { TrashIcon } from 'lucide-react';
import { OfferDetail } from '@/types/offer-details';
import { GlobalDropdown } from "@/components/ui/GlobalDropdown";

const DetailsTable: React.FC = () => {
  const {
    // Data states
    details,
    selectedDetails,
    units,
    
    // UI states
    loading,
    error,
    markedForDeletion,
    
    // Selection states
    setDetailToDelete,
    
    // Dialog states
    setShowDeleteDialog,
    
    // Functions
    handleUnitChange,
    handlePriceChange,
    
    // Utility functions
    truncateText,
    getFullCategoryName,
    getFullSubcategoryName,
    getFullUnitName
  } = useDetailsContext();

  // Create a local ref for tooltip tracking instead of using the context ref
  const localTooltipMountedRef = useRef(false);

  // Function to update the tooltip mounted state
  const handleTooltipMount = () => {
    localTooltipMountedRef.current = true;
  };

  // Combine existing details from DB and selected details, ensuring no duplicates
  const allDetails = React.useMemo(() => {
    const combinedDetails = [...details];
    
    // Add selected details that don't exist in the DB
    selectedDetails.forEach(selectedDetail => {
      const exists = details.some(detail => 
        detail.subcategory_id === selectedDetail.subcategory_id && 
        !detail.date_updated // Use date_updated as a proxy for active items
      );
      
      if (!exists) {
        combinedDetails.push(selectedDetail);
      }
    });
    
    return combinedDetails;
  }, [details, selectedDetails]);

  // Group details by category
  const detailsByCategory = React.useMemo(() => {
    const map = new Map<string, OfferDetail[]>();
    
    allDetails.forEach(detail => {
      // Consider an item not deleted if it doesn't have date_updated
      // This is a temporary solution until we have a proper deleted_at field
      const isActive = !detail.date_updated;
      
      if (isActive) {
        const categoryId = detail.category_id;
        if (!map.has(categoryId)) {
          map.set(categoryId, []);
        }
        map.get(categoryId)?.push(detail);
      }
    });
    
    return map;
  }, [allDetails]);

  const handleDeleteClick = (detail: OfferDetail) => {
    setDetailToDelete(detail);
    setShowDeleteDialog(true);
  };

  // Utility functions for the dropdown
  const renderUnitOption = (id: string) => {
    const unit = units.find(u => u.id === id);
    return unit?.name || "—";
  };

  if (loading) {
    return <div className="text-center py-4">Φόρτωση...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center py-4">{error}</div>;
  }

  if (detailsByCategory.size === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Δεν υπάρχουν στοιχεία. Προσθέστε στοιχεία χρησιμοποιώντας το κουμπί "Προσθήκη" παραπάνω.
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="overflow-y-auto border border-[#52796f] rounded-md max-h-[350px]">
        <table className="w-full text-xs text-[#cad2c5] details-table">
          <thead className="details-table-header">
            <tr className="border-b border-[#52796f]">
              <th className="text-left py-2 px-3 font-medium text-[#84a98c]" colSpan={2}>Κατηγορία / Περιγραφή</th>
              <th className="text-center py-2 px-3 font-medium text-[#84a98c] w-48">Μονάδα</th>
              <th className="text-center py-2 px-3 font-medium text-[#84a98c]">Τιμή</th>
              <th className="w-10 py-2 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {Array.from(detailsByCategory.entries()).map(([categoryId, categoryDetails]) => (
              <React.Fragment key={categoryId}>
                {/* Category row */}
                <tr className="bg-[#354f52]/70 category-row">
                  <td colSpan={5} className="py-2 px-3 font-medium">
                    {truncateText(getFullCategoryName(categoryId), 40)}
                  </td>
                </tr>
                
                {/* Subcategory rows */}
                {categoryDetails.map((detail) => {
                  const isUIOnly = !detail.id || detail.id.startsWith('ui-');
                  const isMarkedForDeletion = detail.id ? markedForDeletion.has(detail.id) : false;
                  
                  return (
                    <tr 
                      key={detail.id || detail.subcategory_id} 
                      className={`
                        hover:bg-[#2f3e46] 
                        ${isMarkedForDeletion ? 'bg-[#84a98c]/10' : ''}
                        ${isUIOnly ? 'bg-[#354f52]/30' : ''}
                      `} 
                      data-row-id={detail.id}
                    >
                      <td className="w-4 py-2">
                        {isUIOnly && (
                          <span className="inline-block w-3 h-3 rounded-full bg-[#84a98c] ml-1" title="Προσωρινό - Δεν έχει αποθηκευτεί"></span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block truncate max-w-[250px] text-[#84a98c]">
                              {getFullSubcategoryName(detail.subcategory_id || '')}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div onMouseEnter={handleTooltipMount}>
                              {getFullSubcategoryName(detail.subcategory_id || '')}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center">
                          <GlobalDropdown
                            options={units.map(unit => ({
                              id: unit.id,
                              name: unit.name
                            }))}
                            value={detail.unit_id || ""}
                            onSelect={(unitId) => handleUnitChange(
                              detail.id || detail.subcategory_id || '',
                              unitId,
                              isUIOnly
                            )}
                            renderOption={renderUnitOption}
                            renderValue={getFullUnitName}
                            placeholder="Επιλέξτε μονάδα"
                            className="w-32"
                            disabled={isMarkedForDeletion}
                          />
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={detail.price || ''}
                            onChange={(e) => handlePriceChange(
                              detail.id || detail.subcategory_id || '',
                              parseFloat(e.target.value) || 0,
                              isUIOnly
                            )}
                            disabled={isMarkedForDeletion}
                            className="bg-[#354f52] text-[#cad2c5] text-xs border-[#52796f] hover:bg-[#2f3e46] w-20 text-center"
                          />
                          <span className="ml-1 text-[#84a98c] text-xs">€</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center">
                        {!isMarkedForDeletion && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(detail)}
                            className="h-8 w-8 text-gray-400 hover:text-gray-300 hover:bg-[#354f52]/50"
                            aria-label="Διαγραφή"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  );
};

export default DetailsTable; 