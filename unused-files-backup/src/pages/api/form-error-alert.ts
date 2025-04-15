import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';
import { ErrorSeverity, ErrorType } from '@/services/formErrorTrackingService';

/**
 * API handler for sending alerts about critical form errors
 * Alerts can be sent via email, Slack, or other notification channels
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      formLinkId,
      errorType,
      errorMessage,
      severity,
      fieldName,
      metadata,
      timestamp
    } = req.body;
    
    // Validate required fields
    if (!formLinkId || !errorType || !errorMessage || !severity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Fetch form link details for context
    const { data: formLink, error: formLinkError } = await supabase
      .from('customer_form_links')
      .select('id, customer_id, status')
      .eq('id', formLinkId)
      .single();
    
    if (formLinkError) {
      console.error('Error fetching form link details:', formLinkError);
      return res.status(500).json({ error: 'Failed to fetch form context' });
    }
    
    // Fetch customer details for context
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, company_name, email, telephone')
      .eq('id', formLink.customer_id)
      .single();
    
    if (customerError) {
      console.error('Error fetching customer details:', customerError);
      return res.status(500).json({ error: 'Failed to fetch customer context' });
    }
    
    // Create alert record
    const { error: alertError } = await supabase
      .from('form_error_alerts')
      .insert({
        form_link_id: formLinkId,
        customer_id: formLink.customer_id,
        error_type: errorType,
        error_message: errorMessage,
        severity,
        field_name: fieldName,
        metadata,
        created_at: timestamp || new Date().toISOString(),
        is_resolved: false
      });
    
    if (alertError) {
      console.error('Error creating error alert:', alertError);
      return res.status(500).json({ error: 'Failed to create alert record' });
    }
    
    // Get admin users to notify
    const { data: adminUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email, user_metadata')
      .or('role.eq.admin,role.eq.superadmin');
    
    if (usersError) {
      console.error('Error fetching admin users:', usersError);
      return res.status(500).json({ error: 'Failed to fetch notification recipients' });
    }
    
    // Create notification messages
    const notificationData = adminUsers.map(user => ({
      user_id: user.id,
      title: `Κρίσιμο σφάλμα φόρμας: ${getErrorTypeText(errorType as ErrorType)}`,
      message: `${getSeverityEmoji(severity as ErrorSeverity)} ${errorMessage}${fieldName ? ` (Πεδίο: ${fieldName})` : ''}\nΠελάτης: ${customer.company_name}`,
      link: `/forms/errors?id=${formLinkId}`,
      is_read: false,
      created_at: new Date().toISOString(),
      metadata: {
        formLinkId,
        errorType,
        severity,
        customerId: customer.id
      }
    }));
    
    // Insert notifications for admin users
    if (notificationData.length > 0) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notificationData);
      
      if (notificationError) {
        console.error('Error creating notifications:', notificationError);
      }
    }
    
    // Send email alerts for HIGH and CRITICAL severity
    if (severity === ErrorSeverity.HIGH || severity === ErrorSeverity.CRITICAL) {
      await sendEmailAlerts({
        adminUsers,
        errorType: errorType as ErrorType,
        errorMessage,
        severity: severity as ErrorSeverity,
        fieldName,
        customer,
        formLinkId
      });
    }
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing error alert:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get emoji representation of error severity
 */
function getSeverityEmoji(severity: ErrorSeverity): string {
  switch (severity) {
    case ErrorSeverity.CRITICAL:
      return '🔴';
    case ErrorSeverity.HIGH:
      return '🟠';
    case ErrorSeverity.MEDIUM:
      return '🟡';
    case ErrorSeverity.LOW:
      return '🟢';
    default:
      return '⚠️';
  }
}

/**
 * Get Greek text representation of error type
 */
function getErrorTypeText(errorType: ErrorType): string {
  switch (errorType) {
    case ErrorType.VALIDATION:
      return 'Σφάλμα Επικύρωσης';
    case ErrorType.SUBMISSION:
      return 'Σφάλμα Υποβολής';
    case ErrorType.API:
      return 'Σφάλμα API';
    case ErrorType.CONNECTIVITY:
      return 'Πρόβλημα Σύνδεσης';
    default:
      return 'Άγνωστο Σφάλμα';
  }
}

/**
 * Send email alerts to admin users
 */
async function sendEmailAlerts(params: {
  adminUsers: any[];
  errorType: ErrorType;
  errorMessage: string;
  severity: ErrorSeverity;
  fieldName?: string;
  customer: any;
  formLinkId: string;
}): Promise<void> {
  const {
    adminUsers,
    errorType,
    errorMessage,
    severity,
    fieldName,
    customer,
    formLinkId
  } = params;
  
  try {
    // This would integrate with your existing email service
    // For now, just log the alert
    console.log(`
      [FORM ERROR ALERT]
      Type: ${getErrorTypeText(errorType)}
      Severity: ${severity} ${getSeverityEmoji(severity)}
      Message: ${errorMessage}
      ${fieldName ? `Field: ${fieldName}` : ''}
      Customer: ${customer.company_name} (${customer.email})
      Form Link ID: ${formLinkId}
      Recipients: ${adminUsers.map(u => u.email).join(', ')}
    `);
    
    // In a real implementation, you would call your email service here
    // Example: await emailService.sendErrorAlert({ ... });
  } catch (error) {
    console.error('Error sending email alerts:', error);
  }
} 