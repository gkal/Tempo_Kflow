import React from 'react';
import {
  AlertDialogContent as OriginalAlertDialogContent,
} from '@/components/ui/alert-dialog';
import { ComponentPropsWithoutRef } from 'react';

// Define the props type using ComponentPropsWithoutRef
type AlertDialogContentProps = ComponentPropsWithoutRef<typeof OriginalAlertDialogContent>;

// Create a unique ID for each instance
let uniqueId = 0;

// Create a custom AlertDialogContent that automatically adds aria-describedby
export const CustomAlertDialogContent: React.FC<AlertDialogContentProps> = (props) => {
  const [descriptionId] = React.useState(`alert-dialog-description-${uniqueId++}`);
  
  return (
    <OriginalAlertDialogContent
      {...props}
      aria-describedby={descriptionId}
    >
      {/* Add a hidden description if none is provided */}
      <div id={descriptionId} style={{ display: 'none' }}>
        Dialog description
      </div>
      {props.children}
    </OriginalAlertDialogContent>
  );
}; 