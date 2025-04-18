import React, { useState, useEffect } from 'react';
import { useRealtimeSubscription, createFilter } from '@/hooks/useRealtimeSubscription';
import { supabase } from '@/lib/supabaseClient';
import { RealtimeStatus } from '@/components/ui/RealtimeStatus';
import { Database } from '@/types/supabase';
import { Loader } from '@/components/ui/Loader';

// Define valid table names from the database schema
type TableNames = keyof Database['public']['Tables'];

interface RealTimeDataViewProps {
  tableName: TableNames;
  filterColumn?: string;
  filterValue?: string | number;
  className?: string;
  limit?: number;
}

/**
 * A component that demonstrates real-time data viewing without modifying existing forms
 * This can be added alongside any existing components to show real-time updates
 */
export function RealTimeDataView({
  tableName,
  filterColumn,
  filterValue,
  className = '',
  limit = 10
}: RealTimeDataViewProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdateType, setLastUpdateType] = useState<string | null>(null);

  // Create the filter string if filter values are provided
  const filterString = filterColumn && filterValue ? 
    createFilter(filterColumn, 'eq', filterValue) : 
    undefined;

  // Use our custom hook to subscribe to real-time changes
  const { status, isConnected } = useRealtimeSubscription(
    {
      table: tableName,
      filter: filterString
    },
    (payload) => {
      // Handle different types of events
      if (payload.eventType === 'INSERT') {
        if (payload.new) {
          setData(prevData => [payload.new, ...prevData].slice(0, limit));
          setLastUpdateType('added');
        }
      } else if (payload.eventType === 'UPDATE') {
        if (payload.new) {
          setData(prevData => 
            prevData.map(item => 
              item.id === payload.new.id ? payload.new : item
            )
          );
          setLastUpdateType('updated');
        }
      } else if (payload.eventType === 'DELETE') {
        if (payload.old) {
          setData(prevData => 
            prevData.filter(item => item.id !== payload.old.id)
          );
          setLastUpdateType('deleted');
        }
      }
    },
    [tableName, filterString, limit]
  );

  // Initial data fetch
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Use a more direct approach with any type to avoid type complexity
        // @ts-ignore - Bypass TypeScript's complex type checking for dynamic table access
        const query = supabase.from(tableName).select('*');
        
        // Apply filter if provided
        let filteredQuery = query;
        if (filterColumn && filterValue) {
          // @ts-ignore - Bypass TypeScript's checks for dynamic column access
          filteredQuery = query.eq(filterColumn, filterValue);
        }
        
        // Apply limit and order by created_at if it exists
        const { data, error } = await filteredQuery
          // @ts-ignore - Bypass TypeScript's checks for dynamic column access
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (error) throw error;
        setData(data || []);
      } catch (error) {
        console.error(`Error fetching ${tableName}:`, error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [tableName, filterColumn, filterValue, limit]);

  // Helper function to format timestamps
  const formatTime = (timestamp: string | null | undefined) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className={`p-4 rounded-lg border ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold capitalize">
          {String(tableName).replace(/_/g, ' ')} Live Data
        </h2>
        <RealtimeStatus 
          table={tableName}
          filter={filterString}
        />
      </div>
      
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader size={32} />
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No data available
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full min-w-full divide-y divide-gray-300">
            <thead>
              <tr>
                {Object.keys(data[0] || {}).slice(0, 5).map(key => (
                  <th 
                    key={key}
                    className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {key.replace(/_/g, ' ')}
                  </th>
                ))}
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Update
                </th>
              </tr>
            </thead>
            <tbody className="bg-transparent divide-y divide-gray-200">
              {data.map((item, index) => (
                <tr key={item.id || index} className={lastUpdateType === 'added' && index === 0 ? 'bg-green-50' : ''}>
                  {Object.entries(item).slice(0, 5).map(([key, value]) => (
                    <td key={key} className="px-3 py-2 whitespace-nowrap text-sm">
                      {key.includes('_at') || key.includes('date') ? 
                        formatTime(value as string) : 
                        String(value).length > 50 ? 
                          `${String(value).substring(0, 50)}...` : 
                          String(value)}
                    </td>
                  ))}
                  <td className="px-3 py-2 whitespace-nowrap text-sm">
                    {formatTime(item.updated_at || item.created_at)}
                    {lastUpdateType && index === 0 && (
                      <span className={`ml-2 px-2 py-1 text-xs rounded ${
                        lastUpdateType === 'added' ? 'bg-green-100 text-green-800' :
                        lastUpdateType === 'updated' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {lastUpdateType}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 
