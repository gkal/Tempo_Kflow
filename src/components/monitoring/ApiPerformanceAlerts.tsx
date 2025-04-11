import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { AlertTriangle, Clock, ArrowRightCircle, AlertCircle, Activity } from 'lucide-react';
import ApiPerformanceService, { PerformanceAlert } from '@/services/monitoring/apiPerformanceService';

interface ApiPerformanceAlertsProps {
  timeRange: { from: string; to: string };
  onViewEndpoint: (endpoint: string, method: string) => void;
}

const ApiPerformanceAlerts: React.FC<ApiPerformanceAlertsProps> = ({ 
  timeRange,
  onViewEndpoint
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  
  // Load alerts data
  const loadAlerts = async () => {
    setIsLoading(true);
    
    try {
      // Create comparison timeRange for 24 hours prior to current range
      const comparisonFrom = new Date(timeRange.from);
      comparisonFrom.setDate(comparisonFrom.getDate() - 1);
      
      const comparisonTimeRange = {
        from: format(comparisonFrom, "yyyy-MM-dd'T'HH:mm:ss"),
        to: timeRange.from
      };
      
      const alertsData = await ApiPerformanceService.generatePerformanceAlerts(
        timeRange,
        comparisonTimeRange
      );
      
      // Sort alerts by severity and timestamp
      setAlerts(alertsData.sort((a, b) => {
        // First sort by severity
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        const severityComparison = severityOrder[a.severity] - severityOrder[b.severity];
        
        // If severity is the same, sort by timestamp (descending)
        if (severityComparison === 0) {
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        }
        
        return severityComparison;
      }));
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading API alerts:', error);
      toast({
        title: 'Error loading alerts',
        description: 'Failed to load API performance alerts',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    loadAlerts();
    
    // Set up auto refresh every 2 minutes
    const refreshInterval = setInterval(loadAlerts, 2 * 60 * 1000);
    
    return () => clearInterval(refreshInterval);
  }, [timeRange]);
  
  // Handle view endpoint details
  const handleViewEndpoint = (alert: PerformanceAlert) => {
    if (alert.endpoint) {
      const [method, endpoint] = alert.endpoint.split(':');
      onViewEndpoint(endpoint, method);
    }
  };
  
  // Get icon based on alert type
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'response_time':
        return <Clock className="h-5 w-5" />;
      case 'error_rate':
        return <AlertTriangle className="h-5 w-5" />;
      case 'throughput':
        return <Activity className="h-5 w-5" />;
      case 'resource_usage':
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };
  
  // Get alert card color based on severity
  const getAlertCardClass = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'info':
        return 'border-blue-200 bg-blue-50';
      default:
        return '';
    }
  };
  
  // Get badge color based on severity
  const getAlertBadgeClass = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Render loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }
  
  // If no alerts
  if (alerts.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="rounded-full bg-green-100 p-3 mb-4">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-6 w-6 text-green-600" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M5 13l4 4L19 7" 
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-green-700">All Systems Operational</h3>
            <p className="text-green-600 mt-2">
              No performance alerts detected for the selected time period.
            </p>
            <Button 
              variant="outline" 
              className="mt-4 border-green-200 text-green-700 hover:bg-green-100"
              onClick={loadAlerts}
            >
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">
          Performance Alerts ({alerts.length})
        </h2>
        <Button variant="outline" size="sm" onClick={loadAlerts}>
          Refresh
        </Button>
      </div>
      
      {/* Alert summary */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <div>
                <h3 className="text-lg font-semibold text-amber-700">
                  {alerts.filter(a => a.severity === 'critical').length} Critical Alerts
                </h3>
                <p className="text-amber-600 text-sm">
                  {alerts.filter(a => a.severity === 'warning').length} Warnings
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge className="bg-red-100 text-red-800">
                {alerts.filter(a => a.type === 'response_time').length} Response Time
              </Badge>
              <Badge className="bg-amber-100 text-amber-800">
                {alerts.filter(a => a.type === 'error_rate').length} Error Rate
              </Badge>
              <Badge className="bg-blue-100 text-blue-800">
                {alerts.filter(a => a.type === 'throughput').length} Throughput
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* List of alerts */}
      {alerts.map((alert, index) => (
        <Card key={index} className={getAlertCardClass(alert.severity)}>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                {getAlertIcon(alert.type)}
                <CardTitle className="text-lg">
                  {alert.type === 'response_time' ? 'Slow Response Time' : 
                   alert.type === 'error_rate' ? 'High Error Rate' :
                   alert.type === 'throughput' ? 'Throughput Issue' : 
                   'Resource Usage Alert'}
                </CardTitle>
              </div>
              <Badge className={getAlertBadgeClass(alert.severity)}>
                {alert.severity.toUpperCase()}
              </Badge>
            </div>
            <CardDescription className="mt-1">
              {alert.timestamp ? format(new Date(alert.timestamp), 'PPp') : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-2">
            <p className="text-gray-700">{alert.message}</p>
            
            <div className="mt-2 flex flex-wrap gap-2">
              {alert.endpoint && (
                <Badge variant="outline" className="font-mono">
                  {alert.endpoint}
                </Badge>
              )}
              
              {alert.currentValue !== undefined && (
                <Badge variant="outline" className="bg-white">
                  Current: {alert.type === 'response_time' ? 
                    `${alert.currentValue.toFixed(2)}ms` : 
                    alert.type === 'error_rate' ? 
                    `${alert.currentValue.toFixed(2)}%` : 
                    alert.currentValue.toFixed(2)}
                </Badge>
              )}
              
              {alert.threshold !== undefined && (
                <Badge variant="outline" className="bg-white">
                  Threshold: {alert.type === 'response_time' ? 
                    `${alert.threshold.toFixed(2)}ms` : 
                    alert.type === 'error_rate' ? 
                    `${alert.threshold.toFixed(2)}%` : 
                    alert.threshold.toFixed(2)}
                </Badge>
              )}
            </div>
          </CardContent>
          {alert.endpoint && (
            <CardFooter>
              <Button 
                variant="ghost" 
                size="sm" 
                className="ml-auto"
                onClick={() => handleViewEndpoint(alert)}
              >
                View Details
                <ArrowRightCircle className="h-4 w-4 ml-2" />
              </Button>
            </CardFooter>
          )}
        </Card>
      ))}
    </div>
  );
};

export default ApiPerformanceAlerts; 