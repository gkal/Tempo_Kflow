import * as React from "react";
import { AccessibleDialog, AccessibleDialogProps } from "./AccessibleDialog";

/**
 * Interface for a dialog configuration
 */
interface DialogOptions extends Omit<AccessibleDialogProps, "children"> {
  /**
   * Unique ID for the dialog
   */
  id: string;
  /**
   * Content to render inside the dialog
   */
  content: React.ReactNode;
  /**
   * Custom callback for when open state changes
   * This is in addition to the default behavior of closing the dialog
   */
  onOpenChange?: (open: boolean) => void;
}

/**
 * Dialog context interface
 */
interface DialogContextType {
  /**
   * Open a dialog with the provided options
   */
  openDialog: (options: DialogOptions) => void;
  /**
   * Close a dialog by ID
   */
  closeDialog: (id: string) => void;
  /**
   * Close all open dialogs
   */
  closeAllDialogs: () => void;
}

// Create the dialog context
const DialogContext = React.createContext<DialogContextType | undefined>(undefined);

/**
 * Hook to use the dialog context
 */
export function useDialog() {
  const context = React.useContext(DialogContext);
  
  if (!context) {
    throw new Error("useDialog must be used within a GlobalDialogProvider");
  }
  
  return context;
}

/**
 * Props for GlobalDialogProvider
 */
interface GlobalDialogProviderProps {
  /**
   * Children to render inside the provider
   */
  children: React.ReactNode;
}

/**
 * GlobalDialogProvider component that manages dialogs across the application
 */
export function GlobalDialogProvider({ children }: GlobalDialogProviderProps) {
  // State to store active dialogs
  const [dialogs, setDialogs] = React.useState<DialogOptions[]>([]);
  
  // Open a dialog
  const openDialog = React.useCallback((options: DialogOptions) => {
    setDialogs((prev) => {
      // If a dialog with this ID already exists, replace it
      const filtered = prev.filter((dialog) => dialog.id !== options.id);
      return [...filtered, options];
    });
  }, []);
  
  // Close a dialog by ID
  const closeDialog = React.useCallback((id: string) => {
    setDialogs((prev) => prev.filter((dialog) => dialog.id !== id));
  }, []);
  
  // Close all dialogs
  const closeAllDialogs = React.useCallback(() => {
    setDialogs([]);
  }, []);
  
  // Create the context value
  const contextValue = React.useMemo(() => ({
    openDialog,
    closeDialog,
    closeAllDialogs,
  }), [openDialog, closeDialog, closeAllDialogs]);
  
  // Handle escape key to close all dialogs
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dialogs.length > 0) {
        // Close the most recently opened dialog
        const lastDialog = dialogs[dialogs.length - 1];
        closeDialog(lastDialog.id);
      }
    };
    
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [dialogs, closeDialog]);
  
  return (
    <DialogContext.Provider value={contextValue}>
      {children}
      
      {/* Render all active dialogs */}
      {dialogs.map((dialog) => (
        <AccessibleDialog
          key={dialog.id}
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              // Call custom onOpenChange handler if provided
              dialog.onOpenChange?.(open);
              // Close the dialog
              closeDialog(dialog.id);
            }
          }}
          title={dialog.title}
          description={dialog.description}
          showTitle={dialog.showTitle}
          showCloseButton={dialog.showCloseButton}
          contentProps={dialog.contentProps}
          className={dialog.className}
          onCloseClick={() => closeDialog(dialog.id)}
          onError={(error) => {
            console.error(`Dialog ${dialog.id} error:`, error);
            closeDialog(dialog.id);
          }}
        >
          {dialog.content}
        </AccessibleDialog>
      ))}
    </DialogContext.Provider>
  );
} 