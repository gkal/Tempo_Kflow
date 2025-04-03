import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Customer, CustomerOffer } from '@/types/customer.types';
import { toast } from '@/components/ui/use-toast';

interface UseCustomerRealtimeProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  customerOffers: Record<string, CustomerOffer[]>;
  setCustomerOffers: React.Dispatch<React.SetStateAction<Record<string, CustomerOffer[]>>>;
  expandedCustomerIds: Record<string, boolean>;
  setLastRealtimeUpdate: React.Dispatch<React.SetStateAction<number>>;
}

export const useCustomerRealtime = ({
  customers,
  setCustomers,
  customerOffers,
  setCustomerOffers,
  expandedCustomerIds,
  setLastRealtimeUpdate
}: UseCustomerRealtimeProps) => {
  const [realtimeStatus, setRealtimeStatus] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to offers changes
    const offersSubscription = supabase
      .channel('offers-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'offers'
      }, (payload) => {
        console.log('🔴 [RT-EVENT] Realtime Offers Event:', payload);
        if (payload.new) console.log('🔴 [RT-PAYLOAD] NEW:', JSON.stringify(payload.new));
        if (payload.old) console.log('🔴 [RT-PAYLOAD] OLD:', JSON.stringify(payload.old));
        
        setRealtimeStatus(`Received ${payload.eventType} at ${new Date().toLocaleTimeString()}`);
        
        if (payload.eventType === 'INSERT') {
          if (payload.new && payload.new.customer_id) {
            const customerId = payload.new.customer_id;
            console.log(`🔴 [RT-INSERT] New offer added for customer ${customerId}`);
            
            setCustomers(prevCustomers => {
              return prevCustomers.map(customer => {
                if (customer.id === customerId) {
                  const isActive = !payload.new.result || 
                                payload.new.result === 'pending' || 
                                payload.new.result === 'none' || 
                                payload.new.result === '';
                                
                  if (isActive) {
                    return {
                      ...customer,
                      offers_count: (customer.offers_count || 0) + 1
                    };
                  }
                }
                return customer;
              });
            });
            
            const newOffer: CustomerOffer = {
              id: payload.new.id,
              name: `Προσφορά ${typeof payload.new.id === 'string' ? payload.new.id.substring(0, 4) : ''}`,
              value: payload.new.amount ? String(payload.new.amount) : '',
              date: payload.new.created_at,
              status: payload.new.offer_result || 'pending',
              requirements: payload.new.requirements || payload.new.customer_comments || '',
              result: payload.new.result || ''
            };
            
            setCustomerOffers(prev => {
              const currentOffers = prev[customerId] || [];
              const existingOfferIndex = currentOffers.findIndex(offer => offer.id === newOffer.id);
              
              if (existingOfferIndex >= 0) {
                const updatedOffers = [...currentOffers];
                updatedOffers[existingOfferIndex] = newOffer;
                return {
                  ...prev,
                  [customerId]: updatedOffers
                };
              }
              
              return {
                ...prev,
                [customerId]: [newOffer, ...currentOffers]
              };
            });
            
            if (expandedCustomerIds[customerId]) {
              setTimeout(() => {
                setLastRealtimeUpdate(Date.now());
              }, 100);
            }
          }
        } else if (payload.eventType === 'UPDATE') {
          if (payload.new && payload.new.customer_id) {
            const customerId = payload.new.customer_id;
            console.log(`🔴 [RT-UPDATE] Offer updated for customer ${customerId}, offer ID: ${payload.new.id}`);
            
            const isSoftDelete = payload.old && !payload.old.deleted_at && payload.new.deleted_at;
            
            if (isSoftDelete) {
              console.log(`🔴 [RT-UPDATE] Offer soft-deleted for customer ${customerId}`);
              
              setCustomers(prevCustomers => 
                prevCustomers.map(customer => {
                  if (customer.id === customerId) {
                    const newCount = Math.max(0, (customer.offers_count || 0) - 1);
                    return {
                      ...customer,
                      offers_count: newCount
                    };
                  }
                  return customer;
                })
              );
              
              const offerId = payload.new.id;
              
              setCustomerOffers(prev => {
                if (!prev[customerId]) return prev;
                
                return {
                  ...prev,
                  [customerId]: prev[customerId].filter(offer => offer.id !== offerId)
                };
              });
              
              if (expandedCustomerIds[customerId]) {
                setTimeout(() => {
                  setLastRealtimeUpdate(Date.now());
                }, 100);
              }
              
              return;
            }
            
            const updatedOffer: CustomerOffer = {
              id: payload.new.id,
              name: `Προσφορά ${typeof payload.new.id === 'string' ? payload.new.id.substring(0, 4) : ''}`,
              value: payload.new.amount ? String(payload.new.amount) : '',
              date: payload.new.created_at || payload.new.updated_at || new Date().toISOString(),
              status: payload.new.offer_result || 'pending',
              requirements: payload.new.requirements || payload.new.customer_comments || '',
              result: payload.new.result || ''
            };
            
            let stateWasUpdated = false;
            
            setCustomerOffers(prev => {
              if (!prev[customerId]) {
                return prev;
              }
              
              const existingOffer = prev[customerId]?.find(offer => offer.id === updatedOffer.id);
              if (!existingOffer || 
                  existingOffer.value !== updatedOffer.value || 
                  existingOffer.status !== updatedOffer.status || 
                  existingOffer.requirements !== updatedOffer.requirements || 
                  existingOffer.result !== updatedOffer.result) {
                stateWasUpdated = true;
              }
              
              return {
                ...prev,
                [customerId]: prev[customerId].map(offer => {
                  if (offer.id === updatedOffer.id) {
                    return updatedOffer;
                  }
                  return offer;
                })
              };
            });
            
            if (stateWasUpdated && expandedCustomerIds[customerId]) {
              setTimeout(() => {
                setLastRealtimeUpdate(Date.now());
              }, 100);
            }
          }
        } else if (payload.eventType === 'DELETE') {
          if (payload.old && payload.old.customer_id) {
            const customerId = payload.old.customer_id;
            const offerId = payload.old.id;
            console.log(`🔴 [RT-DELETE] Offer hard-deleted from database: ${offerId} for customer ${customerId}`);
            
            setCustomers(prevCustomers => 
              prevCustomers.map(customer => {
                if (customer.id === customerId) {
                  const isActive = !payload.old.result || 
                              payload.old.result === 'pending' || 
                              payload.old.result === 'none' || 
                              payload.old.result === '';
                              
                  if (isActive) {
                    const newCount = Math.max(0, (customer.offers_count || 0) - 1);
                    return {
                      ...customer,
                      offers_count: newCount
                    };
                  }
                }
                return customer;
              })
            );
            
            setCustomerOffers(prev => {
              if (!prev[customerId]) return prev;
              
              return {
                ...prev,
                [customerId]: prev[customerId].filter(offer => offer.id !== offerId)
              };
            });
          }
        }
      })
      .subscribe();

    // Subscribe to customers changes
    const customersSubscription = supabase
      .channel('customers-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'customers'
      }, (payload) => {
        console.log('🔵 Realtime Customers Event:', payload);
        if (payload.new) console.log('🔵 Payload NEW:', JSON.stringify(payload.new));
        if (payload.old) console.log('🔵 Payload OLD:', JSON.stringify(payload.old));
        
        setRealtimeStatus(`Received ${payload.eventType} at ${new Date().toLocaleTimeString()}`);
        
        if (payload.eventType === 'INSERT') {
          if (payload.new) {
            console.log('🔵 New customer added:', payload.new.company_name);
            
            const newCustomer: Customer = {
              id: payload.new.id,
              company_name: payload.new.company_name || '',
              email: payload.new.email || '',
              telephone: payload.new.telephone || '',
              status: payload.new.status || 'inactive',
              created_at: payload.new.created_at,
              customer_type: payload.new.customer_type || '',
              address: payload.new.address || '',
              afm: payload.new.afm || '',
              offers_count: 0
            };
            
            setCustomers(prevCustomers => {
              const exists = prevCustomers.some(c => c.id === newCustomer.id);
              if (exists) return prevCustomers;
              
              const newList = [...prevCustomers, newCustomer].sort((a, b) => 
                (a.company_name || '').localeCompare(b.company_name || '')
              );
              
              console.log('🔵 Added new customer to UI:', newCustomer.company_name);
              return newList;
            });
          }
        } else if (payload.eventType === 'UPDATE') {
          if (payload.new && payload.old) {
            const isSoftDelete = !payload.old.deleted_at && payload.new.deleted_at;
            
            if (isSoftDelete) {
              console.log('🔵 Customer soft-deleted:', payload.new.company_name);
              
              setCustomers(prevCustomers => 
                prevCustomers.filter(customer => customer.id !== payload.new.id)
              );
              
              setCustomerOffers(prev => {
                const newOffers = { ...prev };
                delete newOffers[payload.new.id];
                return newOffers;
              });
            } else {
              console.log('🔵 Customer updated:', payload.new.company_name);
              
              setCustomers(prevCustomers => 
                prevCustomers.map(customer => {
                  if (customer.id === payload.new.id) {
                    return {
                      ...customer,
                      company_name: payload.new.company_name || customer.company_name,
                      email: payload.new.email || customer.email,
                      telephone: payload.new.telephone || customer.telephone,
                      status: payload.new.status || customer.status,
                      customer_type: payload.new.customer_type || customer.customer_type,
                      address: payload.new.address || customer.address,
                      afm: payload.new.afm || customer.afm
                    };
                  }
                  return customer;
                })
              );
            }
          }
        } else if (payload.eventType === 'DELETE') {
          if (payload.old) {
            console.log('🔵 Customer deleted:', payload.old.company_name);
            
            setCustomers(prevCustomers => 
              prevCustomers.filter(customer => customer.id !== payload.old.id)
            );
            
            setCustomerOffers(prev => {
              const newOffers = { ...prev };
              delete newOffers[payload.old.id];
              return newOffers;
            });
          }
        }
      })
      .subscribe();

    // Cleanup subscriptions
    return () => {
      offersSubscription.unsubscribe();
      customersSubscription.unsubscribe();
    };
  }, [expandedCustomerIds, setCustomers, setCustomerOffers, setLastRealtimeUpdate]);

  return { realtimeStatus };
}; 