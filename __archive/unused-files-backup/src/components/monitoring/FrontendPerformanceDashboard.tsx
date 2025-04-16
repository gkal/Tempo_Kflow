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
import { Zap, Clock, RefreshCw, Activity, Globe, Cpu, Smartphone, Layers } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import FrontendPerformanceService, { PerformanceReport } from '@/services/monitoring/frontendPerformanceService';
import PageLoadMetrics from './PageLoadMetrics';
import NetworkRequestMetrics from './NetworkRequestMetrics';
import ComponentMetrics from './ComponentMetrics';
import FormPerformanceMetrics from './FormPerformanceMetrics';

// Define types for component
type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d' | 'custom';
type ViewMode = 'overview' | 'page-load' | 'network' | 'components' | 'forms';

const FrontendPerformanceDashboard: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [performanceReport, setPerformanceReport] = useState<PerformanceReport | null>(null);
  
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
  const loadPerformanceData = async () => {
    setIsLoading(true);
    
    try {
      const { from, to } = getTimeRangeValues();
      
      // Get performance report
      const report = await FrontendPerformanceService.getPerformanceReport({ from, to });
      
      if (report) {
        setPerformanceReport(report);
      } else {
        toast({
          title: 'No performance data',
          description: 'No performance data available for the selected time range',
          variant: 'default',
        });
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading performance data:', error);
      toast({
        title: 'Error loading performance data',
        description: 'Failed to load frontend performance metrics',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };
  
  // Initial data load and refresh on time range change
  useEffect(() => {
    loadPerformanceData();
    
    // Set up auto refresh every 5 minutes
    const refreshInterval = setInterval(loadPerformanceData, 5 * 60 * 1000);
    
    return () => clearInterval(refreshInterval);
  }, [timeRange]);
  
  // Handle refresh button click
  const handleRefresh = () => {
    loadPerformanceData();
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
  
  // Get performance score color
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  // Get performance score badge variant
  const getScoreBadgeVariant = (score: number): 'default' | 'destructive' | 'outline' | 'secondary' | 'success' => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'secondary';
    return 'destructive';
  };
  
  // Format milliseconds to readable format
  const formatMs = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
  };
  
  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Frontend Performance Monitoring</h1>
        
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
          <TabsTrigger value="page-load">Page Load</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="forms">Forms</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {performanceReport ? (
            <>
              {/* Summary metrics cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Performance Score */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Performance Score</CardTitle>
                    <CardDescription>Overall user experience</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-3xl font-bold ${getScoreColor(performanceReport.performanceScore)}`}>
                      {performanceReport.performanceScore}/100
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      <Badge variant={getScoreBadgeVariant(performanceReport.performanceScore)}>
                        {performanceReport.performanceScore >= 90 ? 'Excellent' : 
                         performanceReport.performanceScore >= 70 ? 'Good' : 
                         performanceReport.performanceScore >= 50 ? 'Needs Improvement' : 'Poor'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Page Load Time */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Page Load Time</CardTitle>
                    <CardDescription>Average across all pages</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{formatMs(performanceReport.avgPageLoadTime)}</div>
                    <div className="flex items-center gap-1 mt-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-500">FCP: {formatMs(performanceReport.avgFirstContentfulPaint)}</span>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Network Requests */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">API Requests</CardTitle>
                    <CardDescription>Average response time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{formatMs(performanceReport.avgNetworkRequestTime)}</div>
                    <div className="flex items-center gap-1 mt-2">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-500">
                        {performanceReport.slowestNetworkRequests.length} tracked requests
                      </span>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Form Submission */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Form Submission</CardTitle>
                    <CardDescription>Average completion time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{formatMs(performanceReport.avgFormSubmissionTime)}</div>
                    <div className="flex items-center gap-1 mt-2">
                      <Activity className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-500">User interaction: {formatMs(performanceReport.avgUserInteractionTime)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Component render times chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Component Render Times</CardTitle>
                  <CardDescription>
                    Average render time for slowest components
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  {performanceReport.slowestComponents.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={performanceReport.slowestComponents.sort((a, b) => b.renderTime - a.renderTime).slice(0, 10)}
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
                          formatter={(value) => [`${value.toFixed(2)} ms`, 'Render Time']}
                          labelFormatter={(label) => `Component: ${label}`}
                        />
                        <Bar 
                          dataKey="renderTime" 
                          fill="#8884d8"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <p className="text-gray-500">No component render data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Network requests and page load time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Network requests */}
                <Card>
                  <CardHeader>
                    <CardTitle>Slowest Network Requests</CardTitle>
                    <CardDescription>
                      Average response time by endpoint
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-64">
                    {performanceReport.slowestNetworkRequests.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={performanceReport.slowestNetworkRequests
                            .sort((a, b) => b.duration - a.duration)
                            .slice(0, 5)
                            .map(req => ({
                              ...req,
                              // Truncate URL for display
                              displayUrl: req.url.length > 30 ? 
                                `${req.url.substring(0, 30)}...` : req.url
                            }))}
                          margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="displayUrl" 
                            tick={{ fontSize: 10, angle: -45, textAnchor: 'end' }} 
                            height={80}
                          />
                          <YAxis 
                            label={{ value: 'Duration (ms)', angle: -90, position: 'insideLeft' }} 
                          />
                          <Tooltip 
                            formatter={(value) => [`${value} ms`, 'Duration']}
                            labelFormatter={(label) => `URL: ${label}`}
                          />
                          <Bar 
                            dataKey="duration" 
                            fill="#82ca9d" 
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <p className="text-gray-500">No network request data available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Page load metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle>Page Load Metrics</CardTitle>
                    <CardDescription>
                      Key timing metrics for page loading
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-64">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">First Paint</span>
                        <div className="flex items-center">
                          <div className="w-48 h-4 bg-gray-100 rounded overflow-hidden">
                            <div 
                              className="h-full bg-blue-500" 
                              style={{ 
                                width: `${Math.min(100, (performanceReport.avgFirstContentfulPaint / 3000) * 100)}%` 
                              }}
                            />
                          </div>
                          <span className="ml-2 text-sm">{formatMs(performanceReport.avgFirstContentfulPaint)}</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Time to Interactive</span>
                        <div className="flex items-center">
                          <div className="w-48 h-4 bg-gray-100 rounded overflow-hidden">
                            <div 
                              className="h-full bg-green-500" 
                              style={{ 
                                width: `${Math.min(100, (performanceReport.avgTimeToInteractive / 5000) * 100)}%` 
                              }}
                            />
                          </div>
                          <span className="ml-2 text-sm">{formatMs(performanceReport.avgTimeToInteractive)}</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Total Page Load</span>
                        <div className="flex items-center">
                          <div className="w-48 h-4 bg-gray-100 rounded overflow-hidden">
                            <div 
                              className="h-full bg-purple-500" 
                              style={{ 
                                width: `${Math.min(100, (performanceReport.avgPageLoadTime / 5000) * 100)}%` 
                              }}
                            />
                          </div>
                          <span className="ml-2 text-sm">{formatMs(performanceReport.avgPageLoadTime)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-8">
                <div className="flex flex-col items-center justify-center text-center">
                  <Layers className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No Performance Data Available</h3>
                  <p className="text-gray-500 mt-2">
                    There is no frontend performance data available for the selected time period.
                  </p>
                  <Button onClick={handleRefresh} className="mt-4">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="page-load">
          <PageLoadMetrics timeRange={getTimeRangeValues()} />
        </TabsContent>
        
        <TabsContent value="network">
          <NetworkRequestMetrics timeRange={getTimeRangeValues()} />
        </TabsContent>
        
        <TabsContent value="components">
          <ComponentMetrics timeRange={getTimeRangeValues()} />
        </TabsContent>
        
        <TabsContent value="forms">
          <FormPerformanceMetrics timeRange={getTimeRangeValues()} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FrontendPerformanceDashboard; 