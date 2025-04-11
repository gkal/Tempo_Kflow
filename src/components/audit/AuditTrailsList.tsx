import React from 'react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  Info, 
  AlertTriangle, 
  User, 
  Calendar, 
  Activity 
} from 'lucide-react';
import { AuditActionType, AuditSeverity } from '@/services/auditTrailService';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { actionTypeLabels } from '@/utils/auditTrailUtils';

// Types
interface AuditTrail {
  id: string;
  action_type: AuditActionType;
  user_id: string | null;
  timestamp: string;
  description: string;
  severity: AuditSeverity;
  target_type: string | null;
  target_id: string | null;
  ip_address: string | null;
  tags: string[];
  metadata: any;
  user_name?: string;
}

interface PaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
}

interface AuditTrailsListProps {
  trails: AuditTrail[];
  loading: boolean;
  pagination: PaginationProps;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  onPageChange: (page: number) => void;
  onSortChange: (sortBy: string, sortDirection: 'asc' | 'desc') => void;
  onSelectTrail: (id: string) => void;
}

/**
 * Renders an icon based on audit trail action type
 */
const ActionTypeIcon = ({ actionType }: { actionType: AuditActionType }) => {
  if (actionType.startsWith('USER_')) {
    return <User size={16} className="text-blue-500" />;
  } else if (actionType.startsWith('FORM_')) {
    return <Activity size={16} className="text-green-500" />;
  } else if (actionType.includes('ERROR')) {
    return <AlertCircle size={16} className="text-red-500" />;
  } else {
    return <Info size={16} className="text-gray-500" />;
  }
};

/**
 * Renders a severity indicator
 */
const SeverityIndicator = ({ severity }: { severity: AuditSeverity }) => {
  let className = '';
  let icon = null;
  
  switch (severity) {
    case AuditSeverity.CRITICAL:
      className = 'bg-red-100 text-red-800';
      icon = <AlertCircle size={14} className="text-red-800" />;
      break;
    case AuditSeverity.ERROR:
      className = 'bg-red-50 text-red-700';
      icon = <AlertCircle size={14} className="text-red-700" />;
      break;
    case AuditSeverity.WARNING:
      className = 'bg-yellow-50 text-yellow-700';
      icon = <AlertTriangle size={14} className="text-yellow-700" />;
      break;
    case AuditSeverity.INFO:
    default:
      className = 'bg-blue-50 text-blue-700';
      icon = <Info size={14} className="text-blue-700" />;
      break;
  }
  
  return (
    <Badge variant="outline" className={className}>
      {icon}
      <span className="ml-1">{severity}</span>
    </Badge>
  );
};

/**
 * AuditTrailsList - Component for displaying a list of audit trails
 */
const AuditTrailsList: React.FC<AuditTrailsListProps> = ({
  trails,
  loading,
  pagination,
  sortBy,
  sortDirection,
  onPageChange,
  onSortChange,
  onSelectTrail
}) => {
  const { page, pageSize, totalItems } = pagination;
  const totalPages = Math.ceil(totalItems / pageSize);
  
  // Handle sorting
  const handleSort = (column: string) => {
    const newDirection = sortBy === column && sortDirection === 'asc' ? 'desc' : 'asc';
    onSortChange(column, newDirection);
  };
  
  // Render sort indicator
  const renderSortIndicator = (column: string) => {
    if (sortBy !== column) return null;
    
    return sortDirection === 'asc' 
      ? <ChevronUp size={16} /> 
      : <ChevronDown size={16} />;
  };
  
  // Calculate range of items being displayed
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(startItem + pageSize - 1, totalItems);
  
  if (loading) {
    return (
      <Card className="p-4 flex justify-center items-center min-h-[300px]">
        <LoadingSpinner size="lg" />
      </Card>
    );
  }
  
  if (trails.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-500">Δεν βρέθηκαν καταγραφές ελέγχου με τα τρέχοντα φίλτρα.</p>
        <p className="text-gray-400 text-sm mt-2">Δοκιμάστε να αλλάξετε τα φίλτρα αναζήτησης για να δείτε περισσότερα αποτελέσματα.</p>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <button 
                  className="flex items-center text-gray-700 font-semibold"
                  onClick={() => handleSort('timestamp')}
                >
                  <Calendar size={16} className="mr-1" />
                  Ημερομηνία
                  {renderSortIndicator('timestamp')}
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button 
                  className="flex items-center text-gray-700 font-semibold"
                  onClick={() => handleSort('action_type')}
                >
                  Ενέργεια
                  {renderSortIndicator('action_type')}
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button 
                  className="flex items-center text-gray-700 font-semibold"
                  onClick={() => handleSort('user_id')}
                >
                  <User size={16} className="mr-1" />
                  Χρήστης
                  {renderSortIndicator('user_id')}
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button 
                  className="flex items-center text-gray-700 font-semibold"
                  onClick={() => handleSort('description')}
                >
                  Περιγραφή
                  {renderSortIndicator('description')}
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button 
                  className="flex items-center text-gray-700 font-semibold"
                  onClick={() => handleSort('severity')}
                >
                  Σοβαρότητα
                  {renderSortIndicator('severity')}
                </button>
              </th>
              <th className="px-4 py-3 text-center">Ενέργειες</th>
            </tr>
          </thead>
          <tbody>
            {trails.map((trail) => (
              <tr 
                key={trail.id} 
                className="border-t hover:bg-gray-50 cursor-pointer"
                onClick={() => onSelectTrail(trail.id)}
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-gray-900">
                    {format(new Date(trail.timestamp), 'dd/MM/yyyy')}
                  </div>
                  <div className="text-gray-500 text-xs">
                    {format(new Date(trail.timestamp), 'HH:mm:ss')}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center">
                    <ActionTypeIcon actionType={trail.action_type} />
                    <span className="ml-2 text-gray-900">
                      {actionTypeLabels[trail.action_type] || trail.action_type}
                    </span>
                  </div>
                  {trail.target_type && (
                    <div className="text-gray-500 text-xs mt-1">
                      {trail.target_type}: {trail.target_id}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="text-gray-900">
                    {trail.user_name || trail.user_id || 'Σύστημα'}
                  </div>
                  {trail.ip_address && (
                    <div className="text-gray-500 text-xs">
                      {trail.ip_address}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="text-gray-900 max-w-[300px] truncate">
                    {trail.description}
                  </div>
                  {trail.tags && trail.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {trail.tags.map(tag => (
                        <span 
                          key={tag} 
                          className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <SeverityIndicator severity={trail.severity} />
                </td>
                <td className="px-4 py-3 text-center">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTrail(trail.id);
                    }}
                  >
                    Λεπτομέρειες
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      
      {/* Pagination controls */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          Εμφάνιση {startItem}-{endItem} από {totalItems} καταγραφές
        </div>
        
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={page === 1}
          >
            <ChevronLeft size={16} />
            <ChevronLeft size={16} className="-ml-1" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft size={16} />
          </Button>
          
          <div className="flex items-center px-2">
            <span className="text-sm font-medium">
              Σελίδα {page} από {totalPages || 1}
            </span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            <ChevronRight size={16} />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
          >
            <ChevronRight size={16} />
            <ChevronRight size={16} className="-ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AuditTrailsList; 