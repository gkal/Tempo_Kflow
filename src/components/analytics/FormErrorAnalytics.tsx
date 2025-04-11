import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, AlertTriangle, ArrowDown, ArrowUp, Info, TrendingDown, TrendingUp } from 'lucide-react';
import { fetchFormErrorAnalytics } from '@/services/analyticsService';
import { ErrorSeverity, ErrorType } from '@/services/formErrorTrackingService';

// Colors for the charts
const COLORS = {
  low: '#4ade80',     // Green
  medium: '#facc15',  // Yellow
  high: '#f97316',    // Orange
  critical: '#ef4444', // Red
  trend: {
    increasing: '#ef4444', // Red
    decreasing: '#4ade80', // Green
    stable: '#a1a1aa'      // Gray
  }
};

// Component for showing error trend indicators
const TrendIndicator: React.FC<{ trend: string; value: number }> = ({ trend, value }) => {
  if (trend === 'increasing') {
    return (
      <div className="flex items-center text-red-500">
        <TrendingUp className="h-4 w-4 mr-1" />
        <span>+{Math.abs(value)}%</span>
      </div>
    );
  } else if (trend === 'decreasing') {
    return (
      <div className="flex items-center text-green-500">
        <TrendingDown className="h-4 w-4 mr-1" />
        <span>-{Math.abs(value)}%</span>
      </div>
    );
  }
  return (
    <div className="flex items-center text-gray-500">
      <span className="ml-5">Stable</span>
    </div>
  );
};

// Component for error severity icon
const SeverityIcon: React.FC<{ severity: string }> = ({ severity }) => {
  switch (severity.toLowerCase()) {
    case 'critical':
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    case 'high':
      return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    case 'medium':
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    default:
      return <Info className="h-5 w-5 text-green-500" />;
  }
};

interface FormErrorAnalyticsProps {
  startDate: string;
  endDate: string;
  onAlertConfigChange?: (config: any) => void;
}

const FormErrorAnalytics: React.FC<FormErrorAnalyticsProps> = ({ startDate, endDate, onAlertConfigChange }) => {
  const [errorData, setErrorData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('overview');

  useEffect(() => {
    const loadErrorData = async () => {
      setIsLoading(true);
      try {
        const data = await fetchFormErrorAnalytics({ startDate, endDate });
        setErrorData(data);
      } catch (error) {
        console.error('Error fetching error analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadErrorData();
  }, [startDate, endDate]);

  // Format error type for display
  const formatErrorType = (type: string): string => {
    switch (type) {
      case 'validation': return 'Σφάλματα Επικύρωσης';
      case 'submission': return 'Σφάλματα Υποβολής';
      case 'api': return 'Σφάλματα API';
      case 'connectivity': return 'Σφάλματα Σύνδεσης';
      default: return 'Άγνωστα Σφάλματα';
    }
  };

  // Format severity level for display
  const formatSeverity = (severity: string): string => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'Κρίσιμο';
      case 'high': return 'Υψηλό';
      case 'medium': return 'Μεσαίο';
      case 'low': return 'Χαμηλό';
      default: return severity;
    }
  };

  // Get badge variant based on severity
  const getSeverityBadgeVariant = (severity: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'default';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // If no error data available
  if (!errorData || !errorData.totalErrors) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Παρακολούθηση Σφαλμάτων Φόρμας</CardTitle>
          <CardDescription>
            Δεν βρέθηκαν σφάλματα στο επιλεγμένο διάστημα.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-40">
          <Info className="h-12 w-12 text-blue-500 mb-4" />
          <p className="text-center text-gray-600">
            Δεν υπάρχουν καταγεγραμμένα σφάλματα για την περίοδο από {startDate} έως {endDate}.
            Αυτό είναι θετικό σημάδι για την λειτουργία της φόρμας σας!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Παρακολούθηση Σφαλμάτων Φόρμας</CardTitle>
        <CardDescription>
          Ανάλυση σφαλμάτων και προβλημάτων για την περίοδο από {startDate} έως {endDate}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Επισκόπηση</TabsTrigger>
            <TabsTrigger value="fields">Πεδία με Σφάλματα</TabsTrigger>
            <TabsTrigger value="trends">Τάσεις Σφαλμάτων</TabsTrigger>
            <TabsTrigger value="recent">Πρόσφατα Σφάλματα</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Συνολικά Σφάλματα</span>
                    <span className="text-2xl font-bold">{errorData.totalErrors}</span>
                    <span className="text-xs text-gray-500 mt-1">στο επιλεγμένο διάστημα</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Κρίσιμα Σφάλματα</span>
                    <span className="text-2xl font-bold text-red-500">
                      {errorData.errorSeverityDistribution?.critical || 0}
                    </span>
                    <span className="text-xs text-gray-500 mt-1">απαιτούν άμεση προσοχή</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Ποσοστό Σφαλμάτων</span>
                    <span className="text-2xl font-bold">
                      {errorData.errorRate ? (errorData.errorRate * 100).toFixed(1) + '%' : 'N/A'}
                    </span>
                    <span className="text-xs text-gray-500 mt-1">σχετικά με τις προβολές φόρμας</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Πιο Συχνό Σφάλμα</span>
                    <span className="text-lg font-semibold truncate">
                      {errorData.mostCommonError?.type ? formatErrorType(errorData.mostCommonError.type) : 'N/A'}
                    </span>
                    <span className="text-xs text-gray-500 mt-1 truncate">
                      {errorData.mostCommonError?.count ? `${errorData.mostCommonError.count} εμφανίσεις` : ''}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Error Distribution by Severity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Κατανομή Σφαλμάτων κατά Σοβαρότητα</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Κρίσιμο', value: errorData.errorSeverityDistribution?.critical || 0, severity: 'critical' },
                            { name: 'Υψηλό', value: errorData.errorSeverityDistribution?.high || 0, severity: 'high' },
                            { name: 'Μεσαίο', value: errorData.errorSeverityDistribution?.medium || 0, severity: 'medium' },
                            { name: 'Χαμηλό', value: errorData.errorSeverityDistribution?.low || 0, severity: 'low' }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {[
                            { severity: 'critical', color: COLORS.critical },
                            { severity: 'high', color: COLORS.high },
                            { severity: 'medium', color: COLORS.medium },
                            { severity: 'low', color: COLORS.low }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Error Distribution by Type */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Κατανομή Σφαλμάτων κατά Τύπο</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={Object.entries(errorData.errorsByType || {}).map(([type, count]) => ({
                          type: formatErrorType(type),
                          count
                        }))}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="type" width={150} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8884d8" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Fields Tab */}
          <TabsContent value="fields">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Πεδία με τα Περισσότερα Σφάλματα</CardTitle>
                <CardDescription>
                  Τα πεδία που προκαλούν τα περισσότερα προβλήματα στους χρήστες
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={errorData.mostProblematicFields?.map((field: any) => ({
                        field: field.fieldName,
                        count: field.errorCount
                      })) || []}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="field" width={150} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-6">
                  <h4 className="font-medium mb-2">Συστάσεις Βελτίωσης:</h4>
                  <ul className="list-disc pl-5 space-y-2 text-sm">
                    {errorData.mostProblematicFields?.slice(0, 3).map((field: any, index: number) => (
                      <li key={index}>
                        <span className="font-medium">{field.fieldName}:</span> Εξετάστε την αλλαγή των οδηγιών, 
                        την προσθήκη παραδειγμάτων ή την απλοποίηση της επικύρωσης για αυτό το πεδίο.
                      </li>
                    ))}
                    {(!errorData.mostProblematicFields || errorData.mostProblematicFields.length === 0) && (
                      <li>Δεν υπάρχουν αρκετά δεδομένα για συστάσεις.</li>
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends">
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Τάσεις Σφαλμάτων</CardTitle>
                  <CardDescription>
                    Ανάλυση τάσεων σφαλμάτων την τελευταία ώρα σε σύγκριση με την προηγούμενη
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {errorData.errorTrends?.map((trend: any, index: number) => (
                      <div key={index} className="flex items-center justify-between border-b pb-3">
                        <div>
                          <h4 className="font-medium">{formatErrorType(trend.errorType)}</h4>
                          <p className="text-sm text-gray-600">Τελευταία ώρα: {trend.count} σφάλματα</p>
                        </div>
                        <TrendIndicator trend={trend.trend} value={trend.percentageChange} />
                      </div>
                    ))}
                    {(!errorData.errorTrends || errorData.errorTrends.length === 0) && (
                      <p className="text-center py-4 text-gray-500">
                        Δεν υπάρχουν επαρκή δεδομένα για την ανάλυση τάσεων.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Error Rate Over Time */}
              {errorData.errorRateOverTime && errorData.errorRateOverTime.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Ποσοστό Σφαλμάτων στο Χρόνο</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={errorData.errorRateOverTime}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis tickFormatter={(value) => `${(value * 100).toFixed(1)}%`} />
                          <Tooltip formatter={(value) => `${(Number(value) * 100).toFixed(1)}%`} />
                          <Line
                            type="monotone"
                            dataKey="rate"
                            stroke="#ef4444"
                            activeDot={{ r: 8 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Recent Errors Tab */}
          <TabsContent value="recent">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Πρόσφατα Σφάλματα</CardTitle>
                <CardDescription>
                  Τα πιο πρόσφατα σφάλματα που καταγράφηκαν στο σύστημα
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {errorData.recentErrors?.map((error: any, index: number) => (
                    <div key={index} className="flex border rounded-md p-3 gap-4">
                      <div className="flex-shrink-0 pt-1">
                        <SeverityIcon severity={error.severity} />
                      </div>
                      <div className="flex-grow">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{formatErrorType(error.errorType)}</h4>
                            <Badge variant={getSeverityBadgeVariant(error.severity)}>
                              {formatSeverity(error.severity)}
                            </Badge>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(error.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {error.fieldName && (
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Πεδίο:</span> {error.fieldName}
                          </p>
                        )}
                        <p className="text-sm mt-1">{error.errorMessage}</p>
                        {error.formLinkId && (
                          <p className="text-xs text-gray-500 mt-2">Form ID: {error.formLinkId}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!errorData.recentErrors || errorData.recentErrors.length === 0) && (
                    <p className="text-center py-4 text-gray-500">
                      Δεν υπάρχουν πρόσφατα σφάλματα για προβολή.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default FormErrorAnalytics; 