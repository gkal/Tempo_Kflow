/**
 * Dialog Cleanup Hook
 * 
 * This hook helps manage dialog cleanup when components unmount.
 * It ensures that any open dialogs associated with a component are 
 * properly closed when the component is removed from the DOM.
 * 
 * Usage:
 * ```tsx
 * import { useDialogCleanup } from '@/hooks/useDialogCleanup';
 * 
 * function MyComponent() {
 *   // This will ensure all dialogs are cleaned up when component unmounts
 *   useDialogCleanup();
 *   
 *   // Or you can specify specific dialog IDs to clean up
 *   useDialogCleanup(['dialog-1', 'dialog-2']);
 * }
 * ```
 * 
 * @module useDialogCleanup
 */

import * as React from 'react';
import { useDialog } from '@/components/ui/GlobalDialogProvider';

/**
 * Hook for automatic dialog cleanup
 * 
 * @param dialogIds - Optional array of specific dialog IDs to clean up
 *                    If not provided, will call closeAllDialogs on unmount
 */
export function useDialogCleanup(dialogIds?: string[]): void {
  const { closeDialog, closeAllDialogs } = useDialog();
  
  React.useEffect(() => {
    // Cleanup function that runs when component unmounts
    return () => {
      if (dialogIds && dialogIds.length > 0) {
        // Close specific dialogs if IDs are provided
        dialogIds.forEach((id) => closeDialog(id));
      } else {
        // Close all dialogs if no specific IDs are provided
        closeAllDialogs();
      }
    };
  }, [closeDialog, closeAllDialogs, dialogIds]);
}

/**
 * Creates a dialog ID with a component prefix for easier tracking
 * 
 * @param componentName - Name of the component creating the dialog
 * @param suffix - Optional suffix to make the ID more specific
 * @returns A formatted dialog ID
 */
export function createDialogId(componentName: string, suffix?: string): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  
  return suffix 
    ? `${componentName}-${suffix}-${timestamp}-${random}` 
    : `${componentName}-${timestamp}-${random}`;
} 