import React, { useState, useEffect, useCallback } from 'react';
import OffersDialog, { OffersDialogProps } from './OffersDialog';

// Define the interface for dialog props (can be a subset of OffersDialogProps)
interface DialogProps {
  customerId: string;
  offerId?: string;
  defaultSource?: string;
  onSave: () => void;
}

// Create a global singleton for managing the dialog
class DialogManager {
  private static instance: DialogManager;
  private listeners: Set<(isOpen: boolean, props?: DialogProps) => void> = new Set();
  private isOpen: boolean = false;
  private dialogProps: DialogProps | null = null;

  private constructor() {}

  public static getInstance(): DialogManager {
    if (!DialogManager.instance) {
      DialogManager.instance = new DialogManager();
    }
    return DialogManager.instance;
  }

  public openDialog(props: DialogProps): void {
    this.isOpen = true;
    this.dialogProps = props;
    this.notifyListeners();
  }

  public closeDialog(): void {
    this.isOpen = false;
    this.notifyListeners();
  }

  public subscribe(listener: (isOpen: boolean, props?: DialogProps) => void): () => void {
    this.listeners.add(listener);
    // Immediately notify the new listener of the current state
    listener(this.isOpen, this.dialogProps || undefined);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.isOpen, this.dialogProps || undefined);
    }
  }
}

// Export the singleton instance
export const dialogManager = DialogManager.getInstance();

// Create a component that renders the dialog based on the manager's state
export function OfferDialogContainer() {
  const [isOpen, setIsOpen] = useState(false);
  const [dialogProps, setDialogProps] = useState<DialogProps | null>(null);

  useEffect(() => {
    // Subscribe to dialog manager changes
    const unsubscribe = dialogManager.subscribe((open, props) => {
      setIsOpen(open);
      if (props) {
        setDialogProps(props);
      }
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  if (!isOpen || !dialogProps) {
    return null;
  }

  // Fix the TypeScript error by explicitly typing the OffersDialog component
  return (
    <OffersDialog
      key={`offer-dialog-${dialogProps.customerId}-${Date.now()}`}
      open={isOpen}
      onOpenChange={(open: boolean) => {
        if (!open) {
          dialogManager.closeDialog();
        }
      }}
      customerId={dialogProps.customerId}
      offerId={dialogProps.offerId}
      defaultSource={dialogProps.defaultSource || 'Email'}
      onSave={dialogProps.onSave}
    />
  );
}

// Helper functions to open dialogs
export function openNewOfferDialog(customerId: string, source: string = 'Email', onSave?: () => void) {
  dialogManager.openDialog({
    customerId,
    defaultSource: source,
    onSave: onSave || (() => {})
  });
}

export function openEditOfferDialog(customerId: string, offerId: string, onSave?: () => void) {
  dialogManager.openDialog({
    customerId,
    offerId,
    onSave: onSave || (() => {})
  });
} 