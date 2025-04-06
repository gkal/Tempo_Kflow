import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Customer, CustomerFilter } from '@/types/CustomerTypes';

interface CustomerDataState {
  customers: Customer[];
  isLoading: boolean;
  activeFilter: CustomerFilter;
  searchTerm: string;
  searchColumn: string;
  selectedCustomerTypes: string[];
  lastRealtimeUpdate: number;
}

export const useCustomerData = () => {
  const [state, setState] = useState<CustomerDataState>({
    customers: [],
    isLoading: true,
    activeFilter: 'all',
    searchTerm: '',
    searchColumn: 'name',
    selectedCustomerTypes: [],
    lastRealtimeUpdate: Date.now(),
  });

  const fetchCustomers = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      let query = supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (state.activeFilter !== 'all') {
        query = query.eq('status', state.activeFilter);
      }

      if (state.searchTerm) {
        if (state.searchColumn === 'all') {
          query = query.or(`name.ilike.%${state.searchTerm}%,email.ilike.%${state.searchTerm}%,phone.ilike.%${state.searchTerm}%`);
        } else {
          query = query.ilike(state.searchColumn, `%${state.searchTerm}%`);
        }
      }

      if (state.selectedCustomerTypes.length > 0) {
        // Using alternative query approach to avoid deep instantiation error
        const typeFilter = state.selectedCustomerTypes.map(type => `type.eq.${type}`).join(',');
        query = query.or(typeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Map database rows to Customer type
      const customers = data?.map(item => ({
        id: item.id,
        name: item.company_name || '',
        email: item.email || '',
        phone: item.telephone || '',
        type: item.customer_type || '',
        status: item.status || 'active',
        created_at: item.created_at || '',
        updated_at: item.updated_at || null,
        address: item.address || null,
        notes: item.notes || null,
        ...item // Include remaining fields
      })) || [];

      setState(prev => ({
        ...prev,
        customers,
        isLoading: false
      }));
    } catch (error) {
      console.error('Error fetching customers:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.activeFilter, state.searchTerm, state.searchColumn, state.selectedCustomerTypes]);

  const setFilter = useCallback((filter: CustomerFilter) => {
    setState(prev => ({ ...prev, activeFilter: filter }));
  }, []);

  const setSearch = useCallback((term: string, column: string) => {
    setState(prev => ({
      ...prev,
      searchTerm: term,
      searchColumn: column
    }));
  }, []);

  const setCustomerTypes = useCallback((types: string[]) => {
    setState(prev => ({ ...prev, selectedCustomerTypes: types }));
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    const subscription = supabase
      .channel('customers')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'customers' 
        }, 
        () => {
          setState(prev => ({ 
            ...prev, 
            lastRealtimeUpdate: Date.now() 
          }));
          fetchCustomers();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchCustomers]);

  // Fetch customers when filters change or real-time updates occur
  useEffect(() => {
    fetchCustomers();
  }, [
    fetchCustomers,
    state.activeFilter,
    state.searchTerm,
    state.searchColumn,
    state.selectedCustomerTypes,
    state.lastRealtimeUpdate
  ]);

  return {
    state,
    setFilter,
    setSearch,
    setCustomerTypes,
    fetchCustomers
  };
}; 