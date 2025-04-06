import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';
import { useDetailsContext } from './DetailsContext';

const AddItemButton: React.FC = () => {
  const { 
    setShowSelectionDialog,
    dialogLoading,
    handleDialogOpenChange
  } = useDetailsContext();

  const handleAddClick = (e: React.MouseEvent) => {
    // Explicitly stop propagation to prevent parent elements from catching this event
    e.stopPropagation();
    e.preventDefault();
    
    // Open the selection dialog
    setShowSelectionDialog(true);
    handleDialogOpenChange(true);
  };

  return (
    <div className="flex justify-between items-center mb-4 relative pointer-events-auto" style={{ zIndex: 100 }}>
      <h2 className="text-xl font-semibold text-[#a8c5b5]">Στοιχεία Προσφοράς</h2>
      <Button
        type="button"
        variant="default"
        onClick={handleAddClick}
        disabled={dialogLoading}
        className="bg-[#52796f] hover:bg-[#354f52] text-white cursor-pointer relative z-[999] pointer-events-auto"
        style={{ 
          cursor: 'pointer', 
          position: 'relative',
          zIndex: 10000
        }}
      >
        <PlusIcon className="h-4 w-4 mr-2" />
        Προσθήκη
      </Button>
    </div>
  );
};

export default AddItemButton; 