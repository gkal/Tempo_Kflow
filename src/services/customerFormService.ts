import { supabase } from '@/lib/supabaseClient';
import { CustomerFormLink } from './formLinkService/types';
import { createOfferFromFormSubmission } from './offerCreationService';
import { sendApprovalResultEmail } from './emailService';
import { getUserInfo } from './userService';
import { logActivity } from '@/utils/auditUtils';
import { CustomerFormInfo } from './customerFormService/types';

interface FormApprovalData {
  formLinkId: string;
  approved: boolean;
  notes?: string;
}

/**
 * Service for managing customer forms
 */
export const CustomerFormService = {
  /**
   * Check if user has permission to approve forms
   * @param userId User ID to check
   * @returns Promise that resolves to true if user has permission
   */
  async checkUserApprovalPermission(userId: string): Promise<boolean> {
    try {
      // Cast to any to bypass TypeScript type instantiation issues
      const client = supabase as any;
      
      const { data: userPermissions } = await client
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_readonly', true)
        .single();

      // If user has readonly permission, they can't approve forms
      if (userPermissions) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking user approval permission:', error);
      return false;
    }
  },

  /**
   * Process form approval or rejection
   * @param formApprovalData Object containing form link ID, approval status, and notes
   * @returns The updated form link record
   */
  async processFormApproval(
    formApprovalData: FormApprovalData
  ): Promise<CustomerFormLink> {
    const { formLinkId, approved, notes } = formApprovalData;
    const client = supabase as any;

    // Get the current user
    const currentUser = await getUserInfo();
    
    if (!currentUser || !currentUser.id) {
      throw new Error('Δεν είστε συνδεδεμένος. Παρακαλώ συνδεθείτε και προσπαθήστε ξανά.');
    }

    // Check if user has permission to approve forms
    const hasPermission = await this.checkUserApprovalPermission(currentUser.id);
    
    if (!hasPermission) {
      throw new Error('Δεν έχετε δικαίωμα να εγκρίνετε ή να απορρίψετε φόρμες.');
    }

    // Get the form link
    const { data: formLink, error: fetchError } = await client
      .from('customer_form_links')
      .select('*')
      .eq('id', formLinkId)
      .single();
    
    if (fetchError || !formLink) {
      throw new Error('Η φόρμα δεν βρέθηκε.');
    }

    // Check if form is in a state where it can be approved or rejected
    if (formLink.status !== 'submitted') {
      throw new Error(`Η φόρμα δεν μπορεί να ${approved ? 'εγκριθεί' : 'απορριφθεί'} στην τρέχουσα κατάσταση (${formLink.status}).`);
    }

    // Start database transaction
    const { error: transactionError } = await client.rpc('begin_transaction');
    
    if (transactionError) {
      throw new Error(`Σφάλμα κατά την έναρξη της συναλλαγής: ${transactionError.message}`);
    }

    try {
      // Update form link status
      const { data: updatedFormLink, error: updateError } = await client
        .from('customer_form_links')
        .update({
          status: approved ? 'approved' : 'rejected',
          notes: notes || '',
          approved_by: currentUser.id,
          approval_at: new Date().toISOString(),
        })
        .eq('id', formLinkId)
        .select('*')
        .single();

      if (updateError || !updatedFormLink) {
        throw new Error('Failed to update form link');
      }

      // Log activity
      await logActivity({
        activity_type: approved ? 'FORM_APPROVED' : 'FORM_REJECTED',
        user_id: currentUser.id,
        entity_type: 'customer_form_link',
        entity_id: formLinkId,
        details: notes ? { notes } : {},
      });

      // If approved, create an offer from the form data
      if (approved && formLink.customer_id && formLink.submission_data) {
        await createOfferFromFormSubmission(formLink.customer_id, formLink.submission_data);
      }

      // Send email notification to customer
      const customerEmail = formLink.submission_data?.email || '';
      if (customerEmail) {
        // Create a customer info object from form data for the email template
        const customerInfo: CustomerFormInfo = {
          id: formLink.customer_id,
          name: formLink.submission_data?.company_name || '',
          email: customerEmail,
          createdAt: formLink.created_at
        };
        
        await sendApprovalResultEmail(
          customerInfo,
          approved,
          notes || '',
          customerEmail
        );
      }

      // Commit transaction
      const { error: commitError } = await client.rpc('commit_transaction');
      
      if (commitError) {
        throw new Error(`Σφάλμα κατά την ολοκλήρωση της συναλλαγής: ${commitError.message}`);
      }

      return updatedFormLink as CustomerFormLink;
    } catch (error) {
      // Rollback transaction
      await client.rpc('rollback_transaction');
      
      console.error('Error processing form approval:', error);
      throw error instanceof Error 
        ? error
        : new Error(`Σφάλμα κατά την επεξεργασία της φόρμας: ${String(error)}`);
    }
  }
};

// Re-export the standalone functions for backward compatibility
export const checkUserApprovalPermission = CustomerFormService.checkUserApprovalPermission.bind(CustomerFormService);
export const processFormApproval = CustomerFormService.processFormApproval.bind(CustomerFormService); 