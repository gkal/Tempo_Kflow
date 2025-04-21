/**
 * CustomerDataProvider component
 * Extracted from CustomersPage.tsx to improve modularity
 * Handles data fetching, filtering, and real-time updates for customers
 */

import React, { useEffect, useState, useCallback, ReactNode, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { Customer, CustomerOffer } from './types/interfaces';
import { handleOffersRealtimeEvent, handleCustomersRealtimeEvent, mapDatabaseCustomers } from './utils/customerRealtimeHandlers';

interface CustomerDataProviderProps {
  children: (data: {
    customers: Customer[];
    filteredCustomers: Customer[];
    customerOffers: Record<string, CustomerOffer[]>;
    loadingOffers: Record<string, boolean>;
    expandedCustomerIds: Record<string, boolean>;
    activeFilter: 'all' | 'active' | 'inactive';
    searchTerm: string;
    searchColumn: string;
    customerTypes: string[];
    selectedCustomerTypes: string[];
    setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
    setCustomerOffers: React.Dispatch<React.SetStateAction<Record<string, CustomerOffer[]>>>;
    setLoadingOffers: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    setExpandedCustomerIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    setActiveFilter: React.Dispatch<React.SetStateAction<'all' | 'active' | 'inactive'>>;
    setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
    setSearchColumn: React.Dispatch<React.SetStateAction<string>>;
    setSelectedCustomerTypes: React.Dispatch<React.SetStateAction<string[]>>;
    isLoading: boolean;
    refreshTrigger: number;
    setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>;
    realtimeStatus: string | null;
    fetchCustomerOffers: (customerId: string, forceRefresh?: boolean) => Promise<void>;
    isAdminUser: boolean;
    isAdminOrSuperUser: boolean;
    lastRealtimeUpdate: number;
    setLastRealtimeUpdate: React.Dispatch<React.SetStateAction<number>>;
    handleCustomerTypeChange: (types: string[]) => void;
    handleExpandCustomer: (customerId: string) => Promise<void>;
    changedRowId: string | null;
  }) => ReactNode;
}

export const CustomerDataProvider: React.FC<CustomerDataProviderProps> = ({ children }) => {
  const { user } = useAuth();
  
  // State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCustomerIds, setExpandedCustomerIds] = useState<Record<string, boolean>>({});
  const [customerOffers, setCustomerOffers] = useState<Record<string, CustomerOffer[]>>({});
  const [loadingOffers, setLoadingOffers] = useState<Record<string, boolean>>({});
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchColumn, setSearchColumn] = useState('company_name');
  const [customerTypes, setCustomerTypes] = useState<string[]>([
    "Εταιρεία", 
    "Ιδιώτης", 
    "Δημόσιο", 
    "Οικοδομές", 
    "Εκτακτος Πελάτης", 
    "Εκτακτη Εταιρία"
  ]);
  const [selectedCustomerTypes, setSelectedCustomerTypes] = useState<string[]>([]);
  
  // Refresh triggers
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [realtimeStatus, setRealtimeStatus] = useState<string | null>(null);
  const [refreshOffersTrigger, setRefreshOffersTrigger] = useState<{customerId: string, timestamp: number} | null>(null);
  const [customerIdBeingExpanded, setCustomerIdBeingExpanded] = useState<string | null>(null);
  const [lastRealtimeUpdate, setLastRealtimeUpdate] = useState(Date.now());
  
  // Track changed row for animation
  const [changedRowId, setChangedRowId] = useState<string | null>(null);
  const clearChangedRowTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Track when a row was last updated to prevent spam animations
  const recentlyUpdatedRowsRef = useRef<Map<string, number>>(new Map());
  
  // Check user permissions
  const isAdminUser = user?.role?.toLowerCase() === 'admin';
  const isAdminOrSuperUser = isAdminUser || 
                           user?.role === 'Super User' ||
                           user?.role?.toLowerCase() === 'super user';
  
  // Reference to track recently deleted offers
  const recentlyDeletedOffersRef = React.useRef<Set<string>>(new Set());

  // Clear the changed row ID after animation (but without transition back)
  const clearChangedRowId = useCallback(() => {
    if (clearChangedRowTimeoutRef.current) {
      clearTimeout(clearChangedRowTimeoutRef.current);
    }
    
    // Simple direct timeout to clear the ID - with zero transition back
    clearChangedRowTimeoutRef.current = setTimeout(() => {
      setChangedRowId(null);
      clearChangedRowTimeoutRef.current = null;
    }, 1200); // 0.8s for animation appearance + 0.4s visibility
  }, []);

  // Enhanced function to set changed row ID with debounce logic
  const setChangedRowWithDebounce = useCallback((id: string | null) => {
    if (!id) return;
    
    // Current timestamp
    const now = Date.now();
    
    // Check if this row was recently updated (within last 3 seconds)
    const lastUpdateTime = recentlyUpdatedRowsRef.current.get(id);
    if (lastUpdateTime && now - lastUpdateTime < 3000) {
      // Skip animation if row was recently updated to prevent spam
      console.log(`🔴 [RT-ANIM] Skipping animation for recently updated row ${id}`);
      return;
    }
    
    // Set the animation
    console.log(`🔴 [RT-ANIM] Setting animation for row ${id}`);
    setChangedRowId(id);
    clearChangedRowId();
    
    // Record this update time
    recentlyUpdatedRowsRef.current.set(id, now);
    
    // Clean up old entries to prevent memory leaks
    if (recentlyUpdatedRowsRef.current.size > 100) {
      // Remove entries older than 1 minute
      const oldTime = now - 60000;
      for (const [recordId, time] of recentlyUpdatedRowsRef.current.entries()) {
        if (time < oldTime) {
          recentlyUpdatedRowsRef.current.delete(recordId);
        }
      }
    }
  }, [clearChangedRowId]);

  // Fetch customer offers
  const fetchCustomerOffers = useCallback(async (customerId: string, forceRefresh = false) => {
    if (!customerId || (customerOffers[customerId] && !forceRefresh)) {
      return;
    }
    
    // Set loading state for this customer
    setLoadingOffers(prev => ({
      ...prev,
      [customerId]: true
    }));
    
    try {
      console.log(`🔍 [RT-FETCH] Fetching offers for customer ${customerId} with newest first`);
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('customer_id', customerId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      console.log(`📊 [RT-FETCH] Retrieved ${data?.length || 0} offers sorted by newest first for customer ${customerId}`);
      
      // Format the offers data
      const formattedOffers = (data || []).map(offer => ({
        id: offer.id,
        name: `Προσφορά ${typeof offer.id === 'string' ? offer.id.substring(0, 4) : ''}`,
        value: offer.amount ? String(offer.amount) : '',
        date: offer.created_at,
        status: offer.offer_result || 'pending',
        requirements: offer.requirements || offer.customer_comments || '',
        result: offer.result || ''
      }));
      
      // Update offers state
      setCustomerOffers(prev => ({
        ...prev,
        [customerId]: formattedOffers
      }));
    } catch (error) {
      console.error("[RT-ERROR] Error fetching offers:", error);
    } finally {
      // Clear loading state
      setLoadingOffers(prev => ({
        ...prev,
        [customerId]: false
      }));
    }
  }, [customerOffers]);

  // Handle customer expansion
  const handleExpandCustomer = useCallback(async (customerId: string) => {
    const isCurrentlyExpanded = !!expandedCustomerIds[customerId];
    
    if (isCurrentlyExpanded) {
      // Collapse
      setExpandedCustomerIds(prev => {
        const updated = { ...prev };
        delete updated[customerId];
        return updated;
      });
    } else {
      // Track that we're expanding this customer
      setCustomerIdBeingExpanded(customerId);
      
      // Expand and load offers
      setExpandedCustomerIds(prev => ({
        ...prev,
        [customerId]: true
      }));
      
      // Fetch offers if they don't exist or if we have a stale version
      if (!customerOffers[customerId] || customerOffers[customerId].length === 0) {
        await fetchCustomerOffers(customerId);
      }
      
      // Clear the tracking
      setTimeout(() => {
        setCustomerIdBeingExpanded(null);
      }, 500);
    }
  }, [expandedCustomerIds, customerOffers, fetchCustomerOffers]);

  // Setup real-time subscriptions for offers
  useRealtimeSubscription(
    { table: 'offers' },
    (payload) => {
      // Set the changed row ID (customer ID) when an offer update is received
      if (payload.new && payload.new.customer_id) {
        console.log(`🔴 [RT-ANIM] Offer change for customer: ${payload.new.customer_id}`);
        setChangedRowWithDebounce(payload.new.customer_id);
      }
      
      handleOffersRealtimeEvent(
        payload,
        customers,
        setCustomers,
        customerOffers,
        setCustomerOffers,
        expandedCustomerIds,
        setLastRealtimeUpdate,
        setRealtimeStatus,
        fetchCustomerOffers
      );
    }
  );
  
  // Setup real-time subscriptions for customers
  useRealtimeSubscription(
    { table: 'customers' },
    (payload) => {
      // Set the changed row ID (customer ID) when a customer update is received
      if (payload.new && payload.new.id) {
        console.log(`🔴 [RT-ANIM] Customer update for ID: ${payload.new.id}`);
        setChangedRowWithDebounce(payload.new.id);
      } else if (payload.old && payload.old.id) {
        console.log(`🔴 [RT-ANIM] Customer deletion for ID: ${payload.old.id}`);
        // For DELETE events, we need to use the old ID
        setChangedRowWithDebounce(payload.old.id);
      }
      
      handleCustomersRealtimeEvent(
        payload,
        setCustomers,
        expandedCustomerIds,
        setExpandedCustomerIds,
        customerOffers,
        setCustomerOffers,
        setRealtimeStatus
      );
    }
  );

  // Initial data fetch
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setIsLoading(true);
        
        // console.log('🔍 Fetching all customers and their offers...');
        
        // Remove columns that don't exist in the database
        const { data, error } = await supabase
          .from('customers')
          .select(`
            id, 
            company_name, 
            email, 
            telephone, 
            status, 
            customer_type, 
            created_at,
            address,
            town,
            postal_code,
            afm,
            offers(
              id, 
              customer_id, 
              created_at, 
              source, 
              amount, 
              offer_result, 
              result,
              requirements,
              customer_comments, 
              our_comments, 
              deleted_at
            )
          `)
          .filter('deleted_at', 'is', null)
          .order('company_name', { ascending: true });
        
        if (error) throw error;
        
        // console.log(`🔍 Fetched ${data?.length || 0} customers with their offers`);

        // Map the fetched data to our Customer type and ensure offers are sorted by newest first
        const mappedCustomers = mapDatabaseCustomers(data);
        
        // Update state
        setCustomers(mappedCustomers);
        setCustomerOffers(prev => {
          const newOffers = { ...prev };
          mappedCustomers.forEach(customer => {
            // Sort offers by created_at descending (newest first)
            const sortedOffers = [...(customer.offers || [])].sort((a, b) => 
              new Date(b.date).getTime() - new Date(a.date).getTime()
            );
            newOffers[customer.id] = sortedOffers;
          });
          return newOffers;
        });
        
      } catch (err) {
        console.error('Error fetching customers:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, [refreshTrigger]);

  // Fetch expanded offers when required
  useEffect(() => {
    // If a customer is expanded, fetch their offers
    const fetchExpandedOffers = async () => {
      for (const customerId of Object.keys(expandedCustomerIds)) {
        await fetchCustomerOffers(customerId);
      }
    };
    
    fetchExpandedOffers();
  }, [expandedCustomerIds, lastRealtimeUpdate, fetchCustomerOffers]);

  // Add an effect to automatically refresh offers data when lastRealtimeUpdate changes
  useEffect(() => {
    if (lastRealtimeUpdate > 0) {
      // console.log(`🔄 Real-time update detected at ${new Date(lastRealtimeUpdate).toLocaleTimeString()}`);
      
      // Store the current timestamp to avoid loops
      const currentUpdateTime = lastRealtimeUpdate;
      
      // For each expanded customer, refresh their offers
      Object.keys(expandedCustomerIds).forEach(customerId => {
        if (expandedCustomerIds[customerId]) {
          // console.log(`🔄 Auto-refreshing offers for expanded customer ${customerId}`);
          // Use a ref to track the last refresh time for each customer to avoid loops
          fetchCustomerOffers(customerId, true);
        }
      });
      
      // Reset the timestamp after processing to avoid infinite loops
      // Only reset if it hasn't been changed by another event
      if (currentUpdateTime === lastRealtimeUpdate) {
        setTimeout(() => {
          // Only update if it's still the same value to avoid extra renders
          setLastRealtimeUpdate(0);
        }, 500);
      }
    }
  }, [lastRealtimeUpdate, expandedCustomerIds, fetchCustomerOffers]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (clearChangedRowTimeoutRef.current) {
        clearTimeout(clearChangedRowTimeoutRef.current);
      }
    };
  }, []);

  // Handle customer type filter change
  const handleCustomerTypeChange = useCallback((types: string[]) => {
    setSelectedCustomerTypes(types);
  }, []);

  // Filter customers based on activeFilter and selectedCustomerTypes
  const filteredCustomers = React.useMemo(() => {
    return customers.filter(customer => {
      // Filter by status
      if (activeFilter === 'active' && customer.status !== 'active') return false;
      if (activeFilter === 'inactive' && customer.status !== 'inactive') return false;
      
      // Filter by customer type if any types are selected
      if (selectedCustomerTypes.length > 0 && !selectedCustomerTypes.includes(customer.customer_type)) {
        return false;
      }
      
      return true;
    });
  }, [customers, activeFilter, selectedCustomerTypes]);

  return (
    <>
      {children({
        customers,
        filteredCustomers,
        customerOffers,
        loadingOffers,
        expandedCustomerIds,
        activeFilter,
        searchTerm,
        searchColumn,
        customerTypes,
        selectedCustomerTypes,
        setCustomers,
        setCustomerOffers,
        setLoadingOffers,
        setExpandedCustomerIds,
        setActiveFilter,
        setSearchTerm,
        setSearchColumn,
        setSelectedCustomerTypes,
        isLoading,
        refreshTrigger,
        setRefreshTrigger,
        realtimeStatus,
        fetchCustomerOffers,
        isAdminUser,
        isAdminOrSuperUser,
        lastRealtimeUpdate,
        setLastRealtimeUpdate,
        handleCustomerTypeChange,
        handleExpandCustomer,
        changedRowId
      })}
    </>
  );
}; 
