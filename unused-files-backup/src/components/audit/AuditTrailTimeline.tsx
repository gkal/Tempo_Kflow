import React from 'react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { 
  User, 
  Calendar, 
  AlertCircle, 
  Info, 
  AlertTriangle, 
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  Edit,
  Trash,
  Plus,
  Key,
  Shield,
  Settings
} from 'lucide-react';
import { AuditActionType, AuditSeverity } from '@/services/auditTrailService';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { 
  actionTypeLabels, 
  severityLabels, 
  groupAuditTrailsByDate 
} from '@/utils/auditTrailUtils';
import { cn } from '@/lib/utils';

interface AuditTrailTimelineProps {
  trails: any[];
  loading: boolean;
  onSelectTrail: (id: string) => void;
}

/**
 * Get icon for action type
 */
const getActionTypeIcon = (actionType: AuditActionType) => {
  if (actionType.startsWith('USER_')) {
    return <User size={18} />;
  } else if (actionType.includes('FORM_SUBMITTED')) {
    return <FileText size={18} />;
  } else if (actionType.includes('FORM_APPROVED')) {
    return <CheckCircle size={18} />;
  } else if (actionType.includes('FORM_REJECTED')) {
    return <XCircle size={18} />;
  } else if (actionType.includes('CREATED')) {
    return <Plus size={18} />;
  } else if (actionType.includes('UPDATED')) {
    return <Edit size={18} />;
  } else if (actionType.includes('DELETED')) {
    return <Trash size={18} />;
  } else if (actionType.includes('SECURITY')) {
    return <Shield size={18} />;
  } else if (actionType.includes('CONFIG')) {
    return <Settings size={18} />;
  } else {
    return <Info size={18} />;
  }
};

/**
 * Get color for severity
 */
const getSeverityColor = (severity: AuditSeverity): string => {
  switch (severity) {
    case AuditSeverity.CRITICAL:
      return 'text-red-600 bg-red-50 border-red-200';
    case AuditSeverity.ERROR:
      return 'text-red-500 bg-red-50 border-red-100';
    case AuditSeverity.WARNING:
      return 'text-yellow-500 bg-yellow-50 border-yellow-100';
    case AuditSeverity.INFO:
    default:
      return 'text-blue-500 bg-blue-50 border-blue-100';
  }
};

/**
 * AuditTrailTimeline - Component for displaying audit trails in a chronological timeline
 */
const AuditTrailTimeline: React.FC<AuditTrailTimelineProps> = ({
  trails,
  loading,
  onSelectTrail
}) => {
  if (loading) {
    return (
      <Card className="p-8 flex justify-center items-center min-h-[300px]">
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
  
  // Group audit trails by date
  const groupedTrails = groupAuditTrailsByDate(trails);
  const dateKeys = Object.keys(groupedTrails).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime();
  });
  
  return (
    <div className="space-y-8">
      {dateKeys.map(date => (
        <div key={date} className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-800">{date}</h3>
          </div>
          
          <div className="relative border-l-2 border-gray-200 ml-2 pl-6 space-y-6">
            {groupedTrails[date].map((trail, index) => {
              const actionType = trail.action_type as AuditActionType;
              const severity = trail.severity as AuditSeverity;
              const severityColor = getSeverityColor(severity);
              const icon = getActionTypeIcon(actionType);
              const time = format(new Date(trail.timestamp), 'HH:mm:ss');
              
              return (
                <div key={trail.id} className="relative">
                  {/* Timeline dot */}
                  <div 
                    className={cn(
                      "absolute -left-9 mt-1 rounded-full p-1 border-2",
                      severityColor
                    )}
                  >
                    {icon}
                  </div>
                  
                  {/* Content card */}
                  <Card 
                    className={cn(
                      "p-4 hover:shadow-md transition-shadow cursor-pointer",
                      index === 0 && "border-l-4",
                      index === 0 && severityColor
                    )}
                    onClick={() => onSelectTrail(trail.id)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={severityColor}>
                          {severityLabels[severity]?.label || severity}
                        </Badge>
                        <span className="text-sm font-medium text-gray-700">
                          {actionTypeLabels[actionType] || actionType}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock size={14} />
                        <span>{time}</span>
                      </div>
                    </div>
                    
                    <p className="text-gray-700">{trail.description}</p>
                    
                    <div className="mt-2 flex flex-wrap gap-2">
                      {/* User info */}
                      {trail.user_id && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <User size={12} />
                          <span>{trail.user_name || trail.user_id}</span>
                        </div>
                      )}
                      
                      {/* Target info */}
                      {trail.target_type && trail.target_id && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <AlertCircle size={12} />
                          <span>{trail.target_type}: {trail.target_id}</span>
                        </div>
                      )}
                      
                      {/* Tags */}
                      {trail.tags && trail.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {trail.tags.map((tag: string) => (
                            <span 
                              key={tag} 
                              className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-3 flex justify-end">
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
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AuditTrailTimeline; 