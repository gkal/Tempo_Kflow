import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

interface RealtimeContextType {
  realtimeEnabled: boolean;
  setRealtimeEnabled: (enabled: boolean) => void;
}

// Real-time tables to subscribe to
const REALTIME_TABLES = ['customers', 'contacts', 'offers', 'tasks', 'users'];

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  
  useEffect(() => {
    if (!user || !realtimeEnabled) return;
    
    const channels: RealtimeChannel[] = [];
    
    // Create channels for each table
    REALTIME_TABLES.forEach(table => {
      const channel = supabase.channel(`global-${table}`);
      
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table
        },
        () => {
          // Individual components will handle specific updates through their own subscriptions
        }
      ).subscribe();
      
      channels.push(channel);
    });
    
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