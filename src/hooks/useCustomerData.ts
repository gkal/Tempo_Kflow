import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Customer } from '@/types/CustomerTypes';

interface CustomerDataState {
  customers: Customer[];
  isLoading: boolean;
  activeFilter: string;
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
        query = query.in('type', state.selectedCustomerTypes);
      }

      const { data, error } = await query;

      if (error) throw error;

      setState(prev => ({
        ...prev,
        customers: data || [],
        isLoading: false
      }));
    } catch (error) {
      console.error('Error fetching customers:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.activeFilter, state.searchTerm, state.searchColumn, state.selectedCustomerTypes]);

  const setFilter = useCallback((filter: string) => {
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