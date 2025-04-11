import { createRecord, fetchRecordById, updateRecord } from '@/services/api/supabaseService';
import { supabase } from '@/lib/supabaseClient';
import { CustomerFormLink } from './formLinkService/types';
import { createOfferFromFormSubmission } from './offerCreationService';
import { sendApprovalResultEmail } from './emailService';
import { getUserInfo } from './userService';
import { logActivity } from '@/utils/auditUtils';

interface FormApprovalData {
  formLinkId: string;
  approved: boolean;
  notes?: string;
}

export async function checkUserApprovalPermission(userId: string): Promise<boolean> {
  // Check if user has readonly permission
  try {
    const { data: userPermissions } = await supabase
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
}

/**
 * Process form approval or rejection
 * @param formApprovalData Object containing form link ID, approval status, and notes
 * @returns The updated form link record
 */
export async function processFormApproval(
  formApprovalData: FormApprovalData
): Promise<CustomerFormLink> {
  const { formLinkId, approved, notes } = formApprovalData;

  // Get the current user
  const currentUser = await getUserInfo();
  
  if (!currentUser || !currentUser.id) {
    throw new Error('Δεν είστε συνδεδεμένος. Παρακαλώ συνδεθείτε και προσπαθήστε ξανά.');
  }

  // Check if user has permission to approve forms
  const hasPermission = await checkUserApprovalPermission(currentUser.id);
  
  if (!hasPermission) {
    throw new Error('Δεν έχετε δικαίωμα να εγκρίνετε ή να απορρίψετε φόρμες.');
  }

  // Get the form link
  const formLink = await fetchRecordById<CustomerFormLink>('customer_form_links', formLinkId);
  
  if (!formLink) {
    throw new Error('Η φόρμα δεν βρέθηκε.');
  }

  // Check if form is in a state where it can be approved or rejected
  if (formLink.status !== 'submitted' && formLink.status !== 'pending_approval') {
    throw new Error(`Η φόρμα δεν μπορεί να ${approved ? 'εγκριθεί' : 'απορριφθεί'} στην τρέχουσα κατάσταση (${formLink.status}).`);
  }

  // Start database transaction
  const { error: transactionError } = await supabase.rpc('begin_transaction');
  
  if (transactionError) {
    throw new Error(`Σφάλμα κατά την έναρξη της συναλλαγής: ${transactionError.message}`);
  }

  try {
    // Update form link status
    const updatedFormLink = await updateRecord<CustomerFormLink>('customer_form_links', formLinkId, {
      status: approved ? 'approved' : 'rejected',
      notes: notes || '',
      approved_by: currentUser.id,
      approval_at: new Date().toISOString(),
    });

    // Log activity
    await logActivity({
      activity_type: approved ? 'FORM_APPROVED' : 'FORM_REJECTED',
      user_id: currentUser.id,
      entity_type: 'customer_form_link',
      entity_id: formLinkId,
      details: notes ? { notes } : {},
    });

    // If approved, create an offer from the form data
    if (approved && formLink.customer_id && formLink.form_data) {
      await createOfferFromFormSubmission(formLink.customer_id, formLink.form_data);
    }

    // Send email notification to customer
    const customerEmail = formLink.form_data?.email || '';
    if (customerEmail) {
      await sendApprovalResultEmail(customerEmail, {
        approved,
        reason: notes || '',
        customerName: formLink.form_data?.company_name || '',
        formLinkId,
      });
    }

    // Commit transaction
    const { error: commitError } = await supabase.rpc('commit_transaction');
    
    if (commitError) {
      throw new Error(`Σφάλμα κατά την ολοκλήρωση της συναλλαγής: ${commitError.message}`);
    }

    return updatedFormLink;
  } catch (error) {
    // Rollback transaction
    await supabase.rpc('rollback_transaction');
    
    console.error('Error processing form approval:', error);
    throw new Error(`Σφάλμα κατά την επεξεργασία της φόρμας: ${error.message}`);
  }
} 