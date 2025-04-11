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
  AreaChart,
  Area,
  Legend
} from 'recharts';
import { RefreshCw, Clock, Smartphone, Laptop, Monitor, TabletSmartphone } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface PageLoadMetricsProps {
  timeRange: { from: string; to: string };
}

interface PageMetrics {
  route: string;
  avgLoadTime: number;
  avgFirstContentfulPaint: number;
  avgTimeToInteractive: number;
  pageViewCount: number;
}

interface DeviceMetrics {
  deviceType: string;
  count: number;
  avgLoadTime: number;
}

interface PageLoadDataPoint {
  timestamp: string;
  loadTime: number;
  firstContentfulPaint: number;
  timeToInteractive: number;
}

const PageLoadMetrics: React.FC<PageLoadMetricsProps> = ({ timeRange }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pageMetrics, setPageMetrics] = useState<PageMetrics[]>([]);
  const [deviceMetrics, setDeviceMetrics] = useState<DeviceMetrics[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<PageLoadDataPoint[]>([]);
  const [connectionTypeData, setConnectionTypeData] = useState<any[]>([]);
  
  // Load metrics data
  const loadMetricsData = async () => {
    setIsLoading(true);
    
    try {
      // Get page metrics by route
      const { data: pageData, error: pageError } = await supabase
        .from('frontend_performance_logs')
        .select('data')
        .eq('type', 'page_load')
        .gte('timestamp', timeRange.from)
        .lte('timestamp', timeRange.to);
      
      if (pageError) throw pageError;
      
      if (pageData && pageData.length > 0) {
        const routeMap = new Map<string, { 
          totalLoadTime: number, 
          totalFCP: number, 
          totalTTI: number, 
          count: number 
        }>();
        
        const deviceMap = new Map<string, {
          totalLoadTime: number,
          count: number
        }>();
        
        const connectionMap = new Map<string, number>();
        
        const timePoints: PageLoadDataPoint[] = [];
        
        // Process the data
        pageData.forEach(item => {
          const data = item.data;
          const route = data.route || '/unknown';
          
          // Add to route metrics
          if (!routeMap.has(route)) {
            routeMap.set(route, {
              totalLoadTime: 0,
              totalFCP: 0,
              totalTTI: 0,
              count: 0
            });
          }
          
          const routeMetrics = routeMap.get(route)!;
          routeMetrics.totalLoadTime += data.loadTime || 0;
          routeMetrics.totalFCP += data.firstContentfulPaint || 0;
          routeMetrics.totalTTI += data.timeToInteractive || 0;
          routeMetrics.count += 1;
          
          // Add to device metrics (based on user agent)
          const userAgent = data.userAgent || '';
          let deviceType = 'Unknown';
          
          if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
            deviceType = 'Mobile';
          } else if (/Tablet|iPad/i.test(userAgent)) {
            deviceType = 'Tablet';
          } else {
            deviceType = 'Desktop';
          }
          
          if (!deviceMap.has(deviceType)) {
            deviceMap.set(deviceType, {
              totalLoadTime: 0,
              count: 0
            });
          }
          
          const deviceMetrics = deviceMap.get(deviceType)!;
          deviceMetrics.totalLoadTime += data.loadTime || 0;
          deviceMetrics.count += 1;
          
          // Add to connection type data
          const connectionType = data.effectiveConnectionType || 'unknown';
          connectionMap.set(connectionType, (connectionMap.get(connectionType) || 0) + 1);
          
          // Add to time series data
          if (data.timestamp && data.loadTime) {
            timePoints.push({
              timestamp: data.timestamp,
              loadTime: data.loadTime || 0,
              firstContentfulPaint: data.firstContentfulPaint || 0,
              timeToInteractive: data.timeToInteractive || 0
            });
          }
        });
        
        // Convert to arrays for display
        const pageMetricsArray = Array.from(routeMap.entries()).map(([route, metrics]) => ({
          route,
          avgLoadTime: metrics.totalLoadTime / metrics.count,
          avgFirstContentfulPaint: metrics.totalFCP / metrics.count,
          avgTimeToInteractive: metrics.totalTTI / metrics.count,
          pageViewCount: metrics.count
        }));
        
        const deviceMetricsArray = Array.from(deviceMap.entries()).map(([deviceType, metrics]) => ({
          deviceType,
          count: metrics.count,
          avgLoadTime: metrics.totalLoadTime / metrics.count
        }));
        
        const connectionArray = Array.from(connectionMap.entries()).map(([type, count]) => ({
          connectionType: type,
          count
        }));
        
        // Sort and limit data for display
        setPageMetrics(pageMetricsArray.sort((a, b) => b.pageViewCount - a.pageViewCount));
        setDeviceMetrics(deviceMetricsArray.sort((a, b) => b.count - a.count));
        setConnectionTypeData(connectionArray.sort((a, b) => b.count - a.count));
        
        // Sort time series data by timestamp
        setTimeSeriesData(timePoints.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        ));
      } else {
        setPageMetrics([]);
        setDeviceMetrics([]);
        setTimeSeriesData([]);
        setConnectionTypeData([]);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading page metrics:', error);
      toast({
        title: 'Error loading page metrics',
        description: 'Failed to load page load performance data',
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
  
  // Get device icon
  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'Mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'Tablet':
        return <TabletSmartphone className="h-4 w-4" />;
      case 'Desktop':
        return <Monitor className="h-4 w-4" />;
      default:
        return <Laptop className="h-4 w-4" />;
    }
  };
  
  // Get connection type badge color
  const getConnectionBadgeColor = (type: string) => {
    switch (type) {
      case '4g':
        return 'bg-green-100 text-green-800';
      case '3g':
        return 'bg-yellow-100 text-yellow-800';
      case '2g':
        return 'bg-red-100 text-red-800';
      case 'slow-2g':
        return 'bg-red-200 text-red-900';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }
  
  // If no data
  if (timeSeriesData.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Page Load Metrics</h2>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center text-center">
              <Clock className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No Page Load Data Available</h3>
              <p className="text-gray-500 mt-2">
                There is no page load performance data available for the selected time range.
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
        <h2 className="text-xl font-semibold text-gray-800">Page Load Metrics</h2>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      {/* Page load time chart */}
      <Card>
        <CardHeader>
          <CardTitle>Page Load Times Over Time</CardTitle>
          <CardDescription>
            Load time, First Contentful Paint, and Time to Interactive metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="h-80">
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
                yAxisId="left"
                label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft' }} 
              />
              <Tooltip 
                formatter={(value) => [`${value} ms`, '']}
                labelFormatter={(timestamp) => {
                  const date = new Date(timestamp);
                  return date.toLocaleString();
                }}
              />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="loadTime" 
                name="Page Load Time" 
                stroke="#8884d8" 
                activeDot={{ r: 8 }} 
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="firstContentfulPaint" 
                name="First Contentful Paint" 
                stroke="#82ca9d" 
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="timeToInteractive" 
                name="Time to Interactive" 
                stroke="#ffc658" 
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {/* Page metrics and device breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Page metrics by route */}
        <Card>
          <CardHeader>
            <CardTitle>Page Metrics by Route</CardTitle>
            <CardDescription>
              Average load times by page route
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {pageMetrics.map((page, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-sm truncate mb-2" title={page.route}>
                    {page.route}
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">Avg Load Time</span>
                      <span className="font-medium">{formatMs(page.avgLoadTime)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">Page Views</span>
                      <span className="font-medium">{page.pageViewCount}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">First Paint</span>
                      <span className="font-medium">{formatMs(page.avgFirstContentfulPaint)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">Interactive</span>
                      <span className="font-medium">{formatMs(page.avgTimeToInteractive)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Device and connection breakdown */}
        <div className="space-y-6">
          {/* Device breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Device Breakdown</CardTitle>
              <CardDescription>
                Page loads by device type
              </CardDescription>
            </CardHeader>
            <CardContent className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={deviceMetrics}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="deviceType" />
                  <YAxis yAxisId="left" orientation="left" />
                  <YAxis yAxisId="right" orientation="right" dataKey="avgLoadTime" />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'count') return [value, 'Page Views'];
                      if (name === 'avgLoadTime') return [`${value.toFixed(0)} ms`, 'Avg Load Time'];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="count" name="Page Views" fill="#8884d8" />
                  <Bar yAxisId="right" dataKey="avgLoadTime" name="Avg Load Time" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          {/* Connection types */}
          <Card>
            <CardHeader>
              <CardTitle>Connection Types</CardTitle>
              <CardDescription>
                Distribution by network connection type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {connectionTypeData.map((item, index) => (
                  <Badge 
                    key={index} 
                    variant="outline" 
                    className={getConnectionBadgeColor(item.connectionType)}
                  >
                    {item.connectionType}: {item.count} views
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PageLoadMetrics; 