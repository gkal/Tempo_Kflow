import { supabase } from '@/lib/supabaseClient';
import { createRecord, fetchRecordById, fetchRecords, softDeleteRecord, updateRecord } from '@/services/api/supabaseService';
import { generateRandomString } from '@/utils/stringUtils';
import { 
  CustomerFormLink, 
  CrossProjectVerificationRequest,
  CrossProjectVerificationResponse,
  FormLinkCreationResponse, 
  FormLinkFilterOptions, 
  FormLinkGenerationOptions, 
  FormLinkListResponse, 
  FormLinkPaginationOptions, 
  FormLinkResponse, 
  FormLinkSortOptions, 
  FormLinkStatus, 
  FormLinkUpdateOptions, 
  FormLinkUpdateResponse, 
  FormLinkValidationResult, 
  FormSubmissionResponse 
} from './types';
import { getBaseUrl } from '@/utils/urlUtils';
import { Database } from '@/types/supabase';
import { DbResponse } from '@/services/api/types';

// Helper type to work around TableName constraints
type AnyTableName = string & { __brand: 'TableName' };

// Configuration
const TOKEN_LENGTH = 32;
const TOKEN_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const DEFAULT_EXPIRATION_HOURS = 24; // 1 day
const API_KEYS_TABLE = 'project_api_keys';

/**
 * Service for managing customer form links
 */
export const FormLinkService = {
  /**
   * Generate a secure random token with collision detection
   * @param length Token length
   * @returns Secure random token
   */
  async generateUniqueToken(length: number = TOKEN_LENGTH): Promise<string> {
    // Generate random token
    const token = generateRandomString(length, TOKEN_CHARSET);
    
    // Check for collision
    const { count } = await supabase
      .from('customer_form_links')
      .select('*', { count: 'exact', head: true })
      .eq('token', token);
    
    // If collision, generate another token
    if (count && count > 0) {
      return this.generateUniqueToken(length);
    }
    
    return token;
  },
  
  /**
   * Generate a form link for a customer
   * @param options Form link generation options
   * @returns Form link creation response
   */
  async generateFormLinkForCustomer(options: FormLinkGenerationOptions): Promise<FormLinkCreationResponse> {
    try {
      const { 
        customerId, 
        expirationHours = DEFAULT_EXPIRATION_HOURS, 
        createdById,
        externalProjectId,
        callbackUrl
      } = options;
      
      // Validate customerId
      const customerResponse = await fetchRecordById<Database['public']['Tables']['customers']['Row']>('customers', customerId);
      if (!customerResponse || !customerResponse.data) {
        return {
          success: false,
          error: 'Ο πελάτης δεν βρέθηκε',
        };
      }
      
      // Generate unique token
      const token = await this.generateUniqueToken();
      
      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expirationHours);
      
      // Create form link using direct Supabase client to avoid type issues
      const { data: formLink, error } = await supabase
        .from('customer_form_links')
        .insert({
          customer_id: customerId,
          token,
          expires_at: expiresAt.toISOString(),
          is_used: false,
          status: 'pending' as FormLinkStatus,
          created_by: createdById || null,
          external_project_id: externalProjectId || null,
          callback_url: callbackUrl || null,
        })
        .select()
        .single();
      
      if (error || !formLink) {
        return {
          success: false,
          error: 'Αποτυχία δημιουργίας συνδέσμου φόρμας',
        };
      }
      
      // Generate URL - different URL formats depending on where it will be used
      let url = '';
      
      if (externalProjectId) {
        // For external projects, generate a URL that points to their domain
        // This will be configured in the external project's database
        const { data: projectConfig } = await supabase
          .from('external_projects')
          .select('base_url')
          .eq('id', externalProjectId)
          .single();
          
        if (projectConfig && projectConfig.base_url) {
          url = `${projectConfig.base_url}/form/${token}`;
        } else {
          // Fallback to our form URL
          url = `${getBaseUrl()}/form/${token}`;
        }
      } else {
        // For internal usage
        url = `${getBaseUrl()}/form/${token}`;
      }
      
      return {
        success: true,
        data: {
          id: formLink.id,
          token: formLink.token,
          url,
          expiresAt: formLink.expires_at,
          externalProjectId: formLink.external_project_id,
        },
      };
    } catch (error) {
      console.error('Error generating form link:', error);
      return {
        success: false,
        error: 'Προέκυψε ένα απρόσμενο σφάλμα',
      };
    }
  },
  
  /**
   * Validate a form link token
   * @param token Form link token
   * @returns Validation result
   */
  async validateFormLink(token: string): Promise<FormLinkValidationResult> {
    try {
      // Get form link by token
      const { data: formLink, error } = await supabase
        .from('customer_form_links')
        .select('*')
        .eq('token', token)
        .eq('is_deleted', false)
        .single();
      
      if (error || !formLink) {
        return {
          isValid: false,
          reason: 'Ο σύνδεσμος φόρμας δεν βρέθηκε',
        };
      }
      
      // Check expiration
      if (new Date(formLink.expires_at) < new Date()) {
        return {
          isValid: false,
          reason: 'Ο σύνδεσμος φόρμας έχει λήξει',
          formLink: formLink as CustomerFormLink,
        };
      }
      
      // Check if form is in an invalid state (already approved/rejected)
      if (formLink.status === 'approved' || formLink.status === 'rejected') {
        const statusText = formLink.status === 'approved' ? 'εγκριθεί' : 'απορριφθεί';
        return {
          isValid: false,
          reason: `Η φόρμα έχει ήδη ${statusText}`,
          formLink: formLink as CustomerFormLink,
        };
      }
      
      // Get customer data - using direct Supabase client to avoid type issues
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', formLink.customer_id)
        .single();
      
      if (customerError || !customer) {
        return {
          isValid: false,
          reason: 'Ο πελάτης δεν βρέθηκε',
          formLink: formLink as CustomerFormLink,
        };
      }
      
      return {
        isValid: true,
        formLink: formLink as CustomerFormLink,
        customer,
      };
    } catch (error) {
      console.error('Error validating form link:', error);
      return {
        isValid: false,
        reason: 'Προέκυψε ένα απρόσμενο σφάλμα',
      };
    }
  },
  
  /**
   * Verify a form link token for an external project
   * This is a secure API endpoint that can be called from other projects
   * @param verificationRequest The verification request with token and API key
   * @returns Verification response with limited customer data
   */
  async verifyExternalFormLink(
    verificationRequest: CrossProjectVerificationRequest
  ): Promise<CrossProjectVerificationResponse> {
    try {
      const { token, projectApiKey } = verificationRequest;
      
      // Verify the project API key
      const { data: apiKeyData, error: apiKeyError } = await supabase
        .from(API_KEYS_TABLE)
        .select('project_id, is_active')
        .eq('api_key', projectApiKey)
        .eq('is_active', true)
        .single();
      
      if (apiKeyError || !apiKeyData || !apiKeyData.is_active) {
        return {
          success: false,
          error: 'Invalid API key',
        };
      }
      
      // Get the project ID from the API key
      const projectId = apiKeyData.project_id;
      
      // Validate the form link
      const { data: formLink, error: formLinkError } = await supabase
        .from('customer_form_links')
        .select('*')
        .eq('token', token)
        .eq('is_deleted', false)
        .eq('external_project_id', projectId)
        .single();
      
      if (formLinkError || !formLink) {
        return {
          success: true,
          data: {
            isValid: false,
          },
        };
      }
      
      // Check expiration
      if (new Date(formLink.expires_at) < new Date()) {
        return {
          success: true,
          data: {
            isValid: false,
          },
        };
      }
      
      // Check form status
      if (formLink.status !== 'pending') {
        return {
          success: true,
          data: {
            isValid: false,
          },
        };
      }
      
      // Get limited customer data for the external project
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id, name, email, phone')
        .eq('id', formLink.customer_id)
        .single();
      
      if (customerError || !customer) {
        return {
          success: true,
          data: {
            isValid: false,
          },
        };
      }
      
      // Create a copy of the form link without sensitive data
      const { token: _, ...safeFormLink } = formLink;
      
      return {
        success: true,
        data: {
          isValid: true,
          formLink: safeFormLink as Omit<CustomerFormLink, 'token'>,
          customer,
        },
      };
    } catch (error) {
      console.error('Error verifying external form link:', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
      };
    }
  },
  
  /**
   * Submit form data from an external project
   * @param token Form link token
   * @param projectApiKey API key of the external project
   * @param formData Form data to submit
   * @returns Form submission response
   */
  async submitExternalForm(
    token: string,
    projectApiKey: string,
    formData: Record<string, any>
  ): Promise<FormSubmissionResponse> {
    try {
      // Verify the project API key
      const { data: apiKeyData, error: apiKeyError } = await supabase
        .from(API_KEYS_TABLE)
        .select('project_id, is_active')
        .eq('api_key', projectApiKey)
        .eq('is_active', true)
        .single();
      
      if (apiKeyError || !apiKeyData || !apiKeyData.is_active) {
        return {
          success: false,
          error: 'Invalid API key',
        };
      }
      
      // Get the project ID from the API key
      const projectId = apiKeyData.project_id;
      
      // Get form link by token
      const { data: formLink, error: formLinkError } = await supabase
        .from('customer_form_links')
        .select('id, is_used, expires_at, status, external_project_id')
        .eq('token', token)
        .eq('is_deleted', false)
        .eq('external_project_id', projectId)
        .single();
      
      if (formLinkError || !formLink) {
        return {
          success: false,
          error: 'Form link not found',
        };
      }
      
      // Check if already used or expired
      if (formLink.is_used || new Date(formLink.expires_at) < new Date()) {
        return {
          success: false,
          error: formLink.is_used ? 'Form link already used' : 'Form link expired',
        };
      }
      
      // Check project ID match
      if (formLink.external_project_id !== projectId) {
        return {
          success: false,
          error: 'Project ID mismatch',
        };
      }
      
      // Update form link using direct Supabase client
      const submittedAt = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('customer_form_links')
        .update({
          is_used: true,
          submitted_at: submittedAt,
          status: 'submitted',
          form_data: formData,
        })
        .eq('id', formLink.id);
      
      if (updateError) {
        return {
          success: false,
          error: 'Failed to update form link',
        };
      }
      
      return {
        success: true,
        data: {
          formLinkId: formLink.id,
          submittedAt,
          status: 'submitted',
        },
      };
    } catch (error) {
      console.error('Error submitting external form:', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
      };
    }
  },
  
  /**
   * Mark a form link as used
   * @param token Form link token
   * @returns True if successful, false otherwise
   */
  async markFormLinkAsUsed(token: string): Promise<boolean> {
    try {
      // Get form link by token
      const { data: formLink, error } = await supabase
        .from('customer_form_links')
        .select('id, is_used, expires_at, status')
        .eq('token', token)
        .eq('is_deleted', false)
        .single();
      
      if (error || !formLink) {
        return false;
      }
      
      // Check if already used or expired
      if (formLink.is_used || new Date(formLink.expires_at) < new Date()) {
        return false;
      }
      
      // Update form link using direct Supabase client
      const { error: updateError } = await supabase
        .from('customer_form_links')
        .update({
          is_used: true,
          submitted_at: new Date().toISOString(),
          status: 'submitted',
        })
        .eq('id', formLink.id);
      
      return !updateError;
    } catch (error) {
      console.error('Error marking form link as used:', error);
      return false;
    }
  },
  
  /**
   * Get form links by customer ID
   * @param options Filter, sorting, and pagination options
   * @returns Form links list response
   */
  async getFormLinks(
    options: {
      filter?: FormLinkFilterOptions;
      sort?: FormLinkSortOptions;
      pagination?: FormLinkPaginationOptions;
    } = {}
  ): Promise<FormLinkListResponse> {
    try {
      const { filter = {}, sort = { field: 'created_at', direction: 'desc' }, pagination = { page: 1, pageSize: 10 } } = options;
      
      // Build query
      let query = supabase
        .from('customer_form_links')
        .select('*', { count: 'exact' });
      
      // Apply filters
      if (filter.customerId) {
        query = query.eq('customer_id', filter.customerId);
      }
      
      if (filter.status) {
        if (Array.isArray(filter.status)) {
          query = query.in('status', filter.status);
        } else {
          query = query.eq('status', filter.status);
        }
      }
      
      if (filter.isUsed !== undefined) {
        query = query.eq('is_used', filter.isUsed);
      }
      
      if (filter.isExpired !== undefined) {
        const now = new Date().toISOString();
        if (filter.isExpired) {
          query = query.lt('expires_at', now);
        } else {
          query = query.gte('expires_at', now);
        }
      }
      
      if (filter.createdAfter) {
        query = query.gte('created_at', filter.createdAfter);
      }
      
      if (filter.createdBefore) {
        query = query.lte('created_at', filter.createdBefore);
      }
      
      if (filter.createdBy) {
        query = query.eq('created_by', filter.createdBy);
      }
      
      // Exclude deleted records by default
      query = query.eq('is_deleted', false);
      
      // Apply sorting
      query = query.order(sort.field, { ascending: sort.direction === 'asc' });
      
      // Apply pagination
      const from = (pagination.page - 1) * pagination.pageSize;
      const to = from + pagination.pageSize - 1;
      query = query.range(from, to);
      
      // Execute query
      const { data, error, count } = await query;
      
      if (error) {
        throw error;
      }
      
      return {
        success: true,
        data: {
          formLinks: (data || []) as CustomerFormLink[],
          total: count || 0,
          page: pagination.page,
          pageSize: pagination.pageSize,
          totalPages: Math.ceil((count || 0) / pagination.pageSize),
        },
      };
    } catch (error) {
      console.error('Error getting form links:', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
      };
    }
  },
  
  /**
   * Get a form link by ID
   * @param id Form link ID
   * @returns Form link response
   */
  async getFormLinkById(id: string): Promise<FormLinkResponse> {
    try {
      // Using direct Supabase client to avoid type issues
      const { data, error } = await supabase
        .from('customer_form_links')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error || !data) {
        return {
          success: false,
          error: 'Ο σύνδεσμος φόρμας δεν βρέθηκε',
        };
      }
      
      return {
        success: true,
        data: data as CustomerFormLink,
      };
    } catch (error) {
      console.error('Error getting form link by ID:', error);
      return {
        success: false,
        error: 'Προέκυψε ένα απρόσμενο σφάλμα',
      };
    }
  },
  
  /**
   * Get a form link by token
   * @param token Form link token
   * @returns Form link response
   */
  async getFormLinkByToken(token: string): Promise<FormLinkResponse> {
    try {
      const { data, error } = await supabase
        .from('customer_form_links')
        .select('*')
        .eq('token', token)
        .eq('is_deleted', false)
        .single();
      
      if (error || !data) {
        return {
          success: false,
          error: 'Ο σύνδεσμος φόρμας δεν βρέθηκε',
        };
      }
      
      return {
        success: true,
        data: data as CustomerFormLink,
      };
    } catch (error) {
      console.error('Error getting form link by token:', error);
      return {
        success: false,
        error: 'Προέκυψε ένα απρόσμενο σφάλμα',
      };
    }
  },
  
  /**
   * Update a form link
   * @param options Form link update options
   * @returns Form link update response
   */
  async updateFormLink(options: FormLinkUpdateOptions): Promise<FormLinkUpdateResponse> {
    try {
      const { formLinkId, updatedBy, ...updateData } = options;
      
      // Get current form link - using direct Supabase client
      const { data: formLink, error: fetchError } = await supabase
        .from('customer_form_links')
        .select('*')
        .eq('id', formLinkId)
        .single();
      
      if (fetchError || !formLink) {
        return {
          success: false,
          error: 'Ο σύνδεσμος φόρμας δεν βρέθηκε',
        };
      }
      
      // Update form link - using direct Supabase client
      const { data: updated, error: updateError } = await supabase
        .from('customer_form_links')
        .update({
          ...updateData,
          updated_by: updatedBy || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', formLinkId)
        .select()
        .single();
      
      if (updateError || !updated) {
        return {
          success: false,
          error: 'Αποτυχία ενημέρωσης συνδέσμου φόρμας',
        };
      }
      
      return {
        success: true,
        data: updated as CustomerFormLink,
      };
    } catch (error) {
      console.error('Error updating form link:', error);
      return {
        success: false,
        error: 'Προέκυψε ένα απρόσμενο σφάλμα',
      };
    }
  },
  
  /**
   * Delete a form link (soft delete)
   * @param id Form link ID
   * @param userId ID of user performing the deletion
   * @returns True if successful, false otherwise
   */
  async deleteFormLink(id: string, userId?: string): Promise<boolean> {
    try {
      // Use direct Supabase client for soft delete
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('customer_form_links')
        .update({
          is_deleted: true,
          deleted_at: now,
          updated_at: now,
          updated_by: userId || null,
        })
        .eq('id', id);
      
      return !error;
    } catch (error) {
      console.error('Error deleting form link:', error);
      return false;
    }
  },
  
  /**
   * Submit a form
   * @param token Form link token
   * @param formData Form data
   * @returns Form submission response
   */
  async submitForm(token: string, formData: Record<string, any>): Promise<FormSubmissionResponse> {
    try {
      // Validate form link
      const validation = await this.validateFormLink(token);
      
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.reason,
        };
      }
      
      const formLink = validation.formLink as CustomerFormLink;
      
      // Update form link - using direct Supabase client
      const { data: updated, error } = await supabase
        .from('customer_form_links')
        .update({
          form_data: formData,
          is_used: true,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        })
        .eq('id', formLink.id)
        .select()
        .single();
      
      if (error || !updated) {
        return {
          success: false,
          error: 'Failed to submit form',
        };
      }
      
      return {
        success: true,
        data: {
          formLinkId: updated.id,
          submittedAt: updated.submitted_at as string,
          status: updated.status as FormLinkStatus,
        },
      };
    } catch (error) {
      console.error('Error submitting form:', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
      };
    }
  },
}; 