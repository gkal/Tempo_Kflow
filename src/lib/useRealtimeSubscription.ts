import { useEffect, useRef, DependencyList } from 'react';
import { supabase } from './supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

type EventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface SubscriptionOptions {
  table: string;
  schema?: string;
  event?: EventType;
  filter?: string;
}

/**
 * Hook for subscribing to real-time database changes
 * 
 * @param options Configuration options for the subscription
 * @param callback Function to call when changes occur
 * @param dependencies Additional dependencies for the effect
 */
export function useRealtimeSubscription(
  options: SubscriptionOptions | SubscriptionOptions[],
  callback: (payload: any) => void,
  dependencies: DependencyList = []
): void {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const subscriptions = Array.isArray(options) ? options : [options];
    const channelName = `db-changes-${subscriptions.map(s => s.table).join('-')}`;
    
    const channel = supabase.channel(channelName);
    
    subscriptions.forEach(subscription => {
      channel.on(
        'postgres_changes' as any, // Type assertion needed due to Supabase typing issues
        {
          event: subscription.event || '*',
          schema: subscription.schema || 'public',
          table: subscription.table,
          filter: subscription.filter
        },
        payload => {
          callback(payload);
        }
      );
    });
    
    channel.subscribe();
    channelRef.current = channel;
    
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [options, callback, ...dependencies]);
} 