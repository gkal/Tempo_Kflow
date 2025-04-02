import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

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

/**
 * Dialog overlay component with backdrop styling
 */
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

/**
 * Dialog content component with styling and accessibility enhancements
 */
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    showCloseButton?: boolean;
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
  const descriptionId = React.useId();
  const titleId = React.useId();
  const ariaDescribedBy = props['aria-describedby'] || descriptionId;
  const ariaLabelledBy = props['aria-labelledby'] || titleId;
  
  const hasDialogTitle = React.Children.toArray(children).some(
    child => React.isValidElement(child) && 
    (
      child.type === DialogTitle ||
      (child.type === DialogHeader && 
       React.Children.toArray(child.props.children).some(
         headerChild => React.isValidElement(headerChild) && headerChild.type === DialogTitle
       ))
    )
  );
  
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 bg-background p-6 shadow-lg duration-200 sm:rounded-lg outline-none border-0",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
          "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
          className
        )}
        style={{
          overflowX: 'hidden'
        }}
        {...props}
      >
        {!hasDialogTitle && (
          <VisuallyHidden asChild>
            <DialogTitle id={titleId}>Dialog</DialogTitle>
          </VisuallyHidden>
        )}
        {children}
        <div id={descriptionId} style={{ display: 'none' }} aria-hidden="true">
          Dialog content
        </div>
        {showCloseButton && (
          <DialogPrimitive.Close asChild>
            <div className="absolute right-4 top-4 z-[51]">
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

const styles = `
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
