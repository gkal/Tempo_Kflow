import React, { useEffect } from 'react';
import DetailsContextProvider from './DetailsContextProvider';
import { useDetailsContext } from './DetailsContext';
import AddItemButton from './AddItemButton';
import CategorySelectionDialog from './CategorySelectionDialog';
import DetailsTable from './DetailsTable';

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
    <div className="space-y-4 pointer-events-auto" style={{ zIndex: 1 }}>
      <AddItemButton />
      
      <DetailsTable />
      
      {/* Dialogs */}
      <CategorySelectionDialog />
    </div>
  );
};

// Main component that provides the context
const DetailsTab: React.FC = () => {
  return (
    <div className="pointer-events-auto" style={{ position: 'relative', zIndex: 5 }}>
      <DetailsContextProvider>
        <DetailsTabContent />
      </DetailsContextProvider>
    </div>
  );
};

export default DetailsTab; 