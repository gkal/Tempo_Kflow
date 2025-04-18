import React from "react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ComponentPropsWithoutRef } from "react";

// Define the props types manually
type AlertDialogProps = ComponentPropsWithoutRef<typeof AlertDialog>;
type AlertDialogContentProps = ComponentPropsWithoutRef<typeof AlertDialogContent>;

interface AccessibleAlertDialogProps extends AlertDialogProps {
  title: string;
  description?: string;
  contentProps?: AlertDialogContentProps;
  showTitle?: boolean;
  children: React.ReactNode;
}

export function AccessibleAlertDialog({
  title,
  description,
  contentProps,
  showTitle = false,
  children,
  ...props
}: AccessibleAlertDialogProps) {
  return (
    <AlertDialog {...props}>
      <AlertDialogContent {...contentProps}>
        <AlertDialogHeader>
          {showTitle ? (
            <AlertDialogTitle>{title}</AlertDialogTitle>
          ) : (
            <VisuallyHidden asChild>
              <AlertDialogTitle>{title}</AlertDialogTitle>
            </VisuallyHidden>
          )}
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {children}
      </AlertDialogContent>
    </AlertDialog>
  );
} 
