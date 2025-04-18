import { supabase } from '@/lib/supabaseClient';
import { createRecord, fetchRecordById, fetchRecords, softDeleteRecord, updateRecord } from '@/services/api/supabaseService';
import { FormLinkService } from '@/services/formLinkService';
import { CustomerFormLink, FormLinkStatus } from '@/services/formLinkService/types';
import { Customer, Contact } from '@/services/api/types';
import { 
  CustomerFormInfo,
  CustomerContactInfo,
  CustomerFormSubmission,
  FormApprovalData,
  FormSubmissionResult,
  FormApprovalResult,
  CustomerFormInfoOptions,
  FormSubmissionStats,
  FormSubmissionNotification
} from './types';
import { Database } from '@/types/supabase';

// Cache TTL in milliseconds (5 minutes)
const CUSTOMER_CACHE_TTL = 5 * 60 * 1000;

// Simple in-memory cache for customer data
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const customerCache: Record<string, CacheEntry<CustomerFormInfo>> = {};

/**
 * Service for managing customer forms, submissions, and approvals
 */
export const CustomerFormService = {
  /**
   * Get customer information formatted for forms
   * @param customerId Customer ID
   * @param options Options for retrieving customer data
   * @returns CustomerFormInfo or null if not found
   */
  async getCustomerInfoForForm(
    customerId: string, 
    options: CustomerFormInfoOptions = {}
  ): Promise<CustomerFormInfo | null> {
    try {
      // Check cache first
      const cached = customerCache[customerId];
      const now = Date.now();
      
      if (cached && (now - cached.timestamp < CUSTOMER_CACHE_TTL)) {
        return cached.data;
      }

      // Get customer data
      const customer = await fetchRecordById<Customer>('customers', customerId);
      if (!customer || !customer.data) {
        return null;
      }

      // Create customer info object
      const customerInfo: CustomerFormInfo = {
        id: customer.data.id,
        name: customer.data.company_name,
        email: customer.data.email,
        phone: customer.data.phone,
        address: customer.data.address,
        createdAt: customer.data.created_at,
        contacts: [],
      };

      // Add contacts if requested
      if (options.includeContacts) {
        const contactsData = await this.getCustomerContacts(customerId, {
          includeInactive: options.includeInactiveContacts || false,
          includeDeleted: options.includeDeletedContacts || false,
          limit: options.maxContacts,
        });
        
        if (contactsData && contactsData.length > 0) {
          customerInfo.contacts = contactsData;
        }
      }

      // Store in cache
      customerCache[customerId] = {
        data: customerInfo,
        timestamp: now,
      };

      return customerInfo;
    } catch (error) {
      console.error('Error retrieving customer info for form:', error);
      return null;
    }
  },

  /**
   * Get contacts for a customer
   * @param customerId Customer ID
   * @param options Options for filtering contacts
   * @returns Array of customer contacts
   */
  async getCustomerContacts(
    customerId: string,
    options: { 
      includeInactive?: boolean; 
      includeDeleted?: boolean; 
      limit?: number;
    } = {}
  ): Promise<CustomerContactInfo[]> {
    try {
      // Use direct Supabase query for better control
      let query = supabase
        .from('contacts')
        .select('*')
        .eq('customer_id', customerId)
        .order('full_name', { ascending: true });

      // Apply soft delete filter unless includeDeleted is true
      if (!options.includeDeleted) {
        query = query.is('deleted_at', null);
      }

      // Apply limit if specified
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error retrieving customer contacts:', error);
        return [];
      }

      if (!data || !Array.isArray(data)) {
        return [];
      }

      // Map to CustomerContactInfo format
      return data.map(contact => ({
        id: contact.id,
        name: contact.full_name || '',
        position: contact.position || null,
        email: contact.email || null,
        phone: contact.telephone || contact.mobile || null,
        isPrimary: false, // There's no is_primary field, assuming false as default
      }));
    } catch (error) {
      console.error('Error retrieving customer contacts:', error);
      return [];
    }
  },

  /**
   * Submit customer form data
   * @param token Form link token
   * @param formData Customer form submission data
   * @returns Form submission result
   */
  async submitCustomerForm(
    token: string,
    formData: CustomerFormSubmission
  ): Promise<FormSubmissionResult> {
    try {
      // Validate the form link
      const validation = await FormLinkService.validateFormLink(token);
      
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.reason || 'Μη έγκυρος σύνδεσμος φόρμας',
        };
      }

      const formLink = validation.formLink;
      const customer = validation.customer;

      if (!formLink || !customer) {
        return {
          success: false,
          error: 'Λείπουν πληροφορίες πελάτη ή συνδέσμου φόρμας',
        };
      }

      // Sanitize the form data (basic sanitization, can be enhanced)
      const sanitizedData = this.sanitizeFormData(formData);
      
      // Update form link with submission data
      const submissionResult = await FormLinkService.submitForm(token, sanitizedData);
      
      if (!submissionResult.success) {
        return {
          success: false,
          error: submissionResult.error || 'Αποτυχία υποβολής φόρμας',
        };
      }

      // Trigger submission notifications
      await this.triggerSubmissionNotifications(formLink.id, customer.id, customer.company_name);

      return {
        success: true,
        data: {
          formLinkId: formLink.id,
          customerId: customer.id,
          submittedAt: submissionResult.data?.submittedAt || new Date().toISOString(),
          status: 'submitted' as FormLinkStatus,
        },
      };
    } catch (error) {
      console.error('Error submitting customer form:', error);
      return {
        success: false,
        error: 'Προέκυψε ένα απρόσμενο σφάλμα κατά την υποβολή της φόρμας',
      };
    }
  },

  /**
   * Sanitize form data to prevent security issues
   * @param formData Raw form data
   * @returns Sanitized form data
   */
  sanitizeFormData(formData: CustomerFormSubmission): CustomerFormSubmission {
    // Deep clone to avoid modifying the original
    const sanitized = JSON.parse(JSON.stringify(formData)) as CustomerFormSubmission;
    
    // Basic text sanitization for common XSS vectors
    const sanitizeText = (text: string | undefined | null): string | undefined | null => {
      if (!text) return text;
      return text
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    };

    // Sanitize customer data
    if (sanitized.customerData) {
      sanitized.customerData.name = sanitizeText(sanitized.customerData.name) || '';
      sanitized.customerData.email = sanitizeText(sanitized.customerData.email);
      sanitized.customerData.phone = sanitizeText(sanitized.customerData.phone);
      sanitized.customerData.address = sanitizeText(sanitized.customerData.address);
    }

    // Sanitize service requirements
    sanitized.serviceRequirements = sanitizeText(sanitized.serviceRequirements) || '';
    sanitized.additionalNotes = sanitizeText(sanitized.additionalNotes);

    // Sanitize service details
    if (Array.isArray(sanitized.serviceDetails)) {
      sanitized.serviceDetails = sanitized.serviceDetails.map(detail => ({
        ...detail,
        description: sanitizeText(detail.description) || '',
      }));
    }

    return sanitized;
  },

  /**
   * Trigger notifications for new form submissions
   * @param formLinkId Form link ID
   * @param customerId Customer ID
   * @param customerName Customer name
   * @returns True if successful, false otherwise
   */
  async triggerSubmissionNotifications(
    formLinkId: string,
    customerId: string,
    customerName: string
  ): Promise<boolean> {
    try {
      // Create notification object
      const notification: FormSubmissionNotification = {
        formLinkId,
        customerId,
        customerName,
        submittedAt: new Date().toISOString(),
        requiresApproval: true,
        priority: 'medium',
      };

      // In a real implementation, this would:
      // 1. Create notifications in the database for relevant users
      // 2. Trigger real-time notifications via WebSockets if available
      // 3. Send email notifications to users with approval permissions

      // For now, we'll log the notification (mock implementation)
      console.info('New form submission notification:', notification);

      return true;
    } catch (error) {
      console.error('Error triggering form submission notifications:', error);
      return false;
    }
  },

  /**
   * Approve or reject a form submission
   * @param approvalData Form approval data
   * @returns Form approval result
   */
  async processFormApproval(approvalData: FormApprovalData): Promise<FormApprovalResult> {
    try {
      const { formLinkId, approverId, approvalAction, approvalNotes, createOffer } = approvalData;

      // Get form link
      const formLinkResponse = await FormLinkService.getFormLinkById(formLinkId);
      
      if (!formLinkResponse.success || !formLinkResponse.data) {
        return {
          success: false,
          error: 'Form link not found',
        };
      }

      const formLink = formLinkResponse.data;

      // Check form link status
      if (formLink.status !== 'submitted') {
        return {
          success: false,
          error: `Cannot process approval for form in '${formLink.status}' status. Only submitted forms can be approved or rejected.`,
        };
      }

      // Check user permissions (simplified - would be more comprehensive in real implementation)
      const hasPermission = await this.checkUserApprovalPermission(approverId);
      if (!hasPermission) {
        return {
          success: false,
          error: 'User does not have permission to approve or reject forms',
        };
      }

      // Update form link status and related fields
      const newStatus: FormLinkStatus = approvalAction === 'approve' ? 'approved' : 'rejected';
      const now = new Date().toISOString();
      
      const updateResult = await FormLinkService.updateFormLink({
        formLinkId,
        updatedBy: approverId,
        status: newStatus,
        notes: approvalNotes,
        ...(newStatus === 'approved' ? { approved_by: approverId, approved_at: now } : {}),
      });

      if (!updateResult.success) {
        return {
          success: false,
          error: updateResult.error || `Failed to ${approvalAction} form submission`,
        };
      }

      // If approved and createOffer is true, create an offer from the form data
      let offerId: string | undefined;
      if (newStatus === 'approved' && createOffer && formLink.submission_data) {
        const createOfferResult = await this.createOfferFromApprovedForm(formLinkId);
        if (createOfferResult.success && createOfferResult.offerId) {
          offerId = createOfferResult.offerId;
        }
      }

      return {
        success: true,
        data: {
          formLinkId,
          status: newStatus,
          approvedAt: newStatus === 'approved' ? now : undefined,
          offerId,
        },
      };
    } catch (error) {
      console.error('Error processing form approval:', error);
      return {
        success: false,
        error: 'An unexpected error occurred during approval processing',
      };
    }
  },

  /**
   * Check if a user has permission to approve forms
   * @param userId User ID
   * @returns True if user has permission, false otherwise
   */
  async checkUserApprovalPermission(userId: string): Promise<boolean> {
    try {
      // Get user role
      const { data: user, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return false;
      }

      // Check if user has permission based on role
      // In this implementation, all users except 'Μόνο ανάγνωση' (readonly) can approve
      return user.role !== 'Μόνο ανάγνωση';
    } catch (error) {
      console.error('Error checking user approval permission:', error);
      return false;
    }
  },

  /**
   * Create an offer from an approved form submission
   * @param formLinkId Form link ID
   * @returns Result with success status and offer ID if created
   */
  async createOfferFromApprovedForm(formLinkId: string): Promise<{ success: boolean; offerId?: string; error?: string }> {
    try {
      // Get form link with form data
      const formLinkResponse = await FormLinkService.getFormLinkById(formLinkId);
      
      if (!formLinkResponse.success || !formLinkResponse.data) {
        return {
          success: false,
          error: 'Form link not found',
        };
      }

      const formLink = formLinkResponse.data;

      // Check form status
      if (formLink.status !== 'approved') {
        return {
          success: false,
          error: 'Cannot create offer: form has not been approved',
        };
      }

      // Check if form data exists
      if (!formLink.submission_data) {
        return {
          success: false,
          error: 'Cannot create offer: no form data available',
        };
      }

      // Extract form data
      const formData = formLink.submission_data as CustomerFormSubmission;

      // Create offer
      // This is a simplified version - in a real implementation, you would map
      // the form fields to the appropriate offer fields and include more validation
      const offerData = {
        customer_id: formLink.customer_id,
        requirements: formData.serviceRequirements || '',
        created_at: new Date().toISOString(),
        created_by: formLink.approved_by,
        status: 'pending',
        customer_comments: formData.additionalNotes || null,
      };

      // Create the offer record
      const { data: offer, error } = await createRecord('offers', offerData);

      if (error || !offer) {
        return {
          success: false,
          error: 'Failed to create offer from form data',
        };
      }

      // Note: In a real implementation, you would also create offer details
      // based on the service details in the form data

      return {
        success: true,
        offerId: (offer as any).id,
      };
    } catch (error) {
      console.error('Error creating offer from approved form:', error);
      return {
        success: false,
        error: 'An unexpected error occurred creating the offer',
      };
    }
  },

  /**
   * Get statistics for form submissions
   * @param customerId Optional customer ID to filter stats
   * @param dateRange Optional date range to filter stats
   * @returns Form submission statistics
   */
  async getFormSubmissionStats(
    customerId?: string,
    dateRange?: { from: string; to: string }
  ): Promise<FormSubmissionStats> {
    try {
      // Build query for counting form submissions
      let query = supabase
        .from('customer_form_links')
        .select('id, status, submitted_at, approved_at', { count: 'exact' })
        .eq('is_deleted', false)
        .not('submitted_at', 'is', null); // Only count submitted forms
      
      // Add customer filter if provided
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      // Add date range filter if provided
      if (dateRange) {
        query = query.gte('submitted_at', dateRange.from).lte('submitted_at', dateRange.to);
      }

      // Execute query
      const { data, count, error } = await query;

      if (error) {
        throw error;
      }

      // Calculate statistics
      const totalSubmissions = count || 0;
      
      // Count by status
      let pendingApproval = 0;
      let approved = 0;
      let rejected = 0;
      let totalResponseTime = 0;
      let responsesWithTime = 0;

      if (data && Array.isArray(data)) {
        for (const form of data) {
          if (form.status === 'submitted') {
            pendingApproval++;
          } else if (form.status === 'approved') {
            approved++;
            
            // Calculate response time if both timestamps exist
            if (form.submitted_at && form.approved_at) {
              const submittedAt = new Date(form.submitted_at).getTime();
              const approvedAt = new Date(form.approved_at).getTime();
              const responseTime = approvedAt - submittedAt;
              
              if (responseTime > 0) {
                totalResponseTime += responseTime;
                responsesWithTime++;
              }
            }
          } else if (form.status === 'rejected') {
            rejected++;
          }
        }
      }

      // Calculate conversion rate (percentage of forms that lead to offers)
      const conversionRate = totalSubmissions > 0 ? (approved / totalSubmissions) * 100 : 0;
      
      // Calculate average response time in milliseconds
      const averageResponseTime = responsesWithTime > 0 ? totalResponseTime / responsesWithTime : undefined;

      return {
        totalSubmissions,
        pendingApproval,
        approved,
        rejected,
        conversionRate,
        averageResponseTime,
      };
    } catch (error) {
      console.error('Error getting form submission stats:', error);
      
      // Return default statistics object on error
      return {
        totalSubmissions: 0,
        pendingApproval: 0,
        approved: 0,
        rejected: 0,
        conversionRate: 0,
      };
    }
  },
}; 