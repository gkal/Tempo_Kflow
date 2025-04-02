import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';
import { useDetailsContext } from './DetailsContext';

const AddItemButton: React.FC = () => {
  const { 
    setShowSelectionDialog,
    dialogLoading
  } = useDetailsContext();

  const handleAddClick = () => {
    setShowSelectionDialog(true);
  };

  return (
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-xl font-semibold text-[#a8c5b5]">Στοιχεία Προσφοράς</h2>
      <Button
        type="button"
        variant="default"
        onClick={handleAddClick}
        disabled={dialogLoading}
        className="bg-[#52796f] hover:bg-[#354f52] text-white"
      >
        <PlusIcon className="h-4 w-4 mr-2" />
        Προσθήκη
      </Button>
    </div>
  );
};

export default AddItemButton; 