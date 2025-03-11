import React from "react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ComponentPropsWithoutRef } from "react";

// Define the props types manually
type DialogProps = ComponentPropsWithoutRef<typeof Dialog>;
type DialogContentProps = ComponentPropsWithoutRef<typeof DialogContent>;

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