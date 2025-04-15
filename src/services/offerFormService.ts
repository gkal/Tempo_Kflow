import { supabase } from '@/lib/supabaseClient';
import { fetchRecordById, fetchRecords, updateRecord, createRecord } from '@/services/api/supabaseService';
import { logError, logInfo, logDebug } from '@/utils';
import type { Offer, Customer, Contact, TableName } from '@/services/api/types';

// Extended types to match the actual database schema
interface ExtendedContact extends Contact {
  first_name?: string;
  last_name?: string;
  telephone?: string;
  position?: string;
}

interface ExtendedCustomer extends Customer {
  telephone?: string;
  afm?: string;
  primary_contact_id?: string;
}

interface ExtendedOffer extends Offer {
  offer_number?: string;
  is_auto_generated?: boolean;
}

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
    
    const { data, error } = await fetchRecordById<ExtendedOffer>(
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
    const { data: offer, error: offerError } = await fetchRecordById<ExtendedOffer>(
      'offers' as TableName,
      offerId,
      'id, customer_id, contact_id, offer_number'
    );
    
    if (offerError || !offer) {
      logError('Error fetching offer for customer info:', offerError || 'Offer not found', 'OfferFormService');
      return null;
    }
    
    // Get the customer data
    const { data: customer, error: customerError } = await fetchRecordById<ExtendedCustomer>(
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
      const { data: contactData, error: contactError } = await fetchRecordById<ExtendedContact>(
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
    const { data: currentOffer, error: getOfferError } = await fetchRecordById<ExtendedOffer>(
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
    const updateData: Partial<ExtendedOffer> = {
      status: newStatus,
      customer_comments: formData.customer_comments || '',
      special_conditions: formData.special_requests, // Update special conditions if provided
      updated_by: userId
    };

    // Add preferred date if provided in a type-safe way
    if (formData.preferred_date) {
      (updateData as any).preferred_date = formData.preferred_date;
    }
    
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
    // First get the offer to find associated customer and contact
    const { data: offer, error: offerError } = await fetchRecordById<Offer>(
      'offers' as TableName,
      offerId,
      'id, customer_id, contact_id'
    );
    
    if (offerError || !offer) {
      logError('Error fetching offer for contact update:', offerError || 'Offer not found', 'OfferFormService');
      return;
    }
    
    // Parse the contact name to get first and last name components if possible
    let firstName = '';
    let lastName = '';
    
    if (formData.contact_name) {
      const nameParts = formData.contact_name.trim().split(' ');
      if (nameParts.length === 1) {
        firstName = nameParts[0];
      } else if (nameParts.length > 1) {
        firstName = nameParts[0];
        lastName = nameParts.slice(1).join(' ');
      }
    }
    
    // If the offer already has a contact_id, update that contact
    if (offer.contact_id) {
      // Get the current contact data
      const { data: existingContact } = await fetchRecordById<ExtendedContact>(
        'contacts' as TableName,
        offer.contact_id
      );
      
      // Build update object with changes from form
      const contactUpdateData: Partial<ExtendedContact> = {};
      
      if (firstName || lastName) {
        contactUpdateData.first_name = firstName;
        if (lastName) {
          contactUpdateData.last_name = lastName;
        }
        // Only update name if we've derived both parts
        if (existingContact) {
          contactUpdateData.name = `${firstName} ${lastName}`.trim();
        }
      }
      
      if (formData.contact_email) {
        contactUpdateData.email = formData.contact_email;
      }
      
      if (formData.contact_phone) {
        contactUpdateData.telephone = formData.contact_phone;
        contactUpdateData.phone = formData.contact_phone; // Update standard property too
      }
      
      // Only update if we have changes
      if (Object.keys(contactUpdateData).length > 0) {
        await updateRecord<ExtendedContact>(
          'contacts' as TableName,
          offer.contact_id,
          contactUpdateData
        );
        
        logInfo(`Updated contact ${offer.contact_id} with form submission data`);
      }
    } 
    // Otherwise, create a new contact for the customer and associate with the offer
    else if (firstName || formData.contact_email || formData.contact_phone) {
      // Create a new contact
      const newContactData: Partial<ExtendedContact> = {
        customer_id: offer.customer_id,
        first_name: firstName,
        name: `${firstName} ${lastName}`.trim(), // Also set name property
        email: formData.contact_email,
        telephone: formData.contact_phone,
        phone: formData.contact_phone, // Set standard property too
        created_at: new Date().toISOString()
      };
      
      if (lastName) {
        newContactData.last_name = lastName;
      }
      
      // Create the contact
      const { data: newContact, error: createError } = await createRecord<ExtendedContact>(
        'contacts' as TableName,
        newContactData
      );
      
      if (createError || !newContact) {
        logError('Error creating contact from form data:', createError || 'Contact creation failed', 'OfferFormService');
        return;
      }
      
      logInfo(`Created new contact ${newContact.id} from form submission`);
      
      // Associate the new contact with the offer
      await updateRecord<Offer>(
        'offers' as TableName,
        offerId,
        { contact_id: newContact.id }
      );
      
      logInfo(`Associated new contact ${newContact.id} with offer ${offerId}`);
    }
  } catch (error) {
    logError('Exception in updateContactInformation:', error, 'OfferFormService');
  }
}

/**
 * Check if a customer has any active offers that can be used for form submissions
 * 
 * @param customerId The customer ID to check for active offers
 * @returns Promise that resolves to true if customer has active offers
 */
export const customerHasActiveOffers = async (customerId: string): Promise<boolean> => {
  try {
    if (!customerId) {
      return false;
    }
    
    // Check for any active offers - using any to bypass deep instantiation issue
    const client = supabase as any;
    const result = await client
      .from('offers')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', customerId)
      .eq('is_deleted', false)
      .in('status', ['pending', 'approved'])
      .limit(1);
    
    const { data, error, count } = result;
    
    if (error) {
      logError('Error checking for active offers:', error, 'OfferFormService');
      return false;
    }
    
    return !!count && count > 0;
  } catch (error) {
    logError('Exception in customerHasActiveOffers:', error, 'OfferFormService');
    return false;
  }
};

/**
 * Create an auto-generated offer for a customer
 * This is useful for creating placeholder offers for form submissions
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
    
    // Get customer to verify it exists
    const { data: customer, error: customerError } = await fetchRecordById<ExtendedCustomer>(
      'customers' as TableName,
      customerId
    );
    
    if (customerError || !customer) {
      logError('Error fetching customer:', customerError || 'Customer not found', 'OfferFormService');
      return null;
    }
    
    // Generate a unique offer number for auto-generated offers
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const offerNumber = `AUTO-${dateStr}-${randomSuffix}`;
    
    // Create the auto-generated offer
    const offerData: Partial<ExtendedOffer> = {
      customer_id: customerId,
      requirements: 'Auto-generated offer for form submission',
      status: 'pending',
      created_at: new Date().toISOString(),
      is_auto_generated: true,
      contact_id: customer.primary_contact_id || null,
      offer_number: offerNumber,
      created_by: userId
    };
    
    const { data, error } = await createRecord<ExtendedOffer>(
      'offers' as TableName,
      offerData
    );
    
    if (error || !data) {
      logError('Error creating auto-generated offer:', error || 'Offer creation failed', 'OfferFormService');
      return null;
    }
    
    logInfo(`Created auto-generated offer ${data.id} for customer ${customerId}`);
    
    return data;
  } catch (error) {
    logError('Exception in createAutoGeneratedOffer:', error, 'OfferFormService');
    return null;
  }
};

/**
 * Get an existing active offer for a customer, or create a new auto-generated one
 * 
 * @param customerId The customer ID to get or create an offer for
 * @param userId Optional user ID for audit trail
 * @returns Promise with offer
 */
export const getOrCreateCustomerOffer = async (
  customerId: string,
  userId?: string
): Promise<Offer | null> => {
  try {
    if (!customerId) {
      throw new Error('Customer ID is required');
    }
    
    // First check if customer already has an active offer
    // Using any to work around the typescript deep instantiation issue
    const result = await (supabase as any)
      .from('offers')
      .select('*')
      .eq('customer_id', customerId)
      .eq('is_deleted', false)
      .in('status', ['pending', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1);
    
    const { data, error } = result;
    
    if (error) {
      logError('Error fetching existing offers:', error, 'OfferFormService');
      return null;
    }
    
    // If an active offer exists, return it
    if (data && data.length > 0) {
      logInfo(`Using existing offer ${data[0].id} for customer ${customerId}`);
      return data[0] as Offer;
    }
    
    // Otherwise create a new auto-generated offer
    return createAutoGeneratedOffer(customerId, userId);
  } catch (error) {
    logError('Exception in getOrCreateCustomerOffer:', error, 'OfferFormService');
    return null;
  }
}; 