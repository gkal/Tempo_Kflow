import { supabase } from '@/lib/supabaseClient';
import { fetchRecordById, fetchRecords, updateRecord, createRecord } from '@/services/api/supabaseService';
import { logError, logInfo, logDebug } from '@/utils';
import type { Offer, Customer, Contact, TableName } from '@/services/api/types';

/**
 * Interface for offer data needed for forms
 */
export interface OfferFormData {
  id: string;
  offer_number?: string;
  requirements?: string;
  amount?: string;
  special_conditions?: string;
  status?: string;
  address?: string;
  postal_code?: string;
  town?: string;
  created_at: string;
  customer_id: string;
  is_auto_generated?: boolean;
}

/**
 * Interface for customer information needed for offer forms
 */
export interface CustomerFormInfo {
  id: string;
  company_name: string;
  email?: string;
  telephone?: string;
  address?: string;
  afm?: string;
  contact?: {
    id: string;
    full_name: string;
    email?: string;
    telephone?: string;
    position?: string;
  } | null;
  offer?: {
    id: string;
    offer_number?: string;
  };
}

/**
 * Interface for data submitted through an offer form
 */
export interface OfferFormSubmission {
  accepted: boolean;
  customer_comments?: string;
  special_requests?: string;
  preferred_date?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
}

/**
 * Get offer data needed for display in customer-facing forms
 * 
 * @param offerId The ID of the offer to get data for
 * @returns Promise with the offer data needed for the form
 */
export const getOfferDataForForm = async (offerId: string): Promise<OfferFormData | null> => {
  try {
    if (!offerId) {
      throw new Error('Offer ID is required');
    }
    
    const { data, error } = await fetchRecordById<Offer>(
      'offers' as TableName,
      offerId,
      'id, customer_id, requirements, amount, special_conditions, status, address, postal_code, town, created_at, is_auto_generated, offer_number'
    );
    
    if (error || !data) {
      logError('Error fetching offer data for form:', error || 'Offer not found', 'OfferFormService');
      return null;
    }
    
    return data as OfferFormData;
  } catch (error) {
    logError('Exception in getOfferDataForForm:', error, 'OfferFormService');
    return null;
  }
};

/**
 * Get customer information for an offer
 * 
 * @param offerId The ID of the offer to get customer info for
 * @returns Promise with the customer information
 */
export const getCustomerInfoForOffer = async (offerId: string): Promise<CustomerFormInfo | null> => {
  try {
    if (!offerId) {
      throw new Error('Offer ID is required');
    }
    
    // First get the offer to find the customer_id
    const { data: offer, error: offerError } = await fetchRecordById<Offer>(
      'offers' as TableName,
      offerId,
      'id, customer_id, contact_id, offer_number'
    );
    
    if (offerError || !offer) {
      logError('Error fetching offer for customer info:', offerError || 'Offer not found', 'OfferFormService');
      return null;
    }
    
    // Get the customer data
    const { data: customer, error: customerError } = await fetchRecordById<Customer>(
      'customers' as TableName,
      offer.customer_id,
      'id, company_name, email, telephone, address, afm'
    );
    
    if (customerError || !customer) {
      logError('Error fetching customer for offer:', customerError || 'Customer not found', 'OfferFormService');
      return null;
    }
    
    // If the offer has a contact_id, get the contact information
    let contact = null;
    if (offer.contact_id) {
      const { data: contactData, error: contactError } = await fetchRecordById<Contact>(
        'contacts' as TableName,
        offer.contact_id,
        'id, first_name, last_name, email, telephone, position'
      );
      
      if (!contactError && contactData) {
        contact = {
          id: contactData.id,
          full_name: `${contactData.first_name || ''} ${contactData.last_name || ''}`.trim(),
          email: contactData.email,
          telephone: contactData.telephone,
          position: contactData.position
        };
      }
    }
    
    return {
      id: customer.id,
      company_name: customer.company_name,
      email: customer.email,
      telephone: customer.telephone,
      address: customer.address,
      afm: customer.afm,
      contact,
      offer: {
        id: offer.id,
        offer_number: offer.offer_number
      }
    };
  } catch (error) {
    logError('Exception in getCustomerInfoForOffer:', error, 'OfferFormService');
    return null;
  }
};

/**
 * Update an offer with data submitted from a customer form
 * 
 * @param offerId The ID of the offer to update
 * @param formData The data submitted through the form
 * @param userId Optional user ID for audit trail
 * @returns Promise with the updated offer
 */
export const updateOfferFromFormSubmission = async (
  offerId: string,
  formData: OfferFormSubmission,
  userId?: string
): Promise<Offer | null> => {
  try {
    if (!offerId) {
      throw new Error('Offer ID is required');
    }
    
    // Get the current offer data first, to check if it was auto-generated
    const { data: currentOffer, error: getOfferError } = await fetchRecordById<Offer>(
      'offers' as TableName,
      offerId
    );
    
    if (getOfferError || !currentOffer) {
      logError('Error fetching current offer data:', getOfferError || 'Offer not found', 'OfferFormService');
      return null;
    }
    
    // Determine the new status based on the form data
    const newStatus = formData.accepted ? 'approved' : 'rejected';
    
    // Build update object with submitted data
    const updateData: Partial<Offer> = {
      status: newStatus,
      customer_comments: formData.customer_comments || '',
      special_conditions: formData.special_requests, // Update special conditions if provided
      preferred_date: formData.preferred_date, // Add preferred date if provided
      updated_by: userId
    };
    
    // If this was an auto-generated offer, and it's been accepted, 
    // update the is_auto_generated flag to false, as it's now a real offer
    if (currentOffer.is_auto_generated && formData.accepted) {
      updateData.is_auto_generated = false;
      
      // Add additional data to formerly auto-generated offers when accepted
      if (!currentOffer.amount) {
        updateData.amount = '0'; // Initialize with zero amount
      }
      
      logInfo(`Auto-generated offer ${offerId} has been accepted and converted to a regular offer`);
    }
    
    // Update the offer record
    const { data, error } = await updateRecord<Offer>(
      'offers' as TableName,
      offerId,
      updateData
    );
    
    if (error) {
      logError('Error updating offer from form submission:', error, 'OfferFormService');
      return null;
    }
    
    logInfo(`Updated offer ${offerId} with form submission. New status: ${newStatus}`);
    
    // If contact information was provided, update or create a contact record
    if (formData.contact_name || formData.contact_email || formData.contact_phone) {
      await updateContactInformation(offerId, formData, userId);
    }
    
    return data;
  } catch (error) {
    logError('Exception in updateOfferFromFormSubmission:', error, 'OfferFormService');
    return null;
  }
};

/**
 * Helper function to update or create contact information from form submission
 * 
 * @param offerId The ID of the offer
 * @param formData The form submission data containing contact information
 * @param userId Optional user ID for audit trail
 */
async function updateContactInformation(
  offerId: string,
  formData: OfferFormSubmission,
  userId?: string
): Promise<void> {
  try {
    // Get the offer to find the customer_id
    const { data: offer, error: offerError } = await fetchRecordById<Offer>(
      'offers' as TableName,
      offerId,
      'id, customer_id, contact_id'
    );
    
    if (offerError || !offer) {
      logError('Error fetching offer for contact update:', offerError || 'Offer not found', 'OfferFormService');
      return;
    }
    
    // If a contact name was provided, we need to update or create a contact
    if (formData.contact_name) {
      // Split the full name into first and last name
      const nameParts = formData.contact_name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      let contactId = offer.contact_id;
      
      // If the offer already has a contact, update it
      if (contactId) {
        await updateRecord<Contact>(
          'contacts' as TableName,
          contactId,
          {
            first_name: firstName,
            last_name: lastName,
            email: formData.contact_email,
            telephone: formData.contact_phone,
            updated_by: userId
          }
        );
        
        logInfo(`Updated contact ${contactId} from form submission`);
      } else {
        // Create a new contact for the customer
        const { data: newContact, error: createError } = await createRecord<Contact>(
          'contacts' as TableName,
          {
            customer_id: offer.customer_id,
            first_name: firstName,
            last_name: lastName,
            email: formData.contact_email,
            telephone: formData.contact_phone,
            is_primary: false, // Not setting as primary automatically
            created_by: userId
          }
        );
        
        if (createError) {
          logError('Error creating contact from form submission:', createError, 'OfferFormService');
          return;
        }
        
        if (newContact) {
          contactId = newContact.id;
          logInfo(`Created new contact ${contactId} from form submission`);
          
          // Link the new contact to the offer
          await updateRecord<Offer>(
            'offers' as TableName,
            offerId,
            {
              contact_id: contactId,
              updated_by: userId
            }
          );
          
          logInfo(`Linked new contact ${contactId} to offer ${offerId}`);
        }
      }
    }
  } catch (error) {
    logError('Exception in updateContactInformation:', error, 'OfferFormService');
  }
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
      logError('Error checking active offers for customer:', error, 'OfferFormService');
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
    logError('Exception in customerHasActiveOffers:', error, 'OfferFormService');
    return false;
  }
};

/**
 * Create a new auto-generated offer for a customer
 * This is used when a customer doesn't have any active offers
 * 
 * @param customerId The customer ID to create an offer for
 * @param userId Optional user ID for audit trail
 * @returns Promise with the created offer
 */
export const createAutoGeneratedOffer = async (
  customerId: string,
  userId?: string
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
      logError('Error fetching customer for auto-offer creation:', customerError || 'Customer not found', 'OfferFormService');
      return null;
    }
    
    // Generate a unique offer number based on timestamp
    const timestamp = new Date().getTime().toString().slice(-6);
    const offerNumber = `AUTO-${timestamp}`;
    
    // Create a new auto-generated offer
    const { data: offer, error: createError } = await createRecord<Offer>(
      'offers' as TableName,
      {
        customer_id: customerId,
        contact_id: customer.primary_contact_id || null,
        offer_number: offerNumber,
        status: 'pending',
        is_auto_generated: true,
        created_by: userId
      }
    );
    
    if (createError) {
      logError('Error creating auto-generated offer:', createError, 'OfferFormService');
      return null;
    }
    
    logInfo(`Created auto-generated offer ${offer?.id} for customer ${customerId}`);
    return offer;
  } catch (error) {
    logError('Exception in createAutoGeneratedOffer:', error, 'OfferFormService');
    return null;
  }
};

/**
 * Get or create an offer for a customer
 * If the customer has active offers, returns the most recent one
 * Otherwise, creates a new auto-generated offer
 * 
 * @param customerId The customer ID to get or create an offer for
 * @param userId Optional user ID for audit trail
 * @returns Promise with the offer
 */
export const getOrCreateCustomerOffer = async (
  customerId: string,
  userId?: string
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
      logError('Error fetching offers for customer:', error, 'OfferFormService');
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
    
    // No active offers found, create a new auto-generated one
    return await createAutoGeneratedOffer(customerId, userId);
  } catch (error) {
    logError('Exception in getOrCreateCustomerOffer:', error, 'OfferFormService');
    return null;
  }
}; 