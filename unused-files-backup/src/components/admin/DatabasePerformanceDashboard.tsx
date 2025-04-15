import React, { useState, useEffect } from 'react';
import { 
  DatabasePerformanceService,
  generatePerformanceReport 
} from '@/services/monitoring';
import { OptimizationSuggestion, TableStatistics, ConnectionPoolStats } from '@/services/monitoring/databasePerformanceService';
import { supabase } from '@/lib/supabaseClient';
import QueryOptimizationList from './QueryOptimizationCard';

/**
 * DatabasePerformanceDashboard Component
 * 
 * Displays database performance metrics and query optimization suggestions
 */
export default function DatabasePerformanceDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [tableStats, setTableStats] = useState<TableStatistics[]>([]);
  const [poolStats, setPoolStats] = useState<ConnectionPoolStats | null>(null);
  const [slowQueries, setSlowQueries] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'optimize' | 'tables' | 'queries'>('overview');
  const [executionLog, setExecutionLog] = useState<{
    id: string;
    created_at: string;
    executed_by: string;
    sql_query: string;
    success: boolean;
    result_message: string | null;
  }[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toLocaleString('el-GR'));
  
  // Load data on component mount
  useEffect(() => {
    loadPerformanceData();
    loadExecutionLog();
  }, []);
  
  // Load performance data
  const loadPerformanceData = async () => {
    try {
      setIsLoading(true);
      const report = await generatePerformanceReport();
      
      setSuggestions(report.optimizationSuggestions);
      setTableStats(report.tableStatistics);
      setPoolStats(report.connectionPoolStatistics);
      setSlowQueries(report.slowQueries);
      setError(null);
      setLastRefreshed(new Date().toLocaleString('el-GR'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Σφάλμα φόρτωσης δεδομένων απόδοσης');
      console.error('Error loading performance data:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load SQL execution log
  const loadExecutionLog = async () => {
    try {
      // Skip execution log loading for now - we'll implement it after the SQL view is created
      // This component will still work without the execution log
      /*
      const { data, error } = await fetch('/api/admin/sql-execution-log')
        .then(res => res.json());
      
      if (error) {
        console.error('Error loading execution log:', error);
      } else if (data) {
        setExecutionLog(data);
      }
      */
    } catch (err) {
      console.error('Error fetching execution log:', err);
    }
  };
  
  // Format time in milliseconds to a human-readable string
  const formatTime = (ms: number) => {
    if (ms < 1) return '<1ms';
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };
  
  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-orange-500';
      case 'low': return 'text-blue-500';
      default: return 'text-gray-700';
    }
  };
  
  // Get suggestion type icon
  const getSuggestionTypeIcon = (type: string) => {
    switch (type) {
      case 'index': return '📇';
      case 'query': return '🔍';
      case 'table': return '📊';
      case 'transaction': return '🔄';
      case 'configuration': return '⚙️';
      default: return '💡';
    }
  };
  
  // Handle refresh operation
  const handleRefresh = () => {
    loadPerformanceData();
    loadExecutionLog();
  };
  
  // Handle reset monitoring
  const handleResetMonitoring = async () => {
    try {
      setIsLoading(true);
      // Use type assertion to bypass TypeScript's constraint on RPC functions
      // @ts-ignore - This RPC function exists in the database but isn't typed in the schema
      const { data, error } = await supabase.rpc('reset_and_start_monitoring');
      
      if (error) {
        setError('Αποτυχία επαναφοράς παρακολούθησης: ' + error.message);
        console.error('Error resetting monitoring:', error);
      } else {
        handleRefresh();
      }
    } catch (err) {
      setError('Αποτυχία επαναφοράς παρακολούθησης');
      console.error('Error resetting monitoring:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Render tab navigation
  const renderTabNavigation = () => (
    <div className="mb-6 border-b border-gray-200">
      <nav className="-mb-px flex space-x-8">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-4 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'overview'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Επισκόπηση
        </button>
        <button
          onClick={() => setActiveTab('optimize')}
          className={`py-4 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'optimize'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Βελτιστοποίηση
          {suggestions.length > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800">
              {suggestions.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('tables')}
          className={`py-4 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'tables'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Πίνακες
        </button>
        <button
          onClick={() => setActiveTab('queries')}
          className={`py-4 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'queries'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Αργά Ερωτήματα
          {slowQueries.length > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-800">
              {slowQueries.length}
            </span>
          )}
        </button>
      </nav>
    </div>
  );
  
  // Render connection pool stats
  const renderConnectionPoolStats = () => (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Κατάσταση Σύνδεσης</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-500">Ενεργές Συνδέσεις</p>
          <p className="text-2xl font-bold">{poolStats?.activeConnections || 0}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-500">Αδρανείς Συνδέσεις</p>
          <p className="text-2xl font-bold">{poolStats?.idleConnections || 0}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-500">Συνολικές Συνδέσεις</p>
          <p className="text-2xl font-bold">
            {poolStats ? `${poolStats.totalConnections} / ${poolStats.maxConnections}` : '0 / 0'}
          </p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-500">Ποσοστό Χρήσης</p>
          <div className="flex items-center">
            <p className="text-2xl font-bold">
              {poolStats ? `${poolStats.utilizationPercentage.toFixed(1)}%` : '0%'}
            </p>
            <div className="ml-2 w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full ${
                  poolStats && poolStats.utilizationPercentage > 80 ? 'bg-red-600' : 
                  poolStats && poolStats.utilizationPercentage > 50 ? 'bg-yellow-400' : 'bg-green-500'
                }`} 
                style={{ width: `${poolStats ? Math.min(100, poolStats.utilizationPercentage) : 0}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  
  // Render execution log
  const renderExecutionLog = () => (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Πρόσφατες Εκτελέσεις SQL</h2>
      {executionLog.length === 0 ? (
        <p className="text-gray-500 italic">Δεν βρέθηκαν πρόσφατες εκτελέσεις.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ημερομηνία</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Χρήστης</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ερώτημα</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Αποτέλεσμα</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {executionLog.map((log, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(log.created_at).toLocaleString('el-GR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.executed_by}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-900 truncate max-w-md">
                    {log.sql_query}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      log.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {log.success ? 'Επιτυχία' : 'Αποτυχία'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
  
  // Render stats cards
  const renderStatsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium">Επίδοση Ερωτημάτων</h3>
        </div>
        <div className="text-3xl font-bold mb-2">
          {slowQueries.length > 0 
            ? formatTime(slowQueries.reduce((sum, q) => sum + q.stats.averageExecutionTime, 0) / slowQueries.length) 
            : '0ms'}
        </div>
        <p className="text-sm text-gray-500">Μέσος χρόνος εκτέλεσης ερωτημάτων</p>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
            </svg>
          </div>
          <h3 className="text-lg font-medium">Πίνακες Βάσης</h3>
        </div>
        <div className="text-3xl font-bold mb-2">{tableStats.length}</div>
        <p className="text-sm text-gray-500">Συνολικοί πίνακες στη βάση δεδομένων</p>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <div className="p-3 rounded-full bg-red-100 text-red-600 mr-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium">Προτάσεις Βελτιστοποίησης</h3>
        </div>
        <div className="text-3xl font-bold mb-2">{suggestions.length}</div>
        <p className="text-sm text-gray-500">Σύνολο προτάσεων βελτιστοποίησης</p>
      </div>
    </div>
  );
  
  // Render optimization suggestions table - legacy version
  const renderSuggestionsTable = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Προτάσεις Βελτιστοποίησης</h2>
      {suggestions.length === 0 ? (
        <p className="text-gray-500 italic">Δεν βρέθηκαν προτάσεις βελτιστοποίησης.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Τύπος</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Προτεραιότητα</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Πρόταση</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Λογική</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Πιθανή Βελτίωση</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {suggestions.map((suggestion, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="mr-2">{getSuggestionTypeIcon(suggestion.type)}</span>
                    {suggestion.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(suggestion.priority)}`}>
                      {suggestion.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{suggestion.suggestion}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{suggestion.rationale}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{suggestion.potentialImprovement}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
  
  // Render slow queries
  const renderSlowQueries = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Αργά Ερωτήματα</h2>
      {slowQueries.length === 0 ? (
        <p className="text-gray-500 italic">Δεν βρέθηκαν αργά ερωτήματα.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ερώτημα</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Μέσος Χρόνος</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Μέγιστος Χρόνος</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Εκτελέσεις</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {slowQueries.map((query, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono text-gray-900 truncate max-w-md">
                    {query.query}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatTime(query.stats.averageExecutionTime)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatTime(query.stats.maxExecutionTime)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {query.stats.totalExecutions}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
  
  // Render table stats
  const renderTableStats = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Στατιστικά Πινάκων</h2>
      {tableStats.length === 0 ? (
        <p className="text-gray-500 italic">Δεν βρέθηκαν στατιστικά πινάκων.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Πίνακας</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Εγγραφές</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Μέγεθος</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Τελευταία Ανάλυση</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tableStats.map((table, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {table.tableName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {table.rowCount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {table.estimatedSize}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {table.lastAnalyzed 
                      ? new Date(table.lastAnalyzed).toLocaleString('el-GR')
                      : 'Ποτέ'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
  
  // Render action buttons
  const renderActionButtons = () => (
    <div className="flex justify-between items-center mt-6">
      <div className="text-sm text-gray-500">
        Τελευταία ανανέωση: {lastRefreshed}
      </div>
      <div className="flex space-x-4">
        <button 
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Ανανέωση...
            </span>
          ) : (
            'Ανανέωση Δεδομένων'
          )}
        </button>
        <button 
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
          onClick={handleResetMonitoring}
          disabled={isLoading}
        >
          Επαναφορά Παρακολούθησης
        </button>
      </div>
    </div>
  );
  
  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <>
            {renderStatsCards()}
            {poolStats && renderConnectionPoolStats()}
            {renderExecutionLog()}
          </>
        );
      case 'optimize':
        return <QueryOptimizationList suggestions={suggestions} onRefresh={handleRefresh} />;
      case 'tables':
        return renderTableStats();
      case 'queries':
        return renderSlowQueries();
      default:
        return null;
    }
  };
  
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Απόδοση Βάσης Δεδομένων</h1>
      
      {isLoading && !error ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <p>{error}</p>
          <button 
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            onClick={handleRefresh}
          >
            Επαναφόρτωση
          </button>
        </div>
      ) : (
        <div>
          {renderTabNavigation()}
          {renderTabContent()}
          {renderActionButtons()}
        </div>
      )}
    </div>
  );
} 