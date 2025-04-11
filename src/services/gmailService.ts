import { logError, logDebug } from '@/utils';
import { CustomerFormLink, FormLinkStatus } from './formLinkService/types';
import { CustomerFormInfo, CustomerContactInfo } from './customerFormService/types';

/**
 * Base URL for form links
 * This should be set from environment variables
 */
const FORM_BASE_URL = process.env.NEXT_PUBLIC_FORM_BASE_URL || 'https://yourapp.com/form';

/**
 * Interface for Gmail compose options
 */
interface GmailComposeOptions {
  to?: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject?: string;
  body?: string;
}

/**
 * Encode text for safe URL inclusion
 * 
 * @param text Text to encode
 * @returns URL-safe encoded text
 */
const encodeForUrl = (text: string): string => {
  try {
    return encodeURIComponent(text)
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29')
      .replace(/\'/g, '%27')
      .replace(/\!/g, '%21')
      .replace(/\*/g, '%2A');
  } catch (error) {
    logError('Error encoding text for URL:', error, 'GmailService');
    return text;
  }
};

/**
 * Generate a Gmail compose URL with pre-populated fields
 * 
 * @param options Gmail compose options
 * @returns Gmail compose URL that will open in a new Gmail compose window
 */
export const generateGmailComposeUrl = (options: GmailComposeOptions): string => {
  try {
    const baseUrl = 'https://mail.google.com/mail/u/0/?view=cm&fs=1&tf=1';
    
    // Build URL parameters
    const params = new URLSearchParams();
    
    // Add recipients
    if (options.to) {
      const toEmails = Array.isArray(options.to) ? options.to.join(',') : options.to;
      params.append('to', toEmails);
    }
    
    // Add CC recipients
    if (options.cc) {
      const ccEmails = Array.isArray(options.cc) ? options.cc.join(',') : options.cc;
      params.append('cc', ccEmails);
    }
    
    // Add BCC recipients
    if (options.bcc) {
      const bccEmails = Array.isArray(options.bcc) ? options.bcc.join(',') : options.bcc;
      params.append('bcc', bccEmails);
    }
    
    // Add subject
    if (options.subject) {
      params.append('su', encodeForUrl(options.subject));
    }
    
    // Add body
    if (options.body) {
      params.append('body', encodeForUrl(options.body));
    }
    
    // Combine URL and parameters
    return `${baseUrl}&${params.toString()}`;
  } catch (error) {
    logError('Error generating Gmail compose URL:', error, 'GmailService');
    return 'https://mail.google.com/mail/u/0/?view=cm&fs=1&tf=1';
  }
};

/**
 * Generate a Gmail compose URL for sending a form link to a customer
 * 
 * @param formLinkToken The form link token
 * @param customerInfo Customer information object
 * @param expirationDate When the form link expires
 * @param recipientEmail Optional specific recipient email (defaults to customer email)
 * @returns Gmail compose URL
 */
export const generateFormLinkEmailUrl = (
  formLinkToken: string,
  customerInfo: CustomerFormInfo,
  expirationDate: Date,
  recipientEmail?: string
): string => {
  try {
    if (!formLinkToken) {
      throw new Error('Form link token is required');
    }
    
    if (!customerInfo) {
      throw new Error('Customer information is required');
    }
    
    // Determine the recipient email
    const email = recipientEmail || customerInfo.email;
    if (!email) {
      throw new Error('No recipient email found for this customer');
    }
    
    // Get customer name for personalization
    let customerName = customerInfo.name;
    if (customerInfo.contacts && customerInfo.contacts.length > 0) {
      // Try to find primary contact
      const primaryContact = customerInfo.contacts.find(c => c.isPrimary);
      if (primaryContact) {
        customerName = primaryContact.name;
      } else {
        // Use first contact if no primary contact
        customerName = customerInfo.contacts[0].name;
      }
    }
    
    // Construct the form link URL
    const formLinkUrl = `${FORM_BASE_URL}/${formLinkToken}`;
    
    // Format expiration date
    const formattedExpirationDate = expirationDate.toLocaleDateString('el-GR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Create subject
    const subject = `Φόρμα Πελάτη - ${customerInfo.name}`;
    
    // Create email body
    const body = 
`Αγαπητέ/ή ${customerName},

Σας στέλνουμε αυτό το email για να συμπληρώσετε τη φόρμα με τις απαραίτητες πληροφορίες.

Παρακαλούμε χρησιμοποιήστε τον παρακάτω σύνδεσμο για να αποκτήσετε πρόσβαση στη φόρμα:
${formLinkUrl}

Ο σύνδεσμος αυτός θα λήξει στις: ${formattedExpirationDate}

Αν έχετε ερωτήσεις, μη διστάσετε να επικοινωνήσετε μαζί μας.

Ευχαριστούμε,
${process.env.COMPANY_NAME || 'Your Company'} Team`;
    
    // Generate Gmail compose URL
    return generateGmailComposeUrl({
      to: email,
      subject,
      body
    });
  } catch (error) {
    logError('Exception in generateFormLinkEmailUrl:', error, 'GmailService');
    // Return a basic Gmail compose URL as fallback
    return 'https://mail.google.com/mail/u/0/?view=cm&fs=1&tf=1';
  }
};

/**
 * Generate a Gmail compose URL for sending a follow-up email to a customer about a form link
 * 
 * @param formLinkToken The form link token
 * @param customerInfo Customer information object
 * @param expirationDate When the form link expires
 * @param senderInfo Information about the sender
 * @param recipientEmail Optional specific recipient email (defaults to customer email)
 * @returns Gmail compose URL
 */
export const generateFormLinkFollowUpUrl = (
  formLinkToken: string,
  customerInfo: CustomerFormInfo,
  expirationDate: Date,
  senderInfo: {
    name: string;
    position?: string;
    phone?: string;
    companyName?: string;
  },
  recipientEmail?: string
): string => {
  try {
    if (!formLinkToken || !customerInfo) {
      throw new Error('Form link token and customer information are required');
    }
    
    // Determine the recipient email
    const email = recipientEmail || customerInfo.email;
    if (!email) {
      throw new Error('No recipient email found for this customer');
    }
    
    // Get customer name for personalization
    let customerName = customerInfo.name;
    if (customerInfo.contacts && customerInfo.contacts.length > 0) {
      // Try to find primary contact
      const primaryContact = customerInfo.contacts.find(c => c.isPrimary);
      if (primaryContact) {
        customerName = primaryContact.name;
      } else {
        // Use first contact if no primary contact
        customerName = customerInfo.contacts[0].name;
      }
    }
    
    // Construct the form link URL
    const formLinkUrl = `${FORM_BASE_URL}/${formLinkToken}`;
    
    // Format expiration date
    const formattedExpirationDate = expirationDate.toLocaleDateString('el-GR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Get sender details
    const companyName = senderInfo.companyName || process.env.COMPANY_NAME || 'Your Company';
    
    // Create subject
    const subject = `Υπενθύμιση: Συμπλήρωση Φόρμας - ${customerInfo.name}`;
    
    // Create email body
    const body = 
`Αγαπητέ/ή ${customerName},

Θα ήθελα να επιβεβαιώσω ότι λάβατε τον σύνδεσμο φόρμας που σας στείλαμε πρόσφατα.

Για διευκόλυνσή σας, μπορείτε να συμπληρώσετε τη φόρμα χρησιμοποιώντας τον παρακάτω σύνδεσμο:
${formLinkUrl}

Παρακαλώ σημειώστε ότι ο σύνδεσμος λήγει στις: ${formattedExpirationDate}

Είμαι στη διάθεσή σας για οποιαδήποτε επιπλέον πληροφορία ή βοήθεια χρειαστείτε.

Με εκτίμηση,
${senderInfo.name}
${senderInfo.position ? `${senderInfo.position}\n` : ''}${companyName}
${senderInfo.phone ? `Τηλ: ${senderInfo.phone}` : ''}`;
    
    // Generate Gmail compose URL
    return generateGmailComposeUrl({
      to: email,
      subject,
      body
    });
  } catch (error) {
    logError('Exception in generateFormLinkFollowUpUrl:', error, 'GmailService');
    // Return a basic Gmail compose URL as fallback
    return 'https://mail.google.com/mail/u/0/?view=cm&fs=1&tf=1';
  }
};

/**
 * Generate a Gmail compose URL with pre-populated fields from a template
 * 
 * @param templateKey Template identifier
 * @param params Template parameters to replace placeholders
 * @returns Gmail compose URL with template populated
 */
export const generateTemplatedEmailUrl = (
  templateKey: string,
  params: Record<string, any>
): string => {
  try {
    // Define templates
    const templates: Record<string, { subject: string; body: string }> = {
      // Customer form link template
      'customer-form': {
        subject: 'Φόρμα Πελάτη - {{customerName}}',
        body: 
`Αγαπητέ/ή {{contactName}},

Σας στέλνουμε αυτό το email για να συμπληρώσετε τη φόρμα με τις απαραίτητες πληροφορίες.

Παρακαλούμε χρησιμοποιήστε τον παρακάτω σύνδεσμο για να αποκτήσετε πρόσβαση στη φόρμα:
{{formLink}}

Ο σύνδεσμος αυτός θα λήξει στις: {{expirationDate}}

Αν έχετε ερωτήσεις, μη διστάσετε να επικοινωνήσετε μαζί μας.

Ευχαριστούμε,
{{companyName}}`,
      },
      
      // Follow up template
      'form-followup': {
        subject: 'Υπενθύμιση: Συμπλήρωση Φόρμας - {{customerName}}',
        body: 
`Αγαπητέ/ή {{contactName}},

Θα ήθελα να επιβεβαιώσω ότι λάβατε τον σύνδεσμο φόρμας που σας στείλαμε πρόσφατα.

Για διευκόλυνσή σας, μπορείτε να συμπληρώσετε τη φόρμα χρησιμοποιώντας τον παρακάτω σύνδεσμο:
{{formLink}}

Παρακαλώ σημειώστε ότι ο σύνδεσμος λήγει στις: {{expirationDate}}

Είμαι στη διάθεσή σας για οποιαδήποτε επιπλέον πληροφορία ή βοήθεια χρειαστείτε.

Με εκτίμηση,
{{senderName}}
{{senderPosition}}
{{companyName}}
{{senderPhone}}`,
      },
      
      // Thank you template
      'thank-you': {
        subject: 'Ευχαριστούμε για την απάντησή σας - {{customerName}}',
        body:
`Αγαπητέ/ή {{contactName}},

Ευχαριστούμε για τη συμπλήρωση της φόρμας. ${params.accepted ? 
'Είμαστε στην ευχάριστη θέση να σας ενημερώσουμε ότι η φόρμα σας έχει εγκριθεί.' : 
'Λυπούμαστε που η φόρμα σας δεν μπορεί να εγκριθεί αυτή τη στιγμή.'}

${params.accepted ? 
`Η ομάδα μας θα επικοινωνήσει σύντομα μαζί σας για τα επόμενα βήματα.

Ανυπομονούμε να συνεργαστούμε μαζί σας!` : 
`Εκτιμούμε το ενδιαφέρον σας και θα χαρούμε να συζητήσουμε τυχόν απορίες ή απαιτήσεις που μπορεί να έχετε.

Ελπίζουμε να έχουμε την ευκαιρία να συνεργαστούμε μαζί σας στο μέλλον.`}

Με εκτίμηση,
{{senderName}}
{{senderPosition}}
{{companyName}}
{{senderPhone}}`,
      },
      
      // Custom message template
      'custom-message': {
        subject: '{{subject}}',
        body: '{{message}}'
      }
    };
    
    // Get the requested template
    const template = templates[templateKey];
    if (!template) {
      throw new Error(`Template "${templateKey}" not found`);
    }
    
    // Replace template placeholders with actual values
    let subject = template.subject;
    let body = template.body;
    
    // Replace all placeholders in subject and body
    Object.entries(params).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(placeholder, value);
      body = body.replace(placeholder, value);
    });
    
    // Generate Gmail compose URL
    return generateGmailComposeUrl({
      to: params.to,
      cc: params.cc,
      bcc: params.bcc,
      subject,
      body
    });
  } catch (error) {
    logError('Error generating templated email URL:', error, 'GmailService');
    // Return a basic Gmail compose URL as fallback
    return 'https://mail.google.com/mail/u/0/?view=cm&fs=1&tf=1';
  }
}; 