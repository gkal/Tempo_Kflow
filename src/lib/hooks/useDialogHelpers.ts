import * as React from 'react';
import { useDialog } from '@/components/ui/GlobalDialogProvider';
import { nanoid } from 'nanoid';

/**
 * Options for showing a confirmation dialog
 */
export interface ConfirmDialogOptions {
  /**
   * Title of the confirmation dialog
   * @default "Confirmation"
   */
  title?: string;
  /**
   * Message to display in the confirmation dialog
   */
  message: React.ReactNode;
  /**
   * Text for the confirm button
   * @default "Confirm"
   */
  confirmText?: string;
  /**
   * Text for the cancel button
   * @default "Cancel"
   */
  cancelText?: string;
  /**
   * CSS class for the confirm button
   * @default "btn-primary"
   */
  confirmButtonClass?: string;
  /**
   * CSS class for the cancel button
   * @default "btn-secondary"
   */
  cancelButtonClass?: string;
  /**
   * Whether the dialog should be closed when clicking outside
   * @default false
   */
  closeOnOutsideClick?: boolean;
}

/**
 * Options for showing an alert dialog
 */
export interface AlertDialogOptions {
  /**
   * Title of the alert dialog
   * @default "Alert"
   */
  title?: string;
  /**
   * Message to display in the alert dialog
   */
  message: React.ReactNode;
  /**
   * Text for the OK button
   * @default "OK"
   */
  okText?: string;
  /**
   * CSS class for the OK button
   * @default "btn-primary"
   */
  okButtonClass?: string;
  /**
   * Whether the dialog should be closed when clicking outside
   * @default true
   */
  closeOnOutsideClick?: boolean;
}

/**
 * A hook that provides helpers for working with dialogs
 */
export function useDialogHelpers() {
  // Get the base dialog context functions
  const { openDialog, closeDialog, closeAllDialogs } = useDialog();

  /**
   * Show a confirmation dialog and return a promise that resolves when the user confirms or rejects
   */
  const confirm = React.useCallback(
    (options: ConfirmDialogOptions): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        const dialogId = `confirm-${nanoid()}`;
        
        // Handle confirm action
        const handleConfirm = () => {
          closeDialog(dialogId);
          resolve(true);
        };
        
        // Handle cancel action
        const handleCancel = () => {
          closeDialog(dialogId);
          resolve(false);
        };
        
        // Open the confirmation dialog
        openDialog({
          id: dialogId,
          title: options.title || 'Confirmation',
          showCloseButton: false,
          content: (
            <div className="space-y-4">
              <div className="py-2">{options.message}</div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  className={`px-4 py-2 rounded ${options.cancelButtonClass || 'btn-secondary'}`}
                  onClick={handleCancel}
                >
                  {options.cancelText || 'Cancel'}
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 rounded ${options.confirmButtonClass || 'btn-primary'}`}
                  onClick={handleConfirm}
                  autoFocus
                >
                  {options.confirmText || 'Confirm'}
                </button>
              </div>
            </div>
          ),
        });
      });
    },
    [openDialog, closeDialog]
  );

  /**
   * Show an alert dialog and return a promise that resolves when the user acknowledges it
   */
  const alert = React.useCallback(
    (options: AlertDialogOptions): Promise<void> => {
      return new Promise<void>((resolve) => {
        const dialogId = `alert-${nanoid()}`;
        
        // Handle OK action
        const handleOk = () => {
          closeDialog(dialogId);
          resolve();
        };
        
        // Open the alert dialog
        openDialog({
          id: dialogId,
          title: options.title || 'Alert',
          showCloseButton: false,
          content: (
            <div className="space-y-4">
              <div className="py-2">{options.message}</div>
              <div className="flex justify-end">
                <button
                  type="button"
                  className={`px-4 py-2 rounded ${options.okButtonClass || 'btn-primary'}`}
                  onClick={handleOk}
                  autoFocus
                >
                  {options.okText || 'OK'}
                </button>
              </div>
            </div>
          ),
        });
      });
    },
    [openDialog, closeDialog]
  );

  /**
   * Show a custom dialog with the provided content and return its ID
   * This is useful for more complex dialog scenarios where you need to control the lifecycle manually
   */
  const customDialog = React.useCallback(
    (title: string, content: React.ReactNode, options = {}) => {
      const dialogId = `custom-${nanoid()}`;
      
      openDialog({
        id: dialogId,
        title,
        content,
        ...options,
      });
      
      return dialogId;
    },
    [openDialog]
  );

  return {
    confirm,
    alert,
    customDialog,
    closeDialog,
    closeAllDialogs,
  };
} 