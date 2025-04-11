import { 
  FormLinkService 
} from './formLinkService';
import { 
  CustomerFormService 
} from './customerFormService';
import { sendFormLinkToCustomer, sendFormSubmissionNotification } from './emailService';
import { generateFormLinkEmailUrl } from './gmailService';
import { logError, logInfo, logDebug } from '@/utils';
import { createSuccessResponse, createErrorResponse, ApiResponse } from '@/utils/apiUtils';
import { CustomerFormInfo, CustomerFormSubmission } from './customerFormService/types';
import { FormLinkValidationResult } from './formLinkService/types';

/**
 * Response for form link creation
 */
export interface FormLinkCreationResponse {
  formLink: {
    id: string;
    token: string;
    url: string;
    expires_at: string;
  };
  customerInfo: CustomerFormInfo;
  gmailUrl: string;
}

/**
 * Response for form data
 */
export interface FormDataResponse {
  customer: CustomerFormInfo;
  isValid: boolean;
  message?: string;
}

/**
 * Create a new form link for a customer
 * 
 * @param customerId ID of the customer to create a link for
 * @param expirationHours Number of hours until the link expires
 * @param sendEmail Whether to send an email with the form link
 * @param recipientEmail Optional specific recipient email
 * @param userId Optional user ID for audit trail
 * @returns API response with the form link and customer information
 */
export const createFormLinkForCustomerApi = async (
  customerId: string,
  expirationHours: number = 72,
  sendEmail: boolean = false,
  recipientEmail?: string,
  userId?: string
): Promise<ApiResponse<FormLinkCreationResponse>> => {
  try {
    if (!customerId) {
      return createErrorResponse('Απαιτείται το ID του πελάτη');
    }
    
    // Generate the form link with user ID for audit
    const formLinkResult = await FormLinkService.generateFormLinkForCustomer({
      customerId,
      expirationHours,
      createdById: userId
    });
    
    if (!formLinkResult.success || !formLinkResult.data) {
      return createErrorResponse(formLinkResult.error || 'Αποτυχία δημιουργίας συνδέσμου φόρμας');
    }
    
    const formLink = formLinkResult.data;
    
    // Get customer information
    const customerInfo = await CustomerFormService.getCustomerInfoForForm(customerId, { includeContacts: true });
    if (!customerInfo) {
      return createErrorResponse('Αποτυχία λήψης πληροφοριών πελάτη');
    }
    
    // Generate Gmail URL for sending email manually
    const gmailUrl = await generateFormLinkEmailUrl(
      formLink.token,
      recipientEmail || customerInfo.email || '',
      formLink.expiresAt
    );
    
    // Send email if requested
    if (sendEmail && (recipientEmail || customerInfo.email)) {
      try {
        const emailParams = {
          token: formLink.token,
          customerInfo,
          recipientEmail: recipientEmail || customerInfo.email || ''
        };
        
        const emailResult = await sendFormLinkToCustomer(emailParams);
        
        if (!emailResult.success) {
          logError('Failed to send form link email:', emailResult.error, 'FormApiService');
          // Continue execution even if email fails
        }
      } catch (emailError) {
        logError('Exception sending form link email:', emailError, 'FormApiService');
        // Continue execution even if email fails
      }
    }
    
    // Create response
    return createSuccessResponse<FormLinkCreationResponse>({
      formLink: {
        id: formLink.id,
        token: formLink.token,
        url: formLink.url,
        expires_at: formLink.expiresAt
      },
      customerInfo,
      gmailUrl
    });
  } catch (error) {
    logError('Exception in createFormLinkForCustomerApi:', error, 'FormApiService');
    return createErrorResponse(error);
  }
};

/**
 * Validate a form link token and return customer data
 * 
 * @param token Form link token to validate
 * @returns API response with validation status and form data
 */
export const validateFormLinkApi = async (
  token: string
): Promise<ApiResponse<FormDataResponse>> => {
  try {
    if (!token) {
      return createErrorResponse('Απαιτείται το token');
    }
    
    // Validate the token
    const validationResult = await FormLinkService.validateFormLink(token);
    
    // If the token is invalid, return early with validation result
    if (!validationResult.isValid) {
      return createSuccessResponse<FormDataResponse>({
        customer: null as any, // Will be ignored by client since isValid is false
        isValid: false,
        message: validationResult.reason
      });
    }
    
    // Get customer ID from validation result
    const customerId = validationResult.customer?.id;
    if (!customerId) {
      return createErrorResponse('Το ID του πελάτη δεν βρέθηκε στο αποτέλεσμα επικύρωσης');
    }
    
    // Get customer information
    const customerInfo = await CustomerFormService.getCustomerInfoForForm(customerId, { includeContacts: true });
    if (!customerInfo) {
      return createErrorResponse('Αποτυχία λήψης πληροφοριών πελάτη');
    }
    
    // Create response
    return createSuccessResponse<FormDataResponse>({
      customer: customerInfo,
      isValid: true,
      message: 'Ο σύνδεσμος φόρμας είναι έγκυρος'
    });
  } catch (error) {
    logError('Exception in validateFormLinkApi:', error, 'FormApiService');
    return createErrorResponse(error);
  }
};

/**
 * Submit form data for a customer
 * 
 * @param token Form link token
 * @param formData Form submission data
 * @returns API response with success status
 */
export const submitFormApi = async (
  token: string,
  formData: CustomerFormSubmission
): Promise<ApiResponse<{ success: boolean; message: string; formLinkId?: string }>> => {
  try {
    if (!token) {
      return createErrorResponse('Απαιτείται το token');
    }
    
    if (!formData) {
      return createErrorResponse('Απαιτούνται τα δεδομένα της φόρμας');
    }
    
    // Submit the form
    const result = await CustomerFormService.submitCustomerForm(token, formData);
    
    if (!result.success) {
      return createErrorResponse(result.error || 'Αποτυχία υποβολής φόρμας');
    }
    
    // Send submission notification
    try {
      if (result.data?.formLinkId && result.data?.customerId) {
        await sendFormSubmissionNotification({
          formLinkId: result.data.formLinkId,
          customerId: result.data.customerId
        });
      }
    } catch (emailError) {
      logError('Exception sending form submission notification:', emailError, 'FormApiService');
      // Continue execution even if notification fails
    }
    
    // Return success response
    return createSuccessResponse({
      success: true,
      message: 'Η φόρμα υποβλήθηκε με επιτυχία',
      formLinkId: result.data?.formLinkId
    });
  } catch (error) {
    logError('Exception in submitFormApi:', error, 'FormApiService');
    return createErrorResponse(error);
  }
};

/**
 * Get form data by token
 * 
 * @param token Form link token
 * @returns API response with form data and validation result
 */
export const getFormByTokenApi = async (
  token: string
): Promise<ApiResponse<FormDataResponse & Partial<FormLinkValidationResult>>> => {
  try {
    if (!token) {
      return createErrorResponse('Απαιτείται το token');
    }
    
    // Validate the token
    const validationResult = await FormLinkService.validateFormLink(token);
    
    // If the token is invalid, return early with validation result
    if (!validationResult.isValid) {
      return createSuccessResponse<FormDataResponse & Partial<FormLinkValidationResult>>({
        customer: null as any,
        isValid: false,
        reason: validationResult.reason,
        formLink: validationResult.formLink
      });
    }
    
    // Get customer ID from validation result
    const customerId = validationResult.customer?.id;
    if (!customerId) {
      return createErrorResponse<FormDataResponse & Partial<FormLinkValidationResult>>('Το ID του πελάτη δεν βρέθηκε στο αποτέλεσμα επικύρωσης');
    }
    
    // Get customer information
    const customerInfo = await CustomerFormService.getCustomerInfoForForm(customerId, { includeContacts: true });
    if (!customerInfo) {
      return createErrorResponse<FormDataResponse & Partial<FormLinkValidationResult>>('Αποτυχία λήψης πληροφοριών πελάτη');
    }
    
    // Create response
    return createSuccessResponse<FormDataResponse & Partial<FormLinkValidationResult>>({
      customer: customerInfo,
      isValid: true,
      formLink: validationResult.formLink,
      reason: 'Ο σύνδεσμος φόρμας είναι έγκυρος'
    });
  } catch (error) {
    logError('Exception in getFormByTokenApi:', error, 'FormApiService');
    return createErrorResponse<FormDataResponse & Partial<FormLinkValidationResult>>(error);
  }
};

/**
 * Approve or reject a form submission
 * 
 * @param formLinkId Form link ID
 * @param userId User ID approving/rejecting the submission
 * @param action 'approve' or 'reject'
 * @param notes Optional notes for the approval/rejection
 * @param createOffer Whether to create an offer upon approval
 * @returns API response with approval result
 */
export const processFormApprovalApi = async (
  formLinkId: string,
  userId: string,
  action: 'approve' | 'reject',
  notes?: string,
  createOffer: boolean = true
): Promise<ApiResponse<{ success: boolean; message: string; offerId?: string }>> => {
  try {
    if (!formLinkId) {
      return createErrorResponse('Απαιτείται το ID του συνδέσμου φόρμας');
    }
    
    if (!userId) {
      return createErrorResponse('Απαιτείται το ID του χρήστη');
    }
    
    // Check if user has permission to approve forms
    const hasPermission = await CustomerFormService.checkUserApprovalPermission(userId);
    if (!hasPermission) {
      return createErrorResponse('Ο χρήστης δεν έχει δικαίωμα έγκρισης/απόρριψης φορμών');
    }
    
    // Process the approval/rejection
    const result = await CustomerFormService.processFormApproval({
      formLinkId,
      approverId: userId,
      approvalNotes: notes,
      approvalAction: action,
      createOffer
    });
    
    if (!result.success) {
      const actionText = action === 'approve' ? 'έγκριση' : 'απόρριψη';
      return createErrorResponse(result.error || `Αποτυχία ${actionText} φόρμας`);
    }
    
    // Return success response
    const actionText = action === 'approve' ? 'εγκρίθηκε' : 'απορρίφθηκε';
    return createSuccessResponse({
      success: true,
      message: `Η φόρμα ${actionText} με επιτυχία`,
      offerId: result.data?.offerId
    });
  } catch (error) {
    logError(`Exception in processFormApprovalApi (${action}):`, error, 'FormApiService');
    return createErrorResponse(error);
  }
};

/**
 * Create an offer from an approved form
 * 
 * @param formLinkId Form link ID
 * @param userId User ID creating the offer
 * @returns API response with offer creation result
 */
export const createOfferFromFormApi = async (
  formLinkId: string,
  userId: string
): Promise<ApiResponse<{ success: boolean; message: string; offerId?: string }>> => {
  try {
    if (!formLinkId) {
      return createErrorResponse('Απαιτείται το ID του συνδέσμου φόρμας');
    }
    
    if (!userId) {
      return createErrorResponse('Απαιτείται το ID του χρήστη');
    }
    
    // Check if user has permission
    const hasPermission = await CustomerFormService.checkUserApprovalPermission(userId);
    if (!hasPermission) {
      return createErrorResponse('Ο χρήστης δεν έχει δικαίωμα δημιουργίας προσφορών');
    }
    
    // Create the offer
    const result = await CustomerFormService.createOfferFromApprovedForm(formLinkId);
    
    if (!result.success) {
      return createErrorResponse(result.error || 'Αποτυχία δημιουργίας προσφοράς από τη φόρμα');
    }
    
    // Return success response
    return createSuccessResponse({
      success: true,
      message: 'Η προσφορά δημιουργήθηκε με επιτυχία',
      offerId: result.offerId
    });
  } catch (error) {
    logError('Exception in createOfferFromFormApi:', error, 'FormApiService');
    return createErrorResponse(error);
  }
};

/**
 * Get user approval permissions
 * 
 * @param userId User ID
 * @returns API response with permission status
 */
export const getUserApprovalPermissionsApi = async (
  userId: string
): Promise<ApiResponse<{ canApprove: boolean }>> => {
  try {
    if (!userId) {
      return createErrorResponse('Απαιτείται το ID του χρήστη');
    }
    
    // Check if user has permission
    const hasPermission = await CustomerFormService.checkUserApprovalPermission(userId);
    
    // Return permission status
    return createSuccessResponse({
      canApprove: hasPermission
    });
  } catch (error) {
    logError('Exception in getUserApprovalPermissionsApi:', error, 'FormApiService');
    return createErrorResponse(error);
  }
}; 