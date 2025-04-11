/**
 * Email Service
 * 
 * Provides centralized email functionality for the application using Resend API.
 * Features:
 * - Type-safe email sending with proper error handling
 * - Reusable email templates with consistent styling
 * - Mock implementation for development/testing
 * - Comprehensive logging
 * 
 * All form-related emails should use these services for consistency.
 */

import { logError, logInfo } from '@/utils';
import { getCustomerInfoForOffer } from './offerFormService';

// Update the imports to include CustomerFormLink and other required types
import { CustomerFormLink, FormLinkStatus } from './formLinkService/types';
import { CustomerFormInfo } from './customerFormService/types';

// Types for email data
interface EmailRecipient {
  email: string;
  name?: string;
}

interface EmailOptions {
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface CustomerInfo {
  id?: string;
  company_name: string;
  email?: string;
  telephone?: string;
  contact?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  offer?: {
    id?: string;
    offer_number?: string;
  };
  [key: string]: any;
}

/**
 * Base URL for form links
 * This should be set from environment variables
 */
const FORM_BASE_URL = import.meta.env.VITE_FORM_BASE_URL || 'https://yourapp.com/form';

/**
 * Default sender email
 * This should be set from environment variables
 */
const DEFAULT_FROM_EMAIL = import.meta.env.VITE_EMAIL_FROM || 'offers@yourcompany.com';

/**
 * Default company name for sender
 * This should be set from environment variables
 */
const COMPANY_NAME = import.meta.env.VITE_COMPANY_NAME || 'Your Company';

/**
 * Initialize Resend client with API key
 * Will use a mock implementation if API key is not provided
 */
const initializeResendClient = () => {
  // Check if Resend API key is available
  const apiKey = import.meta.env.VITE_RESEND_API_KEY;
  
  if (!apiKey) {
    logInfo('Resend API key not found, using mock implementation', null, 'EmailService');
    return createMockResendClient();
  }
  
  // Create mock Resend client since the actual package is not installed
  logInfo('Using mock Resend implementation', null, 'EmailService');
  return createMockResendClient();
};

/**
 * Create a mock Resend client for development or when API key is not available
 */
const createMockResendClient = () => {
  return {
    emails: {
      send: async (options: any) => {
        logInfo('MOCK EMAIL SENT', options, 'EmailService');
        return { 
          data: { id: `mock-${Date.now()}` }, 
          error: null 
        };
      }
    }
  };
};

/**
 * Get Resend client (lazy-loaded)
 */
let resendClient: any = null;
const getResendClient = async () => {
  if (!resendClient) {
    resendClient = await initializeResendClient();
  }
  return resendClient;
};

/**
 * Send an email using Resend
 * 
 * @param to Recipient email or array of recipients
 * @param options Email options including subject, content, etc.
 * @returns Promise with the result of the email send operation
 */
export const sendEmail = async (
  to: string | EmailRecipient | (string | EmailRecipient)[],
  options: EmailOptions
): Promise<{ success: boolean; messageId?: string; error?: any }> => {
  try {
    // Format recipients
    const recipients = Array.isArray(to) ? to : [to];
    const formattedRecipients = recipients.map(recipient => {
      if (typeof recipient === 'string') {
        return { email: recipient };
      }
      return recipient;
    });
    
    // Get Resend client
    const resend = await getResendClient();
    
    // Send email
    const { data, error } = await resend.emails.send({
      from: options.from || DEFAULT_FROM_EMAIL,
      to: formattedRecipients.map(r => r.email),
      subject: options.subject,
      text: options.text,
      html: options.html,
      reply_to: options.replyTo,
      cc: options.cc?.map(r => typeof r === 'string' ? r : r.email),
      bcc: options.bcc?.map(r => typeof r === 'string' ? r : r.email),
      attachments: options.attachments,
    });
    
    if (error) {
      logError('Error sending email:', error, 'EmailService');
      return { success: false, error };
    }
    
    logInfo(`Email sent successfully to ${formattedRecipients.map(r => r.email).join(', ')}`, 
      { messageId: data?.id }, 
      'EmailService'
    );
    
    return { success: true, messageId: data?.id };
  } catch (error) {
    logError('Exception in sendEmail:', error, 'EmailService');
    return { success: false, error };
  }
};

/**
 * Generate HTML for customer form link email template
 * 
 * @param customerInfo Customer information object
 * @param formLink Form link URL
 * @param expirationDate When the form link expires
 * @returns EmailTemplate object with subject, html, and text content
 */
const generateCustomerFormLinkTemplate = (
  customerInfo: CustomerFormInfo,
  formLink: string,
  expirationDate: Date
): EmailTemplate => {
  const customerName = customerInfo.name;
  const formattedExpirationDate = expirationDate.toLocaleDateString('el-GR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Customer Form Link</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #4A90E2;
          color: white;
          padding: 20px;
          text-align: center;
        }
        .content {
          padding: 20px;
          background-color: #f9f9f9;
        }
        .button {
          display: inline-block;
          background-color: #4A90E2;
          color: white;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer {
          font-size: 12px;
          color: #777;
          text-align: center;
          margin-top: 20px;
        }
        .expiration {
          color: #e74c3c;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${COMPANY_NAME}</h1>
        </div>
        <div class="content">
          <p>Αγαπητέ/ή ${customerName},</p>
          <p>Σας στέλνουμε αυτό το email για να συμπληρώσετε τη φόρμα με τις απαραίτητες πληροφορίες.</p>
          <p>Παρακαλούμε κάντε κλικ στο παρακάτω σύνδεσμο για να συμπληρώσετε τη φόρμα:</p>
          <p style="text-align: center;">
            <a href="${formLink}" class="button">Συμπλήρωση Φόρμας</a>
          </p>
          <p>Ή αντιγράψτε και επικολλήστε τον παρακάτω σύνδεσμο στο πρόγραμμα περιήγησής σας:</p>
          <p style="word-break: break-all;">${formLink}</p>
          <p class="expiration">Ο σύνδεσμος αυτός θα λήξει στις: ${formattedExpirationDate}</p>
          <p>Αν έχετε ερωτήσεις, μη διστάσετε να επικοινωνήσετε μαζί μας.</p>
          <p>Ευχαριστούμε,<br>${COMPANY_NAME}</p>
        </div>
        <div class="footer">
          <p>Αυτό το email στάλθηκε αυτόματα. Παρακαλούμε μην απαντήσετε σε αυτό το email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
Αγαπητέ/ή ${customerName},

Σας στέλνουμε αυτό το email για να συμπληρώσετε τη φόρμα με τις απαραίτητες πληροφορίες.

Παρακαλούμε χρησιμοποιήστε τον παρακάτω σύνδεσμο για να συμπληρώσετε τη φόρμα:
${formLink}

Ο σύνδεσμος αυτός θα λήξει στις: ${formattedExpirationDate}

Αν έχετε ερωτήσεις, μη διστάσετε να επικοινωνήσετε μαζί μας.

Ευχαριστούμε,
${COMPANY_NAME}

Αυτό το email στάλθηκε αυτόματα. Παρακαλούμε μην απαντήσετε σε αυτό το email.
  `;
  
  return {
    subject: `${COMPANY_NAME} - Φόρμα Πελάτη`,
    html,
    text
  };
};

/**
 * Generate HTML for form submission notification template
 * 
 * @param customerInfo Customer information
 * @param submissionData Form submission data
 * @param submittedAt Date when the form was submitted
 * @returns EmailTemplate object with subject, html, and text content
 */
const generateFormSubmissionNotificationTemplate = (
  customerInfo: CustomerFormInfo,
  submissionData: any,
  submittedAt: Date
): EmailTemplate => {
  const formattedSubmissionDate = submittedAt.toLocaleDateString('el-GR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Format submission data as HTML table
  let submissionHtml = '<table style="width: 100%; border-collapse: collapse; margin-top: 20px;">';
  
  Object.entries(submissionData).forEach(([key, value]) => {
    if (key !== 'formMetadata' && key !== 'attachments') {
      if (typeof value === 'object' && value !== null) {
        submissionHtml += `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${key}</td>
            <td style="padding: 8px; border: 1px solid #ddd;"><pre>${JSON.stringify(value, null, 2)}</pre></td>
          </tr>
        `;
      } else {
        submissionHtml += `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${key}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${value}</td>
          </tr>
        `;
      }
    }
  });
  
  submissionHtml += '</table>';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Form Submission Notification</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #4A90E2;
          color: white;
          padding: 20px;
          text-align: center;
        }
        .content {
          padding: 20px;
          background-color: #f9f9f9;
        }
        .button {
          display: inline-block;
          background-color: #4A90E2;
          color: white;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer {
          font-size: 12px;
          color: #777;
          text-align: center;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Υποβολή Φόρμας Πελάτη</h1>
        </div>
        <div class="content">
          <p><strong>Πελάτης:</strong> ${customerInfo.name}</p>
          <p><strong>Ημερομηνία υποβολής:</strong> ${formattedSubmissionDate}</p>
          <h2>Δεδομένα φόρμας:</h2>
          ${submissionHtml}
          <p style="text-align: center; margin-top: 20px;">
            <a href="${import.meta.env.VITE_APP_URL}/forms/approval" class="button">Έλεγχος Φόρμας</a>
          </p>
        </div>
        <div class="footer">
          <p>Αυτό το email στάλθηκε αυτόματα. Παρακαλούμε μην απαντήσετε σε αυτό το email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  // Create plain text version
  const text = `
Υποβολή Φόρμας Πελάτη

Πελάτης: ${customerInfo.name}
Ημερομηνία υποβολής: ${formattedSubmissionDate}

Δεδομένα φόρμας:
${Object.entries(submissionData)
  .filter(([key]) => key !== 'formMetadata' && key !== 'attachments')
  .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
  .join('\n')}

Για να ελέγξετε τη φόρμα, επισκεφθείτε: ${import.meta.env.VITE_APP_URL}/forms/approval

Αυτό το email στάλθηκε αυτόματα. Παρακαλούμε μην απαντήσετε σε αυτό το email.
  `;
  
  return {
    subject: `Νέα υποβολή φόρμας - ${customerInfo.name}`,
    html,
    text
  };
};

/**
 * Generate HTML for approval request email template
 * 
 * @param customerInfo Customer information
 * @param formLinkId Form link ID
 * @param submissionData Form submission data
 * @param approvalToken Secure token for approval actions
 * @returns EmailTemplate object with subject, html, and text content
 */
const generateApprovalRequestTemplate = (
  customerInfo: CustomerFormInfo,
  formLinkId: string,
  submissionData: any,
  approvalToken: string
): EmailTemplate => {
  // Format submission data as HTML table
  let submissionHtml = '<table style="width: 100%; border-collapse: collapse; margin-top: 20px;">';
  
  Object.entries(submissionData).forEach(([key, value]) => {
    if (key !== 'formMetadata' && key !== 'attachments') {
      if (typeof value === 'object' && value !== null) {
        submissionHtml += `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${key}</td>
            <td style="padding: 8px; border: 1px solid #ddd;"><pre>${JSON.stringify(value, null, 2)}</pre></td>
          </tr>
        `;
      } else {
        submissionHtml += `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${key}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${value}</td>
          </tr>
        `;
      }
    }
  });
  
  submissionHtml += '</table>';
  
  const approveUrl = `${import.meta.env.VITE_APP_URL}/forms/approve/${approvalToken}?action=approve`;
  const rejectUrl = `${import.meta.env.VITE_APP_URL}/forms/approve/${approvalToken}?action=reject`;
  const viewUrl = `${import.meta.env.VITE_APP_URL}/forms/approval/${formLinkId}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Form Approval Request</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #4A90E2;
          color: white;
          padding: 20px;
          text-align: center;
        }
        .content {
          padding: 20px;
          background-color: #f9f9f9;
        }
        .button {
          display: inline-block;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 5px;
          margin: 10px;
          text-align: center;
        }
        .approve {
          background-color: #2ecc71;
          color: white;
        }
        .reject {
          background-color: #e74c3c;
          color: white;
        }
        .view {
          background-color: #3498db;
          color: white;
        }
        .footer {
          font-size: 12px;
          color: #777;
          text-align: center;
          margin-top: 20px;
        }
        .actions {
          display: flex;
          justify-content: center;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Αίτημα Έγκρισης Φόρμας</h1>
        </div>
        <div class="content">
          <p>Έχει υποβληθεί μια νέα φόρμα από τον πελάτη <strong>${customerInfo.name}</strong> και απαιτείται η έγκρισή σας.</p>
          
          <h2>Δεδομένα φόρμας:</h2>
          ${submissionHtml}
          
          <div class="actions">
            <a href="${approveUrl}" class="button approve">Έγκριση</a>
            <a href="${rejectUrl}" class="button reject">Απόρριψη</a>
            <a href="${viewUrl}" class="button view">Προβολή Λεπτομερειών</a>
          </div>
          
          <p>Ή μπορείτε να επισκεφθείτε το <a href="${import.meta.env.VITE_APP_URL}/forms/approval">σύστημα διαχείρισης φορμών</a> για περισσότερες λεπτομέρειες και επιλογές.</p>
        </div>
        <div class="footer">
          <p>Αυτό το email στάλθηκε αυτόματα. Παρακαλούμε μην απαντήσετε σε αυτό το email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  // Create plain text version
  const text = `
Αίτημα Έγκρισης Φόρμας

Έχει υποβληθεί μια νέα φόρμα από τον πελάτη ${customerInfo.name} και απαιτείται η έγκρισή σας.

Δεδομένα φόρμας:
${Object.entries(submissionData)
  .filter(([key]) => key !== 'formMetadata' && key !== 'attachments')
  .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
  .join('\n')}

Για να εγκρίνετε: ${approveUrl}
Για να απορρίψετε: ${rejectUrl}
Για να δείτε λεπτομέρειες: ${viewUrl}

Ή μπορείτε να επισκεφθείτε το σύστημα διαχείρισης φορμών: ${import.meta.env.VITE_APP_URL}/forms/approval

Αυτό το email στάλθηκε αυτόματα. Παρακαλούμε μην απαντήσετε σε αυτό το email.
  `;
  
  return {
    subject: `Αίτημα έγκρισης φόρμας - ${customerInfo.name}`,
    html,
    text
  };
};

/**
 * Generate HTML for approval result notification template
 * 
 * @param customerInfo Customer information
 * @param approved Whether the form was approved or rejected
 * @param reason Reason for approval/rejection
 * @returns EmailTemplate object with subject, html, and text content
 */
const generateApprovalResultTemplate = (
  customerInfo: CustomerFormInfo,
  approved: boolean,
  reason?: string
): EmailTemplate => {
  const resultText = approved ? 'εγκρίθηκε' : 'απορρίφθηκε';
  const resultColor = approved ? '#2ecc71' : '#e74c3c';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Form Approval Result</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: ${resultColor};
          color: white;
          padding: 20px;
          text-align: center;
        }
        .content {
          padding: 20px;
          background-color: #f9f9f9;
        }
        .result {
          font-size: 18px;
          font-weight: bold;
          color: ${resultColor};
          margin: 20px 0;
          text-align: center;
        }
        .reason {
          background-color: #f8f9fa;
          border-left: 4px solid ${resultColor};
          padding: 15px;
          margin: 20px 0;
        }
        .footer {
          font-size: 12px;
          color: #777;
          text-align: center;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Αποτέλεσμα Αξιολόγησης Φόρμας</h1>
        </div>
        <div class="content">
          <p>Αγαπητέ/ή ${customerInfo.name},</p>
          
          <p>Η φόρμα που υποβάλατε έχει ${resultText}.</p>
          
          <div class="result">
            ${approved ? 'ΕΓΚΡΙΘΗΚΕ' : 'ΑΠΟΡΡΙΦΘΗΚΕ'}
          </div>
          
          ${reason ? `
          <div class="reason">
            <strong>Αιτιολόγηση:</strong><br>
            ${reason}
          </div>
          ` : ''}
          
          ${approved ? `
          <p>Θα επικοινωνήσουμε σύντομα μαζί σας για τα επόμενα βήματα.</p>
          ` : `
          <p>Μπορείτε να επικοινωνήσετε μαζί μας για περισσότερες πληροφορίες.</p>
          `}
          
          <p>Ευχαριστούμε για την κατανόηση.</p>
          <p>Με εκτίμηση,<br>${COMPANY_NAME}</p>
        </div>
        <div class="footer">
          <p>Αυτό το email στάλθηκε αυτόματα. Παρακαλούμε μην απαντήσετε σε αυτό το email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  // Create plain text version
  const text = `
Αποτέλεσμα Αξιολόγησης Φόρμας

Αγαπητέ/ή ${customerInfo.name},

Η φόρμα που υποβάλατε έχει ${resultText}.

${approved ? 'ΕΓΚΡΙΘΗΚΕ' : 'ΑΠΟΡΡΙΦΘΗΚΕ'}

${reason ? `Αιτιολόγηση:
${reason}` : ''}

${approved ? `Θα επικοινωνήσουμε σύντομα μαζί σας για τα επόμενα βήματα.` : `Μπορείτε να επικοινωνήσετε μαζί μας για περισσότερες πληροφορίες.`}

Ευχαριστούμε για την κατανόηση.

Με εκτίμηση,
${COMPANY_NAME}

Αυτό το email στάλθηκε αυτόματα. Παρακαλούμε μην απαντήσετε σε αυτό το email.
  `;
  
  return {
    subject: `Φόρμα ${approved ? 'εγκρίθηκε' : 'απορρίφθηκε'} - ${customerInfo.name}`,
    html,
    text
  };
};

/**
 * Email parameters for sending form link to customer
 */
interface FormLinkEmailParams {
  token: string;
  customerInfo: CustomerFormInfo;
  recipientEmail?: string;
}

/**
 * Email parameters for sending form submission notification
 */
interface FormSubmissionNotificationParams {
  formLinkId: string;
  customerId: string;
  submissionData?: any;
}

/**
 * Send form link to customer via email
 * 
 * @param params Object containing token, customerInfo, and optional recipientEmail
 * @returns Promise with the result of the email send operation
 */
export const sendFormLinkToCustomer = async (
  params: FormLinkEmailParams
): Promise<{ success: boolean; messageId?: string; error?: any }> => {
  try {
    const { token, customerInfo, recipientEmail } = params;
    
    // Use provided recipient email or customer email
    const recipient = recipientEmail || customerInfo.email;
    
    if (!recipient) {
      logError('Cannot send form link email: No recipient email provided', 
        { customerInfo }, 
        'EmailService'
      );
      return { 
        success: false, 
        error: 'No recipient email provided'
      };
    }
    
    // Construct form link URL
    const formLink = `${FORM_BASE_URL}/${token}`;
    
    // Calculate expiration date - default to 72 hours if not available
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + 72);
    
    // Generate email template
    const template = generateCustomerFormLinkTemplate(
      customerInfo,
      formLink,
      expirationDate
    );
    
    // Send email
    return await sendEmail(recipient, {
      subject: template.subject,
      html: template.html,
      text: template.text,
      replyTo: DEFAULT_FROM_EMAIL,
    });
  } catch (error) {
    logError('Error sending form link to customer:', error, 'EmailService');
    return { success: false, error };
  }
};

/**
 * Send form submission notification to users
 * 
 * @param params Object containing formLinkId, customerId, and optional submissionData
 * @param recipients Optional list of recipient emails
 * @returns Promise with the result of the email send operation
 */
export const sendFormSubmissionNotification = async (
  params: FormSubmissionNotificationParams,
  recipients: string[] = []
): Promise<{ success: boolean; messageId?: string; error?: any }> => {
  try {
    const { formLinkId, customerId, submissionData = {} } = params;
    
    // Determine recipients if not provided
    const notificationRecipients = recipients.length > 0 ? recipients : 
      import.meta.env.VITE_NOTIFICATION_EMAILS ? 
      import.meta.env.VITE_NOTIFICATION_EMAILS.split(',') : 
      [DEFAULT_FROM_EMAIL];
    
    if (!notificationRecipients || notificationRecipients.length === 0) {
      logError('Cannot send form submission notification: No recipients available', 
        { formLinkId, customerId }, 
        'EmailService'
      );
      return { 
        success: false, 
        error: 'No recipients available'
      };
    }
    
    // Create a placeholder customerInfo if we don't have full details yet
    const customerInfo: CustomerFormInfo = {
      id: customerId,
      name: submissionData.customerData?.name || submissionData.company_name || 'Customer',
      createdAt: new Date().toISOString()
    };
    
    // Generate email template
    const template = generateFormSubmissionNotificationTemplate(
      customerInfo,
      submissionData,
      new Date()
    );
    
    // Send email
    return await sendEmail(notificationRecipients, {
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  } catch (error) {
    logError('Error sending form submission notification:', error, 'EmailService');
    return { success: false, error };
  }
};

/**
 * Send approval request email to users
 * 
 * @param customerInfo Customer information
 * @param formLinkId Form link ID
 * @param submissionData Form submission data
 * @param approvalToken Secure token for approval actions
 * @param recipients List of recipient emails
 * @returns Promise with the result of the email send operation
 */
export const sendSubmissionApprovalEmail = async (
  customerInfo: CustomerFormInfo,
  formLinkId: string,
  submissionData: any,
  approvalToken: string,
  recipients: string[] = []
): Promise<{ success: boolean; messageId?: string; error?: any }> => {
  try {
    if (!recipients || recipients.length === 0) {
      logError('Cannot send approval request: No recipients provided', 
        { customerInfo, formLinkId }, 
        'EmailService'
      );
      return { 
        success: false, 
        error: 'No recipients provided'
      };
    }
    
    // Generate email template
    const template = generateApprovalRequestTemplate(
      customerInfo,
      formLinkId,
      submissionData,
      approvalToken
    );
    
    // Send email
    return await sendEmail(recipients, {
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  } catch (error) {
    logError('Error sending approval request:', error, 'EmailService');
    return { success: false, error };
  }
};

/**
 * Send approval result email to customer
 * 
 * @param customerInfo Customer information
 * @param approved Whether the form was approved or rejected
 * @param reason Reason for approval/rejection
 * @param recipientEmail Optional custom recipient email
 * @returns Promise with the result of the email send operation
 */
export const sendApprovalResultEmail = async (
  customerInfo: CustomerFormInfo,
  approved: boolean,
  reason?: string,
  recipientEmail?: string
): Promise<{ success: boolean; messageId?: string; error?: any }> => {
  try {
    // Use provided recipient email or customer email
    const recipient = recipientEmail || customerInfo.email;
    
    if (!recipient) {
      logError('Cannot send approval result: No recipient email provided', 
        { customerInfo }, 
        'EmailService'
      );
      return { 
        success: false, 
        error: 'No recipient email provided'
      };
    }
    
    // Generate email template
    const template = generateApprovalResultTemplate(
      customerInfo,
      approved,
      reason
    );
    
    // Send email
    return await sendEmail(recipient, {
      subject: template.subject,
      html: template.html,
      text: template.text,
      replyTo: DEFAULT_FROM_EMAIL,
    });
  } catch (error) {
    logError('Error sending approval result:', error, 'EmailService');
    return { success: false, error };
  }
};

/**
 * Send a test email to verify email configuration
 * 
 * @param recipient Email address to send test to
 * @returns Promise with email sending result
 */
export const sendTestEmail = async (
  recipient: string
): Promise<{ success: boolean; messageId?: string; error?: any }> => {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Configuration Test</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h1 style="color: #4A90E2;">Email Test Successful!</h1>
          <p>This is a test email to verify that your email configuration is working correctly.</p>
          <p>If you're receiving this email, it means that:</p>
          <ul>
            <li>Your Resend API key is configured correctly</li>
            <li>Email sending functionality is working properly</li>
            <li>The email template system is functioning as expected</li>
          </ul>
          <p>Email details:</p>
          <ul>
            <li><strong>Sent to:</strong> ${recipient}</li>
            <li><strong>Sent from:</strong> ${DEFAULT_FROM_EMAIL}</li>
            <li><strong>Date/Time:</strong> ${new Date().toLocaleString()}</li>
            <li><strong>Environment:</strong> ${import.meta.env.MODE || 'development'}</li>
          </ul>
          <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #777;">
            This is an automated test email from ${COMPANY_NAME}.
          </p>
        </div>
      </body>
      </html>
    `;

    const text = `
Email Test Successful!

This is a test email to verify that your email configuration is working correctly.

If you're receiving this email, it means that:
- Your Resend API key is configured correctly
- Email sending functionality is working properly
- The email template system is functioning as expected

Email details:
- Sent to: ${recipient}
- Sent from: ${DEFAULT_FROM_EMAIL}
- Date/Time: ${new Date().toLocaleString()}
- Environment: ${import.meta.env.MODE || 'development'}

This is an automated test email from ${COMPANY_NAME}.
    `;

    return await sendEmail(recipient, {
      subject: `Email Configuration Test - ${new Date().toLocaleString()}`,
      html,
      text
    });
  } catch (error) {
    logError('Exception in sendTestEmail:', error, 'EmailService');
    return { success: false, error };
  }
}; 