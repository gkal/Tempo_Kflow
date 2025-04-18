import React, { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

/**
 * A component that logs all real-time events to the console
 * Use this for debugging real-time connections
 */
export function RealtimeDebugger() {
  useEffect(() => {
    console.log('🔌 Setting up real-time debugger...');
    
    // Create a channel for debugging
    const channel = supabase
      .channel('realtime-debug')
      .on('presence', { event: 'sync' }, () => {
        console.log('🟢 Presence sync occurred');
      })
      .on('presence', { event: 'join' }, () => {
        console.log('🟢 Presence join occurred');
      })
      .on('system', { event: '*' }, (payload) => {
        console.log('⚙️ System event:', payload);
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'offers' },
        (payload) => {
          console.log('📊 Offers Change Event:', {
            event: payload.eventType,
            schema: payload.schema,
            table: payload.table,
            new: payload.new,
            old: payload.old,
          });
        }
      )
      .subscribe((status) => {
        console.log(`🔔 Subscription status: ${status}`);
      });

    return () => {
      console.log('🔌 Cleaning up real-time debugger...');
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="p-4 bg-slate-100 rounded-md">
      <h2 className="font-semibold mb-2">Real-time Debugger Active</h2>
      <p className="text-sm text-slate-600">
        Open your browser console to see real-time events.
        <br />
        Try adding or editing an offer in another window.
      </p>
    </div>
  );
} 
