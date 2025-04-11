import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
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
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { filterIcon, Globe, Users, Clock, Phone, Laptop, ArrowUpDown } from 'lucide-react';
import { fetchCustomerSegmentAnalytics } from '@/services/analyticsService';
import { supabase } from '@/lib/supabaseClient';
import { Skeleton } from '@/components/ui/skeleton';

// Chart colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// Interfaces
interface CustomerSegmentAnalyticsProps {
  startDate: string;
  endDate: string;
}

interface CustomerSegmentData {
  customerTypeData: {
    type: string;
    count: number;
    percentage: number;
    conversionRate: number;
    avgCompletionTime: number;
  }[];
  geographicalData: {
    region: string;
    count: number;
    percentage: number;
  }[];
  deviceData: {
    deviceType: string;
    browser: string;
    count: number;
    percentage: number;
  }[];
  timeOfDayData: {
    hour: number;
    count: number;
    customerTypes: {
      type: string;
      count: number;
    }[];
  }[];
  completionTimeData: {
    customerType: string;
    avgTime: number;
    minTime: number;
    maxTime: number;
  }[];
  comparisonData: {
    metric: string;
    values: {
      segment: string;
      value: number;
    }[];
  }[];
}

const CustomerSegmentAnalytics: React.FC<CustomerSegmentAnalyticsProps> = ({ 
  startDate, 
  endDate 
}) => {
  const [segmentData, setSegmentData] = useState<CustomerSegmentData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('customer-types');
  const [primarySegment, setPrimarySegment] = useState<string>('all');
  const [comparisonSegment, setComparisonSegment] = useState<string>('none');
  
  // Fetch data when dates change
  useEffect(() => {
    const loadSegmentData = async () => {
      setIsLoading(true);
      try {
        const data = await fetchCustomerSegmentAnalytics({ 
          startDate, 
          endDate 
        });
        setSegmentData(data);
      } catch (error) {
        console.error('Error fetching segment analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSegmentData();
  }, [startDate, endDate]);
  
  // Get customer types for dropdowns
  const customerTypes = useMemo(() => {
    if (!segmentData) return [];
    return [
      { label: 'Όλοι οι Τύποι', value: 'all' },
      ...segmentData.customerTypeData.map(type => ({
        label: type.type,
        value: type.type
      }))
    ];
  }, [segmentData]);
  
  // Format percentage 
  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };
  
  // Format time (seconds to minutes and seconds)
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Filter data based on selected segment
  const filteredDeviceData = useMemo(() => {
    if (!segmentData || primarySegment === 'all') return segmentData?.deviceData;
    // This would be implemented with real data filtering
    return segmentData.deviceData;
  }, [segmentData, primarySegment]);
  
  // Render loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }
  
  // If no data available
  if (!segmentData) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-lg text-gray-500">Δεν υπάρχουν διαθέσιμα δεδομένα ανά τμήμα πελατών</p>
        <p className="text-sm text-gray-400 mt-2">Προσπαθήστε να επιλέξετε διαφορετικό χρονικό διάστημα</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-800">Αναλυτικά Στοιχεία ανά Τμήμα Πελατών</h2>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex flex-col w-full sm:w-auto">
            <label htmlFor="primary-segment" className="text-sm text-gray-500 mb-1">Κύριο Τμήμα</label>
            <Select value={primarySegment} onValueChange={setPrimarySegment}>
              <SelectTrigger id="primary-segment" className="w-full sm:w-[180px]">
                <SelectValue placeholder="Επιλέξτε τμήμα" />
              </SelectTrigger>
              <SelectContent>
                {customerTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-col w-full sm:w-auto">
            <label htmlFor="comparison-segment" className="text-sm text-gray-500 mb-1">Σύγκριση με</label>
            <Select value={comparisonSegment} onValueChange={setComparisonSegment}>
              <SelectTrigger id="comparison-segment" className="w-full sm:w-[180px]">
                <SelectValue placeholder="Επιλέξτε τμήμα" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Καμία Σύγκριση</SelectItem>
                {customerTypes
                  .filter(type => type.value !== 'all' && type.value !== primarySegment)
                  .map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 md:grid-cols-5 mb-4">
          <TabsTrigger value="customer-types">
            <Users className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Τύποι Πελατών</span>
          </TabsTrigger>
          <TabsTrigger value="geographical">
            <Globe className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Γεωγραφική Ανάλυση</span>
          </TabsTrigger>
          <TabsTrigger value="devices">
            <Laptop className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Συσκευές & Browsers</span>
          </TabsTrigger>
          <TabsTrigger value="time-patterns">
            <Clock className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Χρονικά Μοτίβα</span>
          </TabsTrigger>
          <TabsTrigger value="comparison">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Σύγκριση Τμημάτων</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="customer-types" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Κατανομή Τύπων Πελατών</CardTitle>
                <CardDescription>
                  Ποσοστιαία κατανομή υποβολών φορμών ανά τύπο πελάτη
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                {segmentData.customerTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={segmentData.customerTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="type"
                        label={({ type, percentage }) => 
                          `${type}: ${formatPercentage(percentage)}`
                        }
                      >
                        {segmentData.customerTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name, props) => [
                          `${value} (${formatPercentage(props.payload.percentage)})`,
                          name
                        ]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <p className="text-gray-500">
                      Δεν υπάρχουν διαθέσιμα δεδομένα για την επιλεγμένη περίοδο
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Ποσοστό Ολοκλήρωσης ανά Τύπο</CardTitle>
                <CardDescription>
                  Ποσοστό επιτυχημένων υποβολών σε σχέση με τις προβολές
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                {segmentData.customerTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={segmentData.customerTypeData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" />
                      <YAxis tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
                      <Tooltip 
                        formatter={(value) => [`${(value * 100).toFixed(1)}%`, 'Ποσοστό Ολοκλήρωσης']}
                      />
                      <Bar 
                        dataKey="conversionRate" 
                        fill="#0088FE" 
                        name="Ποσοστό Ολοκλήρωσης"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <p className="text-gray-500">
                      Δεν υπάρχουν διαθέσιμα δεδομένα για την επιλεγμένη περίοδο
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Μέσος Χρόνος Ολοκλήρωσης ανά Τύπο Πελάτη</CardTitle>
              <CardDescription>
                Πόσο χρόνο χρειάζονται οι διαφορετικοί τύποι πελατών για να συμπληρώσουν τη φόρμα
              </CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              {segmentData.completionTimeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={segmentData.completionTimeData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="customerType" />
                    <YAxis 
                      tickFormatter={(value) => formatTime(value)}
                      label={{ value: 'Χρόνος (λεπτά:δευτερόλεπτα)', angle: -90, position: 'insideLeft' }} 
                    />
                    <Tooltip 
                      formatter={(value) => [formatTime(value), 'Χρόνος Ολοκλήρωσης']}
                    />
                    <Bar 
                      dataKey="avgTime" 
                      fill="#00C49F" 
                      name="Μέσος Χρόνος"
                    />
                    <Bar 
                      dataKey="minTime" 
                      fill="#0088FE" 
                      name="Ελάχιστος Χρόνος"
                    />
                    <Bar 
                      dataKey="maxTime" 
                      fill="#FF8042" 
                      name="Μέγιστος Χρόνος"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <p className="text-gray-500">
                    Δεν υπάρχουν διαθέσιμα δεδομένα για την επιλεγμένη περίοδο
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="geographical" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Γεωγραφική Κατανομή Υποβολών</CardTitle>
              <CardDescription>
                Κατανομή υποβολών φορμών ανά γεωγραφική περιοχή
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-[400px]">
              {segmentData.geographicalData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={segmentData.geographicalData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis 
                      type="category" 
                      dataKey="region" 
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value, name, props) => [
                        `${value} (${formatPercentage(props.payload.percentage)})`,
                        'Υποβολές'
                      ]}
                    />
                    <Bar 
                      dataKey="count" 
                      fill="#8884d8" 
                      name="Υποβολές Φορμών"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-64">
                  <p className="text-gray-500">
                    Δεν υπάρχουν διαθέσιμα γεωγραφικά δεδομένα για την επιλεγμένη περίοδο
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="devices" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Κατανομή Συσκευών</CardTitle>
                <CardDescription>
                  Τύποι συσκευών που χρησιμοποιούνται για υποβολή φορμών
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                {filteredDeviceData && filteredDeviceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={filteredDeviceData.reduce((acc, curr) => {
                          const existing = acc.find(item => item.deviceType === curr.deviceType);
                          if (existing) {
                            existing.count += curr.count;
                          } else {
                            acc.push({
                              deviceType: curr.deviceType,
                              count: curr.count,
                              percentage: 0 // Will be calculated below
                            });
                          }
                          return acc;
                        }, [] as any[]).map(item => {
                          const total = filteredDeviceData.reduce((sum, curr) => sum + curr.count, 0);
                          return {
                            ...item,
                            percentage: item.count / total
                          };
                        })}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="deviceType"
                        label={({ deviceType, percentage }) => 
                          `${deviceType}: ${formatPercentage(percentage)}`
                        }
                      >
                        {filteredDeviceData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name, props) => [
                          `${value} (${formatPercentage(props.payload.percentage)})`,
                          name
                        ]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <p className="text-gray-500">
                      Δεν υπάρχουν διαθέσιμα δεδομένα για την επιλεγμένη περίοδο
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Κατανομή Προγραμμάτων Περιήγησης</CardTitle>
                <CardDescription>
                  Browser που χρησιμοποιούνται για υποβολή φορμών
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                {filteredDeviceData && filteredDeviceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={filteredDeviceData.reduce((acc, curr) => {
                          const existing = acc.find(item => item.browser === curr.browser);
                          if (existing) {
                            existing.count += curr.count;
                          } else {
                            acc.push({
                              browser: curr.browser,
                              count: curr.count,
                              percentage: 0 // Will be calculated below
                            });
                          }
                          return acc;
                        }, [] as any[]).map(item => {
                          const total = filteredDeviceData.reduce((sum, curr) => sum + curr.count, 0);
                          return {
                            ...item,
                            percentage: item.count / total
                          };
                        })}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="browser"
                        label={({ browser, percentage }) => 
                          `${browser}: ${formatPercentage(percentage)}`
                        }
                      >
                        {filteredDeviceData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[(index + 3) % COLORS.length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name, props) => [
                          `${value} (${formatPercentage(props.payload.percentage)})`,
                          name
                        ]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <p className="text-gray-500">
                      Δεν υπάρχουν διαθέσιμα δεδομένα για την επιλεγμένη περίοδο
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="time-patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Κατανομή Υποβολών ανά Ώρα</CardTitle>
              <CardDescription>
                Πότε υποβάλλονται οι φόρμες κατά τη διάρκεια της ημέρας
              </CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              {segmentData.timeOfDayData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={segmentData.timeOfDayData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="hour" 
                      tickFormatter={(hour) => `${hour}:00`}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [value, 'Υποβολές']}
                      labelFormatter={(hour) => `Ώρα: ${hour}:00`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#8884d8" 
                      name="Συνολικές Υποβολές" 
                      strokeWidth={2}
                    />
                    {primarySegment !== 'all' && (
                      <Line
                        type="monotone"
                        dataKey={`customerTypes.${segmentData.customerTypeData.findIndex(
                          t => t.type === primarySegment
                        )}.count`}
                        stroke="#82ca9d"
                        name={`Υποβολές: ${primarySegment}`}
                        strokeWidth={2}
                      />
                    )}
                    {comparisonSegment !== 'none' && (
                      <Line
                        type="monotone"
                        dataKey={`customerTypes.${segmentData.customerTypeData.findIndex(
                          t => t.type === comparisonSegment
                        )}.count`}
                        stroke="#ffc658"
                        name={`Υποβολές: ${comparisonSegment}`}
                        strokeWidth={2}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <p className="text-gray-500">
                    Δεν υπάρχουν διαθέσιμα δεδομένα για την επιλεγμένη περίοδο
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Σύγκριση Τμημάτων Πελατών</CardTitle>
              <CardDescription>
                Συγκριτική ανάλυση βασικών μετρικών ανά τύπο πελάτη
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-[400px]">
              {segmentData.comparisonData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={segmentData.comparisonData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="metric" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {segmentData.customerTypeData.map((type, index) => (
                      <Bar 
                        key={type.type}
                        dataKey={`values.${index}.value`} 
                        fill={COLORS[index % COLORS.length]} 
                        name={type.type}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-64">
                  <p className="text-gray-500">
                    Δεν υπάρχουν διαθέσιμα δεδομένα για την επιλεγμένη περίοδο
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerSegmentAnalytics; 