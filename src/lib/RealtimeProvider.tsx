import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './AuthContext';
import { toast } from '@/components/ui/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';

// Create a context for real-time updates
const RealtimeContext = createContext({
  realtimeEnabled: true,
  setRealtimeEnabled: (enabled: boolean) => {},
});

// Hook to use the real-time context
export const useRealtime = () => useContext(RealtimeContext);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  
  // Set up global real-time subscriptions
  useEffect(() => {
    if (!user || !realtimeEnabled) return;
    
    // Set up real-time subscriptions
    const channels: RealtimeChannel[] = [];
    
    // Create a channel for each table we want to subscribe to
    const tablesWithRealtime = ['customers', 'contacts', 'offers', 'tasks', 'users'];
    
    tablesWithRealtime.forEach(table => {
      const channel = supabase.channel(`global-${table}`);
      
      channel.on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: table
        },
        (payload: any) => {
          // We're not using a dispatch mechanism, so just log silently
          // The component-specific subscriptions will handle the updates
        }
      ).subscribe();
      
      channels.push(channel);
    });
    
    // Return cleanup function
    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [user, realtimeEnabled]);
  
  return (
    <RealtimeContext.Provider value={{ realtimeEnabled, setRealtimeEnabled }}>
      {children}
    </RealtimeContext.Provider>
  );
} 