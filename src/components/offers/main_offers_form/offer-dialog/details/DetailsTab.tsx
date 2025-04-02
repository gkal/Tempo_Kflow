import React, { useEffect } from 'react';
import DetailsContextProvider from './DetailsContextProvider';
import { useDetailsContext } from './DetailsContext';
import AddItemButton from './AddItemButton';
import CategorySelectionDialog from './CategorySelectionDialog';
import DetailsTable from './DetailsTable';
import SelectionConfirm from './SelectionConfirm';

// Inner component that uses the context
const DetailsTabContent: React.FC = () => {
  const { cleanupDialogPortals } = useDetailsContext();

  // Cleanup function
  useEffect(() => {
    return () => {
      cleanupDialogPortals();
    };
  }, [cleanupDialogPortals]);

  return (
    <div className="space-y-4">
      <AddItemButton />
      
      <DetailsTable />
      
      {/* Dialogs */}
      <CategorySelectionDialog />
      
      {/* Selection confirmation overlay */}
      <SelectionConfirm />
    </div>
  );
};

// Main component that provides the context
const DetailsTab: React.FC = () => {
  return (
    <DetailsContextProvider>
      <DetailsTabContent />
    </DetailsContextProvider>
  );
};

export default DetailsTab; 