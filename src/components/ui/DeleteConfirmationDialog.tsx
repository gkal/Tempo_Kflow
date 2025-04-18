import React from 'react';
import { ModernDeleteConfirmation, ModernDeleteConfirmationProps } from './ModernDeleteConfirmation';

// Re-export the props type for backwards compatibility
export type DeleteConfirmationDialogProps = ModernDeleteConfirmationProps;

// Export a wrapper component that uses ModernDeleteConfirmation
export const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = (props) => {
  return <ModernDeleteConfirmation {...props} />;
}; 
