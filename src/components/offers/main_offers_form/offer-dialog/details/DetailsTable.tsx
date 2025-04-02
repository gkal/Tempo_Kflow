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
    
    // Update functions
    setMarkedForDeletion,
    setSelectedDetails,
    
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
        !detail.is_deleted // Use is_deleted flag to check if the item is active
      );
      
      if (!exists) {
        combinedDetails.push(selectedDetail);
      }
    });
    
    return combinedDetails;
  }, [details, selectedDetails]);

  // Extract PriceInput to a memoized component to reduce re-renders
  const PriceInput = React.memo(({ 
    detailId, 
    price, 
    isUIOnly, 
    isDisabled 
  }: { 
    detailId: string; 
    price: number | null | undefined; 
    isUIOnly: boolean; 
    isDisabled: boolean;
  }) => {
    const { handlePriceChange } = useDetailsContext();
    const [inputValue, setInputValue] = React.useState<string>(
      price !== undefined && price !== null && price !== 0 ? price.toString() : ''
    );
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Update local state when prop changes (e.g. when loading data)
    // but only if we don't have focus to avoid disrupting user input
    React.useEffect(() => {
      const hasCurrentFocus = inputRef.current === document.activeElement;
      if (!hasCurrentFocus && price !== undefined && price !== null) {
        if (price === 0) {
          setInputValue('');
        } else {
          setInputValue(price.toString());
        }
      }
    }, [price]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault(); // Prevent default browser behavior
      const newValue = e.target.value;
      
      // Use a timeout to ensure the state update happens after the event
      // This helps maintain focus
      setTimeout(() => {
        setInputValue(newValue);
        
        // Parse and update the actual value, but don't pass 0 when the field is empty
        const numValue = newValue === '' ? undefined : parseFloat(newValue) || 0;
        handlePriceChange(detailId, numValue as number, isUIOnly);
      }, 0);
    };

    return (
      <div className="flex items-center justify-center">
        <Input
          ref={inputRef}
          type="number"
          min="0"
          step="0.01"
          value={inputValue}
          onChange={handleChange}
          onFocus={(e) => {
            // Select all text when focused for easier editing
            e.target.select();
          }}
          disabled={isDisabled}
          className="bg-[#354f52] text-[#cad2c5] text-xs border-[#52796f] hover:bg-[#2f3e46] w-20 text-center"
          onBlur={() => {
            // Only add a 0 on blur if the field is empty and it's not disabled
            if (inputValue === '' && !isDisabled) {
              setInputValue('');
            }
          }}
        />
        <span className="ml-1 text-[#84a98c] text-xs">€</span>
      </div>
    );
  }, (prevProps, nextProps) => {
    // Custom comparison for memo to prevent unnecessary re-renders
    // Only re-render if one of these props has changed
    return (
      prevProps.isDisabled === nextProps.isDisabled &&
      prevProps.isUIOnly === nextProps.isUIOnly &&
      prevProps.detailId === nextProps.detailId &&
      (prevProps.price === nextProps.price || 
        (prevProps.price === 0 && nextProps.price === undefined) ||
        (prevProps.price === undefined && nextProps.price === 0)
      )
    );
  });

  // For better debugging
  PriceInput.displayName = 'PriceInput';

  // Extract UnitSelector to a memoized component to reduce re-renders
  const UnitSelector = React.memo(({
    detailId,
    unitId,
    isUIOnly,
    isDisabled
  }: {
    detailId: string;
    unitId: string;
    isUIOnly: boolean;
    isDisabled: boolean;
  }) => {
    const { units, handleUnitChange, getFullUnitName } = useDetailsContext();
    
    const handleSelect = (selectedUnitId: string) => {
      handleUnitChange(detailId, selectedUnitId, isUIOnly);
    };

    return (
      <div className="flex items-center justify-center">
        <GlobalDropdown
          options={units.map(unit => ({
            id: unit.id,
            name: unit.name
          }))}
          value={unitId || ""}
          onSelect={handleSelect}
          renderOption={(option) => typeof option === 'string' ? option : option.name}
          renderValue={(id) => getFullUnitName(id)}
          placeholder="Επιλέξτε μονάδα"
          className="w-32"
          disabled={isDisabled}
        />
      </div>
    );
  });

  // For better debugging
  UnitSelector.displayName = 'UnitSelector';

  // Group details by category
  const detailsByCategory = React.useMemo(() => {
    const map = new Map<string, OfferDetail[]>();
    
    allDetails.forEach(detail => {
      // Use is_deleted flag to determine if an item is active
      const isActive = !detail.is_deleted;
      
      if (isActive) {
        const categoryId = detail.category_id;
        if (!map.has(categoryId)) {
          map.set(categoryId, []);
        }
        map.get(categoryId)?.push(detail);
      }
    });
    
    // Sort subcategories within each category by name
    map.forEach((details, categoryId) => {
      details.sort((a, b) => {
        const nameA = getFullSubcategoryName(a.subcategory_id || '').toLowerCase();
        const nameB = getFullSubcategoryName(b.subcategory_id || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
    });
    
    return map;
  }, [allDetails, getFullSubcategoryName]);

  const handleDeleteClick = (detail: OfferDetail) => {
    // If it's a database item (has a real ID), toggle its deletion state
    if (detail.id && !detail.id.startsWith('ui-')) {
      setMarkedForDeletion(prev => {
        const newSet = new Set(prev);
        // If already marked for deletion, unmark it
        if (newSet.has(detail.id)) {
          newSet.delete(detail.id);
        } else {
          // Otherwise mark it for deletion
          newSet.add(detail.id);
        }
        return newSet;
      });
    } else {
      // For UI-only items, remove them from selectedDetails
      setSelectedDetails(prev => 
        prev.filter(item => 
          item.id !== detail.id && 
          item.subcategory_id !== detail.subcategory_id
        )
      );
    }
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
                        ${isMarkedForDeletion ? 'opacity-70' : ''}
                        ${isUIOnly ? 'bg-[#354f52]/30' : ''}
                      `} 
                      data-row-id={detail.id}
                    >
                      <td className="w-4 py-2">
                        {isUIOnly && (
                          <span className="inline-block w-3 h-3 rounded-full bg-[#84a98c] ml-1" title="Προσωρινό - Δεν έχει αποθηκευτεί"></span>
                        )}
                        {isMarkedForDeletion && (
                          <span className="inline-block w-3 h-3 rounded-full bg-red-500 ml-1" title="Επισημασμένο για διαγραφή - Θα διαγραφεί οριστικά κατά την αποθήκευση"></span>
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
                        <UnitSelector
                          detailId={detail.id || detail.subcategory_id || ''}
                          unitId={detail.unit_id || ''}
                          isUIOnly={isUIOnly}
                          isDisabled={isMarkedForDeletion}
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <PriceInput
                          detailId={detail.id || detail.subcategory_id || ''}
                          price={detail.price}
                          isUIOnly={isUIOnly}
                          isDisabled={isMarkedForDeletion}
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            handleDeleteClick(detail);
                            
                            return false;
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                            }
                          }}
                          className={`h-8 w-8 ${isMarkedForDeletion ? 'text-red-500 hover:text-red-400' : 'text-gray-400 hover:text-gray-300'} hover:bg-[#354f52]/50`}
                          aria-label={isMarkedForDeletion ? "Ακύρωση διαγραφής" : "Διαγραφή"}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
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