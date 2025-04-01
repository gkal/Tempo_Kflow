import * as React from "react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface DialogWrapperProps {
  /**
   * Whether the dialog is open
   */
  open?: boolean;
  /**
   * Callback fired when the open state changes
   */
  onOpenChange?: (open: boolean) => void;
  /**
   * The title of the dialog (required for accessibility)
   */
  title: string;
  /**
   * Whether to visually hide the title
   * @default false
   */
  hideTitle?: boolean;
  /**
   * Children to render inside the dialog
   */
  children: React.ReactNode;
  /**
   * Optional class name for the dialog content
   */
  className?: string;
  /**
   * Any additional props to pass to DialogContent
   */
  contentProps?: React.ComponentPropsWithoutRef<typeof DialogContent>;
}

/**
 * A wrapper component that ensures DialogContent always has a DialogTitle
 * for accessibility, with the option to visually hide it if needed.
 */
export function DialogWrapper({
  open,
  onOpenChange,
  title,
  hideTitle = false,
  children,
  className,
  contentProps,
}: DialogWrapperProps) {
  // Create a unique ID for the dialog title
  const titleId = React.useId();
  
  // Create the title element based on whether it should be visually hidden
  const titleElement = hideTitle ? (
    <VisuallyHidden asChild>
      <DialogTitle id={titleId}>{title}</DialogTitle>
    </VisuallyHidden>
  ) : (
    <DialogTitle id={titleId}>{title}</DialogTitle>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={className} 
        aria-labelledby={titleId}
        {...contentProps}
      >
        {titleElement}
        {children}
      </DialogContent>
    </Dialog>
  );
}
