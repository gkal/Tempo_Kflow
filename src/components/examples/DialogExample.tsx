import React from 'react';
import { useDialogHelpers, useDialogCleanup, createDialogId } from '@/hooks';

/**
 * Component demonstrating the usage of useDialogHelpers hook
 */
export const DialogExample: React.FC = () => {
  const { showConfirm, showAlert } = useDialogHelpers();
  
  // Ensure all dialogs are cleaned up when component unmounts
  useDialogCleanup();
  
  // Create specific dialog IDs for this component
  const dialogIds = React.useMemo(() => ({
    basicConfirm: createDialogId('DialogExample', 'basic-confirm'),
    customConfirm: createDialogId('DialogExample', 'custom-confirm'),
    basicAlert: createDialogId('DialogExample', 'basic-alert'),
    customAlert: createDialogId('DialogExample', 'custom-alert'),
    complexDialog: createDialogId('DialogExample', 'complex'),
  }), []);
  
  // Basic confirmation dialog
  const handleBasicConfirm = async () => {
    const confirmed = await showConfirm({
      id: dialogIds.basicConfirm,
      title: 'Basic Confirmation',
      message: 'Are you sure you want to proceed with this action?',
      onClose: () => console.log('Basic confirm dialog closed')
    });
    
    console.log('User confirmed:', confirmed);
  };
  
  // Custom styled confirmation dialog
  const handleCustomConfirm = async () => {
    const confirmed = await showConfirm({
      id: dialogIds.customConfirm,
      title: 'Delete Item',
      message: 'This action cannot be undone. Are you sure you want to delete this item?',
      confirmText: 'Delete',
      cancelText: 'Keep',
      confirmButtonClass: 'bg-red-600 hover:bg-red-700 text-white',
      cancelButtonClass: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
      onConfirm: () => console.log('User clicked confirm button'),
      onCancel: () => console.log('User clicked cancel button'),
      onClose: () => console.log('Delete confirm dialog closed')
    });
    
    if (confirmed) {
      console.log('Item deleted');
    } else {
      console.log('Deletion cancelled');
    }
  };
  
  // Basic alert dialog
  const handleBasicAlert = async () => {
    await showAlert({
      id: dialogIds.basicAlert,
      title: 'Information',
      message: 'This is a simple alert dialog with default styling.',
      onClose: () => console.log('Basic alert dialog closed')
    });
    
    console.log('Alert acknowledged');
  };
  
  // Custom styled alert dialog
  const handleCustomAlert = async () => {
    await showAlert({
      id: dialogIds.customAlert,
      title: 'Success',
      message: 'Your changes have been saved successfully!',
      okText: 'Great!',
      okButtonClass: 'bg-green-600 hover:bg-green-700 text-white',
      onOk: () => console.log('User clicked OK button'),
      onClose: () => console.log('Success alert dialog closed')
    });
    
    console.log('Success alert acknowledged');
  };
  
  // Complex content in dialog
  const handleComplexDialog = async () => {
    const complexContent = (
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Complex Dialog Content</h3>
        <p>This dialog contains complex content with multiple elements.</p>
        <div className="bg-gray-100 p-3 rounded">
          <code>You can include code snippets, images, or any React components here.</code>
        </div>
        <ul className="list-disc pl-5 space-y-1">
          <li>List item one</li>
          <li>List item two</li>
          <li>List item three</li>
        </ul>
      </div>
    );
    
    await showAlert({
      id: dialogIds.complexDialog,
      title: 'Complex Content',
      message: complexContent,
      okText: 'I understand',
      onClose: () => console.log('Complex dialog closed')
    });
  };
  
  return (
    <div className="space-y-6 p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">Dialog Examples</h1>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Confirmation Dialogs</h2>
        <div className="flex space-x-4">
          <button
            onClick={handleBasicConfirm}
            onKeyDown={(e) => e.key === 'Enter' && handleBasicConfirm()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            aria-label="Show basic confirmation dialog"
            tabIndex={0}
          >
            Basic Confirm
          </button>
          <button
            onClick={handleCustomConfirm}
            onKeyDown={(e) => e.key === 'Enter' && handleCustomConfirm()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
            aria-label="Show delete confirmation dialog"
            tabIndex={0}
          >
            Delete Confirm
          </button>
        </div>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Alert Dialogs</h2>
        <div className="flex space-x-4">
          <button
            onClick={handleBasicAlert}
            onKeyDown={(e) => e.key === 'Enter' && handleBasicAlert()}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
            aria-label="Show basic alert dialog"
            tabIndex={0}
          >
            Basic Alert
          </button>
          <button
            onClick={handleCustomAlert}
            onKeyDown={(e) => e.key === 'Enter' && handleCustomAlert()}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
            aria-label="Show success alert dialog"
            tabIndex={0}
          >
            Success Alert
          </button>
          <button
            onClick={handleComplexDialog}
            onKeyDown={(e) => e.key === 'Enter' && handleComplexDialog()}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
            aria-label="Show complex content dialog"
            tabIndex={0}
          >
            Complex Content
          </button>
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-medium">Usage Notes:</h3>
        <p className="text-sm text-gray-700 mt-2">
          Open your browser console to see the callback logs when interacting with the dialogs.
          Each dialog demonstrates different configurations and styling options available through
          the useDialogHelpers hook.
        </p>
      </div>
    </div>
  );
}; 
