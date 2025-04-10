import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabaseClient';
import { FormLink, FormLinkValidationResult, FormLinkWithOffer } from './types';
import { logError, logInfo, logDebug } from '@/utils';

/**
 * Generate a secure token for form links
 * 
 * @returns A cryptographically secure token
 */
const generateSecureToken = (): string => {
  // Generate a UUID and replace dashes with empty string
  const uuid = uuidv4().replace(/-/g, '');
  
  // Add a random timestamp component for additional uniqueness
  const timestamp = Date.now().toString(36);
  
  // Combine them for a secure, unique token
  return `${uuid}${timestamp}`;
};

/**
 * Generate a new form link for a specific offer
 * 
 * @param offerId The ID of the offer to create a link for
 * @param expirationHours Number of hours until the link expires
 * @returns The created form link
 */
export const generateFormLink = async (
  offerId: string,
  expirationHours: number = 48 // Default to 48 hours
): Promise<FormLink | null> => {
  try {
    // Validate inputs
    if (!offerId) {
      throw new Error('Offer ID is required');
    }
    
    if (expirationHours <= 0) {
      throw new Error('Expiration hours must be greater than 0');
    }
    
    // Check if offer exists
    const { data: offerExists, error: offerCheckError } = await supabase
      .from('offers')
      .select('id')
      .eq('id', offerId)
      .is('deleted_at', null)
      .single();
    
    if (offerCheckError || !offerExists) {
      logError('Error checking if offer exists:', offerCheckError || 'Offer not found', 'FormLinkService');
      throw new Error('Offer does not exist or has been deleted');
    }
    
    // Generate a secure token
    const token = generateSecureToken();
    
    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expirationHours);
    
    // Create the form link
    const { data, error } = await supabase
      .from('offer_form_links')
      .insert({
        offer_id: offerId,
        token,
        is_used: false,
        expires_at: expiresAt.toISOString(),
      })
      .select('*')
      .single();
    
    if (error) {
      logError('Error creating form link:', error, 'FormLinkService');
      throw error;
    }
    
    logInfo(`Created form link with token: ${token} for offer: ${offerId}`);
    return data as FormLink;
  } catch (error) {
    logError('Exception in generateFormLink:', error, 'FormLinkService');
    throw error;
  }
};

/**
 * Validate a form link token
 * 
 * @param token The token to validate
 * @returns Validation result
 */
export const validateFormLink = async (token: string): Promise<FormLinkValidationResult> => {
  try {
    // Default response for invalid tokens
    const invalidResponse: FormLinkValidationResult = {
      isValid: false,
      isExpired: false,
      isUsed: false,
      message: 'Invalid form link'
    };
    
    if (!token) {
      return invalidResponse;
    }
    
    // Find the form link
    const { data, error } = await supabase
      .from('offer_form_links')
      .select('*, offer:offers(id, offer_number, customer_id, status)')
      .eq('token', token)
      .is('is_deleted', false)
      .single();
    
    if (error || !data) {
      logError('Error validating form link or link not found:', error || 'Link not found', 'FormLinkService');
      return invalidResponse;
    }
    
    const formLink = data as FormLinkWithOffer;
    
    // Check if the link has been used
    if (formLink.is_used) {
      return {
        isValid: false,
        isExpired: false,
        isUsed: true,
        offer_id: formLink.offer_id,
        message: 'This form has already been submitted'
      };
    }
    
    // Check if the link has expired
    const expirationDate = new Date(formLink.expires_at);
    const now = new Date();
    
    if (now > expirationDate) {
      return {
        isValid: false,
        isExpired: true,
        isUsed: false,
        offer_id: formLink.offer_id,
        message: 'This form link has expired'
      };
    }
    
    // Link is valid
    return {
      isValid: true,
      isExpired: false,
      isUsed: false,
      offer_id: formLink.offer_id,
      message: 'Valid form link'
    };
  } catch (error) {
    logError('Exception in validateFormLink:', error, 'FormLinkService');
    return {
      isValid: false,
      isExpired: false,
      isUsed: false,
      message: 'An error occurred while validating the form link'
    };
  }
};

/**
 * Mark a form link as used after submission
 * 
 * @param token The token of the form link to mark
 * @returns Whether the operation was successful
 */
export const markFormLinkAsUsed = async (token: string): Promise<boolean> => {
  try {
    if (!token) {
      throw new Error('Token is required');
    }
    
    // Update the form link
    const { data, error } = await supabase
      .from('offer_form_links')
      .update({ is_used: true })
      .eq('token', token)
      .is('is_deleted', false)
      .select('*')
      .single();
    
    if (error) {
      logError('Error marking form link as used:', error, 'FormLinkService');
      return false;
    }
    
    logInfo(`Marked form link with token: ${token} as used`);
    return true;
  } catch (error) {
    logError('Exception in markFormLinkAsUsed:', error, 'FormLinkService');
    return false;
  }
};

/**
 * Get all form links for a specific offer
 * 
 * @param offerId The ID of the offer to get links for
 * @returns Array of form links
 */
export const getFormLinksByOfferId = async (offerId: string): Promise<FormLink[]> => {
  try {
    if (!offerId) {
      throw new Error('Offer ID is required');
    }
    
    // Get all form links for the offer
    const { data, error } = await supabase
      .from('offer_form_links')
      .select('*')
      .eq('offer_id', offerId)
      .is('is_deleted', false)
      .order('created_at', { ascending: false });
    
    if (error) {
      logError('Error getting form links for offer:', error, 'FormLinkService');
      throw error;
    }
    
    return (data || []) as FormLink[];
  } catch (error) {
    logError('Exception in getFormLinksByOfferId:', error, 'FormLinkService');
    throw error;
  }
};

// Re-export types
export * from './types'; 