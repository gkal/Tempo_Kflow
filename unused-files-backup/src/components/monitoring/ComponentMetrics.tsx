import React, { useState, useEffect } from 'react';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { RefreshCw, LayoutDashboard, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface ComponentMetricsProps {
  timeRange: { from: string; to: string };
}

interface ComponentPerformance {
  componentName: string;
  avgRenderTime: number;
  maxRenderTime: number;
  renderCount: number;
  rerenderRate: number;
}

interface ComponentRenderTimeSeries {
  timestamp: string;
  renderTime: number;
  componentName: string;
}

const ComponentMetrics: React.FC<ComponentMetricsProps> = ({ timeRange }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [componentData, setComponentData] = useState<ComponentPerformance[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<ComponentRenderTimeSeries[]>([]);
  
  // Load metrics data
  const loadMetricsData = async () => {
    setIsLoading(true);
    
    try {
      // Get component render data
      const { data: componentData, error: componentError } = await supabase
        .from('frontend_performance_logs')
        .select('data')
        .eq('type', 'component_render')
        .gte('timestamp', timeRange.from)
        .lte('timestamp', timeRange.to);
      
      if (componentError) throw componentError;
      
      if (componentData && componentData.length > 0) {
        // Map of components
        const componentMap = new Map<string, { 
          totalRenderTime: number, 
          maxRenderTime: number,
          renderCount: number,
          rerenderCount: number
        }>();
        
        const timePoints: ComponentRenderTimeSeries[] = [];
        
        // Process the data
        componentData.forEach(item => {
          const data = item.data;
          const componentName = data.componentName || 'Unknown';
          
          // Add to component metrics
          if (!componentMap.has(componentName)) {
            componentMap.set(componentName, {
              totalRenderTime: 0,
              maxRenderTime: 0,
              renderCount: 0,
              rerenderCount: 0
            });
          }
          
          const componentMetrics = componentMap.get(componentName)!;
          componentMetrics.totalRenderTime += data.renderTime || 0;
          componentMetrics.maxRenderTime = Math.max(componentMetrics.maxRenderTime, data.renderTime || 0);
          componentMetrics.renderCount += 1;
          componentMetrics.rerenderCount += data.rerenders || 0;
          
          // Add to time series data - only include a subset for performance reasons
          if (data.timestamp && data.renderTime && (timePoints.length < 500 || data.renderTime > 50)) {
            timePoints.push({
              timestamp: data.timestamp,
              renderTime: data.renderTime || 0,
              componentName
            });
          }
        });
        
        // Convert to arrays for display
        const componentArray = Array.from(componentMap.entries()).map(([componentName, metrics]) => ({
          componentName,
          avgRenderTime: metrics.totalRenderTime / metrics.renderCount,
          maxRenderTime: metrics.maxRenderTime,
          renderCount: metrics.renderCount,
          rerenderRate: metrics.rerenderCount / metrics.renderCount
        }));
        
        // Sort by average render time (descending)
        setComponentData(componentArray.sort((a, b) => b.avgRenderTime - a.avgRenderTime));
        
        // Sort time series data by timestamp
        setTimeSeriesData(timePoints.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        ));
      } else {
        setComponentData([]);
        setTimeSeriesData([]);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading component metrics:', error);
      toast({
        title: 'Error loading component metrics',
        description: 'Failed to load component rendering performance data',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };
  
  // Load data on initial render and when time range changes
  useEffect(() => {
    loadMetricsData();
  }, [timeRange]);
  
  // Handle refresh button click
  const handleRefresh = () => {
    loadMetricsData();
  };
  
  // Format milliseconds to readable format
  const formatMs = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
  };
  
  // Get component performance status
  const getComponentStatus = (renderTime: number) => {
    if (renderTime > 50) return { status: 'Slow', className: 'bg-red-100 text-red-800' };
    if (renderTime > 20) return { status: 'Warning', className: 'bg-yellow-100 text-yellow-800' };
    return { status: 'Good', className: 'bg-green-100 text-green-800' };
  };
  
  // Render loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-10 w-20" />
        </div>
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  
  // If no data
  if (componentData.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Component Render Metrics</h2>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center text-center">
              <LayoutDashboard className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No Component Render Data Available</h3>
              <p className="text-gray-500 mt-2">
                There is no component render performance data available for the selected time range.
              </p>
              <Button onClick={handleRefresh} className="mt-4">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Component Render Metrics</h2>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      {/* Render time chart */}
      <Card>
        <CardHeader>
          <CardTitle>Component Render Times</CardTitle>
          <CardDescription>
            Render time by component (top 10 slowest)
          </CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={componentData.slice(0, 10)}
              margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                label={{ value: 'Render Time (ms)', position: 'bottom' }} 
              />
              <YAxis 
                dataKey="componentName" 
                type="category"
                width={150}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                formatter={(value) => [`${Number(value).toFixed(2)} ms`, '']}
                labelFormatter={(label) => `Component: ${label}`}
              />
              <Legend />
              <Bar 
                dataKey="avgRenderTime" 
                name="Avg Render Time" 
                fill="#8884d8" 
              />
              <Bar 
                dataKey="maxRenderTime" 
                name="Max Render Time" 
                fill="#82ca9d" 
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {/* Render time series and top components */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Render time series */}
        <Card>
          <CardHeader>
            <CardTitle>Component Renders Over Time</CardTitle>
            <CardDescription>
              Render times for components across time
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {timeSeriesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={timeSeriesData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(timestamp) => {
                      const date = new Date(timestamp);
                      return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
                    }}
                  />
                  <YAxis 
                    label={{ value: 'Render Time (ms)', angle: -90, position: 'insideLeft' }} 
                  />
                  <Tooltip 
                    formatter={(value) => [`${value} ms`, 'Render Time']}
                    labelFormatter={(timestamp) => {
                      const date = new Date(timestamp);
                      return `${date.toLocaleString()}, Component: ${timeSeriesData.find(d => d.timestamp === timestamp)?.componentName}`;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="renderTime" 
                    name="Render Time" 
                    stroke="#8884d8" 
                    dot={{ r: 2 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <p className="text-gray-500">No time series data available</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Component table */}
        <Card>
          <CardHeader>
            <CardTitle>Component Performance</CardTitle>
            <CardDescription>
              Render metrics for all components
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Component</th>
                  <th className="text-right py-2">Avg Time</th>
                  <th className="text-right py-2">Renders</th>
                  <th className="text-center py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {componentData.map((component, index) => {
                  const status = getComponentStatus(component.avgRenderTime);
                  return (
                    <tr key={index} className="border-b">
                      <td className="py-2 truncate max-w-[200px]" title={component.componentName}>
                        {component.componentName.length > 25 ? 
                          `${component.componentName.substring(0, 25)}...` : 
                          component.componentName}
                      </td>
                      <td className="text-right py-2">{formatMs(component.avgRenderTime)}</td>
                      <td className="text-right py-2">{component.renderCount}</td>
                      <td className="text-center py-2">
                        <Badge variant="outline" className={status.className}>
                          {status.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ComponentMetrics; 