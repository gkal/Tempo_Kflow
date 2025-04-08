/**
 * Real-time event handlers for customer-related components
 * Extracted from CustomersPage.tsx to improve modularity
 */

import { toast } from "@/components/ui/use-toast";
import { Customer, CustomerOffer } from '../types/interfaces';

/**
 * Handle real-time events for offers
 */
export const handleOffersRealtimeEvent = (
  payload: any,
  customers: Customer[],
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>,
  customerOffers: Record<string, CustomerOffer[]>,
  setCustomerOffers: React.Dispatch<React.SetStateAction<Record<string, CustomerOffer[]>>>,
  expandedCustomerIds: Record<string, boolean>,
  setLastRealtimeUpdate: React.Dispatch<React.SetStateAction<number>>,
  setRealtimeStatus: React.Dispatch<React.SetStateAction<string | null>>,
  fetchCustomerOffers: (customerId: string, forceRefresh?: boolean) => Promise<void>
) => {
  // console.log('🔴 [RT-EVENT] Realtime Offers Event:', payload);
  // if (payload.new) console.log('🔴 [RT-PAYLOAD] NEW:', JSON.stringify(payload.new));
  // if (payload.old) console.log('🔴 [RT-PAYLOAD] OLD:', JSON.stringify(payload.old));
  
  // Add back the realtime status update that we accidentally removed
  setRealtimeStatus(`Received ${payload.eventType} at ${new Date().toLocaleTimeString()}`);
  
  // Handle the real-time update based on event type
  if (payload.eventType === 'INSERT') {
    // A new offer was added
    if (payload.new && payload.new.customer_id) {
      const customerId = payload.new.customer_id;
      // console.log(`🔴 [RT-INSERT] New offer added for customer ${customerId}`);
      
      // Update the customers list with the new offer count - only through real-time events
      setCustomers(prevCustomers => {
        return prevCustomers.map(customer => {
          if (customer.id === customerId) {
            // Only increase the count if it's an active offer
            const isActive = !payload.new.result || 
                          payload.new.result === 'pending' || 
                          payload.new.result === 'none' || 
                          payload.new.result === '';
                          
            if (isActive) {
              // console.log(`🔴 [RT-INSERT] Updating offer count for customer ${customerId} from ${customer.offers_count} to ${(customer.offers_count || 0) + 1}`);
              return {
                ...customer,
                offers_count: (customer.offers_count || 0) + 1
              };
            }
          }
          return customer;
        });
      });
      
      // Create a UI offer object from the payload for either case
      const newOffer: CustomerOffer = {
        id: payload.new.id,
        name: `Προσφορά ${typeof payload.new.id === 'string' ? payload.new.id.substring(0, 4) : ''}`,
        value: payload.new.amount ? String(payload.new.amount) : '',
        date: payload.new.created_at,
        status: payload.new.offer_result || 'pending',
        requirements: payload.new.requirements || payload.new.customer_comments || '',
        result: payload.new.result || ''
      };
      
      // Always update the customerOffers state regardless of expansion state
      // This ensures all browsers have the latest data
      // console.log(`🔴 [RT-INSERT] Updating offers state for customer ${customerId} with new offer ${payload.new.id}`);
      setCustomerOffers(prev => {
        const currentOffers = prev[customerId] || [];
        
        // Check if this offer already exists (preventing duplicates)
        const existingOfferIndex = currentOffers.findIndex(offer => offer.id === newOffer.id);
        if (existingOfferIndex >= 0) {
          // Replace the existing offer with the updated one
          // console.log(`🔴 [RT-INSERT] Offer ${newOffer.id} already exists, updating it`);
          const updatedOffers = [...currentOffers];
          updatedOffers[existingOfferIndex] = newOffer;
          return {
            ...prev,
            [customerId]: updatedOffers
          };
        }
        
        // Add as a new offer at the beginning (newest first)
        // console.log(`🔴 [RT-INSERT] Adding new offer ${newOffer.id} to customer ${customerId}`);
        return {
          ...prev,
          [customerId]: [newOffer, ...currentOffers]
        };
      });
      
      // Only trigger a refresh when we have an expanded customer with this ID
      if (expandedCustomerIds[customerId]) {
        // console.log(`🔴 [RT-INSERT] Customer ${customerId} is expanded, triggering refresh`);
        // Add a small delay to avoid updates colliding
        setTimeout(() => {
          setLastRealtimeUpdate(Date.now());
        }, 100);
      }
    }
  } else if (payload.eventType === 'UPDATE') {
    // An offer was updated
    if (payload.new && payload.new.customer_id) {
      const customerId = payload.new.customer_id;
      // console.log(`🔴 [RT-UPDATE] Offer updated for customer ${customerId}, offer ID: ${payload.new.id}`);
      
      // Check if this is a soft delete operation (deleted_at was set)
      const isSoftDelete = payload.old && !payload.old.deleted_at && payload.new.deleted_at;
      
      if (isSoftDelete) {
        // console.log(`🔴 [RT-UPDATE] Offer soft-deleted for customer ${customerId}`);
        
        // Always update the count immediately
        setCustomers(prevCustomers => 
          prevCustomers.map(customer => {
            if (customer.id === customerId) {
              const newCount = Math.max(0, (customer.offers_count || 0) - 1);
              // console.log(`🔴 [RT-UPDATE] Soft delete: Updating offer count for customer ${customerId} from ${customer.offers_count} to ${newCount}`);
              
              return {
                ...customer,
                offers_count: newCount
              };
            }
            return customer;
          })
        );
        
        // Remove the deleted offer from the list - regardless of expansion state
        // This ensures all browsers have the latest data
        const offerId = payload.new.id;
        // console.log(`🔴 [RT-UPDATE] Soft delete: Removing offer ${offerId} from UI for customer ${customerId}`);
        
        setCustomerOffers(prev => {
          if (!prev[customerId]) return prev;
          
          return {
            ...prev,
            [customerId]: prev[customerId].filter(offer => offer.id !== offerId)
          };
        });
        
        // Only trigger a refresh when we have an expanded customer with this ID
        if (expandedCustomerIds[customerId]) {
          // console.log(`🔴 [RT-UPDATE] Customer ${customerId} is expanded, triggering refresh after soft delete`);
          // Add a small delay to avoid updates colliding
          setTimeout(() => {
            setLastRealtimeUpdate(Date.now());
          }, 100);
        }
        
        return; // Skip the regular update handling
      }
      
      // Regular update - Create a formatted offer object from the payload
      const updatedOffer: CustomerOffer = {
        id: payload.new.id,
        name: `Προσφορά ${typeof payload.new.id === 'string' ? payload.new.id.substring(0, 4) : ''}`,
        value: payload.new.amount ? String(payload.new.amount) : '',
        date: payload.new.created_at || payload.new.updated_at || new Date().toISOString(),
        status: payload.new.offer_result || 'pending',
        requirements: payload.new.requirements || payload.new.customer_comments || '',
        result: payload.new.result || ''
      };
      
      // Update the offer in local state regardless of expansion state
      // This ensures all browsers have the latest data
      // console.log(`🔴 [RT-UPDATE] Regular update: Updating offer ${payload.new.id} in UI for customer ${customerId}`);
      
      let stateWasUpdated = false;
      
      setCustomerOffers(prev => {
        // If we don't have offers for this customer yet, get them
        if (!prev[customerId]) {
          // console.log(`🔴 [RT-UPDATE] No offers found for ${customerId}, triggering fetch for this customer`);
          // Fetch offers for this customer in the background
          fetchCustomerOffers(customerId, true);
          return prev;
        }
        
        // Check if the offer exists and is different from the updated one
        const existingOffer = prev[customerId]?.find(offer => offer.id === updatedOffer.id);
        if (!existingOffer || 
            existingOffer.value !== updatedOffer.value || 
            existingOffer.status !== updatedOffer.status || 
            existingOffer.requirements !== updatedOffer.requirements || 
            existingOffer.result !== updatedOffer.result) {
          stateWasUpdated = true;
        }
        
        // Update the offer in the existing list
        return {
          ...prev,
          [customerId]: prev[customerId].map(offer => {
            if (offer.id === updatedOffer.id) {
              // console.log(`🔴 [RT-UPDATE] Found offer to update: ${offer.id}`);
              // console.log(`🔴 [RT-UPDATE] Updating from: ${JSON.stringify(offer)} to: ${JSON.stringify(updatedOffer)}`);
              // Return the updated offer with all fields
              return updatedOffer;
            }
            return offer;
          })
        };
      });
      
      // Only trigger a refresh when the state was updated and customer is expanded
      if (stateWasUpdated && expandedCustomerIds[customerId]) {
        // console.log(`🔴 [RT-UPDATE] Customer ${customerId} is expanded and offer was updated, triggering refresh`);
        // Add a small delay to avoid updates colliding
        setTimeout(() => {
          setLastRealtimeUpdate(Date.now());
        }, 100);
      }
    }
  } else if (payload.eventType === 'DELETE') {
    // A hard delete happened (directly in the database)
    if (payload.old && payload.old.customer_id) {
      const customerId = payload.old.customer_id;
      const offerId = payload.old.id;
      // console.log(`🔴 [RT-DELETE] Offer hard-deleted from database: ${offerId} for customer ${customerId}`);
      
      // Update customer offer count
      setCustomers(prevCustomers => 
        prevCustomers.map(customer => {
          if (customer.id === customerId) {
            // Only decrease if it's an active offer
            const isActive = !payload.old.result || 
                        payload.old.result === 'pending' || 
                        payload.old.result === 'none' || 
                        payload.old.result === '';
                        
            if (isActive) {
              const newCount = Math.max(0, (customer.offers_count || 0) - 1);
              // console.log(`🔴 [RT-DELETE] Hard delete: Updating offer count for customer ${customerId} from ${customer.offers_count} to ${newCount}`);
              
              return {
                ...customer,
                offers_count: newCount
              };
            }
          }
          return customer;
        })
      );
      
      // Remove the deleted offer from the list regardless of expansion state
      console.log(`🔴 [RT-DELETE] Removing offer ${offerId} from UI for customer ${customerId}`);
      
      setCustomerOffers(prev => {
        if (!prev[customerId]) return prev;
        
        return {
          ...prev,
          [customerId]: prev[customerId].filter(offer => offer.id !== offerId)
        };
      });
    }
  }
};

/**
 * Handle real-time events for customers
 */
export const handleCustomersRealtimeEvent = (
  payload: any,
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>,
  expandedCustomerIds: Record<string, boolean>,
  setExpandedCustomerIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
  customerOffers: Record<string, CustomerOffer[]>,
  setCustomerOffers: React.Dispatch<React.SetStateAction<Record<string, CustomerOffer[]>>>,
  setRealtimeStatus: React.Dispatch<React.SetStateAction<string | null>>
) => {
  console.log('🔵 Realtime Customers Event:', payload);
  if (payload.new) console.log('🔵 Payload NEW:', JSON.stringify(payload.new));
  if (payload.old) console.log('🔵 Payload OLD:', JSON.stringify(payload.old));
  
  setRealtimeStatus(`Received ${payload.eventType} at ${new Date().toLocaleTimeString()}`);
  
  // Handle the real-time update based on event type
  if (payload.eventType === 'INSERT') {
    // A new customer was added
    if (payload.new) {
      // Map the new customer data to our Customer type
      const newCustomer: Customer = {
        id: payload.new.id,
        company_name: payload.new.company_name || '',
        email: payload.new.email || '',
        telephone: payload.new.telephone || '',
        status: payload.new.status || 'inactive',
        created_at: payload.new.created_at,
        customer_type: payload.new.customer_type || '',
        address: payload.new.address || '',
        town: payload.new.town || '',
        postal_code: payload.new.postal_code || '',
        afm: payload.new.afm || '',
        offers_count: 0 // New customer has no offers yet
      };
      
      // Add the new customer to state
      setCustomers(prevCustomers => {
        // Check if this customer already exists (unlikely but possible)
        const exists = prevCustomers.some(c => c.id === newCustomer.id);
        if (exists) return prevCustomers;
        
        // Add the new customer to the list and sort by company_name
        const newList = [...prevCustomers, newCustomer].sort((a, b) => 
          (a.company_name || '').localeCompare(b.company_name || '')
        );
        
        console.log('🔵 Added new customer to UI:', newCustomer.company_name);
        return newList;
      });
    }
  } else if (payload.eventType === 'UPDATE') {
    // A customer was updated
    if (payload.new && payload.old) {
      // Check if this is a soft delete operation (deleted_at was set)
      const isSoftDelete = !payload.old.deleted_at && payload.new.deleted_at;
      
      if (isSoftDelete) {
        console.log('🔵 Customer soft-deleted:', payload.new.company_name);
        
        // Remove the customer from state
        setCustomers(prevCustomers => 
          prevCustomers.filter(customer => customer.id !== payload.new.id)
        );
        
        // Also remove any offers data for this customer
        setCustomerOffers(prev => {
          const newOffers = { ...prev };
          delete newOffers[payload.new.id];
          return newOffers;
        });
        
        // And remove from expanded state if expanded
        if (expandedCustomerIds[payload.new.id]) {
          setExpandedCustomerIds(prev => {
            const newState = { ...prev };
            delete newState[payload.new.id];
            return newState;
          });
        }
      } else {
        console.log('🔵 Customer updated:', payload.new.company_name);
        
        // Update the customer in state
        setCustomers(prevCustomers => 
          prevCustomers.map(customer => {
            if (customer.id === payload.new.id) {
              // Update relevant fields
              return {
                ...customer,
                company_name: payload.new.company_name || customer.company_name,
                email: payload.new.email || customer.email,
                telephone: payload.new.telephone || customer.telephone,
                status: payload.new.status || customer.status,
                customer_type: payload.new.customer_type || customer.customer_type,
                address: payload.new.address || customer.address,
                town: payload.new.town || customer.town,
                postal_code: payload.new.postal_code || customer.postal_code,
                afm: payload.new.afm || customer.afm
              };
            }
            return customer;
          })
        );
      }
    }
  } else if (payload.eventType === 'DELETE') {
    // A customer was hard deleted (rare, as we usually use soft deletes)
    if (payload.old) {
      console.log('🔵 Customer deleted:', payload.old.company_name);
      
      // Remove the customer from state
      setCustomers(prevCustomers => 
        prevCustomers.filter(customer => customer.id !== payload.old.id)
      );
      
      // Also remove any offers data for this customer
      setCustomerOffers(prev => {
        const newOffers = { ...prev };
        delete newOffers[payload.old.id];
        return newOffers;
      });
      
      // And remove from expanded state if expanded
      if (expandedCustomerIds[payload.old.id]) {
        setExpandedCustomerIds(prev => {
          const newState = { ...prev };
          delete newState[payload.old.id];
          return newState;
        });
      }
    }
  }
};

/**
 * Maps database customers to our Customer type
 */
export const mapDatabaseCustomers = (dbCustomers: any[]): Customer[] => {
  return dbCustomers.map(dbCustomer => {
    // Get all non-deleted offers
    const validOffers = dbCustomer.offers?.filter((offer: any) => !offer.deleted_at) || [];
    
    // Sort offers by created_at descending (newest first)
    validOffers.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    // Count active offers (those without a final result)
    const activeOffersCount = validOffers.filter((offer: any) => 
      !offer.result || 
      offer.result === 'pending' || 
      offer.result === 'none' || 
      offer.result === ''
    ).length;
    
    return {
      id: dbCustomer.id,
      company_name: dbCustomer.company_name || '',
      email: dbCustomer.email || '',
      telephone: dbCustomer.telephone || '',
      status: dbCustomer.status || 'inactive',
      created_at: dbCustomer.created_at,
      customer_type: dbCustomer.customer_type || '',
      address: dbCustomer.address || '',
      town: dbCustomer.town || '',
      postal_code: dbCustomer.postal_code || '',
      afm: dbCustomer.afm || '',
      offers_count: activeOffersCount,
      offers: validOffers.map((offer: any) => ({
        id: offer.id,
        name: `Προσφορά ${typeof offer.id === 'string' ? offer.id.substring(0, 4) : ''}`,
        value: offer.amount ? String(offer.amount) : '',
        date: offer.created_at,
        status: offer.offer_result || 'pending',
        requirements: offer.requirements || '',
        result: offer.result || ''
      }))
    };
  });
}; 