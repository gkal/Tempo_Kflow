import React from "react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogProps,
  DialogContentProps
} from "@/components/ui/dialog";

interface AccessibleDialogProps extends DialogProps {
  title: string;
  description?: string;
  contentProps?: DialogContentProps;
  showTitle?: boolean;
  children: React.ReactNode;
}

export function AccessibleDialog({
  title,
  description,
  contentProps,
  showTitle = false,
  children,
  ...props
}: AccessibleDialogProps) {
  return (
    <Dialog {...props}>
      <DialogContent {...contentProps}>
        <DialogHeader>
          {showTitle ? (
            <DialogTitle>{title}</DialogTitle>
          ) : (
            <VisuallyHidden asChild>
              <DialogTitle>{title}</DialogTitle>
            </VisuallyHidden>
          )}
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
} 