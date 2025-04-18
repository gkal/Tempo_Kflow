import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
}

export function ErrorDialog({
  open,
  onOpenChange,
  title,
  description,
}: ErrorDialogProps) {
  const titleId = React.useId();
  const descriptionId = React.useId();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent 
        className="bg-[#2f3e46] border border-[#52796f] text-[#cad2c5]"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <AlertDialogHeader>
          <AlertDialogTitle id={titleId}>{title}</AlertDialogTitle>
          <AlertDialogDescription id={descriptionId} className="text-[#84a98c]">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={() => onOpenChange(false)}
            className="bg-[#52796f] hover:bg-[#52796f]/90 text-[#cad2c5]"
          >
            Εντάξει
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
