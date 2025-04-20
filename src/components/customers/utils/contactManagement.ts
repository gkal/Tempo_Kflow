import { createPrefixedLogger } from "@/utils/loggingUtils";
import { toast } from "@/components/ui/use-toast";

const logger = createPrefixedLogger('ContactManagement');

// Set primary contact for a customer
export const setPrimaryContact = async (
  customerId: string,
  contactId: string,
  updateCustomer: (id: string, data: any) => Promise<any>
) => {
  try {
    // Use DataService instead of direct supabase call
    await updateCustomer(customerId, { primary_contact_id: contactId });
    
    return contactId;
  } catch (error) {
    logger.error("Error setting primary contact:", error);
    throw error;
  }
};

// Delete contact safely with proper cleanup
export const handleDeleteContact = async (
  contactToDelete: any, 
  customerId: string,
  primaryContactId: string,
  updateCustomer: (id: string, data: any) => Promise<any>,
  softDeleteContact: (id: string) => Promise<any>
) => {
  try {
    // Check if this is the primary contact
    if (contactToDelete.id === primaryContactId) {
      // Update customer to remove primary contact reference
      await updateCustomer(customerId, { primary_contact_id: null });
    }
    
    // Delete the contact using DataService soft delete
    await softDeleteContact(contactToDelete.id);
    
    // Show success toast
    toast({
      title: "Επιτυχία",
      description: "Η επαφή διαγράφηκε με επιτυχία.",
      variant: "default",
    });
    
    return true;
  } catch (error) {
    logger.error("Error deleting contact:", error);
    
    toast({
      title: "Σφάλμα",
      description: "Προέκυψε σφάλμα κατά τη διαγραφή της επαφής.",
      variant: "destructive",
    });
    
    return false;
  }
}; 