import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import DatabasePerformanceService, { 
  DatabasePerformanceReport, 
  OptimizationSuggestion, 
  QueryPerformanceMetrics, 
  TableMetrics 
} from '@/services/monitoring/databasePerformanceService';

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28BFF'];

interface TimeRangeOption {
  label: string;
  value: string;
  from: string;
  to: string;
}

/**
 * Database Performance Dashboard Component
 * Displays comprehensive metrics for database performance
 */
const DatabasePerformanceDashboard: React.FC = () => {
  // Time range options for filtering
  const timeRangeOptions: TimeRangeOption[] = [
    { 
      label: 'Last 24 hours', 
      value: '24h',
      from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      to: new Date().toISOString()
    },
    { 
      label: 'Last 7 days', 
      value: '7d',
      from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      to: new Date().toISOString()
    },
    { 
      label: 'Last 30 days', 
      value: '30d',
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      to: new Date().toISOString()
    }
  ];

  // State variables
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRangeOption>(timeRangeOptions[0]);
  const [performanceReport, setPerformanceReport] = useState<DatabasePerformanceReport | null>(null);
  const [optimizationSuggestions, setOptimizationSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [error, setError] = useState<string | null>(null);

  // Load data on component mount and when time range changes
  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Get database performance report
        const timeRange = {
          from: selectedTimeRange.from,
          to: selectedTimeRange.to
        };
        
        const report = await DatabasePerformanceService.getDatabasePerformanceReport(timeRange);
        setPerformanceReport(report);
        
        // Get optimization suggestions
        const suggestions = await DatabasePerformanceService.getOptimizationSuggestions();
        setOptimizationSuggestions(suggestions);
      } catch (error) {
        console.error('Error loading database performance data:', error);
        setError('Failed to load database performance data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadDashboardData();
  }, [selectedTimeRange]);

  // Handle time range change
  const handleTimeRangeChange = (value: string) => {
    const selected = timeRangeOptions.find(option => option.value === value);
    if (selected) {
      setSelectedTimeRange(selected);
    }
  };

  // Handle refresh button click
  const handleRefresh = () => {
    // Reset time range to trigger data reload
    const currentRange = { ...selectedTimeRange };
    setSelectedTimeRange(currentRange);
  };

  // Format file size (bytes to MB or GB)
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } else {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
  };

  // Get badge color based on priority
  const getPriorityBadgeColor = (priority: string): string => {
    switch (priority.toLowerCase()) {
      case 'critical':
        return 'bg-red-500 hover:bg-red-600';
      case 'high':
        return 'bg-orange-500 hover:bg-orange-600';
      case 'medium':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'low':
        return 'bg-green-500 hover:bg-green-600';
      default:
        return 'bg-blue-500 hover:bg-blue-600';
    }
  };

  // Calculate overall performance score (0-100)
  const calculatePerformanceScore = (): number => {
    if (!performanceReport) return 0;
    
    let score = 100;
    
    // Deduct for slow average query time
    if (performanceReport.avgQueryTime > 1000) {
      score -= 20;
    } else if (performanceReport.avgQueryTime > 500) {
      score -= 10;
    } else if (performanceReport.avgQueryTime > 200) {
      score -= 5;
    }
    
    // Deduct for high connection pool utilization
    if (performanceReport.connectionPoolUtilization > 90) {
      score -= 15;
    } else if (performanceReport.connectionPoolUtilization > 80) {
      score -= 10;
    } else if (performanceReport.connectionPoolUtilization > 70) {
      score -= 5;
    }
    
    // Deduct for transaction failures
    if (performanceReport.transactionSuccess < 90) {
      score -= 15;
    } else if (performanceReport.transactionSuccess < 95) {
      score -= 10;
    } else if (performanceReport.transactionSuccess < 99) {
      score -= 5;
    }
    
    // Deduct for unused indexes
    if (performanceReport.unusedIndexes && performanceReport.unusedIndexes.length > 5) {
      score -= 10;
    } else if (performanceReport.unusedIndexes && performanceReport.unusedIndexes.length > 2) {
      score -= 5;
    }
    
    // Deduct for inefficient queries
    if (performanceReport.inefficientQueries && performanceReport.inefficientQueries.length > 5) {
      score -= 15;
    } else if (performanceReport.inefficientQueries && performanceReport.inefficientQueries.length > 2) {
      score -= 8;
    }
    
    return Math.max(0, Math.min(100, score));
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-lg">Loading database performance data...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Determine performance score color
  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Database Performance Dashboard</h1>
        
        <div className="flex items-center space-x-4">
          <Select
            value={selectedTimeRange.value}
            onValueChange={handleTimeRangeChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              {timeRangeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={handleRefresh}>
            Refresh
          </Button>
        </div>
      </div>

      {performanceReport && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle>Database Health Score</CardTitle>
            <CardDescription>Overall database performance based on multiple metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className={`text-5xl font-bold ${getScoreColor(calculatePerformanceScore())}`}>
                {calculatePerformanceScore()}
              </div>
              <div className="text-right">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Query Time</p>
                    <p className="text-xl">{performanceReport.avgQueryTime.toFixed(2)} ms</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pool Utilization</p>
                    <p className="text-xl">{performanceReport.connectionPoolUtilization.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Transaction Success</p>
                    <p className="text-xl">{performanceReport.transactionSuccess.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Database Size</p>
                    <p className="text-xl">{formatFileSize(performanceReport.totalDatabaseSize)}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="queries">Queries</TabsTrigger>
          <TabsTrigger value="tables">Tables</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {performanceReport && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Query Performance Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Query Performance</CardTitle>
                  <CardDescription>Query execution time percentiles</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'p50', value: performanceReport.queryTimePercentiles?.p50 || 0 },
                          { name: 'p90', value: performanceReport.queryTimePercentiles?.p90 || 0 },
                          { name: 'p95', value: performanceReport.queryTimePercentiles?.p95 || 0 },
                          { name: 'p99', value: performanceReport.queryTimePercentiles?.p99 || 0 }
                        ]}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip formatter={(value) => `${value} ms`} />
                        <Bar dataKey="value" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Connection Pool Utilization */}
              <Card>
                <CardHeader>
                  <CardTitle>Connection Pool Utilization</CardTitle>
                  <CardDescription>Active connections relative to max capacity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Active', value: performanceReport.connectionPoolUtilization },
                            { name: 'Available', value: 100 - performanceReport.connectionPoolUtilization }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        >
                          {[0, 1].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Transaction Success Rate */}
              <Card>
                <CardHeader>
                  <CardTitle>Transaction Success Rate</CardTitle>
                  <CardDescription>Percentage of successful database transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Success', value: performanceReport.transactionSuccess },
                            { name: 'Failure', value: 100 - performanceReport.transactionSuccess }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        >
                          <Cell fill="#4ade80" />
                          <Cell fill="#f87171" />
                        </Pie>
                        <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Database Size Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Database Size Distribution</CardTitle>
                  <CardDescription>Top tables by size</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={performanceReport.largestTables?.slice(0, 5).map(table => ({
                          name: table.tableName.split('.').pop(),
                          tableSize: table.tableSize,
                          indexSize: table.indexSize
                        })) || []}
                        margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" />
                        <Tooltip formatter={(value) => formatFileSize(value as number)} />
                        <Legend />
                        <Bar dataKey="tableSize" name="Table Size" stackId="a" fill="#8884d8" />
                        <Bar dataKey="indexSize" name="Index Size" stackId="a" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="queries">
          {performanceReport?.slowestQueries && (
            <Card>
              <CardHeader>
                <CardTitle>Slowest Queries</CardTitle>
                <CardDescription>Top 10 queries by execution time</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Query</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Execution Time</TableHead>
                      <TableHead>Rows</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {performanceReport.slowestQueries.map((query) => (
                      <TableRow key={query.queryId}>
                        <TableCell className="font-mono text-xs" style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {query.query}
                        </TableCell>
                        <TableCell>{query.source || 'Unknown'}</TableCell>
                        <TableCell className={query.executionTime > 1000 ? 'text-red-600' : (query.executionTime > 500 ? 'text-yellow-600' : 'text-green-600')}>
                          {query.executionTime.toFixed(2)} ms
                        </TableCell>
                        <TableCell>{query.rowCount}</TableCell>
                        <TableCell>
                          {query.success ? (
                            <Badge variant="outline" className="bg-green-100 text-green-800">Success</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-100 text-red-800">Failed</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {performanceReport?.inefficientQueries && performanceReport.inefficientQueries.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Inefficient Queries</CardTitle>
                <CardDescription>Queries that could benefit from optimization</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Query</TableHead>
                      <TableHead>Execution Time</TableHead>
                      <TableHead>Rows</TableHead>
                      <TableHead>Issue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {performanceReport.inefficientQueries.map((query) => (
                      <TableRow key={query.queryId}>
                        <TableCell className="font-mono text-xs" style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {query.query}
                        </TableCell>
                        <TableCell className="text-red-600">
                          {query.executionTime.toFixed(2)} ms
                        </TableCell>
                        <TableCell>{query.rowCount}</TableCell>
                        <TableCell>
                          {query.queryPlan && query.queryPlan.toString().includes('Seq Scan') ? (
                            <Badge variant="outline" className="bg-red-100 text-red-800">Sequential Scan</Badge>
                          ) : query.queryPlan && query.queryPlan.toString().includes('Nested Loop') ? (
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Nested Loop</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-orange-100 text-orange-800">Inefficient Join</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tables">
          {performanceReport?.largestTables && (
            <Card>
              <CardHeader>
                <CardTitle>Table Statistics</CardTitle>
                <CardDescription>Size and row count of database tables</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Table Name</TableHead>
                      <TableHead>Rows</TableHead>
                      <TableHead>Table Size</TableHead>
                      <TableHead>Index Size</TableHead>
                      <TableHead>Last Vacuum</TableHead>
                      <TableHead>Last Analyze</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {performanceReport.largestTables.map((table) => (
                      <TableRow key={table.tableName}>
                        <TableCell className="font-medium">{table.tableName}</TableCell>
                        <TableCell>{table.rowCount.toLocaleString()}</TableCell>
                        <TableCell>{formatFileSize(table.tableSize)}</TableCell>
                        <TableCell>{formatFileSize(table.indexSize)}</TableCell>
                        <TableCell>
                          {table.lastVacuum ? new Date(table.lastVacuum).toLocaleString() : 'Never'}
                        </TableCell>
                        <TableCell>
                          {table.lastAnalyze ? new Date(table.lastAnalyze).toLocaleString() : 'Never'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {performanceReport?.unusedIndexes && performanceReport.unusedIndexes.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Unused Indexes</CardTitle>
                <CardDescription>Indexes with no scans that may be candidates for removal</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Index Name</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>Index Size</TableHead>
                      <TableHead>Scans</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {performanceReport.unusedIndexes.map((index) => (
                      <TableRow key={index.indexName}>
                        <TableCell className="font-medium">{index.indexName}</TableCell>
                        <TableCell>{index.tableName}</TableCell>
                        <TableCell>{formatFileSize(index.indexSize)}</TableCell>
                        <TableCell className="text-red-600">{index.scans}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="optimization">
          {optimizationSuggestions.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Optimization Suggestions</CardTitle>
                <CardDescription>Recommendations to improve database performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {optimizationSuggestions.map((suggestion, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge className={getPriorityBadgeColor(suggestion.priority)}>
                            {suggestion.priority.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">{suggestion.type}</Badge>
                        </div>
                        {suggestion.tableName && (
                          <div className="text-sm text-muted-foreground">
                            Table: {suggestion.tableName}
                          </div>
                        )}
                      </div>
                      <h3 className="text-lg font-bold mt-2">{suggestion.description}</h3>
                      <p className="text-muted-foreground my-1">{suggestion.suggestion}</p>
                      <div className="mt-2">
                        <span className="text-sm font-medium">Expected Impact:</span>
                        <span className="text-sm ml-2">{suggestion.impact}</span>
                      </div>
                      {suggestion.currentMetric !== undefined && suggestion.targetMetric !== undefined && (
                        <div className="mt-1">
                          <span className="text-sm font-medium">Current: </span>
                          <span className="text-sm">{suggestion.currentMetric.toFixed(2)}</span>
                          <span className="text-sm mx-2">→</span>
                          <span className="text-sm font-medium">Target: </span>
                          <span className="text-sm">{suggestion.targetMetric.toFixed(2)}</span>
                        </div>
                      )}
                      {suggestion.query && (
                        <pre className="bg-gray-100 p-2 rounded mt-2 overflow-x-auto text-xs">
                          {suggestion.query}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Optimization Suggestions</CardTitle>
                <CardDescription>Recommendations to improve database performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <p className="text-lg text-muted-foreground">No optimization suggestions available</p>
                  <p className="text-sm text-muted-foreground mt-1">Your database appears to be optimized!</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DatabasePerformanceDashboard; 