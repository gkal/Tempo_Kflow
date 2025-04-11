/**
 * Customer Offer Service
 * 
 * Provides functionality for creating and managing offers associated with customers.
 * Centralizes the logic for auto-generating offers when needed.
 */

import { fetchRecordById, fetchRecords, createRecord, updateRecord } from '@/services/api/supabaseService';
import { logError, logInfo, logDebug } from '@/utils';
import type { Offer, Customer, TableName } from '@/services/api/types';

/**
 * Interface for auto-generated offer options
 */
export interface AutoOfferOptions {
  status?: string;
  offerNumberPrefix?: string;
  expirationDays?: number;
  initialAmount?: string;
  userId?: string;
}

/**
 * Check if a customer has any active offers
 * 
 * @param customerId The customer ID to check
 * @returns Promise with boolean indicating if customer has active offers
 */
export const customerHasActiveOffers = async (customerId: string): Promise<boolean> => {
  try {
    if (!customerId) {
      throw new Error('Customer ID is required');
    }
    
    // Query for active offers (not rejected or completed)
    const { data, error } = await fetchRecords<Offer>(
      'offers' as TableName,
      {
        filters: { 
          customer_id: customerId,
        },
        select: 'id, status'
      }
    );
    
    if (error) {
      logError('Error checking active offers for customer:', error, 'CustomerOfferService');
      return false;
    }
    
    // Consider non-rejected/completed offers as active
    const activeOffers = Array.isArray(data) 
      ? data.filter(offer => 
          offer.status !== 'rejected' && 
          offer.status !== 'completed' &&
          offer.status !== 'canceled')
      : [];
    
    return activeOffers.length > 0;
  } catch (error) {
    logError('Exception in customerHasActiveOffers:', error, 'CustomerOfferService');
    return false;
  }
};

/**
 * Create a new auto-generated offer for a customer
 * 
 * @param customerId The customer ID to create an offer for
 * @param options Optional settings for the auto-generated offer
 * @returns Promise with the created offer
 */
export const createOfferForCustomer = async (
  customerId: string,
  options: AutoOfferOptions = {}
): Promise<Offer | null> => {
  try {
    if (!customerId) {
      throw new Error('Customer ID is required');
    }
    
    // First check if customer exists
    const { data: customer, error: customerError } = await fetchRecordById<Customer>(
      'customers' as TableName,
      customerId,
      'id, company_name, primary_contact_id'
    );
    
    if (customerError || !customer) {
      logError('Error fetching customer for auto-offer creation:', customerError || 'Customer not found', 'CustomerOfferService');
      return null;
    }
    
    // Set default options
    const defaultOptions: Required<AutoOfferOptions> = {
      status: 'pending',
      offerNumberPrefix: 'AUTO',
      expirationDays: 30, // Default offer validity
      initialAmount: '0',
      userId: undefined
    };
    
    // Merge with provided options
    const settings = { ...defaultOptions, ...options };
    
    // Generate a unique offer number based on timestamp
    const timestamp = new Date().getTime().toString().slice(-6);
    const offerNumber = `${settings.offerNumberPrefix}-${timestamp}`;
    
    // Calculate expiration date if provided
    const expiresAt = settings.expirationDays 
      ? new Date(Date.now() + settings.expirationDays * 24 * 60 * 60 * 1000) 
      : undefined;
    
    // Create a new auto-generated offer
    const { data: offer, error: createError } = await createRecord<Offer>(
      'offers' as TableName,
      {
        customer_id: customerId,
        contact_id: customer.primary_contact_id || null,
        offer_number: offerNumber,
        status: settings.status,
        is_auto_generated: true,
        amount: settings.initialAmount,
        expires_at: expiresAt?.toISOString(),
        created_by: settings.userId
      }
    );
    
    if (createError) {
      logError('Error creating auto-generated offer:', createError, 'CustomerOfferService');
      return null;
    }
    
    logInfo(`Created auto-generated offer ${offer?.id} for customer ${customerId}`);
    return offer;
  } catch (error) {
    logError('Exception in createOfferForCustomer:', error, 'CustomerOfferService');
    return null;
  }
};

/**
 * Get or create an offer for a customer
 * If the customer has active offers, returns the most recent one
 * Otherwise, creates a new auto-generated offer
 * 
 * @param customerId The customer ID to get or create an offer for
 * @param options Optional settings for auto-generated offers
 * @returns Promise with the offer
 */
export const getOrCreateCustomerOffer = async (
  customerId: string,
  options: AutoOfferOptions = {}
): Promise<Offer | null> => {
  try {
    if (!customerId) {
      throw new Error('Customer ID is required');
    }
    
    // First check if customer has any active offers
    const { data, error } = await fetchRecords<Offer>(
      'offers' as TableName,
      {
        filters: { 
          customer_id: customerId
        },
        order: { column: 'created_at', ascending: false },
        select: '*'
      }
    );
    
    if (error) {
      logError('Error fetching offers for customer:', error, 'CustomerOfferService');
      return null;
    }
    
    // Filter to get non-rejected/completed offers
    const activeOffers = Array.isArray(data) 
      ? data.filter(offer => 
          offer.status !== 'rejected' && 
          offer.status !== 'completed' &&
          offer.status !== 'canceled')
      : [];
    
    if (activeOffers.length > 0) {
      // Return the most recent active offer (already sorted by created_at desc)
      return activeOffers[0] as Offer;
    }
    
    // Check for auto-generated offers that might be appropriate to reuse
    const autoOffers = Array.isArray(data)
      ? data.filter(offer => 
          offer.is_auto_generated === true &&
          new Date(offer.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
      : [];
      
    if (autoOffers.length > 0) {
      // Reuse the most recent auto-generated offer instead of creating a new one
      logInfo(`Reusing existing auto-generated offer ${autoOffers[0].id} for customer ${customerId}`);
      return autoOffers[0] as Offer;
    }
    
    // No active offers found, create a new auto-generated one
    return await createOfferForCustomer(customerId, options);
  } catch (error) {
    logError('Exception in getOrCreateCustomerOffer:', error, 'CustomerOfferService');
    return null;
  }
};

/**
 * Convert an auto-generated offer to a regular offer
 * This is typically done when a customer accepts an auto-generated offer
 * 
 * @param offerId The ID of the auto-generated offer to convert
 * @param userId Optional user ID for audit trail
 * @returns Promise with the updated offer
 */
export const convertAutoOfferToRegular = async (
  offerId: string,
  userId?: string
): Promise<Offer | null> => {
  try {
    if (!offerId) {
      throw new Error('Offer ID is required');
    }
    
    // Get the current offer
    const { data: offer, error: getError } = await fetchRecordById<Offer>(
      'offers' as TableName,
      offerId
    );
    
    if (getError || !offer) {
      logError('Error fetching offer for conversion:', getError || 'Offer not found', 'CustomerOfferService');
      return null;
    }
    
    // Check if this is an auto-generated offer
    if (!offer.is_auto_generated) {
      logInfo(`Offer ${offerId} is not auto-generated, no conversion needed`);
      return offer;
    }
    
    // Convert the offer by updating is_auto_generated flag
    const { data: updatedOffer, error: updateError } = await updateRecord<Offer>(
      'offers' as TableName,
      offerId,
      {
        is_auto_generated: false,
        updated_by: userId,
        // We could add other fields here if needed for conversion
      }
    );
    
    if (updateError) {
      logError('Error converting auto-generated offer:', updateError, 'CustomerOfferService');
      return null;
    }
    
    logInfo(`Successfully converted auto-generated offer ${offerId} to regular offer`);
    return updatedOffer;
  } catch (error) {
    logError('Exception in convertAutoOfferToRegular:', error, 'CustomerOfferService');
    return null;
  }
}; 