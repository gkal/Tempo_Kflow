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
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { RefreshCw, Globe, Server, Clock, FileDown } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface NetworkRequestMetricsProps {
  timeRange: { from: string; to: string };
}

interface RequestByResource {
  resourceType: string;
  count: number;
  avgDuration: number;
  totalSize: number;
}

interface EndpointMetrics {
  url: string;
  count: number;
  avgDuration: number;
  maxDuration: number;
  errorRate: number;
}

interface StatusMetrics {
  status: string;
  count: number;
}

const NetworkRequestMetrics: React.FC<NetworkRequestMetricsProps> = ({ timeRange }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [resourceTypeData, setResourceTypeData] = useState<RequestByResource[]>([]);
  const [endpointData, setEndpointData] = useState<EndpointMetrics[]>([]);
  const [statusData, setStatusData] = useState<StatusMetrics[]>([]);
  const [totalRequests, setTotalRequests] = useState<number>(0);
  const [avgDuration, setAvgDuration] = useState<number>(0);
  const [cachingRate, setCachingRate] = useState<number>(0);
  
  // Load metrics data
  const loadMetricsData = async () => {
    setIsLoading(true);
    
    try {
      // Get network request data
      const { data: networkData, error: networkError } = await supabase
        .from('frontend_performance_logs')
        .select('data')
        .eq('type', 'network_request')
        .gte('timestamp', timeRange.from)
        .lte('timestamp', timeRange.to);
      
      if (networkError) throw networkError;
      
      if (networkData && networkData.length > 0) {
        // Map of resource types
        const resourceMap = new Map<string, { 
          count: number, 
          totalDuration: number,
          totalSize: number
        }>();
        
        // Map of endpoints
        const endpointMap = new Map<string, {
          count: number,
          totalDuration: number,
          maxDuration: number,
          errorCount: number
        }>();
        
        // Map of status codes
        const statusMap = new Map<string, number>();
        
        // Track total metrics
        let totalDuration = 0;
        let cachedCount = 0;
        
        // Process the data
        networkData.forEach(item => {
          const data = item.data;
          
          // Resource type processing
          const resourceType = data.resourceType || 'other';
          
          if (!resourceMap.has(resourceType)) {
            resourceMap.set(resourceType, {
              count: 0,
              totalDuration: 0,
              totalSize: 0
            });
          }
          
          const resourceMetrics = resourceMap.get(resourceType)!;
          resourceMetrics.count += 1;
          resourceMetrics.totalDuration += data.duration || 0;
          resourceMetrics.totalSize += data.responseSize || 0;
          
          // Endpoint processing
          // Trim the URL to remove query parameters and normalize
          const url = data.url ? data.url.split('?')[0] : 'unknown';
          
          if (!endpointMap.has(url)) {
            endpointMap.set(url, {
              count: 0,
              totalDuration: 0,
              maxDuration: 0,
              errorCount: 0
            });
          }
          
          const endpointMetrics = endpointMap.get(url)!;
          endpointMetrics.count += 1;
          endpointMetrics.totalDuration += data.duration || 0;
          endpointMetrics.maxDuration = Math.max(endpointMetrics.maxDuration, data.duration || 0);
          
          // Count errors (status >= 400)
          if (data.status >= 400) {
            endpointMetrics.errorCount += 1;
          }
          
          // Status code processing
          const statusCode = data.status ? 
            (data.status >= 200 && data.status < 300 ? '2xx' :
             data.status >= 300 && data.status < 400 ? '3xx' :
             data.status >= 400 && data.status < 500 ? '4xx' :
             data.status >= 500 ? '5xx' : 'unknown') : 'unknown';
          
          statusMap.set(statusCode, (statusMap.get(statusCode) || 0) + 1);
          
          // Track caching
          if (data.cached) {
            cachedCount += 1;
          }
          
          // Add to total duration
          totalDuration += data.duration || 0;
        });
        
        // Convert to arrays for display
        const resourceTypeArray = Array.from(resourceMap.entries()).map(([resourceType, metrics]) => ({
          resourceType,
          count: metrics.count,
          avgDuration: metrics.totalDuration / metrics.count,
          totalSize: metrics.totalSize
        }));
        
        const endpointArray = Array.from(endpointMap.entries())
          .filter(([url, metrics]) => metrics.count >= 2) // Filter out endpoints with few requests
          .map(([url, metrics]) => ({
            url,
            count: metrics.count,
            avgDuration: metrics.totalDuration / metrics.count,
            maxDuration: metrics.maxDuration,
            errorRate: (metrics.errorCount / metrics.count) * 100
          }));
        
        const statusArray = Array.from(statusMap.entries()).map(([status, count]) => ({
          status,
          count
        }));
        
        // Set state with computed data
        setResourceTypeData(resourceTypeArray.sort((a, b) => b.count - a.count));
        setEndpointData(endpointArray.sort((a, b) => b.avgDuration - a.avgDuration));
        setStatusData(statusArray.sort((a, b) => b.count - a.count));
        
        // Set summary metrics
        setTotalRequests(networkData.length);
        setAvgDuration(totalDuration / networkData.length);
        setCachingRate((cachedCount / networkData.length) * 100);
      } else {
        // Reset data if none available
        setResourceTypeData([]);
        setEndpointData([]);
        setStatusData([]);
        setTotalRequests(0);
        setAvgDuration(0);
        setCachingRate(0);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading network metrics:', error);
      toast({
        title: 'Error loading network metrics',
        description: 'Failed to load network request performance data',
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
  
  // Format bytes to human-readable format
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };
  
  // Get resource type color
  const getResourceTypeColor = (type: string) => {
    switch (type) {
      case 'fetch':
      case 'xhr':
        return '#8884d8'; // Purple
      case 'script':
        return '#82ca9d'; // Green
      case 'style':
        return '#ffc658'; // Yellow
      case 'image':
        return '#ff8042'; // Orange
      case 'font':
        return '#0088fe'; // Blue
      case 'document':
        return '#00C49F'; // Teal
      default:
        return '#888888'; // Gray
    }
  };
  
  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case '2xx':
        return '#4ade80'; // Green
      case '3xx':
        return '#facc15'; // Yellow
      case '4xx':
        return '#f97316'; // Orange
      case '5xx':
        return '#ef4444'; // Red
      default:
        return '#a3a3a3'; // Gray
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  
  // If no data
  if (totalRequests === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Network Request Metrics</h2>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center text-center">
              <Globe className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No Network Data Available</h3>
              <p className="text-gray-500 mt-2">
                There is no network request data available for the selected time range.
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
        <h2 className="text-xl font-semibold text-gray-800">Network Request Metrics</h2>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      {/* Summary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Requests */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Requests</CardTitle>
            <CardDescription>Network requests tracked</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalRequests.toLocaleString()}</div>
            <div className="flex items-center gap-1 mt-2">
              <Globe className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-500">
                {endpointData.length} unique endpoints
              </span>
            </div>
          </CardContent>
        </Card>
        
        {/* Average Duration */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Avg Response Time</CardTitle>
            <CardDescription>Average network request time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatMs(avgDuration)}</div>
            <div className="flex items-center gap-1 mt-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-500">
                Slowest: {formatMs(endpointData[0]?.maxDuration || 0)}
              </span>
            </div>
          </CardContent>
        </Card>
        
        {/* Caching Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Cache Hit Rate</CardTitle>
            <CardDescription>Requests served from cache</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{cachingRate.toFixed(1)}%</div>
            <div className="flex items-center gap-1 mt-2">
              <Server className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-500">
                {Math.round(totalRequests * (cachingRate / 100))} cached responses
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Resource Type Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Requests by Resource Type</CardTitle>
          <CardDescription>
            Distribution of network requests by resource type
          </CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
            {/* Resource Type Pie Chart */}
            <div className="h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={resourceTypeData}
                    dataKey="count"
                    nameKey="resourceType"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    label={({ resourceType, count }) => `${resourceType}: ${count}`}
                  >
                    {resourceTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getResourceTypeColor(entry.resourceType)} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => [value, 'Requests']}
                    labelFormatter={(label) => `Resource Type: ${label}`}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Resource Type Response Time Chart */}
            <div className="h-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={resourceTypeData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" label={{ value: 'Avg Duration (ms)', position: 'bottom' }} />
                  <YAxis 
                    dataKey="resourceType" 
                    type="category"
                    width={100}
                  />
                  <Tooltip 
                    formatter={(value) => [`${Number(value).toFixed(0)} ms`, 'Avg Duration']}
                  />
                  <Bar 
                    dataKey="avgDuration" 
                    name="Avg Response Time"
                  >
                    {resourceTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getResourceTypeColor(entry.resourceType)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Status Codes and Slowest Endpoints */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Codes */}
        <Card>
          <CardHeader>
            <CardTitle>Status Code Distribution</CardTitle>
            <CardDescription>
              HTTP response status codes
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  label={({ status, count }) => `${status}: ${count}`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name, props) => [`${value} (${((value / totalRequests) * 100).toFixed(1)}%)`, 'Requests']}
                  labelFormatter={(label) => `Status: ${label}`}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Slowest Endpoints */}
        <Card>
          <CardHeader>
            <CardTitle>Slowest Endpoints</CardTitle>
            <CardDescription>
              Endpoints with highest average response time
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Endpoint</th>
                  <th className="text-right py-2">Avg Time</th>
                  <th className="text-right py-2">Requests</th>
                  <th className="text-right py-2">Error %</th>
                </tr>
              </thead>
              <tbody>
                {endpointData.slice(0, 10).map((endpoint, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2 truncate max-w-[200px]" title={endpoint.url}>
                      {endpoint.url.length > 30 ? `${endpoint.url.substring(0, 30)}...` : endpoint.url}
                    </td>
                    <td className="text-right py-2">{formatMs(endpoint.avgDuration)}</td>
                    <td className="text-right py-2">{endpoint.count}</td>
                    <td className="text-right py-2">
                      <Badge variant={endpoint.errorRate > 0 ? "destructive" : "outline"}>
                        {endpoint.errorRate.toFixed(1)}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NetworkRequestMetrics; 