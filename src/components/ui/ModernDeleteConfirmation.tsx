import React, { useState, useEffect, useId } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertTriangle, XCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type DeleteStatus = 'idle' | 'deleting' | 'success' | 'error';

export interface ModernDeleteConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => Promise<void>;
  onSuccess?: () => void;
  title?: string;
  description?: string;
  itemToDelete?: string;
  successMessage?: string;
  errorMessage?: string;
  deleteButtonLabel?: string;
  cancelButtonLabel?: string;
  autoCloseDelay?: number;
  destructive?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ModernDeleteConfirmation: React.FC<ModernDeleteConfirmationProps> = ({
  open,
  onOpenChange,
  onDelete,
  onSuccess,
  title = 'Delete Confirmation',
  description = 'Are you sure you want to delete this item? This action cannot be undone.',
  itemToDelete,
  successMessage = 'Successfully deleted.',
  errorMessage = 'An error occurred while trying to delete.',
  deleteButtonLabel = 'Delete',
  cancelButtonLabel = 'Cancel',
  autoCloseDelay = 1500,
  destructive = true,
  size = 'md',
}) => {
  const descriptionId = useId();
  const titleId = useId();
  const [status, setStatus] = useState<DeleteStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [animateIcon, setAnimateIcon] = useState(false);

  const formattedItem = itemToDelete ? (
    itemToDelete.length === 36 && itemToDelete.includes('-') 
      ? 'την επιλεγμένη εγγραφή' 
      : itemToDelete
  ) : '';

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStatus('idle');
      setError(null);
      setAnimateIcon(false);
    }
  }, [open]);

  // Set animation class when status changes to success
  useEffect(() => {
    if (status === 'success') {
      setAnimateIcon(true);
    }
  }, [status]);

  const handleClose = () => {
    if (status === 'deleting') return; // Prevent closing during deletion
    
    onOpenChange(false);
    
    // Execute the success callback after closing if we were in success state
    if (status === 'success' && onSuccess) {
      setTimeout(() => {
        onSuccess();
      }, 100);
    }
    
    // Reset state after a delay to allow for animation
    setTimeout(() => {
      setStatus('idle');
      setError(null);
      setAnimateIcon(false);
    }, 300);
  };

  const handleConfirmDelete = async () => {
    try {
      setStatus('deleting');
      setError(null);
      
      await onDelete();
      
      setStatus('success');
      
      // Auto-close on success after specified delay
      if (autoCloseDelay > 0) {
        setTimeout(() => {
          handleClose();
        }, autoCloseDelay);
      }
    } catch (err) {
      setStatus('error');
      setError(typeof err === 'string' ? err : err instanceof Error ? err.message : errorMessage);
    }
  };

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent 
        className={cn(
          'sm:max-w-[425px]',
          size === 'sm' && 'sm:max-w-[385px]',
          size === 'lg' && 'sm:max-w-[525px]'
        )}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div className="flex flex-col gap-4">
          <AlertDialogDescription id={descriptionId} className="text-base m-0">
            {description}
            {formattedItem && itemToDelete && !itemToDelete.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) && (
              <>
                <br />
                <span className="font-medium">{formattedItem}</span>
              </>
            )}
          </AlertDialogDescription>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={status === 'deleting'}
            >
              {cancelButtonLabel}
            </Button>
            <Button
              type="button"
              variant={destructive ? 'destructive' : 'default'}
              onClick={handleConfirmDelete}
              disabled={status === 'deleting'}
              className="gap-2"
            >
              {status === 'deleting' && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {deleteButtonLabel}
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive mt-2">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// Also create a hook for easy use
export interface UseModernDeleteConfirmationProps extends Omit<ModernDeleteConfirmationProps, 'open' | 'onOpenChange'> {}

export const useModernDeleteConfirmation = (props: UseModernDeleteConfirmationProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  const DeleteDialog = () => (
    <ModernDeleteConfirmation
      {...props}
      open={isOpen}
      onOpenChange={setIsOpen}
    />
  );

  return {
    open,
    close,
    isOpen,
    DeleteDialog,
  };
}; 
