import { useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

type EventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface SubscriptionOptions {
  table: string;
  schema?: string;
  event?: EventType;
  filter?: string;
}

type PayloadType = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: any;
  old: any;
  [key: string]: any;
};

/**
 * Hook for subscribing to real-time database changes
 * 
 * @param options Configuration options for the subscription
 * @param callback Function to call when changes occur
 * @param dependencies Additional dependencies for the effect
 * @returns void
 */
export function useRealtimeSubscription(
  options: SubscriptionOptions | SubscriptionOptions[],
  callback: (payload: PayloadType) => void,
  dependencies: any[] = []
) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Create a unique channel name based on tables being watched
    const subscriptions = Array.isArray(options) ? options : [options];
    const channelName = `db-changes-${subscriptions.map(s => s.table).join('-')}`;
    
    // Create a new channel
    const channel = supabase.channel(channelName);
    
    // Add all subscriptions to the channel
    subscriptions.forEach(subscription => {
      channel.on(
        'postgres_changes' as any,
        {
          event: subscription.event || '*',
          schema: subscription.schema || 'public',
          table: subscription.table,
          filter: subscription.filter
        },
        (payload: any) => {
          callback(payload as PayloadType);
        }
      );
    });
    
    // Subscribe to the channel
    channel.subscribe();
    
    // Store the channel reference
    channelRef.current = channel;
    
    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [options, callback, ...dependencies]); // Re-subscribe when options, callback or dependencies change
} 