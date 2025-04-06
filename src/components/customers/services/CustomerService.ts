// Customer service for data operations
// Extracted from CustomersPage.tsx to improve modularity

import { supabase } from "@/lib/supabaseClient";
import { Customer, CustomerOffer } from "../types/CustomerTypes";

/**
 * Maps database customers to the Customer type
 */
export const mapDatabaseCustomers = (dbCustomers: any[]): Customer[] => {
  return dbCustomers.map(customer => ({
    id: customer.id,
    company_name: customer.company_name || '',
    email: customer.email || '',
    telephone: customer.telephone || '',
    status: customer.status || 'active',
    created_at: customer.created_at,
    customer_type: customer.customer_type || '',
    offers_count: customer.offers_count || 0,
    address: customer.address || '',
    afm: customer.afm || '',
    // Add any other fields from the database
    ...Object.fromEntries(
      Object.entries(customer).filter(([key]) => 
        !['id', 'company_name', 'email', 'telephone', 'status', 'created_at', 
          'customer_type', 'offers_count', 'address', 'afm'].includes(key)
      )
    )
  }));
};

/**
 * Fetches customers from the database
 */
export const fetchCustomers = async (): Promise<Customer[]> => {
  try {
    console.log("Fetching customers...");
    
    // Get customers with offer count
    const { data: customers, error } = await supabase
      .from('customers')
      .select(`
        *,
        offers_count:offers(count)
      `)
      .is('deleted_at', null)
      .order('company_name', { ascending: true });
    
    if (error) {
      console.error("Error fetching customers:", error);
      throw error;
    }
    
    if (!customers) {
      return [];
    }
    
    // Process the data to match our Customer type
    return mapDatabaseCustomers(customers);
  } catch (error) {
    console.error("Error in fetchCustomers:", error);
    throw error;
  }
};

/**
 * Fetches offers for a specific customer
 */
export const fetchCustomerOffers = async (customerId: string): Promise<CustomerOffer[]> => {
  try {
    const { data: offers, error } = await supabase
      .from('offers')
      .select('*')
      .eq('customer_id', customerId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error(`Error fetching offers for customer ${customerId}:`, error);
      throw error;
    }
    
    if (!offers) {
      return [];
    }
    
    // Map to CustomerOffer type
    return offers.map(offer => ({
      id: offer.id,
      name: offer.requirements?.substring(0, 30) || 'Προσφορά',
      value: offer.amount ? offer.amount.toString() : '0',
      date: offer.created_at || '',
      status: offer.status || 'pending',
      requirements: offer.requirements || '',
      result: offer.result || 'pending'
    }));
  } catch (error) {
    console.error(`Error in fetchCustomerOffers for ${customerId}:`, error);
    throw error;
  }
};

/**
 * Soft deletes a customer
 */
export const deleteCustomer = async (customerId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('customers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', customerId);
    
    if (error) {
      console.error(`Error deleting customer ${customerId}:`, error);
      throw error;
    }
  } catch (error) {
    console.error(`Error in deleteCustomer for ${customerId}:`, error);
    throw error;
  }
};

/**
 * Soft deletes an offer
 */
export const deleteOffer = async (offerId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('offers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', offerId);
    
    if (error) {
      console.error(`Error deleting offer ${offerId}:`, error);
      throw error;
    }
  } catch (error) {
    console.error(`Error in deleteOffer for ${offerId}:`, error);
    throw error;
  }
};
