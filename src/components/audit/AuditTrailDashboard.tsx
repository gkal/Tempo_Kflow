import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { AuditActionType, AuditSeverity, auditTrailService } from '@/services/auditTrailService';
import { checkUserPermission } from '@/services/sessionService';
import AuditTrailFilters from './AuditTrailFilters';
import AuditTrailsList from './AuditTrailsList';
import AuditTrailDetail from './AuditTrailDetail';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { saveAs } from 'file-saver';
import AuditTrailStats from './AuditTrailStats';
import AuditTrailTimeline from './AuditTrailTimeline';
import AccessDeniedPage from '@/components/ui/AccessDeniedPage';

// Types
export interface AuditTrailFiltersState {
  actionTypes: AuditActionType[];
  userId: string | null;
  targetType: string | null;
  targetId: string | null;
  dateFrom: Date | null;
  dateTo: Date | null;
  severities: AuditSeverity[];
  tags: string[];
  search: string;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

/**
 * AuditTrailDashboard - Main component for viewing and filtering audit trails
 */
const AuditTrailDashboard: React.FC = () => {
  // Permission state
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  // Component state
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [auditTrails, setAuditTrails] = useState<any[]>([]);
  const [selectedTrailId, setSelectedTrailId] = useState<string | null>(null);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>('list');
  
  // Filters and pagination state
  const [filters, setFilters] = useState<AuditTrailFiltersState>({
    actionTypes: [],
    userId: null,
    targetType: null,
    targetId: null,
    dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    dateTo: new Date(),
    severities: [],
    tags: [],
    search: ''
  });
  
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 50,
    sortBy: 'timestamp',
    sortDirection: 'desc'
  });
  
  const router = useRouter();
  
  // Check permissions on mount
  useEffect(() => {
    const checkPermission = async () => {
      try {
        const hasAuditPermission = await checkUserPermission('view_audit_trails');
        setHasPermission(hasAuditPermission);
        
        // If user has permission, load audit trails
        if (hasAuditPermission) {
          fetchAuditTrails();
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Error checking permissions:', err);
        setError('Σφάλμα κατά τον έλεγχο δικαιωμάτων');
        setLoading(false);
      }
    };
    
    checkPermission();
  }, []);
  
  // Fetch audit trails when filters or pagination change
  useEffect(() => {
    if (hasPermission) {
      fetchAuditTrails();
    }
  }, [filters, pagination, hasPermission]);
  
  // Load audit trail from URL param if present
  useEffect(() => {
    const { trailId } = router.query;
    if (trailId && typeof trailId === 'string') {
      setSelectedTrailId(trailId);
      setActiveTab('detail');
    }
  }, [router.query]);
  
  // Fetch audit trails based on current filters and pagination
  const fetchAuditTrails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await auditTrailService.getAuditTrails(filters, pagination);
      
      setAuditTrails(result.records);
      setTotalRecords(result.total);
    } catch (err: any) {
      console.error('Error fetching audit trails:', err);
      setError(err.message || 'Σφάλμα κατά την ανάκτηση των καταγραφών ελέγχου');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<AuditTrailFiltersState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page on filter change
  };
  
  // Handle pagination changes
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };
  
  // Handle sort changes
  const handleSortChange = (sortBy: string, sortDirection: 'asc' | 'desc') => {
    setPagination(prev => ({ ...prev, sortBy, sortDirection }));
  };
  
  // Handle audit trail selection
  const handleSelectTrail = (id: string) => {
    setSelectedTrailId(id);
    setActiveTab('detail');
    
    // Update URL with selected trail ID
    router.push({
      pathname: router.pathname,
      query: { ...router.query, trailId: id }
    }, undefined, { shallow: true });
  };
  
  // Handle back button from detail view
  const handleBackToList = () => {
    setSelectedTrailId(null);
    setActiveTab('list');
    
    // Remove trail ID from URL
    const { trailId, ...restQuery } = router.query;
    router.push({
      pathname: router.pathname,
      query: restQuery
    }, undefined, { shallow: true });
  };
  
  // Export audit trails as CSV
  const handleExportCSV = async () => {
    try {
      setLoading(true);
      
      // Get all trails matching current filters (up to 10,000)
      const allTrailsFilter = { ...filters };
      const allTrailsPagination = { 
        page: 1, 
        pageSize: 10000, 
        sortBy: pagination.sortBy, 
        sortDirection: pagination.sortDirection 
      };
      
      const result = await auditTrailService.getAuditTrails(allTrailsFilter, allTrailsPagination);
      
      // Convert to CSV
      const headers = [
        'ID', 'Action Type', 'User ID', 'Timestamp', 'Description', 
        'Severity', 'Target Type', 'Target ID', 'IP Address', 'Tags'
      ];
      
      const rows = result.records.map(trail => [
        trail.id,
        trail.action_type,
        trail.user_id || '',
        format(new Date(trail.timestamp), 'yyyy-MM-dd HH:mm:ss'),
        trail.description,
        trail.severity,
        trail.target_type || '',
        trail.target_id || '',
        trail.ip_address || '',
        (trail.tags || []).join(', ')
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      
      // Download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const filename = `audit-trails-export-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
      saveAs(blob, filename);
    } catch (err: any) {
      console.error('Error exporting audit trails:', err);
      setError(err.message || 'Σφάλμα κατά την εξαγωγή των καταγραφών ελέγχου');
    } finally {
      setLoading(false);
    }
  };
  
  // If permission check is in progress
  if (hasPermission === null) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  // If user doesn't have permission
  if (hasPermission === false) {
    return <AccessDeniedPage message="Δεν έχετε δικαίωμα πρόσβασης στο σύστημα καταγραφής ενεργειών" />;
  }
  
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Σύστημα Καταγραφής Ενεργειών</h1>
          <p className="text-gray-600">Παρακολούθηση και αναζήτηση όλων των ενεργειών στο σύστημα</p>
        </div>
        
        <div className="flex gap-2 mt-2 sm:mt-0">
          <Button 
            onClick={handleExportCSV} 
            variant="outline" 
            disabled={loading}
          >
            Εξαγωγή σε CSV
          </Button>
        </div>
      </div>
      
      {error && (
        <ErrorDisplay 
          message={error} 
          onClose={() => setError(null)} 
          className="mb-4"
        />
      )}
      
      <Card className="p-4 mb-4">
        <AuditTrailFilters 
          filters={filters} 
          onChange={handleFilterChange} 
        />
      </Card>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="list">Λίστα Καταγραφών</TabsTrigger>
          <TabsTrigger value="stats">Στατιστικά</TabsTrigger>
          <TabsTrigger value="timeline">Χρονολόγιο</TabsTrigger>
          {selectedTrailId && (
            <TabsTrigger value="detail">Λεπτομέρειες Καταγραφής</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="list" className="mt-4">
          <AuditTrailsList 
            trails={auditTrails}
            loading={loading}
            pagination={{
              page: pagination.page,
              pageSize: pagination.pageSize,
              totalItems: totalRecords
            }}
            sortBy={pagination.sortBy}
            sortDirection={pagination.sortDirection}
            onPageChange={handlePageChange}
            onSortChange={handleSortChange}
            onSelectTrail={handleSelectTrail}
          />
        </TabsContent>
        
        <TabsContent value="stats" className="mt-4">
          <AuditTrailStats 
            filters={filters} 
            loading={loading}
          />
        </TabsContent>
        
        <TabsContent value="timeline" className="mt-4">
          <AuditTrailTimeline 
            trails={auditTrails}
            loading={loading}
            onSelectTrail={handleSelectTrail}
          />
        </TabsContent>
        
        <TabsContent value="detail" className="mt-4">
          {selectedTrailId ? (
            <AuditTrailDetail 
              trailId={selectedTrailId}
              onBack={handleBackToList}
            />
          ) : (
            <div className="text-center p-8 text-gray-500">
              Επιλέξτε μια καταγραφή για να δείτε τις λεπτομέρειες
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AuditTrailDashboard; 