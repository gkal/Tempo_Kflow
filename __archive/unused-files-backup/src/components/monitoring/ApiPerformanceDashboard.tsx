import React, { useState, useEffect } from 'react';
import { format, subDays, subHours } from 'date-fns';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { AlertTriangle, CheckCircle, Clock, RefreshCw, Server, Cpu } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import ApiPerformanceService from '@/services/monitoring/apiPerformanceService';
import ApiPerformanceAlerts from './ApiPerformanceAlerts';
import ApiEndpointDetails from './ApiEndpointDetails';

// Define types for component
type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d' | 'custom';
type ViewMode = 'overview' | 'alerts' | 'details';

interface ApiEndpointSummary {
  endpoint: string;
  method: string;
  avgResponseTime: number;
  p95ResponseTime: number;
  errorRate: number;
  requestCount: number;
  status: 'healthy' | 'warning' | 'critical';
}

const ApiPerformanceDashboard: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [endpointData, setEndpointData] = useState<ApiEndpointSummary[]>([]);
  const [resourceUsage, setResourceUsage] = useState<any[]>([]);
  const [alertsCount, setAlertsCount] = useState<number>(0);
  
  // Derived time range based on selection
  const getTimeRangeValues = () => {
    const now = new Date();
    const to = format(now, "yyyy-MM-dd'T'HH:mm:ss");
    let from;
    
    switch (timeRange) {
      case '1h':
        from = format(subHours(now, 1), "yyyy-MM-dd'T'HH:mm:ss");
        break;
      case '6h':
        from = format(subHours(now, 6), "yyyy-MM-dd'T'HH:mm:ss");
        break;
      case '24h':
        from = format(subHours(now, 24), "yyyy-MM-dd'T'HH:mm:ss");
        break;
      case '7d':
        from = format(subDays(now, 7), "yyyy-MM-dd'T'HH:mm:ss");
        break;
      case '30d':
        from = format(subDays(now, 30), "yyyy-MM-dd'T'HH:mm:ss");
        break;
      default:
        from = format(subHours(now, 24), "yyyy-MM-dd'T'HH:mm:ss");
    }
    
    return { from, to };
  };

  // Load data based on selected time range
  const loadApiPerformanceData = async () => {
    setIsLoading(true);
    
    try {
      const { from, to } = getTimeRangeValues();
      
      // Get all API stats
      const apiStats = await ApiPerformanceService.getAllApiStats({ from, to });
      
      // Transform to endpoint summary array
      const summary: ApiEndpointSummary[] = [];
      apiStats.forEach((stats, key) => {
        const [method, endpoint] = key.split(':');
        
        let status: 'healthy' | 'warning' | 'critical' = 'healthy';
        if (stats.errorRate > 10 || stats.p95ResponseTime > 1000) {
          status = 'critical';
        } else if (stats.errorRate > 5 || stats.p95ResponseTime > 500) {
          status = 'warning';
        }
        
        summary.push({
          endpoint,
          method,
          avgResponseTime: stats.averageResponseTime,
          p95ResponseTime: stats.p95ResponseTime,
          errorRate: stats.errorRate,
          requestCount: stats.requestCount,
          status
        });
      });
      
      setEndpointData(summary.sort((a, b) => b.avgResponseTime - a.avgResponseTime));
      
      // Get resource usage
      const resourceData = await ApiPerformanceService.getResourceUsage({ from, to });
      setResourceUsage(resourceData);
      
      // Get alerts count
      const alerts = await ApiPerformanceService.generatePerformanceAlerts(
        { from, to },
        { from: format(subDays(new Date(from), 1), "yyyy-MM-dd'T'HH:mm:ss"), to: from }
      );
      setAlertsCount(alerts.length);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading API performance data:', error);
      toast({
        title: 'Error loading performance data',
        description: 'Failed to load API performance metrics',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };
  
  // Initial data load and refresh on time range change
  useEffect(() => {
    loadApiPerformanceData();
    
    // Set up auto refresh every 5 minutes
    const refreshInterval = setInterval(loadApiPerformanceData, 5 * 60 * 1000);
    
    return () => clearInterval(refreshInterval);
  }, [timeRange]);
  
  // Handle refresh button click
  const handleRefresh = () => {
    loadApiPerformanceData();
  };
  
  // Handle endpoint selection for details view
  const handleEndpointSelect = (endpoint: string, method: string) => {
    setSelectedEndpoint(`${method}:${endpoint}`);
    setViewMode('details');
  };
  
  // Render loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }
  
  // Calculate summary metrics
  const totalRequests = endpointData.reduce((sum, endpoint) => sum + endpoint.requestCount, 0);
  const avgResponseTime = endpointData.length > 0 
    ? endpointData.reduce((sum, endpoint) => sum + endpoint.avgResponseTime, 0) / endpointData.length 
    : 0;
  const criticalEndpoints = endpointData.filter(e => e.status === 'critical').length;
  const warningEndpoints = endpointData.filter(e => e.status === 'warning').length;
  
  // Status color mapping
  const statusColors = {
    healthy: 'bg-green-50 text-green-700',
    warning: 'bg-yellow-50 text-yellow-700',
    critical: 'bg-red-50 text-red-700'
  };
  
  // Chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  
  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">API Performance Monitoring</h1>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          {/* Time range selector */}
          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="6h">Last 6 Hours</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Refresh button */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            title="Refresh Data"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* View mode tabs */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts {alertsCount > 0 && (
              <Badge variant="destructive" className="ml-2">{alertsCount}</Badge>
            )}
          </TabsTrigger>
          {selectedEndpoint && (
            <TabsTrigger value="details">Endpoint Details</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Summary metrics cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Requests */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Total API Requests</CardTitle>
                <CardDescription>Across all endpoints</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalRequests.toLocaleString()}</div>
                <div className="flex items-center gap-1 mt-2">
                  <Badge variant="outline" className="bg-blue-50">
                    {endpointData.length} Endpoints
                  </Badge>
                </div>
              </CardContent>
            </Card>
            
            {/* Average Response Time */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Avg Response Time</CardTitle>
                <CardDescription>Across all endpoints</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{avgResponseTime.toFixed(2)} ms</div>
                <div className="flex items-center gap-1 mt-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">P95: {
                    Math.max(...endpointData.map(e => e.p95ResponseTime)).toFixed(2)
                  } ms</span>
                </div>
              </CardContent>
            </Card>
            
            {/* Error rate */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Error Rate</CardTitle>
                <CardDescription>Failed requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {(endpointData.reduce((sum, e) => sum + e.errorRate * e.requestCount, 0) / 
                    (totalRequests || 1)).toFixed(2)}%
                </div>
                <div className="flex items-center gap-1 mt-2">
                  {criticalEndpoints > 0 ? (
                    <Badge variant="destructive">{criticalEndpoints} Critical</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      Healthy
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Endpoint Health */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Endpoint Health</CardTitle>
                <CardDescription>Status overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-green-600 font-medium">
                      {endpointData.filter(e => e.status === 'healthy').length} Healthy
                    </span>
                    <span className="text-yellow-600 font-medium">
                      {warningEndpoints} Warning
                    </span>
                    <span className="text-red-600 font-medium">
                      {criticalEndpoints} Critical
                    </span>
                  </div>
                  
                  <div className="h-16 w-16">
                    <PieChart width={64} height={64}>
                      <Pie
                        data={[
                          { 
                            name: 'Healthy', 
                            value: endpointData.filter(e => e.status === 'healthy').length 
                          },
                          { name: 'Warning', value: warningEndpoints },
                          { name: 'Critical', value: criticalEndpoints }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={15}
                        outerRadius={30}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell fill="#10B981" />
                        <Cell fill="#F59E0B" />
                        <Cell fill="#EF4444" />
                      </Pie>
                    </PieChart>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Response time chart */}
          <Card>
            <CardHeader>
              <CardTitle>API Response Times</CardTitle>
              <CardDescription>
                Average and 95th percentile response times by endpoint
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {endpointData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={endpointData.slice(0, 10)} // Show top 10 endpoints
                    margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" label={{ value: 'Response Time (ms)', position: 'bottom' }} />
                    <YAxis 
                      dataKey="endpoint" 
                      type="category"
                      width={150}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value) => [`${value.toFixed(2)} ms`, '']}
                      labelFormatter={(label) => `Endpoint: ${label}`}
                    />
                    <Legend />
                    <Bar 
                      dataKey="avgResponseTime" 
                      name="Avg Response Time" 
                      fill="#8884d8"
                    />
                    <Bar 
                      dataKey="p95ResponseTime" 
                      name="P95 Response Time" 
                      fill="#82ca9d"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <p className="text-gray-500">No API performance data available</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Resource usage and error rate */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Resource Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Resource Usage</CardTitle>
                <CardDescription>
                  CPU and memory usage over time
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                {resourceUsage.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={resourceUsage}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(timestamp) => 
                          format(new Date(timestamp), 'HH:mm')
                        } 
                      />
                      <YAxis yAxisId="left" tickFormatter={(value) => `${value}%`} />
                      <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value}MB`} />
                      <Tooltip
                        labelFormatter={(timestamp) => 
                          format(new Date(timestamp), 'yyyy-MM-dd HH:mm:ss')
                        }
                        formatter={(value, name) => 
                          name === 'cpuUsage' 
                            ? [`${value}%`, 'CPU Usage'] 
                            : [`${value}MB`, 'Memory Usage']
                        }
                      />
                      <Legend />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="cpuUsage" 
                        name="CPU Usage" 
                        stroke="#8884d8" 
                        activeDot={{ r: 8 }} 
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="memoryUsage" 
                        name="Memory Usage" 
                        stroke="#82ca9d" 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <p className="text-gray-500">No resource usage data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Error Rate by Endpoint */}
            <Card>
              <CardHeader>
                <CardTitle>Error Rate by Endpoint</CardTitle>
                <CardDescription>
                  Percentage of failed requests
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                {endpointData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={endpointData
                        .sort((a, b) => b.errorRate - a.errorRate)
                        .slice(0, 10)}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="endpoint" 
                        tick={{ fontSize: 10, angle: -45, textAnchor: 'end' }} 
                        height={80}
                      />
                      <YAxis tickFormatter={(value) => `${value}%`} />
                      <Tooltip 
                        formatter={(value) => [`${value}%`, 'Error Rate']}
                        labelFormatter={(endpoint) => `Endpoint: ${endpoint}`}
                      />
                      <Bar 
                        dataKey="errorRate" 
                        name="Error Rate" 
                        fill="#FF8042"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <p className="text-gray-500">No error rate data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Endpoints table */}
          <Card>
            <CardHeader>
              <CardTitle>API Endpoints</CardTitle>
              <CardDescription>
                Performance metrics for all monitored endpoints
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-700">
                  <thead className="text-xs uppercase bg-gray-50">
                    <tr>
                      <th className="px-4 py-3">Endpoint</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3">Avg Response Time</th>
                      <th className="px-4 py-3">P95 Response Time</th>
                      <th className="px-4 py-3">Error Rate</th>
                      <th className="px-4 py-3">Requests</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {endpointData.map((endpoint, index) => (
                      <tr 
                        key={`${endpoint.method}-${endpoint.endpoint}-${index}`}
                        className="border-b hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleEndpointSelect(endpoint.endpoint, endpoint.method)}
                      >
                        <td className="px-4 py-3">{endpoint.endpoint}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="font-mono">
                            {endpoint.method}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">{endpoint.avgResponseTime.toFixed(2)} ms</td>
                        <td className="px-4 py-3">{endpoint.p95ResponseTime.toFixed(2)} ms</td>
                        <td className="px-4 py-3">{endpoint.errorRate.toFixed(2)}%</td>
                        <td className="px-4 py-3">{endpoint.requestCount.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={statusColors[endpoint.status]}>
                            {endpoint.status.charAt(0).toUpperCase() + endpoint.status.slice(1)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="alerts">
          <ApiPerformanceAlerts 
            timeRange={getTimeRangeValues()} 
            onViewEndpoint={handleEndpointSelect}
          />
        </TabsContent>
        
        <TabsContent value="details">
          {selectedEndpoint && (
            <ApiEndpointDetails 
              endpoint={selectedEndpoint}
              timeRange={getTimeRangeValues()}
              onBack={() => setViewMode('overview')}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ApiPerformanceDashboard; 