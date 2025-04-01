import React from 'react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { cn } from '@/lib/utils';
import { Database } from '@/types/supabase';

// Define valid table names from the database schema
type TableNames = keyof Database['public']['Tables'];

interface RealtimeStatusProps {
  table: TableNames;
  filter?: string;
  className?: string;
  showDebug?: boolean;
}

/**
 * A component to show the status of a real-time connection
 * This can be used to display connection status to users and for debugging
 */
export function RealtimeStatus({ 
  table, 
  filter, 
  className,
  showDebug = true 
}: RealtimeStatusProps) {
  const [lastUpdate, setLastUpdate] = React.useState<Date | null>(null);
  const [events, setEvents] = React.useState<{type: string, time: Date}[]>([]);
  
  // Log real-time events to console for debugging
  console.log(`🔄 RealtimeStatus for ${table} initialized`);
  
  const { status, error } = useRealtimeSubscription(
    { 
      table, 
      filter 
    },
    (payload) => {
      // Update the last update time whenever a change is received
      const now = new Date();
      setLastUpdate(now);
      setEvents(prev => [
        { type: payload.eventType, time: now },
        ...prev.slice(0, 4)
      ]);

      // Direct debugging in this component
      console.log(`🔄 RealtimeStatus received event for ${table}:`, payload);
    },
    [table, filter]
  );

  // Status badge colors
  const statusColor = {
    connected: 'bg-green-500',
    connecting: 'bg-yellow-500',
    disconnected: 'bg-red-500'
  };

  return (
    <div className={cn('flex flex-col space-y-1', className)}>
      <div className="flex items-center">
        <div 
          className={cn(
            'w-2 h-2 rounded-full mr-1', 
            statusColor[status]
          )} 
          aria-hidden="true"
        />
        <span className="text-xs">{status === 'connected' ? 'Live' : status}</span>
      </div>
      
      {lastUpdate && (
        <div className="text-xs text-muted-foreground">
          Last update: {lastUpdate.toLocaleTimeString()}
        </div>
      )}

      {error && (
        <div className="text-xs text-red-600 mt-1">
          Error: {error.message}
        </div>
      )}
      
      {showDebug && (
        <div className="mt-2 text-xs bg-gray-100 p-2 rounded">
          <div>Table: {table}</div>
          {filter && <div>Filter: {filter}</div>}
          <div>Connection: {status}</div>
          <div>Last activity: {lastUpdate?.toLocaleTimeString() || 'None'}</div>
          {events.length > 0 && (
            <div className="mt-1">
              <div>Recent events:</div>
              <ul className="list-disc list-inside">
                {events.map((evt, i) => (
                  <li key={i}>
                    {evt.type} at {evt.time.toLocaleTimeString()}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 