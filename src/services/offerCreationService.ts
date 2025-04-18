/**
 * Offer Creation Service
 * 
 * Service for creating offers from customer form submissions.
 * This service handles the mapping, validation, and creation of offers
 * based on form submission data.
 */

import { supabase } from '@/lib/supabaseClient';
import { createRecord, fetchRecordById, fetchRecords, updateRecord } from '@/services/api/supabaseService';
import { FormLinkService } from '@/services/formLinkService';
import { CustomerFormLink, FormLinkStatus } from '@/services/formLinkService/types';
import { CustomerFormSubmission } from '@/services/customerFormService/types';
import { Offer, OfferDetail, Contact, Customer } from '@/services/api/types';
import { logError, logInfo, logDebug } from '@/utils';
import { createSuccessResponse, createErrorResponse, ApiResponse } from '@/utils/apiUtils';
import { generateRandomString } from '@/utils/stringUtils';

/**
 * Validation result for form data
 */
export interface FormDataValidationResult {
  isValid: boolean;
  errors?: Record<string, string[]>;
  warnings?: Record<string, string[]>;
  message?: string;
}

/**
 * Offer creation result
 */
export interface OfferCreationResult {
  success: boolean;
  offer?: Offer;
  offerDetails?: OfferDetail[];
  error?: string;
  warnings?: string[];
}

/**
 * Form data to offer mapping configuration
 */
export interface FormToOfferFieldMapping {
  sourceField: string;
  targetField: string;
  transform?: (value: any) => any;
  required?: boolean;
  validate?: (value: any) => boolean | string;
}

/**
 * Service for creating offers from form data
 */
export const OfferCreationService = {
  /**
   * Validate form data for offer creation
   * @param formData Form submission data
   * @returns Validation result
   */
  validateFormDataForOffer(formData: CustomerFormSubmission): FormDataValidationResult {
    try {
      if (!formData) {
        return {
          isValid: false,
          message: 'Form data is required'
        };
      }

      const errors: Record<string, string[]> = {};
      const warnings: Record<string, string[]> = {};

      // Validate required fields
      if (!formData.serviceRequirements) {
        errors['serviceRequirements'] = ['Service requirements are required'];
      }

      if (!formData.customerData?.name) {
        errors['customerData.name'] = ['Customer name is required'];
      }

      // Validate service details if provided
      if (formData.serviceDetails && Array.isArray(formData.serviceDetails)) {
        formData.serviceDetails.forEach((detail, index) => {
          if (!detail.description) {
            if (!errors['serviceDetails']) {
              errors['serviceDetails'] = [];
            }
            errors['serviceDetails'].push(`Service detail #${index + 1} description is required`);
          }
        });
      }

      // Check for warnings
      if (!formData.customerData?.email && !formData.customerData?.phone) {
        warnings['contactInfo'] = ['No contact information (email or phone) provided'];
      }

      // Determine overall validity
      const isValid = Object.keys(errors).length === 0;

      return {
        isValid,
        errors: Object.keys(errors).length > 0 ? errors : undefined,
        warnings: Object.keys(warnings).length > 0 ? warnings : undefined,
        message: isValid 
          ? 'Form data is valid for offer creation' 
          : 'Form data has validation errors'
      };
    } catch (error) {
      logError('Error validating form data for offer:', error, 'OfferCreationService');
      return {
        isValid: false,
        message: 'An error occurred during validation'
      };
    }
  },

  /**
   * Map form submission data to offer structure
   * @param formData Form submission data
   * @param customerId Customer ID
   * @param userId User ID creating the offer
   * @returns Mapped offer data
   */
  mapFormDataToOffer(
    formData: CustomerFormSubmission,
    customerId: string,
    userId?: string
  ): Partial<Offer> {
    // Basic mapping
    const offerData: Partial<Offer> = {
      customer_id: customerId,
      requirements: formData.serviceRequirements || '',
      customer_comments: formData.additionalNotes || null,
      status: 'pending',
      created_by: userId || null,
      created_at: new Date().toISOString(),
    };

    // Add title derived from requirements if not too long
    if (formData.serviceRequirements) {
      const titleText = formData.serviceRequirements.trim();
      offerData.title = titleText.length > 50 
        ? titleText.substring(0, 47) + '...' 
        : titleText;
    }

    // Add contact information if available
    if (formData.preferredContactMethod) {
      offerData.our_comments = `Preferred contact method: ${formData.preferredContactMethod}`;
      
      if (formData.preferredContactTime) {
        offerData.our_comments += `, Preferred time: ${formData.preferredContactTime}`;
      }
    }

    // Add address information if available
    if (formData.customerData?.address) {
      offerData.address = formData.customerData.address;
    }

    return offerData;
  },

  /**
   * Map form service details to offer details
   * @param formData Form submission data
   * @param offerId Offer ID to associate details with
   * @returns Mapped offer details
   */
  mapFormServiceDetailsToOfferDetails(
    formData: CustomerFormSubmission, 
    offerId: string
  ): Partial<OfferDetail>[] {
    if (!formData.serviceDetails || !Array.isArray(formData.serviceDetails) || formData.serviceDetails.length === 0) {
      // Create a single detail from requirements if no details provided
      return [{
        offer_id: offerId,
        description: formData.serviceRequirements || 'General service',
        created_at: new Date().toISOString()
      }];
    }

    // Map each service detail to an offer detail
    return formData.serviceDetails.map(detail => ({
      offer_id: offerId,
      service_category_id: detail.categoryId || null,
      service_subcategory_id: detail.subcategoryId || null,
      description: detail.description,
      created_at: new Date().toISOString()
    }));
  },

  /**
   * Generate a unique offer number
   * @returns Promise with unique offer number
   */
  async generateOfferNumber(): Promise<string> {
    try {
      // Format: FORM-YYYYMMDD-XXXX where XXXX is a random alphanumeric string
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomPart = generateRandomString(4, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
      const offerNumber = `FORM-${datePart}-${randomPart}`;
      
      // Check if this offer number already exists (collision check)
      const client = supabase as any;
      const { count, error } = await client
        .from('offers')
        .select('*', { count: 'exact', head: true })
        .eq('offer_number', offerNumber);

      if (error) {
        logError('Error checking offer number existence:', error, 'OfferCreationService');
        throw error;
      }

      // If collision, recursively generate a new number
      if (count && count > 0) {
        return this.generateOfferNumber();
      }

      return offerNumber;
    } catch (error) {
      logError('Error generating offer number:', error, 'OfferCreationService');
      // Return a fallback offer number
      return `FORM-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    }
  },

  /**
   * Create an offer from form submission data
   * @param formLinkId Form link ID with associated form data
   * @param userId User ID creating the offer
   * @returns Promise with offer creation result
   */
  async createOfferFromFormSubmission(
    formLinkId: string,
    userId?: string
  ): Promise<OfferCreationResult> {
    try {
      // Get form link with form data
      const formLinkResponse = await FormLinkService.getFormLinkById(formLinkId);
      
      if (!formLinkResponse.success || !formLinkResponse.data) {
        return {
          success: false,
          error: formLinkResponse.error || 'Form link not found'
        };
      }

      const formLink = formLinkResponse.data;
      const formData = formLink.submission_data as CustomerFormSubmission;

      // Validate form data
      const validation = this.validateFormDataForOffer(formData);
      
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.message || 'Invalid form data',
          warnings: validation.warnings ? this.extractWarningMessages(validation.warnings) : undefined
        };
      }

      // Create an offer from the form data
      return this.createOfferFromForm(formData, formLink.customer_id, userId);
    } catch (error) {
      logError('Error creating offer from form submission:', error, 'OfferCreationService');
      return {
        success: false,
        error: 'An unexpected error occurred'
      };
    }
  },

  /**
   * Create an offer from a customer form link token
   * This is a simplified wrapper around createOfferFromFormSubmission
   * @param token Form link token
   * @param userId User ID creating the offer
   * @returns Promise with offer creation result
   */
  async createOfferFromToken(
    token: string,
    userId?: string
  ): Promise<OfferCreationResult> {
    try {
      // First validate the token
      const validation = await FormLinkService.validateFormLink(token);
      
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.reason || 'Invalid form link token'
        };
      }

      // Get the form link ID
      const formLinkId = validation.formLink?.id;
      
      if (!formLinkId) {
        return {
          success: false,
          error: 'Form link ID not found'
        };
      }

      // Create the offer using the form link ID
      return this.createOfferFromFormSubmission(formLinkId, userId);
    } catch (error) {
      logError('Error creating offer from token:', error, 'OfferCreationService');
      return {
        success: false,
        error: 'An unexpected error occurred: ' + (error instanceof Error ? error.message : String(error))
      };
    }
  },

  /**
   * Create API wrapper for offer creation
   * @param formLinkId Form link ID
   * @param userId User ID creating the offer
   * @returns Promise with API response
   */
  async createOfferFromFormApi(
    formLinkId: string,
    userId?: string
  ): Promise<ApiResponse<OfferCreationResult>> {
    try {
      const result = await this.createOfferFromFormSubmission(formLinkId, userId);
      
      if (result.success) {
        return createSuccessResponse(result);
      } else {
        return createErrorResponse(result.error || 'Failed to create offer');
      }
    } catch (error) {
      logError('Error in createOfferFromFormApi:', error, 'OfferCreationService');
      return createErrorResponse('An unexpected error occurred');
    }
  },

  /**
   * Create an offer from form data
   * @param formData Form data object
   * @param customerId ID of the customer submitting the form
   * @param userId User ID creating the offer (optional)
   * @returns Promise with offer creation result
   */
  async createOfferFromForm(
    formData: CustomerFormSubmission,
    customerId: string,
    userId?: string
  ): Promise<OfferCreationResult> {
    try {
      // Validate form data
      const validation = this.validateFormDataForOffer(formData);
      if (!validation.isValid) {
        // Simplified warning extraction to avoid type depth issues
        const warningMessages: string[] = [];
        
        if (validation.warnings) {
          // Manually iterate through the warnings to avoid Object.values().flat() pattern
          Object.keys(validation.warnings).forEach(key => {
            const warnings = validation.warnings![key];
            if (Array.isArray(warnings)) {
              warnings.forEach(warning => warningMessages.push(warning));
            }
          });
        }
        
        return {
          success: false,
          error: validation.message || 'Invalid form data',
          warnings: warningMessages.length > 0 ? warningMessages : undefined
        };
      }

      // Generate unique offer number
      const offerNumber = await this.generateOfferNumber();

      // Map form data to offer
      const offerData = this.mapFormDataToOffer(formData, customerId, userId);
      offerData.offer_number = offerNumber;

      // Create the offer
      const offerResponse = await createRecord('offers', {
        ...offerData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      if (!offerResponse.data) {
        return {
          success: false,
          error: offerResponse.error?.message || 'Failed to create offer record'
        };
      }

      const offer = offerResponse.data as Offer;

      // Create offer details
      const offerDetailsMapped = this.mapFormServiceDetailsToOfferDetails(formData, offer.id);
      const offerDetails: OfferDetail[] = [];

      for (const detail of offerDetailsMapped) {
        const detailResponse = await createRecord('offer_details', {
          ...detail,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        if (detailResponse.data) {
          offerDetails.push(detailResponse.data as OfferDetail);
        }
      }

      // Log successful creation
      logInfo(
        `Created offer #${offerNumber} with ${offerDetails.length} details from form data`,
        'OfferCreationService'
      );

      // Process warnings for success response
      const successWarnings: string[] = [];
      
      if (validation.warnings) {
        // Same approach as above - manually iterate
        Object.keys(validation.warnings).forEach(key => {
          const warnings = validation.warnings![key];
          if (Array.isArray(warnings)) {
            warnings.forEach(warning => successWarnings.push(warning));
          }
        });
      }

      return {
        success: true,
        offer,
        offerDetails,
        warnings: successWarnings.length > 0 ? successWarnings : undefined
      };
    } catch (error) {
      logError('Error creating offer from form data:', error, 'OfferCreationService');
      return {
        success: false,
        error: 'An unexpected error occurred while creating the offer'
      };
    }
  },

  /**
   * Extract warning messages from validation warnings object
   * @param warnings Validation warnings object
   * @returns Array of warning messages
   */
  extractWarningMessages(warnings: Record<string, string[]>): string[] {
    const result: string[] = [];
    Object.values(warnings).forEach(warningArr => {
      if (Array.isArray(warningArr)) {
        result.push(...warningArr);
      }
    });
    return result;
  }
};

// Export individual functions for convenience
export const {
  validateFormDataForOffer,
  createOfferFromFormSubmission,
  createOfferFromToken,
  createOfferFromFormApi,
  createOfferFromForm
} = OfferCreationService; 