import React, { useState, useEffect, useMemo } from 'react';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { 
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  AreaChart, 
  LineChart, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { Download, Calendar as CalendarIcon, Filter, ArrowRight, AlertCircle } from 'lucide-react';
import { fetchFormAnalytics } from '@/services/analyticsService';
import { supabase } from '@/lib/supabaseClient';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import FormErrorAnalytics from './FormErrorAnalytics';
import CustomerSegmentAnalytics from './CustomerSegmentAnalytics';
import FormAnalyticsService, { 
  FormAnalyticsReport, 
  FieldAnalytics,
  FormAnalyticsFilter
} from '@/services/analytics/formAnalyticsService';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Progress } from '@/components/ui/progress';

// Define types for analytics data
interface FormAnalyticsData {
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  conversionRate: number;
  averageCompletionTime: number;
  viewsCount: number;
  abandonmentRate: number;
  dailySubmissions: {
    date: string;
    count: number;
    approved: number;
    rejected: number;
  }[];
  deviceDistribution: {
    device: string;
    count: number;
    percentage: number;
  }[];
  errorData: {
    fieldName: string;
    errorCount: number;
    percentage: number;
  }[];
  timeOfDayDistribution: {
    hour: number;
    count: number;
  }[];
  formStepAbandonment: {
    step: string;
    abandonCount: number;
    percentage: number;
  }[];
}

type DateRange = {
  from: Date;
  to: Date;
};

type TimePeriod = 'day' | 'week' | 'month' | 'custom';

interface FormOption {
  id: string;
  name: string;
  submissions: number;
  completionRate: number;
}

/**
 * Form Analytics Dashboard Component
 * Displays comprehensive analytics for form submissions and user behavior
 */
const FormAnalyticsDashboard: React.FC = () => {
  const { toast } = useToast();
  const { hasPermission } = useUserPermissions();
  const [analyticsData, setAnalyticsData] = useState<FormAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [forms, setForms] = useState<FormOption[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [analyticsReport, setAnalyticsReport] = useState<FormAnalyticsReport | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Permission check - hide dashboard if no permission
  const hasAnalyticsAccess = useMemo(() => {
    return hasPermission('view_analytics');
  }, [hasPermission]);

  // Calculate date range based on selected time period
  const calculateDateRange = (period: TimePeriod): DateRange => {
    const today = new Date();
    switch (period) {
      case 'day':
        return { from: today, to: today };
      case 'week':
        return { 
          from: startOfWeek(today, { weekStartsOn: 1 }), 
          to: endOfWeek(today, { weekStartsOn: 1 }) 
        };
      case 'month':
        return { from: startOfMonth(today), to: endOfMonth(today) };
      case 'custom':
        return dateRange;
      default:
        return { from: subDays(today, 7), to: today };
    }
  };

  // Update date range when time period changes
  useEffect(() => {
    if (timePeriod !== 'custom') {
      setDateRange(calculateDateRange(timePeriod));
    }
  }, [timePeriod]);

  // Fetch analytics data when date range changes
  useEffect(() => {
    const loadAnalyticsData = async () => {
      if (!hasAnalyticsAccess) return;
      
      setIsLoading(true);
      try {
        const { from, to } = dateRange;
        const data = await fetchFormAnalytics({ 
          startDate: format(from, 'yyyy-MM-dd'),
          endDate: format(to, 'yyyy-MM-dd'),
        });
        setAnalyticsData(data);
      } catch (error) {
        console.error('Error fetching analytics data:', error);
        toast({
          title: 'Σφάλμα φόρτωσης αναλυτικών στοιχείων',
          description: 'Παρουσιάστηκε πρόβλημα κατά τη φόρτωση των αναλυτικών στοιχείων. Παρακαλώ δοκιμάστε ξανά.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalyticsData();
  }, [dateRange, hasAnalyticsAccess, toast]);

  // Load forms list on component mount
  useEffect(() => {
    loadFormsList();
  }, []);

  // Load analytics when form or date range changes
  useEffect(() => {
    if (selectedFormId) {
      loadFormAnalytics();
    }
  }, [selectedFormId, dateRange]);

  // Load list of available forms with submission counts
  const loadFormsList = async () => {
    try {
      setIsLoading(true);
      const formsList = await FormAnalyticsService.getFormsList();
      
      if (formsList.length > 0) {
        setForms(formsList.map(form => ({
          id: form.formId,
          name: form.formName,
          submissions: form.submissions,
          completionRate: form.completionRate
        })));
        
        // Select the first form by default
        if (!selectedFormId && formsList.length > 0) {
          setSelectedFormId(formsList[0].formId);
        }
      } else {
        setError('No forms with analytics data found.');
      }
    } catch (err) {
      setError('Failed to load forms list. Please try again later.');
      console.error('Error loading forms list:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load analytics data for selected form
  const loadFormAnalytics = async () => {
    try {
      setIsLoading(true);
      
      const filter: FormAnalyticsFilter = {
        formId: selectedFormId,
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString()
      };
      
      const report = await FormAnalyticsService.getFormAnalyticsReport(filter);
      
      if (report) {
        setAnalyticsReport(report);
        setError(null);
      } else {
        setError('No analytics data available for the selected criteria.');
      }
    } catch (err) {
      setError('Failed to load analytics data. Please try again later.');
      console.error('Error loading analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form selection change
  const handleFormChange = (formId: string) => {
    setSelectedFormId(formId);
  };

  // Handle date range change
  const handleDateRangeChange = (range: { from: Date; to: Date }) => {
    setDateRange(range);
  };

  // Format time in seconds to a readable format
  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds.toFixed(1)} seconds`;
    } else if (seconds < 3600) {
      return `${(seconds / 60).toFixed(1)} minutes`;
    } else {
      return `${(seconds / 3600).toFixed(1)} hours`;
    }
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  // Refresh analytics data
  const handleRefresh = () => {
    loadFormAnalytics();
  };

  // Get badge color based on completion rate
  const getCompletionRateBadgeColor = (rate: number): string => {
    if (rate >= 80) return 'bg-green-500';
    if (rate >= 60) return 'bg-yellow-500';
    if (rate >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // If user doesn't have permission, show access denied message
  if (!hasAnalyticsAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-80">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Δεν έχετε πρόσβαση</h2>
        <p className="text-gray-600 text-center max-w-md">
          Δεν έχετε τα απαραίτητα δικαιώματα για να δείτε τα αναλυτικά στοιχεία των φορμών.
          Παρακαλούμε επικοινωνήστε με τον διαχειριστή του συστήματος.
        </p>
      </div>
    );
  }

  // Render loading state
  if (isLoading && !analyticsReport) {
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

  // Render error state
  if (error && !analyticsReport) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error loading analytics</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="space-y-6">
      {/* Dashboard header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Form Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Track form submissions, user behavior, and conversion rates
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={selectedFormId} onValueChange={handleFormChange}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select a form" />
            </SelectTrigger>
            <SelectContent>
              {forms.map((form) => (
                <SelectItem key={form.id} value={form.id}>
                  {form.name} ({form.submissions} submissions)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DateRangePicker
            date={dateRange}
            onChange={handleDateRangeChange}
            align="end"
          />
          <Button variant="outline" onClick={handleRefresh}>
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Main dashboard content */}
      {analyticsReport && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
            <TabsTrigger value="fields">Fields</TabsTrigger>
            <TabsTrigger value="devices">Devices</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* KPI cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Submissions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analyticsReport.totalSubmissions}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    During selected period
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Completion Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-bold">
                      {analyticsReport.completionRate.toFixed(1)}%
                    </div>
                    <Badge
                      className={getCompletionRateBadgeColor(
                        analyticsReport.completionRate
                      )}
                    >
                      {analyticsReport.completionRate >= 70
                        ? "Good"
                        : analyticsReport.completionRate >= 50
                        ? "Average"
                        : "Poor"}
                    </Badge>
                  </div>
                  <Progress
                    value={analyticsReport.completionRate}
                    className="h-2 mt-2"
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Avg. Completion Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatTime(analyticsReport.averageCompletionTime)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    For completed submissions
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Abandonment Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analyticsReport.abandonmentRate.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Users who left before completing
                  </p>
                </CardContent>
              </Card>
            </div>
            
            {/* Submission trends chart */}
            <Card>
              <CardHeader>
                <CardTitle>Submission Trends</CardTitle>
                <CardDescription>
                  Form submissions and completions over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <LineChart
                    data={analyticsReport.submissionTrends}
                    index="date"
                    categories={["submissions", "completions"]}
                    colors={["blue", "green"]}
                    valueFormatter={(value) => `${value} submissions`}
                    showLegend={true}
                    showGridLines={true}
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Problematic fields summary */}
            <Card>
              <CardHeader>
                <CardTitle>Top Problematic Fields</CardTitle>
                <CardDescription>
                  Fields with highest error and abandonment rates
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsReport.mostProblematicFields.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Field</TableHead>
                        <TableHead>Avg. Time Spent</TableHead>
                        <TableHead>Error Rate</TableHead>
                        <TableHead>Abandonment Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analyticsReport.mostProblematicFields.map((field) => (
                        <TableRow key={field.fieldId}>
                          <TableCell className="font-medium">
                            {field.fieldName}
                          </TableCell>
                          <TableCell>
                            {(field.averageInteractionTime / 1000).toFixed(1)}s
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                field.errorRate > 10 ? "destructive" : "outline"
                              }
                            >
                              {field.errorRate.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                field.abandonmentRate > 15
                                  ? "destructive"
                                  : "outline"
                              }
                            >
                              {field.abandonmentRate.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground">
                    No field interaction data available
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Submissions Tab */}
          <TabsContent value="submissions" className="space-y-4">
            {/* Submission distribution charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Submissions by Device</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <PieChart
                      data={Object.entries(
                        analyticsReport.submissionsByDevice
                      ).map(([key, value]) => ({
                        name: key,
                        value: value,
                      }))}
                      index="name"
                      category="value"
                      valueFormatter={(value) => `${value} submissions`}
                      showLabel={true}
                      showLegend={true}
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Submissions by Browser</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <PieChart
                      data={Object.entries(
                        analyticsReport.submissionsByBrowser
                      )
                        .filter(([_, value]) => value > 0)
                        .map(([key, value]) => ({
                          name: key,
                          value: value,
                        }))}
                      index="name"
                      category="value"
                      valueFormatter={(value) => `${value} submissions`}
                      showLabel={true}
                      showLegend={true}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Peak usage times */}
            <Card>
              <CardHeader>
                <CardTitle>Peak Usage Times</CardTitle>
                <CardDescription>
                  When users most frequently interact with the form
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <BarChart
                    data={analyticsReport.peakUsageTimes
                      .filter(time => time.day >= 0) // Only show day-specific data
                      .map(time => ({
                        day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][time.day],
                        hour: `${time.hour}:00`,
                        submissions: time.submissions
                      }))}
                    index="hour"
                    categories={["submissions"]}
                    colors={["blue"]}
                    valueFormatter={(value) => `${value} submissions`}
                    showLegend={false}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Fields Tab */}
          <TabsContent value="fields" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Field Performance Analysis</CardTitle>
                <CardDescription>
                  Detailed field interaction metrics and error rates
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsReport.mostProblematicFields.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Field Name</TableHead>
                        <TableHead>Average Time Spent</TableHead>
                        <TableHead>Error Rate</TableHead>
                        <TableHead>Abandonment Rate</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analyticsReport.mostProblematicFields.map((field) => (
                        <TableRow key={field.fieldId}>
                          <TableCell className="font-medium">
                            {field.fieldName}
                          </TableCell>
                          <TableCell>
                            {(field.averageInteractionTime / 1000).toFixed(1)}s
                          </TableCell>
                          <TableCell>
                            {field.errorRate.toFixed(1)}%
                          </TableCell>
                          <TableCell>
                            {field.abandonmentRate.toFixed(1)}%
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                field.errorRate > 10 || field.abandonmentRate > 15
                                  ? "destructive"
                                  : field.errorRate > 5 || field.abandonmentRate > 10
                                  ? "warning"
                                  : "success"
                              }
                            >
                              {field.errorRate > 10 || field.abandonmentRate > 15
                                ? "Needs Attention"
                                : field.errorRate > 5 || field.abandonmentRate > 10
                                ? "Monitor"
                                : "Good"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground">
                    No field interaction data available
                  </p>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Field Improvement Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsReport.mostProblematicFields.length > 0 ? (
                    analyticsReport.mostProblematicFields
                      .filter(
                        (field) =>
                          field.errorRate > 5 || field.abandonmentRate > 10
                      )
                      .map((field) => (
                        <div
                          key={field.fieldId}
                          className="p-4 border rounded-lg space-y-2"
                        >
                          <h3 className="font-semibold">{field.fieldName}</h3>
                          <div className="text-sm">
                            {field.errorRate > 10 && (
                              <p className="text-red-500">
                                High error rate ({field.errorRate.toFixed(1)}%):
                                Consider clarifying field instructions or
                                validation requirements.
                              </p>
                            )}
                            {field.abandonmentRate > 15 && (
                              <p className="text-red-500">
                                High abandonment rate (
                                {field.abandonmentRate.toFixed(1)}%): Users
                                frequently leave the form at this field.
                                Consider simplifying or making it optional.
                              </p>
                            )}
                            {field.averageInteractionTime > 10000 && (
                              <p className="text-amber-500">
                                Long interaction time (
                                {(field.averageInteractionTime / 1000).toFixed(
                                  1
                                )}
                                s): Users spend excessive time on this field.
                                Consider providing examples or clearer
                                instructions.
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                  ) : (
                    <p className="text-muted-foreground">
                      No suggestions available. All fields are performing well.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Devices Tab */}
          <TabsContent value="devices" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Performance by Device Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Device</TableHead>
                        <TableHead>Submissions</TableHead>
                        <TableHead>Percentage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(analyticsReport.submissionsByDevice).map(
                        ([device, count]) => (
                          <TableRow key={device}>
                            <TableCell className="font-medium">
                              {device}
                            </TableCell>
                            <TableCell>{count}</TableCell>
                            <TableCell>
                              {((count / analyticsReport.totalSubmissions) * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Performance by Browser</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Browser</TableHead>
                        <TableHead>Submissions</TableHead>
                        <TableHead>Percentage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(analyticsReport.submissionsByBrowser).map(
                        ([browser, count]) => (
                          <TableRow key={browser}>
                            <TableCell className="font-medium">
                              {browser}
                            </TableCell>
                            <TableCell>{count}</TableCell>
                            <TableCell>
                              {((count / analyticsReport.totalSubmissions) * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Device Compatibility Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(analyticsReport.submissionsByDevice).length > 0 ? (
                    <div>
                      <h3 className="font-semibold mb-2">Device Insights</h3>
                      <ul className="space-y-2 list-disc pl-5">
                        {Object.keys(analyticsReport.submissionsByDevice).includes('mobile') && 
                         Object.keys(analyticsReport.submissionsByDevice).includes('desktop') && (
                          <li>
                            Mobile usage: {
                              ((analyticsReport.submissionsByDevice['mobile'] || 0) / 
                               analyticsReport.totalSubmissions * 100).toFixed(1)
                            }% of total submissions
                          </li>
                        )}
                        
                        {Object.entries(analyticsReport.submissionsByDevice).length > 2 && (
                          <li>
                            Your form is being accessed from {Object.entries(analyticsReport.submissionsByDevice).length} 
                            different device types, ensure it's optimized for all screen sizes.
                          </li>
                        )}
                        
                        {Object.entries(analyticsReport.submissionsByBrowser).length > 3 && (
                          <li>
                            Your form is being accessed from {Object.entries(analyticsReport.submissionsByBrowser).length} 
                            different browsers, ensure cross-browser compatibility.
                          </li>
                        )}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      No device data available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default FormAnalyticsDashboard; 