import React, { useState, useEffect, useMemo } from 'react';
import { useVirtualTableData } from '@/hooks/useVirtualTableData';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { fetchFormLinksByStatus } from '@/services/formLinkService';
import { CustomerFormLink } from '@/services/formLinkService/types';
import { GlobalTooltip } from '@/components/ui/GlobalTooltip';
import { TruncateWithTooltip } from '@/components/ui/TruncateWithTooltip';
import { formatDate, formatRelativeTime } from '@/utils/dateUtils';
import { getUserPermissions } from '@/services/userService';
import { UserPermission } from '@/types/auth';
import { useCustomToast } from '@/hooks/useCustomToast';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { SearchField } from '@/components/ui/SearchField';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Select } from '@/components/ui/Select';
import { useWebSocketNotification } from '@/hooks/useWebSocketNotification';
import { Badge } from '@/components/ui/badge';
import { useMediaQuery } from '@/hooks/useMediaQuery';

// Status options for filter
const STATUS_OPTIONS = [
  { value: 'all', label: 'Όλες οι καταστάσεις' },
  { value: 'submitted', label: 'Υποβληθείσες' },
  { value: 'pending_approval', label: 'Σε αναμονή έγκρισης' },
  { value: 'approved', label: 'Εγκεκριμένες' },
  { value: 'rejected', label: 'Απορριφθείσες' },
];

interface FormApprovalQueueProps {
  onViewDetails: (formLink: CustomerFormLink) => void;
}

export const FormApprovalQueue: React.FC<FormApprovalQueueProps> = ({ onViewDetails }) => {
  // State for form links, loading, and permissions
  const [formLinks, setFormLinks] = useState<CustomerFormLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasReadonlyPermission, setHasReadonlyPermission] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNewSubmissions, setHasNewSubmissions] = useState(false);
  const { showToast } = useCustomToast();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // State for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending_approval');
  const [dateRange, setDateRange] = useState<{ startDate: Date | null; endDate: Date | null }>({
    startDate: null,
    endDate: null,
  });

  // Set up real-time notifications for new submissions
  useWebSocketNotification('form_submission', () => {
    showToast({
      title: 'Νέα Υποβολή',
      description: 'Μια νέα φόρμα υποβλήθηκε και χρειάζεται έγκριση',
      type: 'info',
      duration: 5000,
    });
    setHasNewSubmissions(true);
  });

  // Check user permissions
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const permissions = await getUserPermissions();
        setHasReadonlyPermission(permissions.includes(UserPermission.READONLY));
      } catch (error) {
        console.error('Failed to check user permissions:', error);
        setHasReadonlyPermission(false);
      }
    };

    checkPermissions();
  }, []);

  // Fetch form links based on filters
  useEffect(() => {
    const fetchFormLinks = async () => {
      setIsLoading(true);
      try {
        const response = await fetchFormLinksByStatus({
          status: statusFilter === 'all' ? undefined : statusFilter,
          searchTerm,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          page: 1,
          pageSize: 100, // Using pagination from VirtualTable
        });

        setFormLinks(response.data || []);
        setTotalCount(response.totalCount || 0);
        setHasNewSubmissions(false); // Reset the new submissions flag
      } catch (error) {
        console.error('Failed to fetch form links:', error);
        showToast({
          title: 'Σφάλμα',
          description: 'Αποτυχία φόρτωσης φορμών προς έγκριση',
          type: 'error',
        });
        setFormLinks([]);
        setTotalCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFormLinks();
  }, [searchTerm, statusFilter, dateRange, showToast]);

  // Handle refresh when new submissions are received
  const handleRefresh = () => {
    // Re-fetch the data
    setStatusFilter('pending_approval');
    // This will trigger the useEffect to fetch data again
  };

  // Define columns for the virtual table
  const columns = useMemo(
    () => [
      {
        header: 'Κατάσταση',
        accessor: 'status',
        cellRenderer: (row: CustomerFormLink) => (
          <StatusIndicator 
            status={row.status} 
            statusLabels={{
              pending: 'Σε αναμονή',
              submitted: 'Υποβλήθηκε',
              pending_approval: 'Προς έγκριση',
              approved: 'Εγκρίθηκε',
              rejected: 'Απορρίφθηκε',
            }}
            statusColors={{
              pending: 'gray',
              submitted: 'blue',
              pending_approval: 'yellow',
              approved: 'green',
              rejected: 'red',
            }}
          />
        ),
        width: 120,
      },
      {
        header: 'Επωνυμία Πελάτη',
        accessor: 'customer_name',
        cellRenderer: (row: CustomerFormLink) => (
          <TruncateWithTooltip text={row.customer_name || 'Άγνωστος'} maxLength={25} />
        ),
        width: 200,
      },
      {
        header: 'Ημ/νία Υποβολής',
        accessor: 'submitted_at',
        cellRenderer: (row: CustomerFormLink) => (
          <GlobalTooltip
            content={row.submitted_at ? formatDate(row.submitted_at) : 'Δεν έχει υποβληθεί'}
          >
            <span className="whitespace-nowrap">
              {row.submitted_at 
                ? formatRelativeTime(new Date(row.submitted_at)) 
                : 'Δεν έχει υποβληθεί'}
            </span>
          </GlobalTooltip>
        ),
        width: 150,
      },
      {
        header: 'Λήξη',
        accessor: 'expires_at',
        cellRenderer: (row: CustomerFormLink) => (
          <GlobalTooltip
            content={row.expires_at ? formatDate(row.expires_at) : 'Δεν έχει οριστεί'}
          >
            <span className="whitespace-nowrap">
              {row.expires_at 
                ? formatRelativeTime(new Date(row.expires_at)) 
                : 'Δεν έχει οριστεί'}
            </span>
          </GlobalTooltip>
        ),
        width: 120,
        hideOnMobile: true,
      },
      {
        header: 'Δημιουργήθηκε από',
        accessor: 'created_by',
        cellRenderer: (row: CustomerFormLink) => (
          <TruncateWithTooltip text={row.created_by_name || row.created_by || 'Σύστημα'} maxLength={20} />
        ),
        width: 150,
        hideOnMobile: true,
      },
      {
        header: 'Ενέργειες',
        accessor: 'id',
        cellRenderer: (row: CustomerFormLink) => (
          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onViewDetails(row)}
              aria-label="Προβολή λεπτομερειών φόρμας"
              disabled={hasReadonlyPermission}
            >
              Προβολή
            </Button>
          </div>
        ),
        width: 100,
      },
    ],
    [onViewDetails, hasReadonlyPermission]
  );

  // Filter columns for mobile view
  const visibleColumns = useMemo(() => {
    if (isMobile) {
      return columns.filter(column => !column.hideOnMobile);
    }
    return columns;
  }, [columns, isMobile]);

  // Initialize virtual table
  const { table, containerProps, tableProps } = useVirtualTableData({
    data: formLinks,
    columns: visibleColumns,
    estimateSize: () => 50, // Row height estimate
    getRowId: (row) => row.id,
  });

  // If user has readonly permission, show message
  if (hasReadonlyPermission) {
    return (
      <div className="p-4 rounded-md bg-yellow-50 border border-yellow-200">
        <p className="text-yellow-700">
          Δεν έχετε δικαιώματα για την έγκριση ή απόρριψη φορμών. Παρακαλώ επικοινωνήστε με τον διαχειριστή του συστήματος.
        </p>
      </div>
    );
  }

  // Render mobile optimization component
  const renderMobileFilters = () => (
    <div className="space-y-3 mb-4">
      <SearchField
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Αναζήτηση πελάτη..."
        className="w-full"
      />
      
      <Select
        value={statusFilter}
        onChange={(value) => setStatusFilter(value)}
        options={STATUS_OPTIONS}
        className="w-full"
      />
    </div>
  );

  return (
    <div className="space-y-4">
      {hasNewSubmissions && (
        <div 
          className="p-3 bg-blue-50 border border-blue-200 rounded-md flex justify-between items-center cursor-pointer"
          onClick={handleRefresh}
        >
          <div className="flex items-center">
            <Badge variant="info" className="mr-2">Νέο</Badge>
            <span className="text-blue-700">Υπάρχουν νέες υποβολές φορμών που χρειάζονται έγκριση</span>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            className="text-blue-600 border-blue-300"
          >
            Ανανέωση
          </Button>
        </div>
      )}

      <div className={`flex ${isMobile ? 'flex-col' : 'lg:flex-row lg:items-center lg:justify-between'} gap-3 mb-4`}>
        <h2 className="text-xl font-semibold">Φόρμες προς Έγκριση</h2>
        
        {isMobile ? (
          renderMobileFilters()
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <SearchField
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Αναζήτηση πελάτη..."
              className="w-full sm:w-64"
            />
            
            <Select
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              options={STATUS_OPTIONS}
              className="w-full sm:w-48"
            />
            
            <DateRangePicker
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onChange={setDateRange}
              placeholderText="Επιλογή περιόδου"
              className="w-full sm:w-auto"
            />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      ) : formLinks.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded-md border border-gray-200">
          <p className="text-gray-500">
            {searchTerm || statusFilter !== 'all' || dateRange.startDate || dateRange.endDate
              ? 'Δεν βρέθηκαν φόρμες με τα επιλεγμένα κριτήρια'
              : 'Δεν υπάρχουν φόρμες προς έγκριση αυτή τη στιγμή'}
          </p>
        </div>
      ) : (
        <>
          <div className="mb-2 text-sm text-gray-500">
            Συνολικά: {totalCount} φόρμες
          </div>
          
          <div className="border border-gray-200 rounded-md overflow-hidden">
            <div {...containerProps} className={`${isMobile ? 'h-[450px]' : 'h-[650px]'}`}>
              <table {...tableProps} className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {table.getHeaderGroups().map((headerGroup) =>
                      headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          style={{ width: header.column.columnDef.width }}
                        >
                          {header.column.columnDef.header}
                        </th>
                      ))
                    )}
                  </tr>
                </thead>
                
                <tbody className="bg-white divide-y divide-gray-200">
                  {table.getRowModel().rows.map((row) => (
                    <tr 
                      key={row.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => onViewDetails(row.original as CustomerFormLink)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-4 py-3 whitespace-nowrap"
                        >
                          {cell.column.columnDef.cellRenderer
                            ? cell.column.columnDef.cellRenderer(cell.row.original)
                            : cell.renderCell()}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FormApprovalQueue; 