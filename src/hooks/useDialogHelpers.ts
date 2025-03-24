/**
 * Dialog Helpers Hook
 * 
 * This hook provides helper functions for managing dialog interactions such as
 * confirmation dialogs, alert dialogs, and other common dialog-related operations.
 * 
 * Usage:
 * ```tsx
 * import { useDialogHelpers } from '@/hooks/useDialogHelpers';
 * 
 * function MyComponent() {
 *   const { showConfirm, showAlert } = useDialogHelpers();
 *   
 *   const handleDelete = async () => {
 *     const confirmed = await showConfirm({
 *       title: 'Confirm Deletion',
 *       message: 'Are you sure you want to delete this item?',
 *       confirmText: 'Delete',
 *       confirmButtonClass: 'bg-red-600 hover:bg-red-700',
 *       onClose: () => console.log('Dialog was closed')
 *     });
 *     
 *     if (confirmed) {
 *       // Perform deletion
 *     }
 *   };
 * }
 * ```
 * 
 * Files using this hook:
 * - src/components/customers/CustomerDetailPage.tsx
 * - src/components/offers/OffersPage.tsx
 * 
 * @module useDialogHelpers
 */

import * as React from 'react';
import { useDialog } from '@/components/ui/GlobalDialogProvider';
import { nanoid } from 'nanoid';

/**
 * Base dialog options shared between different dialog types
 */
export interface BaseDialogOptions {
  /** Optional unique ID for the dialog */
  id?: string;
  /** Title of the dialog */
  title?: string;
  /** Message to display in the dialog */
  message: React.ReactNode;
  /** Optional callback when dialog is closed (whether confirmed or canceled) */
  onClose?: () => void;
}

/**
 * Options for showing a confirmation dialog
 */
export interface ConfirmDialogOptions extends BaseDialogOptions {
  /** Text for the confirm button */
  confirmText?: string;
  /** Text for the cancel button */
  cancelText?: string;
  /** CSS class for the confirm button */
  confirmButtonClass?: string;
  /** CSS class for the cancel button */
  cancelButtonClass?: string;
  /** Optional callback when user confirms */
  onConfirm?: () => void;
  /** Optional callback when user cancels */
  onCancel?: () => void;
}

/**
 * Options for showing an alert dialog
 */
export interface AlertDialogOptions extends BaseDialogOptions {
  /** Text for the OK button */
  okText?: string;
  /** CSS class for the OK button */
  okButtonClass?: string;
  /** Optional callback when OK is clicked */
  onOk?: () => void;
}

/**
 * Hook for dialog helper functions
 * 
 * This hook provides helper functions for managing dialog interactions such as
 * confirmation dialogs, alert dialogs, and other common dialog-related operations.
 * 
 * @example
 * ```tsx
 * import { useDialogHelpers } from '@/hooks/useDialogHelpers';
 * 
 * function MyComponent() {
 *   const { showConfirm, showAlert } = useDialogHelpers();
 *   
 *   const handleDelete = async () => {
 *     const confirmed = await showConfirm({
 *       title: 'Confirm Deletion',
 *       message: 'Are you sure you want to delete this item?',
 *       confirmText: 'Delete',
 *       confirmButtonClass: 'bg-red-600 hover:bg-red-700'
 *     });
 *     
 *     if (confirmed) {
 *       // Perform deletion
 *     }
 *   };
 * }
 * ```
 * 
 * @returns Object containing dialog helper functions
 */
export function useDialogHelpers() {
  const { openDialog, closeDialog } = useDialog();

  /**
   * Shows a confirmation dialog and returns a promise that resolves to true if confirmed
   */
  const showConfirm = React.useCallback(
    (options: ConfirmDialogOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        // Use provided id or generate a new one
        const dialogId = options.id || nanoid();
        
        // Define handlers
        const handleConfirm = () => {
          closeDialog(dialogId);
          options.onConfirm?.();
          options.onClose?.();
          resolve(true);
        };
        
        const handleCancel = () => {
          closeDialog(dialogId);
          options.onCancel?.();
          options.onClose?.();
          resolve(false);
        };

        // Prepare style classes
        const cancelBtnClass = options.cancelButtonClass || "bg-[#354f52] text-[#cad2c5] hover:bg-[#52796f]";
        const confirmBtnClass = options.confirmButtonClass || "bg-[#52796f] text-[#cad2c5] hover:bg-[#84a98c]";

        // Create confirmation dialog content
        const dialogContent = React.createElement(
          'div',
          { className: "space-y-4" },
          React.createElement('div', null, options.message),
          React.createElement(
            'div',
            { className: "flex justify-end space-x-2" },
            React.createElement(
              'button',
              { 
                onClick: handleCancel,
                className: `px-4 py-2 rounded ${cancelBtnClass}`
              },
              options.cancelText || "Cancel"
            ),
            React.createElement(
              'button',
              { 
                onClick: handleConfirm,
                className: `px-4 py-2 rounded ${confirmBtnClass}`
              },
              options.confirmText || "Confirm"
            )
          )
        );

        // Show the dialog
        openDialog({
          id: dialogId,
          title: options.title || "Confirmation",
          content: dialogContent,
          onOpenChange: (open) => {
            if (!open) {
              options.onClose?.();
              resolve(false);
            }
          }
        });
      });
    },
    [openDialog, closeDialog]
  );

  /**
   * Shows an alert dialog and returns a promise that resolves when dismissed
   */
  const showAlert = React.useCallback(
    (options: AlertDialogOptions): Promise<void> => {
      return new Promise((resolve) => {
        // Use provided id or generate a new one
        const dialogId = options.id || nanoid();
        
        // Define handler
        const handleOk = () => {
          closeDialog(dialogId);
          options.onOk?.();
          options.onClose?.();
          resolve();
        };

        // Prepare style class
        const okBtnClass = options.okButtonClass || "bg-[#52796f] text-[#cad2c5] hover:bg-[#84a98c]";

        // Create alert dialog content
        const dialogContent = React.createElement(
          'div',
          { className: "space-y-4" },
          React.createElement('div', null, options.message),
          React.createElement(
            'div',
            { className: "flex justify-end" },
            React.createElement(
              'button',
              { 
                onClick: handleOk,
                className: `px-4 py-2 rounded ${okBtnClass}`
              },
              options.okText || "OK"
            )
          )
        );

        // Show the dialog
        openDialog({
          id: dialogId,
          title: options.title || "Alert",
          content: dialogContent,
          onOpenChange: (open) => {
            if (!open) {
              options.onClose?.();
              resolve();
            }
          }
        });
      });
    },
    [openDialog, closeDialog]
  );

  return {
    showConfirm,
    showAlert
  };
} 