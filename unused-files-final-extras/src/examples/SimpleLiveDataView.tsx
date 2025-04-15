import React, { useState, useEffect } from 'react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { RealtimeStatus } from '@/components/ui/RealtimeStatus';
import { Database } from '@/types/supabase';
import { supabase } from '@/lib/supabaseClient';

// Define valid table names from the database schema
type TableNames = keyof Database['public']['Tables'];

interface LiveDataViewProps {
  table: TableNames;
}

/**
 * A simple component that demonstrates live data updates without modifying existing forms
 * Add this component anywhere in your application to see real-time updates
 */
export function SimpleLiveDataView({ table }: LiveDataViewProps) {
  const [updates, setUpdates] = useState<Array<{
    timestamp: Date;
    type: string;
    data: any;
  }>>([]);
  const [connectionInfo, setConnectionInfo] = useState<string>("Initializing...");

  // Log initial setup
  useEffect(() => {
    console.log(`📊 SimpleLiveDataView mounted for ${table}`);
    
    // Direct debug subscription as a double-check
    const channel = supabase.channel(`direct-debug-${table}`)
      .on(
        'postgres_changes' as any,
        { 
          event: '*', 
          schema: 'public', 
          table 
        },
        (payload) => {
          console.log(`📊 DIRECT DEBUG (${table}):`, payload);
        }
      )
      .subscribe((status) => {
        console.log(`📊 DIRECT DEBUG Status (${table}): ${status}`);
        setConnectionInfo(`Direct connection status: ${status}`);
      });
      
    return () => {
      console.log(`📊 SimpleLiveDataView unmounted for ${table}`);
      supabase.removeChannel(channel);
    };
  }, [table]);

  // Use the real-time hook to subscribe to changes
  useRealtimeSubscription(
    { table },
    (payload) => {
      console.log(`📊 Hook received event for ${table}:`, payload);
      
      // Add the new update to the list
      setUpdates(prev => [
        {
          timestamp: new Date(),
          type: payload.eventType,
          data: payload.eventType === 'DELETE' ? payload.old : payload.new
        },
        ...prev
      ].slice(0, 10)); // Keep only the last 10 updates
    }
  );

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Live {table} Updates</h2>
        <RealtimeStatus table={table} />
      </div>

      <div className="mb-4 text-xs bg-blue-50 p-2 rounded">
        <p>Connection Info: {connectionInfo}</p>
        <p className="mt-1">
          Check your browser console for detailed real-time debugging logs.
        </p>
      </div>

      {updates.length === 0 ? (
        <p className="text-center py-4 text-gray-500">
          Waiting for updates...
        </p>
      ) : (
        <ul className="space-y-2">
          {updates.map((update, index) => (
            <li
              key={index}
              className={`p-3 rounded ${
                update.type === 'INSERT'
                  ? 'bg-green-50 border-green-200'
                  : update.type === 'UPDATE'
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-red-50 border-red-200'
              } border`}
            >
              <div className="flex justify-between">
                <span
                  className={`font-medium ${
                    update.type === 'INSERT'
                      ? 'text-green-700'
                      : update.type === 'UPDATE'
                      ? 'text-blue-700'
                      : 'text-red-700'
                  }`}
                >
                  {update.type}
                </span>
                <span className="text-gray-500 text-sm">
                  {update.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <div className="mt-1 text-sm">
                <pre className="overflow-auto max-h-40 whitespace-pre-wrap">
                  {JSON.stringify(update.data, null, 2)}
                </pre>
              </div>
            </li>
          ))}
        </ul>
      )}
      
      <div className="mt-4 text-sm text-gray-500">
        <p>
          This component displays real-time updates from the {table} table.
          No changes to existing forms or data submission code were needed!
        </p>
      </div>
    </div>
  );
}

export default SimpleLiveDataView; 