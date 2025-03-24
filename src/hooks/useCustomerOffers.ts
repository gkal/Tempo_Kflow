import { supabase } from '@/lib/supabaseClient';
import { useState, useEffect } from 'react';

export function useCustomerOffers(customerId: string) {
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const { data, error } = await supabase
          .from('offers')
          .select('*')
          .eq('customer_id', customerId)
          .is("deleted_at", null)
          .order('created_at', { ascending: false });

        if (error) {
          setError(error.message);
          setOffers([]);
        } else {
          setOffers(data || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setOffers([]);
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      fetchOffers();
    }
  }, [customerId]);

  return { offers, loading, error };
} 