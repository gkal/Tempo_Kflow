import React, { useState, useCallback } from 'react';
import { ModernDeleteConfirmation, UseModernDeleteConfirmationProps } from '@/components/ui/ModernDeleteConfirmation';

// Re-export the useModernDeleteConfirmation hook as useDeleteConfirmation for backward compatibility
export const useDeleteConfirmation = (props: UseModernDeleteConfirmationProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const renderDeleteConfirmationDialog = useCallback(() => (
    <ModernDeleteConfirmation
      {...props}
      open={isOpen}
      onOpenChange={setIsOpen}
    />
  ), [isOpen, props]);

  return {
    open,
    close,
    isOpen,
    handleConfirmDelete: props.onDelete,
    DeleteConfirmationDialog: renderDeleteConfirmationDialog,
  };
}; 