import React, { useState, useEffect } from 'react';
import { auditTrailService, AuditActionType, AuditSeverity } from '@/services/auditTrailService';
import { Card } from '@/components/ui/Card';
import { AuditTrailFiltersState } from './AuditTrailDashboard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { actionTypeLabels, severityLabels } from '@/utils/auditTrailUtils';

interface AuditTrailStatsProps {
  filters: AuditTrailFiltersState;
  loading: boolean;
}

const AuditTrailStats: React.FC<AuditTrailStatsProps> = ({ filters, loading }) => {
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>({
    totalCount: 0,
    actionTypeCounts: {},
    severityCounts: {},
    userCounts: {},
    hourlyDistribution: {},
    recentTrends: {}
  });

  // Fetch statistics based on current filters
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        setError(null);
        
        // This would be a real API call in a production implementation
        // For now, we'll simulate some statistics
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data
        setStats({
          totalCount: 1248,
          actionTypeCounts: {
            [AuditActionType.USER_LOGIN]: 342,
            [AuditActionType.FORM_SUBMITTED]: 156,
            [AuditActionType.FORM_APPROVED]: 128,
            [AuditActionType.FORM_REJECTED]: 14,
            [AuditActionType.CUSTOMER_CREATED]: 76,
            [AuditActionType.CUSTOMER_UPDATED]: 124,
            [AuditActionType.FORM_LINK_CREATED]: 89,
            [AuditActionType.FORM_LINK_SENT]: 85,
            [AuditActionType.OFFER_CREATED_FROM_FORM]: 67,
            [AuditActionType.SECURITY_ERROR]: 8
          },
          severityCounts: {
            [AuditSeverity.INFO]: 986,
            [AuditSeverity.WARNING]: 198,
            [AuditSeverity.ERROR]: 56,
            [AuditSeverity.CRITICAL]: 8
          },
          userCounts: {
            "user1": { name: "Γιώργος Παπαδόπουλος", count: 342 },
            "user2": { name: "Μαρία Κωνσταντίνου", count: 298 },
            "user3": { name: "Δημήτρης Αλεξίου", count: 276 },
            "system": { name: "Σύστημα", count: 332 }
          },
          hourlyDistribution: {
            "8": 56, "9": 124, "10": 156, "11": 176, 
            "12": 98, "13": 45, "14": 67, "15": 145,
            "16": 187, "17": 164, "18": 30
          },
          recentTrends: {
            last24Hours: 156,
            previousDay: 143,
            changePercentage: 9.1,
            trend: "up"
          }
        });
      } catch (err: any) {
        console.error('Error fetching audit stats:', err);
        setError(err.message || 'Σφάλμα κατά την ανάκτηση των στατιστικών στοιχείων');
      } finally {
        setStatsLoading(false);
      }
    };
    
    fetchStats();
  }, [filters]);

  if (loading || statsLoading) {
    return (
      <Card className="p-8 flex justify-center items-center min-h-[300px]">
        <LoadingSpinner size="lg" />
      </Card>
    );
  }

  if (error) {
    return (
      <ErrorDisplay message={error} />
    );
  }

  // Sort action types by count
  const sortedActionTypes = Object.entries(stats.actionTypeCounts)
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">Συνολικές Καταγραφές</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">{stats.totalCount}</p>
          <div className="mt-2 text-sm text-gray-600">
            <span className={stats.recentTrends.trend === "up" ? "text-green-600" : "text-red-600"}>
              {stats.recentTrends.trend === "up" ? "+" : "-"}{stats.recentTrends.changePercentage}%
            </span>
            {' '}από χθες
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">Τελευταίες 24 Ώρες</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">{stats.recentTrends.last24Hours}</p>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">Κρίσιμα Συμβάντα</h3>
          <p className="text-3xl font-bold text-red-600 mt-2">{stats.severityCounts[AuditSeverity.CRITICAL] || 0}</p>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">Σφάλματα</h3>
          <p className="text-3xl font-bold text-orange-500 mt-2">{stats.severityCounts[AuditSeverity.ERROR] || 0}</p>
        </Card>
      </div>

      {/* Charts and Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Actions */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Κορυφαίες Ενέργειες</h3>
          <div className="space-y-4">
            {sortedActionTypes.map(([type, count]: [string, any]) => (
              <div key={type} className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {actionTypeLabels[type as AuditActionType] || type}
                    </span>
                    <span className="text-sm text-gray-500">{count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(count / stats.totalCount) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Severity Distribution */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Κατανομή Επιπέδου Σοβαρότητας</h3>
          <div className="flex flex-col space-y-4">
            {Object.entries(stats.severityCounts).map(([severity, count]: [string, any]) => {
              const percentage = Math.round((count / stats.totalCount) * 100);
              const severityInfo = severityLabels[severity as AuditSeverity];
              const bgColor = severityInfo?.bgColor || 'bg-gray-100';
              const textColor = severityInfo?.textColor || 'text-gray-700';
              
              return (
                <div key={severity} className="space-y-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-sm font-medium ${textColor}`}>
                      {severityInfo?.label || severity}
                    </span>
                    <span className="text-sm text-gray-500">{count} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`${bgColor} h-2 rounded-full`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Top Users */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Κορυφαίοι Χρήστες</h3>
          <div className="space-y-4">
            {Object.entries(stats.userCounts)
              .sort(([, a]: [string, any], [, b]: [string, any]) => b.count - a.count)
              .slice(0, 5)
              .map(([userId, data]: [string, any]) => (
                <div key={userId} className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">{data.name}</span>
                  <span className="text-sm text-gray-500">{data.count} ενέργειες</span>
                </div>
              ))}
          </div>
        </Card>

        {/* Hourly Distribution */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Κατανομή ανά Ώρα</h3>
          <div className="h-40 flex items-end justify-between">
            {Object.entries(stats.hourlyDistribution)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([hour, count]: [string, any]) => {
                const maxCount = Math.max(...Object.values(stats.hourlyDistribution) as number[]);
                const percentage = (count / maxCount) * 100;
                
                return (
                  <div key={hour} className="flex flex-col items-center">
                    <div 
                      className="w-8 bg-blue-500 rounded-t"
                      style={{ height: `${percentage}%` }}
                    ></div>
                    <span className="text-xs text-gray-500 mt-1">{hour}:00</span>
                  </div>
                );
              })}
          </div>
        </Card>
      </div>

      {/* Note: The actual implementation would include proper charts with ChartJS or similar */}
      <p className="text-center text-gray-500 text-sm italic">
        Σημείωση: Αυτή είναι μια απλοποιημένη έκδοση του dashboard στατιστικών. 
        Η πλήρης υλοποίηση θα περιλαμβάνει διαδραστικά γραφήματα και αναλυτικά στατιστικά.
      </p>
    </div>
  );
};

export default AuditTrailStats; 