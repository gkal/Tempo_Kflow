import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { authService } from '@/services/authService';
import { useRouter } from 'next/router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertCircle,
  Check,
  FileDown,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Shield,
  ShieldAlert,
  UserX,
} from 'lucide-react';
import { gdprComplianceService } from '@/services/gdprComplianceService';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function GDPRAdminPage() {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // States for different data types
  const [agreements, setAgreements] = useState<any[]>([]);
  const [dataRequests, setDataRequests] = useState<any[]>([]);
  const [dataBreaches, setDataBreaches] = useState<any[]>([]);
  
  // Loading states
  const [loadingAgreements, setLoadingAgreements] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingBreaches, setLoadingBreaches] = useState(false);
  
  // Error states
  const [agreementsError, setAgreementsError] = useState<string | null>(null);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [breachesError, setBreachesError] = useState<string | null>(null);

  useEffect(() => {
    async function checkPermissions() {
      try {
        const hasGdprAccess = await authService.checkUserPermission('gdpr.admin');
        
        if (!hasGdprAccess) {
          router.push('/dashboard');
          return;
        }
        
        setHasPermission(true);
        setIsLoading(false);
        
        // Load initial data
        fetchAgreements();
        fetchDataRequests();
        fetchDataBreaches();
      } catch (error) {
        console.error('Error checking permissions:', error);
        router.push('/dashboard');
      }
    }
    
    checkPermissions();
  }, [router]);

  // Data fetching functions
  const fetchAgreements = async () => {
    setLoadingAgreements(true);
    setAgreementsError(null);
    
    try {
      const data = await gdprComplianceService.getAllDataProcessingAgreements();
      setAgreements(data);
    } catch (error) {
      console.error('Error fetching agreements:', error);
      setAgreementsError('Failed to load data processing agreements.');
    } finally {
      setLoadingAgreements(false);
    }
  };
  
  const fetchDataRequests = async () => {
    setLoadingRequests(true);
    setRequestsError(null);
    
    try {
      // In a real implementation, this would come from the service
      // Since we don't have this method yet, mocking with empty array
      // Replace with actual method when available
      // const data = await gdprComplianceService.getAllDataSubjectRequests();
      const data: any[] = [];
      setDataRequests(data);
    } catch (error) {
      console.error('Error fetching data requests:', error);
      setRequestsError('Failed to load data subject requests.');
    } finally {
      setLoadingRequests(false);
    }
  };
  
  const fetchDataBreaches = async () => {
    setLoadingBreaches(true);
    setBreachesError(null);
    
    try {
      const data = await gdprComplianceService.getAllDataBreaches();
      setDataBreaches(data);
    } catch (error) {
      console.error('Error fetching data breaches:', error);
      setBreachesError('Failed to load data breach records.');
    } finally {
      setLoadingBreaches(false);
    }
  };

  // Render loading spinner while checking permissions
  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">GDPR Administration</h1>
            <p className="text-muted-foreground">
              Manage data processing agreements, subject requests, and breach notifications.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push('/gdpr/privacy-policy')}>
              <FileText className="h-4 w-4 mr-2" />
              Privacy Policy
            </Button>
          </div>
        </div>

        <Tabs defaultValue="requests" className="w-full">
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="requests">Data Subject Requests</TabsTrigger>
            <TabsTrigger value="agreements">Data Processing Agreements</TabsTrigger>
            <TabsTrigger value="breaches">Data Breach Records</TabsTrigger>
          </TabsList>
          
          {/* Data Subject Requests Tab */}
          <TabsContent value="requests">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Data Subject Requests</CardTitle>
                  <CardDescription>
                    Manage GDPR data subject access, deletion, and other requests.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={fetchDataRequests}
                    disabled={loadingRequests}
                  >
                    {loadingRequests ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {requestsError && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{requestsError}</AlertDescription>
                  </Alert>
                )}
                
                {dataRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <FileText className="h-12 w-12 mb-4 opacity-20" />
                    <h3 className="text-lg font-medium">No data subject requests</h3>
                    <p className="max-w-sm mt-2">
                      There are currently no data subject requests to process. Requests will appear here when users submit them.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Verified</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dataRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            <Badge variant={getBadgeVariantForRequestType(request.request_type)}>
                              {formatRequestType(request.request_type)}
                            </Badge>
                          </TableCell>
                          <TableCell>{request.email}</TableCell>
                          <TableCell>
                            <Badge variant={getBadgeVariantForStatus(request.status)}>
                              {formatRequestStatus(request.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(request.created_at)}</TableCell>
                          <TableCell>
                            {request.is_verified ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-amber-500" />
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Data Processing Agreements Tab */}
          <TabsContent value="agreements">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Data Processing Agreements</CardTitle>
                  <CardDescription>
                    Manage data processing agreements and privacy policies.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={fetchAgreements} disabled={loadingAgreements}>
                    {loadingAgreements ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                  <Button variant="default" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Agreement
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {agreementsError && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{agreementsError}</AlertDescription>
                  </Alert>
                )}
                
                {agreements.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <FileText className="h-12 w-12 mb-4 opacity-20" />
                    <h3 className="text-lg font-medium">No agreements found</h3>
                    <p className="max-w-sm mt-2">
                      Get started by creating a new data processing agreement using the button above.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Effective Date</TableHead>
                        <TableHead>Expiry Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agreements.map((agreement) => (
                        <TableRow key={agreement.id}>
                          <TableCell className="font-medium">{agreement.title}</TableCell>
                          <TableCell>{agreement.version}</TableCell>
                          <TableCell>
                            <Badge variant={agreement.is_active ? "default" : "secondary"}>
                              {agreement.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(agreement.effective_date)}</TableCell>
                          <TableCell>{agreement.expiry_date ? formatDate(agreement.expiry_date) : "N/A"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm">
                                View
                              </Button>
                              <Button 
                                variant={agreement.is_active ? "secondary" : "default"} 
                                size="sm"
                              >
                                {agreement.is_active ? "Deactivate" : "Activate"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Data Breach Records Tab */}
          <TabsContent value="breaches">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Data Breach Records</CardTitle>
                  <CardDescription>
                    Track and manage data breach incidents and notifications.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={fetchDataBreaches} disabled={loadingBreaches}>
                    {loadingBreaches ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                  <Button variant="default" size="sm">
                    <ShieldAlert className="h-4 w-4 mr-2" />
                    Record Breach
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {breachesError && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{breachesError}</AlertDescription>
                  </Alert>
                )}
                
                {dataBreaches.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <Shield className="h-12 w-12 mb-4 opacity-20" />
                    <h3 className="text-lg font-medium">No data breaches</h3>
                    <p className="max-w-sm mt-2">
                      There are no data breach incidents recorded. Use the "Record Breach" button to document a new incident.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Breach Date</TableHead>
                        <TableHead>Risk Level</TableHead>
                        <TableHead>Affected Users</TableHead>
                        <TableHead>Notification Status</TableHead>
                        <TableHead>Report Submitted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dataBreaches.map((breach) => (
                        <TableRow key={breach.id}>
                          <TableCell>{formatDate(breach.breach_date)}</TableCell>
                          <TableCell>
                            <Badge variant={getRiskLevelVariant(breach.risk_level)}>
                              {formatRiskLevel(breach.risk_level)}
                            </Badge>
                          </TableCell>
                          <TableCell>{breach.affected_users_count}</TableCell>
                          <TableCell>
                            <Badge variant={getNotificationStatusVariant(breach.notification_status)}>
                              {formatNotificationStatus(breach.notification_status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {breach.report_submitted ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-amber-500" />
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

// Helper functions for formatting
function formatDate(dateString: string): string {
  try {
    return format(new Date(dateString), 'dd MMM yyyy');
  } catch (error) {
    return 'Invalid date';
  }
}

function formatRequestType(type: string): string {
  const types: Record<string, string> = {
    access: 'Access',
    deletion: 'Deletion',
    rectification: 'Correction',
    portability: 'Export',
    restriction: 'Restriction',
    objection: 'Objection',
  };
  
  return types[type] || type;
}

function formatRequestStatus(status: string): string {
  const statuses: Record<string, string> = {
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    denied: 'Denied',
  };
  
  return statuses[status] || status;
}

function formatRiskLevel(level: string): string {
  const levels: Record<string, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical',
  };
  
  return levels[level] || level;
}

function formatNotificationStatus(status: string): string {
  const statuses: Record<string, string> = {
    pending: 'Pending',
    notified: 'Notified',
    not_required: 'Not Required',
  };
  
  return statuses[status] || status;
}

// Helper functions for badge variants
function getBadgeVariantForRequestType(type: string): "default" | "secondary" | "destructive" | "outline" {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    access: 'default',
    deletion: 'destructive',
    rectification: 'secondary',
    portability: 'default',
    restriction: 'outline',
    objection: 'outline',
  };
  
  return variants[type] || 'default';
}

function getBadgeVariantForStatus(status: string): "default" | "secondary" | "destructive" | "outline" {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: 'outline',
    processing: 'secondary',
    completed: 'default',
    denied: 'destructive',
  };
  
  return variants[status] || 'default';
}

function getRiskLevelVariant(level: string): "default" | "secondary" | "destructive" | "outline" {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    low: 'outline',
    medium: 'secondary',
    high: 'destructive',
    critical: 'destructive',
  };
  
  return variants[level] || 'default';
}

function getNotificationStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: 'outline',
    notified: 'default',
    not_required: 'secondary',
  };
  
  return variants[status] || 'default';
} 