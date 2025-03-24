import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { cn } from "@/lib/utils";
import { CloseButton } from "@/components/ui/close-button";

/**
 * Custom hook to manage dialog state and provide accessibility enhancements
 */
export function useDialogState(defaultOpen = false) {
  const [open, setOpen] = React.useState(defaultOpen);
  const descriptionId = React.useId();
  
  // Fix for dialog backdrop issues
  React.useEffect(() => {
    if (!open) return;
    
    // Fix for dialog backdrop not being removed when dialog is closed
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          const dialogBackdrops = document.querySelectorAll('[data-radix-popper-content-wrapper]');
          
          if (dialogBackdrops.length > 1) {
            // Remove all but the last one
            for (let i = 0; i < dialogBackdrops.length - 1; i++) {
              dialogBackdrops[i].remove();
            }
          }
        }
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    return () => {
      observer.disconnect();
    };
  }, [open]);

  return {
    open,
    setOpen,
    onOpenChange: setOpen,
    descriptionId,
    dialogProps: {
      open,
      onOpenChange: setOpen,
    }
  };
}

// Common z-index values for consistent layering
const Z_INDICES = {
  overlay: 1000,
  content: 1001,
};

/**
 * Dialog root component
 */
const Dialog = DialogPrimitive.Root;

/**
 * Dialog trigger component
 */
const DialogTrigger = DialogPrimitive.Trigger;

/**
 * Dialog portal component
 */
const DialogPortal = DialogPrimitive.Portal;

/**
 * Dialog close component
 */
const DialogClose = DialogPrimitive.Close;

/**
 * Dialog overlay component with backdrop styling
 */
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, style, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    style={{
      ...style,
      zIndex: Z_INDICES.overlay // Much higher z-index for overlay to handle nested dialogs
    }}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

// Content animation classes for consistent animation effects
const CONTENT_ANIMATION_CLASSES = `
  duration-200 
  data-[state=open]:animate-in data-[state=closed]:animate-out 
  data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 
  data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 
  data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] 
  data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]
`;

/**
 * Dialog content component with styling and accessibility enhancements
 */
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    /**
     * Whether to show the close button
     * @default true
     */
    showCloseButton?: boolean;
    /**
     * Handler for when the close button is clicked
     */
    onCloseClick?: () => void;
  }
>(({ 
  className, 
  children, 
  style, 
  showCloseButton = true, 
  onCloseClick,
  ...props 
}, ref) => {
  // Generate a unique ID for the description if aria-describedby is not provided
  const descriptionId = React.useId();
  const ariaDescribedBy = props['aria-describedby'] || descriptionId;
  
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%] grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg sm:rounded-lg",
          "max-h-[90vh] overflow-hidden",
          CONTENT_ANIMATION_CLASSES,
          className
        )}
        style={{
          ...style,
          zIndex: Z_INDICES.content, // Higher than overlay for nested dialogs
          height: style?.height || 'auto'
        }}
        aria-describedby={ariaDescribedBy}
        aria-modal="true"
        role="dialog"
        {...props}
      >
        {children}
        <div id={descriptionId} style={{ display: 'none' }} aria-hidden="true">
          Dialog content
        </div>
        {showCloseButton && (
          <DialogPrimitive.Close asChild>
            <div className="absolute right-4 top-4">
              <CloseButton onClick={onCloseClick || (() => {})} />
            </div>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

/**
 * Dialog header component for title and description layout
 */
const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className,
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

/**
 * Dialog footer component for action buttons layout
 */
const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className,
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

/**
 * Dialog title component with styling
 */
const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className,
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

/**
 * Dialog description component with styling
 */
const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
