/**
 * CustomerContactManagement component
 * Handles contact management for CustomerForm
 * Extracted from CustomerForm.tsx to improve modularity
 */

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactDialog } from "@/components/contacts/ContactDialog";
import { ContactList } from "@/components/contacts/ContactList";
import { Label } from "@/components/ui/label";
import { GlobalDropdown } from "@/components/ui/GlobalDropdown";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCustomerForm } from "./CustomerFormProvider";
import { useDataService } from "@/hooks/useDataService";
import { createPrefixedLogger } from "@/utils/loggingUtils";

// Initialize logger
const logger = createPrefixedLogger('CustomerContactManagement');

interface CustomerContactManagementProps {
  viewOnly?: boolean;
}

export const CustomerContactManagement: React.FC<CustomerContactManagementProps> = ({
  viewOnly = false
}) => {
  // Get necessary state and functions from context
  const {
    customerId,
    formData,
    contacts,
    selectedContact,
    showContactDialog,
    contactToDelete,
    showDeleteDialog,
    isDeleting,
    isDeleteSuccessful,
    setContacts,
    setSelectedContact,
    setShowContactDialog,
    setContactToDelete,
    setShowDeleteDialog,
    handleContactSelect,
    setPrimaryContact,
    fetchContacts
  } = useCustomerForm();

  // Use the data service for contacts
  const { create: createContact, softDelete: softDeleteContact } = useDataService<any>('contacts');

  // Handle adding a new contact
  const handleAddContact = () => {
    setShowContactDialog(true);
  };

  // Handle contact creation from the dialog
  const handleContactCreated = async (contactData: any) => {
    if (!customerId) return;

    try {
      // Add the customer ID to the contact data
      const dataWithCustomerId = {
        ...contactData,
        customer_id: customerId
      };

      // Create the contact using data service
      await createContact(dataWithCustomerId);

      // Refresh the contacts list
      fetchContacts();

      // Close the dialog
      setShowContactDialog(false);
    } catch (error) {
      logger.error("Error creating contact:", error);
    }
  };

  // Prepare to delete a contact
  const handleDeleteContactClick = (contact: any) => {
    setContactToDelete(contact);
    setShowDeleteDialog(true);
  };

  // Handle actual contact deletion
  const handleDeleteContact = async () => {
    if (!contactToDelete) return;

    try {
      // Use softDelete from data service (sets deleted_at)
      await softDeleteContact(contactToDelete.id);

      // Update the contacts list by filtering out the deleted one
      setContacts(prev => prev.filter(c => c.id !== contactToDelete.id));

      // If the deleted contact was the primary one, set a new primary if available
      if (contactToDelete.id === formData.primary_contact_id && contacts.length > 1) {
        const newPrimaryContact = contacts.find(c => c.id !== contactToDelete.id);
        if (newPrimaryContact) {
          await setPrimaryContact(newPrimaryContact.id);
        }
      }

      setContactToDelete(null);
      setShowDeleteDialog(false);
    } catch (error) {
      logger.error("Error deleting contact:", error);
    }
  };

  // Render the contacts management section
  return (
    <div className="mt-2">
      {/* Contact Management Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-[#84a98c] font-medium">Επαφές</Label>
          {!viewOnly && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAddContact}
              className="text-[#84a98c] hover:text-[#cad2c5] hover:bg-[#354f52]"
            >
              <Plus className="h-4 w-4 mr-1" /> Νέα Επαφή
            </Button>
          )}
        </div>

        {/* Primary Contact Dropdown */}
        {contacts.length > 0 && (
          <div className="mb-2">
            <Label htmlFor="primary_contact" className="text-[#84a98c] text-sm">
              Κύρια Επαφή
            </Label>
            <GlobalDropdown
              options={contacts.map(contact => ({ id: contact.id, name: `${contact.name} ${contact.surname} - ${contact.role || "N/A"}` }))}
              value={formData.primary_contact_id}
              onSelect={(option) => setPrimaryContact(option)}
              placeholder="Επιλέξτε κύρια επαφή"
              disabled={viewOnly}
              className="w-full bg-[#2f3e46] text-[#cad2c5] mt-1"
            />
          </div>
        )}

        {/* Contacts List */}
        <div className="bg-[#2f3e46] rounded-md border border-[#52796f] p-2 max-h-[300px] overflow-y-auto">
          {contacts.length === 0 ? (
            <div className="text-[#cad2c5] text-sm italic p-2">
              Δεν υπάρχουν επαφές. Προσθέστε μια νέα επαφή.
            </div>
          ) : (
            <ContactList
              contacts={contacts}
              onContactClick={handleContactSelect}
              onAddContact={() => setShowContactDialog(true)}
              primaryContactId={formData.primary_contact_id}
              onSetPrimary={(contactId) => setPrimaryContact(contactId)}
              onDeleteContact={!viewOnly ? handleDeleteContactClick : undefined}
            />
          )}
        </div>
      </div>

      {/* Contact Dialog */}
      <ContactDialog
        open={showContactDialog}
        onOpenChange={setShowContactDialog}
        customerId={customerId || ""}
        refreshData={() => fetchContacts()}
      />

      {/* Delete Contact Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Διαγραφή Επαφής</AlertDialogTitle>
            <AlertDialogDescription>
              Είστε βέβαιοι ότι θέλετε να διαγράψετε αυτήν την επαφή;
              {contactToDelete && contactToDelete.id === formData.primary_contact_id && (
                <span className="text-red-500 block mt-2">
                  Προσοχή: Αυτή είναι η κύρια επαφή.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Άκυρο</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteContact}
              className="bg-red-600 hover:bg-red-700"
            >
              Διαγραφή
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}; 