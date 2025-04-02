import React from 'react';
import { Button } from '@/components/ui/button';
import { useDetailsContext } from './DetailsContext';
import { Check } from 'lucide-react';

const SelectionConfirm: React.FC = () => {
  const { 
    selectedItems, 
    confirmingSelection, 
    setConfirmingSelection,
    currentCategoryId,
    getFullCategoryName,
    getFullSubcategoryName
  } = useDetailsContext();

  if (selectedItems.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-4 space-y-4">
        <div>
          <h3 className="text-lg font-medium">Επιβεβαίωση Επιλογής</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Έχετε επιλέξει {selectedItems.length} {selectedItems.length === 1 ? 'στοιχείο' : 'στοιχεία'} 
            από την κατηγορία "{currentCategoryId ? getFullCategoryName(currentCategoryId) : ''}".
          </p>
        </div>

        <div className="max-h-60 overflow-y-auto border rounded-md">
          <ul className="divide-y">
            {selectedItems.map((item, index) => (
              <li key={index} className="p-2 text-sm">
                {getFullSubcategoryName(item.subcategoryId)}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirmingSelection(false)}
            disabled={confirmingSelection}
            className="border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-[#cad2c5]"
          >
            Ακύρωση
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={() => setConfirmingSelection(true)}
            disabled={confirmingSelection}
            className="bg-[#52796f] hover:bg-[#354f52] text-white"
          >
            <Check className="h-4 w-4 mr-2" />
            Επιβεβαίωση
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SelectionConfirm; 