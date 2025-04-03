import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ModernDeleteConfirmation } from '@/components/ui/ModernDeleteConfirmation';
import { CustomerDialog } from '@/components/customers/CustomerDialog';
import { Customer } from '@/types/CustomerTypes';

interface CustomerActionsProps {
  showNewCustomerDialog: boolean;
  showDeleteCustomerDialog: boolean;
  customerToDelete: Customer | null;
  isAdminOrSuperUser: boolean;
  onNewCustomer: () => void;
  onCloseNewCustomerDialog: () => void;
  onCloseDeleteDialog: () => void;
  onConfirmDelete: () => Promise<void>;
}

export const CustomerActions: React.FC<CustomerActionsProps> = ({
  showNewCustomerDialog,
  showDeleteCustomerDialog,
  customerToDelete,
  isAdminOrSuperUser,
  onNewCustomer,
  onCloseNewCustomerDialog,
  onCloseDeleteDialog,
  onConfirmDelete
}) => {
  return (
    <>
      {/* New Customer Button */}
      <div className="flex justify-end mb-4">
        <Button
          onClick={onNewCustomer}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Νέος Πελάτης
        </Button>
      </div>

      {/* New Customer Dialog */}
      {showNewCustomerDialog && (
        <CustomerDialog
          open={showNewCustomerDialog}
          onOpenChange={onCloseNewCustomerDialog}
          onSave={async () => {
            onCloseNewCustomerDialog();
            return Promise.resolve();
          }}
        />
      )}

      {/* Delete Customer Dialog */}
      {showDeleteCustomerDialog && customerToDelete && (
        <ModernDeleteConfirmation
          open={showDeleteCustomerDialog}
          onOpenChange={onCloseDeleteDialog}
          onDelete={onConfirmDelete}
          title="Διαγραφή Πελάτη"
          description={`Είστε σίγουροι ότι θέλετε να διαγράψετε τον πελάτη "${customerToDelete.company_name}"?`}
          deleteButtonLabel="Διαγραφή"
          cancelButtonLabel="Ακύρωση"
          destructive={true}
        />
      )}
    </>
  );
}; 