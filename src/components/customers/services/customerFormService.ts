/**
 * Customer Form Service
 * Handles API calls and data operations for the customer form
 * Extracted from CustomerForm.tsx to improve modularity
 */

import { supabase } from '@/lib/supabaseClient';
import { CustomerFormSubmissionData } from '../types/customerTypes';
import { createPrefixedLogger } from '@/utils/loggingUtils';

// Initialize logger
const logger = createPrefixedLogger('CustomerFormService');

/**
 * Create a new customer
 */
export const createCustomer = async (
  data: CustomerFormSubmissionData
): Promise<{ id: string } | null> => {
  try {
    const { data: createdCustomer, error } = await supabase
      .from('customers')
      .insert([data])
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    return createdCustomer;
  } catch (error) {
    logger.error('Error creating customer:', error);
    throw error;
  }
};

/**
 * Update an existing customer
 */
export const updateCustomer = async (
  customerId: string,
  data: Partial<CustomerFormSubmissionData>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('customers')
      .update(data)
      .eq('id', customerId);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    logger.error('Error updating customer:', error);
    throw error;
  }
};

/**
 * Get a customer by id
 */
export const getCustomerById = async (
  customerId: string
): Promise<any | null> => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*, created_by:users!created_by(fullname), modified_by:users!modified_by(fullname)')
      .eq('id', customerId)
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Error fetching customer:', error);
    throw error;
  }
};

/**
 * Get all contacts for a customer
 */
export const getCustomerContacts = async (
  customerId: string
): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('customer_id', customerId)
      .eq('status', 'active')
      .is('deleted_at', null);

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error('Error fetching contacts:', error);
    throw error;
  }
};

/**
 * Create a new contact
 */
export const createContact = async (
  contactData: any
): Promise<{ id: string } | null> => {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .insert([contactData])
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Error creating contact:', error);
    throw error;
  }
};

/**
 * Soft delete a contact (sets deleted_at)
 */
export const deleteContact = async (
  contactId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('contacts')
      .update({
        deleted_at: new Date().toISOString(),
        status: 'inactive'
      })
      .eq('id', contactId);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    logger.error('Error deleting contact:', error);
    throw error;
  }
};

/**
 * Set primary contact for a customer
 */
export const setPrimaryContact = async (
  customerId: string,
  contactId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('customers')
      .update({ primary_contact_id: contactId })
      .eq('id', customerId);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    logger.error('Error setting primary contact:', error);
    throw error;
  }
}; 