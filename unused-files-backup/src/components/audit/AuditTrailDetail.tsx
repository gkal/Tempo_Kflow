import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Calendar, Globe, Hash, AlertCircle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { auditTrailService, AuditActionType, AuditSeverity } from '@/services/auditTrailService';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import CodeBlock from '@/components/ui/CodeBlock';
import Link from 'next/link';
import { 
  actionTypeLabels, 
  severityLabels, 
  getTargetTypeLabel, 
  formatTimestamp, 
  isTargetViewable, 
  getTargetViewRoute 
} from '@/utils/auditTrailUtils';
import { cn } from '@/lib/utils';

interface AuditTrailDetailProps {
  trailId: string;
  onBack: () => void;
}

/**
 * AuditTrailDetail - Component for displaying detailed information about an audit trail
 */
const AuditTrailDetail: React.FC<AuditTrailDetailProps> = ({ trailId, onBack }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [trailData, setTrailData] = useState<any | null>(null);
  const [showMetadata, setShowMetadata] = useState<boolean>(false);
  const [showBeforeState, setShowBeforeState] = useState<boolean>(false);
  const [showAfterState, setShowAfterState] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('overview');
  
  // Fetch audit trail data
  useEffect(() => {
    const fetchTrailDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const result = await auditTrailService.getAuditTrailDetails(trailId);
        setTrailData(result);
      } catch (err: any) {
        console.error('Error fetching audit trail details:', err);
        setError(err.message || 'Σφάλμα κατά την ανάκτηση των λεπτομερειών καταγραφής');
      } finally {
        setLoading(false);
      }
    };
    
    if (trailId) {
      fetchTrailDetails();
    }
  }, [trailId]);
  
  if (loading) {
    return (
      <Card className="p-8 flex justify-center items-center min-h-[300px]">
        <LoadingSpinner size="lg" />
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="p-4">
        <div className="flex mb-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft size={16} className="mr-1" />
            Επιστροφή
          </Button>
        </div>
        <ErrorDisplay message={error} />
      </Card>
    );
  }
  
  if (!trailData || !trailData.trail) {
    return (
      <Card className="p-4">
        <div className="flex mb-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft size={16} className="mr-1" />
            Επιστροφή
          </Button>
        </div>
        <div className="text-center p-8 text-gray-500">
          Δεν βρέθηκαν λεπτομέρειες για αυτή την καταγραφή.
        </div>
      </Card>
    );
  }
  
  const { trail, details, tags } = trailData;
  
  const formattedTimestamp = formatTimestamp(trail.timestamp);
  const severity = trail.severity as AuditSeverity;
  const actionType = trail.action_type as AuditActionType;
  
  const severityColor = severityLabels[severity]?.color || 'bg-gray-100 text-gray-800';
  const severityLabel = severityLabels[severity]?.label || severity;
  
  return (
    <Card className="p-4">
      {/* Header with back button */}
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft size={16} className="mr-1" />
          Επιστροφή στη λίστα
        </Button>
        
        <Badge className={severityColor}>
          {severityLabel}
        </Badge>
      </div>
      
      {/* Title and description */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-1">
          {actionTypeLabels[actionType] || actionType}
        </h2>
        <p className="text-gray-600">{trail.description}</p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full sm:w-auto mb-4">
          <TabsTrigger value="overview">Επισκόπηση</TabsTrigger>
          <TabsTrigger value="data">Δεδομένα</TabsTrigger>
          {(trail.before_state || trail.after_state) && (
            <TabsTrigger value="changes">Αλλαγές</TabsTrigger>
          )}
          {details.length > 0 && (
            <TabsTrigger value="details">Λεπτομέρειες</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Βασικές Πληροφορίες</h3>
              
              <div className="space-y-3">
                <div className="flex items-start">
                  <Calendar size={18} className="text-gray-500 mt-0.5 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Ημερομηνία & Ώρα</p>
                    <p className="text-gray-800">{formattedTimestamp}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <User size={18} className="text-gray-500 mt-0.5 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Χρήστης</p>
                    <p className="text-gray-800">{trail.user_name || trail.user_id || 'Σύστημα'}</p>
                  </div>
                </div>
                
                {trail.ip_address && (
                  <div className="flex items-start">
                    <Globe size={18} className="text-gray-500 mt-0.5 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Διεύθυνση IP</p>
                      <p className="text-gray-800">{trail.ip_address}</p>
                      {trail.location && (
                        <p className="text-xs text-gray-500">
                          {typeof trail.location === 'object' 
                            ? `${trail.location.city || ''}, ${trail.location.country || ''}` 
                            : trail.location}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                {trail.user_agent && (
                  <div className="flex items-start">
                    <div className="text-gray-500 mt-0.5 mr-2">🌐</div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Browser/Device</p>
                      <p className="text-xs text-gray-600 break-words">{trail.user_agent}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Target and Tags */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Στόχος & Ετικέτες</h3>
              
              <div className="space-y-3">
                {(trail.target_type || trail.target_id) && (
                  <div className="flex items-start">
                    <AlertCircle size={18} className="text-gray-500 mt-0.5 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Στόχος</p>
                      <div className="flex items-center gap-2">
                        <p className="text-gray-800">
                          {getTargetTypeLabel(trail.target_type)}: {trail.target_id}
                        </p>
                        
                        {trail.target_type && trail.target_id && isTargetViewable(trail.target_type) && (
                          <Link href={getTargetViewRoute(trail.target_type, trail.target_id)}>
                            <Button variant="ghost" size="sm">
                              <ExternalLink size={14} className="mr-1" />
                              Προβολή
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {tags.length > 0 && (
                  <div className="flex items-start">
                    <Hash size={18} className="text-gray-500 mt-0.5 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Ετικέτες</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {tags.map((tag: any) => (
                          <Badge key={tag.id} variant="outline" className="bg-gray-100">
                            #{tag.tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {trail.session_id && (
                  <div className="flex items-start">
                    <div className="text-gray-500 mt-0.5 mr-2">🔑</div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Session ID</p>
                      <p className="text-xs text-gray-600 break-all">{trail.session_id}</p>
                    </div>
                  </div>
                )}
                
                {trail.request_id && (
                  <div className="flex items-start">
                    <div className="text-gray-500 mt-0.5 mr-2">🔄</div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Request ID</p>
                      <p className="text-xs text-gray-600 break-all">{trail.request_id}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="data">
          {/* Metadata Section */}
          {trail.metadata && Object.keys(trail.metadata).length > 0 && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-gray-800">Μεταδεδομένα</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowMetadata(!showMetadata)}
                >
                  {showMetadata ? (
                    <><ChevronUp size={16} className="mr-1" /> Απόκρυψη</>
                  ) : (
                    <><ChevronDown size={16} className="mr-1" /> Εμφάνιση</>
                  )}
                </Button>
              </div>
              
              {showMetadata && (
                <Card className="p-4 bg-gray-50">
                  <CodeBlock
                    code={JSON.stringify(trail.metadata, null, 2)}
                    language="json"
                  />
                </Card>
              )}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="changes">
          {/* Before State */}
          {trail.before_state && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-gray-800">Κατάσταση Πριν</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowBeforeState(!showBeforeState)}
                >
                  {showBeforeState ? (
                    <><ChevronUp size={16} className="mr-1" /> Απόκρυψη</>
                  ) : (
                    <><ChevronDown size={16} className="mr-1" /> Εμφάνιση</>
                  )}
                </Button>
              </div>
              
              {showBeforeState && (
                <Card className="p-4 bg-gray-50">
                  <CodeBlock
                    code={JSON.stringify(trail.before_state, null, 2)}
                    language="json"
                  />
                </Card>
              )}
            </div>
          )}
          
          {/* After State */}
          {trail.after_state && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-gray-800">Κατάσταση Μετά</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowAfterState(!showAfterState)}
                >
                  {showAfterState ? (
                    <><ChevronUp size={16} className="mr-1" /> Απόκρυψη</>
                  ) : (
                    <><ChevronDown size={16} className="mr-1" /> Εμφάνιση</>
                  )}
                </Button>
              </div>
              
              {showAfterState && (
                <Card className="p-4 bg-gray-50">
                  <CodeBlock
                    code={JSON.stringify(trail.after_state, null, 2)}
                    language="json"
                  />
                </Card>
              )}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="details">
          {/* Detail Items */}
          {details.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Επιπλέον Πληροφορίες</h3>
              
              <Card className="p-4 bg-gray-50">
                <div className="space-y-2">
                  {details.map((detail: any) => (
                    <div key={detail.id} className="flex gap-2 items-start border-b border-gray-100 pb-2">
                      <span className="font-medium text-gray-700 w-1/3">{detail.key}:</span>
                      <span className={cn(
                        "text-gray-600 w-2/3",
                        detail.is_sensitive && "text-xs bg-gray-100 p-1 rounded font-mono"
                      )}>
                        {detail.is_sensitive 
                          ? "********" 
                          : detail.value}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Signature verification */}
      {trail.signature && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="text-gray-500 mr-2">🔒</div>
            <span className="text-xs text-gray-500">
              Verified record with signature: {trail.signature.substring(0, 16)}...
            </span>
          </div>
        </div>
      )}
    </Card>
  );
};

export default AuditTrailDetail; 