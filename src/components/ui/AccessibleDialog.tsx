import * as React from "react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  useDialogState
} from "./dialog";
import DialogErrorBoundary from "./DialogErrorBoundary";

/**
 * Props for the AccessibleDialog component
 */
export interface AccessibleDialogProps {
  /**
   * Whether the dialog is open
   */
  open?: boolean;
  /**
   * Callback fired when the open state changes
   */
  onOpenChange?: (open: boolean) => void;
  /**
   * The title of the dialog
   */
  title: string;
  /**
   * Optional description text for the dialog
   */
  description?: string;
  /**
   * Props to pass to the DialogContent component
   */
  contentProps?: React.ComponentPropsWithoutRef<typeof DialogContent>;
  /**
   * Whether to show the title visually
   * @default true
   */
  showTitle?: boolean;
  /**
   * Whether to show the close button
   * @default true
   */
  showCloseButton?: boolean;
  /**
   * Children to render inside the dialog
   */
  children: React.ReactNode;
  /**
   * Optional class name for the dialog content
   */
  className?: string;
  /**
   * Optional handler for when the close button is clicked
   */
  onCloseClick?: () => void;
  /**
   * Optional callback for when an error occurs in the dialog
   */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * AccessibleDialog component that wraps Dialog with accessibility enhancements
 */
export function AccessibleDialog({
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  title,
  description,
  contentProps = {},
  showTitle = true,
  showCloseButton = true,
  children,
  className,
  onCloseClick,
  onError,
}: AccessibleDialogProps) {
  // Use the dialog hook for state management
  const { 
    open: internalOpen, 
    setOpen: internalSetOpen, 
    descriptionId 
  } = useDialogState(!!externalOpen);
  
  // Determine if we're using controlled or uncontrolled mode
  const isControlled = externalOpen !== undefined;
  const open = isControlled ? externalOpen : internalOpen;
  const onOpenChange = isControlled 
    ? externalOnOpenChange 
    : internalSetOpen;

  // Handle title display
  const titleContent = showTitle ? (
    <DialogTitle>{title}</DialogTitle>
  ) : (
    <VisuallyHidden asChild>
      <DialogTitle>{title}</DialogTitle>
    </VisuallyHidden>
  );

  return (
    <DialogErrorBoundary onError={onError}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={className}
          aria-labelledby={title ? "dialog-title" : undefined}
          aria-describedby={description ? descriptionId : undefined}
          showCloseButton={showCloseButton}
          onCloseClick={onCloseClick}
          {...contentProps}
        >
          <DialogHeader>
            <div id="dialog-title">{titleContent}</div>
            {description && (
              <DialogDescription id={descriptionId}>
                {description}
              </DialogDescription>
            )}
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    </DialogErrorBoundary>
  );
} 