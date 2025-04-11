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
import { RefreshCw, FileText, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface FormPerformanceMetricsProps {
  timeRange: { from: string; to: string };
}

interface FormMetrics {
  formId: string;
  avgPreparationTime: number;
  avgValidationTime: number;
  avgSubmissionTime: number;
  avgTotalTime: number;
  submissionCount: number;
  successRate: number;
  fieldCount: number;
}

interface FormTimingBreakdown {
  name: string;
  value: number;
}

interface FormSubmissionDataPoint {
  timestamp: string;
  totalTime: number;
  success: boolean;
}

const FormPerformanceMetrics: React.FC<FormPerformanceMetricsProps> = ({ timeRange }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [formData, setFormData] = useState<FormMetrics[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<FormSubmissionDataPoint[]>([]);
  const [totalSubmissions, setTotalSubmissions] = useState<number>(0);
  const [successRate, setSuccessRate] = useState<number>(0);
  const [avgTotalTime, setAvgTotalTime] = useState<number>(0);
  
  // Load metrics data
  const loadMetricsData = async () => {
    setIsLoading(true);
    
    try {
      // Get form submission data
      const { data: submissionData, error: submissionError } = await supabase
        .from('frontend_performance_logs')
        .select('data')
        .eq('type', 'form_submission')
        .gte('timestamp', timeRange.from)
        .lte('timestamp', timeRange.to);
      
      if (submissionError) throw submissionError;
      
      if (submissionData && submissionData.length > 0) {
        // Map of forms
        const formMap = new Map<string, { 
          totalPreparationTime: number, 
          totalValidationTime: number,
          totalSubmissionTime: number,
          totalTime: number,
          submissionCount: number,
          successCount: number,
          totalFieldCount: number
        }>();
        
        const timePoints: FormSubmissionDataPoint[] = [];
        let overallTotalTime = 0;
        let overallSuccessCount = 0;
        
        // Process the data
        submissionData.forEach(item => {
          const data = item.data;
          const formId = data.formId || 'Unknown';
          
          // Add to form metrics
          if (!formMap.has(formId)) {
            formMap.set(formId, {
              totalPreparationTime: 0,
              totalValidationTime: 0,
              totalSubmissionTime: 0,
              totalTime: 0,
              submissionCount: 0,
              successCount: 0,
              totalFieldCount: 0
            });
          }
          
          const formMetrics = formMap.get(formId)!;
          formMetrics.totalPreparationTime += data.preparationTime || 0;
          formMetrics.totalValidationTime += data.validationTime || 0;
          formMetrics.totalSubmissionTime += data.submissionTime || 0;
          formMetrics.totalTime += data.totalTime || 0;
          formMetrics.submissionCount += 1;
          formMetrics.successCount += data.success ? 1 : 0;
          formMetrics.totalFieldCount += data.fieldCount || 0;
          
          // Track overall metrics
          overallTotalTime += data.totalTime || 0;
          overallSuccessCount += data.success ? 1 : 0;
          
          // Add to time series data
          if (data.timestamp && data.totalTime) {
            timePoints.push({
              timestamp: data.timestamp,
              totalTime: data.totalTime || 0,
              success: data.success || false
            });
          }
        });
        
        // Convert to arrays for display
        const formArray = Array.from(formMap.entries()).map(([formId, metrics]) => ({
          formId,
          avgPreparationTime: metrics.totalPreparationTime / metrics.submissionCount,
          avgValidationTime: metrics.totalValidationTime / metrics.submissionCount,
          avgSubmissionTime: metrics.totalSubmissionTime / metrics.submissionCount,
          avgTotalTime: metrics.totalTime / metrics.submissionCount,
          submissionCount: metrics.submissionCount,
          successRate: (metrics.successCount / metrics.submissionCount) * 100,
          fieldCount: Math.round(metrics.totalFieldCount / metrics.submissionCount)
        }));
        
        // Set overall metrics
        setTotalSubmissions(submissionData.length);
        setSuccessRate((overallSuccessCount / submissionData.length) * 100);
        setAvgTotalTime(overallTotalTime / submissionData.length);
        
        // Sort by average total time (descending)
        setFormData(formArray.sort((a, b) => b.avgTotalTime - a.avgTotalTime));
        
        // Sort time series data by timestamp
        setTimeSeriesData(timePoints.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        ));
      } else {
        setFormData([]);
        setTimeSeriesData([]);
        setTotalSubmissions(0);
        setSuccessRate(0);
        setAvgTotalTime(0);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading form metrics:', error);
      toast({
        title: 'Error loading form metrics',
        description: 'Failed to load form submission performance data',
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
  
  // Calculate timing breakdown data
  const getTimingBreakdownData = (form: FormMetrics): FormTimingBreakdown[] => {
    return [
      { name: 'Preparation', value: form.avgPreparationTime },
      { name: 'Validation', value: form.avgValidationTime },
      { name: 'Submission', value: form.avgSubmissionTime }
    ];
  };
  
  // Get color for timing breakdown
  const getTimingColor = (name: string) => {
    switch (name) {
      case 'Preparation':
        return '#8884d8'; // Purple
      case 'Validation':
        return '#82ca9d'; // Green
      case 'Submission':
        return '#ffc658'; // Yellow
      default:
        return '#888888'; // Gray
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
  if (totalSubmissions === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Form Submission Metrics</h2>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center text-center">
              <FileText className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No Form Submission Data Available</h3>
              <p className="text-gray-500 mt-2">
                There is no form submission performance data available for the selected time range.
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
        <h2 className="text-xl font-semibold text-gray-800">Form Submission Metrics</h2>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      {/* Summary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Submissions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Submissions</CardTitle>
            <CardDescription>Form submissions tracked</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalSubmissions.toLocaleString()}</div>
            <div className="flex items-center gap-1 mt-2">
              <FileText className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-500">
                {formData.length} unique forms
              </span>
            </div>
          </CardContent>
        </Card>
        
        {/* Success Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Success Rate</CardTitle>
            <CardDescription>Successful form submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{successRate.toFixed(1)}%</div>
            <div className="flex items-center gap-1 mt-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-500">
                {Math.round(totalSubmissions * (successRate / 100))} successful submissions
              </span>
            </div>
          </CardContent>
        </Card>
        
        {/* Average Time */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Avg Completion Time</CardTitle>
            <CardDescription>Time to complete forms</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatMs(avgTotalTime)}</div>
            <div className="flex items-center gap-1 mt-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-500">
                From start to submission
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Form submission time series */}
      <Card>
        <CardHeader>
          <CardTitle>Form Submission Times</CardTitle>
          <CardDescription>
            Submission times over time with success/failure indication
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
                label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft' }} 
              />
              <Tooltip 
                formatter={(value) => [`${value} ms`, 'Submission Time']}
                labelFormatter={(timestamp) => {
                  const date = new Date(timestamp);
                  const dataPoint = timeSeriesData.find(d => d.timestamp === timestamp);
                  return `${date.toLocaleString()}, Status: ${dataPoint?.success ? 'Success' : 'Failed'}`;
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="totalTime" 
                name="Submission Time" 
                stroke="#8884d8"
                strokeWidth={2}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  const success = payload.success;
                  
                  return (
                    <svg x={cx - 5} y={cy - 5} width={10} height={10} fill={success ? "green" : "red"}>
                      <circle cx={5} cy={5} r={5} />
                    </svg>
                  );
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {/* Form details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Form breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Form Performance Breakdown</CardTitle>
            <CardDescription>
              Time breakdown by form processing stage
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {formData.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={formData.slice(0, 5)}
                  margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="formId" 
                    tick={{ fontSize: 10, angle: -45, textAnchor: 'end' }}
                    height={80}
                  />
                  <YAxis label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip 
                    formatter={(value) => [`${Number(value).toFixed(0)} ms`, '']}
                  />
                  <Legend />
                  <Bar 
                    dataKey="avgPreparationTime" 
                    name="Preparation Time" 
                    stackId="a"
                    fill="#8884d8" 
                  />
                  <Bar 
                    dataKey="avgValidationTime" 
                    name="Validation Time" 
                    stackId="a"
                    fill="#82ca9d" 
                  />
                  <Bar 
                    dataKey="avgSubmissionTime" 
                    name="Submission Time" 
                    stackId="a"
                    fill="#ffc658" 
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        
        {/* Form metrics table */}
        <Card>
          <CardHeader>
            <CardTitle>Form Metrics By Form</CardTitle>
            <CardDescription>
              Performance metrics for each form
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Form</th>
                  <th className="text-right py-2">Avg Time</th>
                  <th className="text-right py-2">Success</th>
                  <th className="text-right py-2">Fields</th>
                </tr>
              </thead>
              <tbody>
                {formData.map((form, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2 truncate max-w-[200px]" title={form.formId}>
                      {form.formId.length > 25 ? `${form.formId.substring(0, 25)}...` : form.formId}
                    </td>
                    <td className="text-right py-2">{formatMs(form.avgTotalTime)}</td>
                    <td className="text-right py-2">
                      <Badge variant={form.successRate >= 90 ? "outline" : "destructive"}>
                        {form.successRate.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="text-right py-2">{form.fieldCount}</td>
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

export default FormPerformanceMetrics; 