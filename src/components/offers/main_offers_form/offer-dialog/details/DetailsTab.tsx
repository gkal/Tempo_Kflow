import React, { useEffect } from 'react';
import DetailsContextProvider from './DetailsContextProvider';
import { useDetailsContext } from './DetailsContext';
import AddItemButton from './AddItemButton';
import CategorySelectionDialog from './CategorySelectionDialog';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';
import DetailsTable from './DetailsTable';
import SelectionConfirm from './SelectionConfirm';

// Inner component that uses the context
const DetailsTabContent: React.FC = () => {
  const {
    showDeleteDialog,
    setShowDeleteDialog,
    detailToDelete,
    setDetailToDelete,
    cleanupDialogPortals,
    markedForDeletion,
    setMarkedForDeletion,
    details
  } = useDetailsContext();

  // Cleanup function
  useEffect(() => {
    return () => {
      cleanupDialogPortals();
    };
  }, [cleanupDialogPortals]);

  const handleDeleteConfirm = () => {
    if (detailToDelete) {
      if (detailToDelete.id) {
        // For existing items, mark for deletion
        setMarkedForDeletion(prev => {
          const newSet = new Set(prev);
          newSet.add(detailToDelete.id as string);
          return newSet;
        });
      } else {
        // For UI-only items, remove from selectedDetails
        // This will be handled by the context provider
      }
      
      setShowDeleteDialog(false);
      setDetailToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      <AddItemButton />
      
      <DetailsTable />
      
      {/* Dialogs */}
      <CategorySelectionDialog />
      
      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDeleteConfirm}
      />
      
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