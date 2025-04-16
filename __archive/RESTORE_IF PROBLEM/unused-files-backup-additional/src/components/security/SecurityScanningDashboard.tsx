import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, CheckCircle, Clock, RefreshCw, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { securityScanningService, VulnerabilityScan, VulnerabilityFinding, SecurityPatch } from '@/services/securityScanningService';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

const SecurityScanningDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isScanRunning, setIsScanRunning] = useState(false);
  const [latestScan, setLatestScan] = useState<VulnerabilityScan | null>(null);
  const [scans, setScans] = useState<VulnerabilityScan[]>([]);
  const [patches, setPatches] = useState<SecurityPatch[]>([]);
  const [selectedScan, setSelectedScan] = useState<string | null>(null);
  const [selectedFindings, setSelectedFindings] = useState<VulnerabilityFinding[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load scans and patches
      const scanList = await securityScanningService.getVulnerabilityScans(1, 10);
      setScans(scanList);
      setLatestScan(scanList.length > 0 ? scanList[0] : null);
      
      const patchList = await securityScanningService.getSecurityPatches(1, 10);
      setPatches(patchList);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading security data:', error);
      toast({
        title: 'Error loading data',
        description: 'Failed to load security information. Please try again.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const handleRunScan = async () => {
    if (isScanRunning) return;
    
    setIsScanRunning(true);
    toast({
      title: 'Starting security scan',
      description: 'This may take a few minutes. You can continue using the system.',
    });
    
    try {
      const result = await securityScanningService.runAllSecurityScans();
      toast({
        title: 'Security scan completed',
        description: result,
      });
      
      // Reload data to get the latest scan results
      await loadData();
      
    } catch (error) {
      toast({
        title: 'Scan failed',
        description: `Error: ${(error as Error).message}`,
        variant: 'destructive',
      });
    } finally {
      setIsScanRunning(false);
    }
  };

  const handleViewScanDetails = async (scanId: string) => {
    setSelectedScan(scanId);
    setActiveTab('findings');
    
    try {
      const findings = await securityScanningService.getVulnerabilityFindings(scanId);
      setSelectedFindings(findings);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load scan findings',
        variant: 'destructive',
      });
    }
  };

  const handleApplyPatch = async (patchId: string) => {
    try {
      const success = await securityScanningService.applySecurityPatch(patchId);
      if (success) {
        toast({
          title: 'Patch applied',
          description: 'Security patch has been successfully applied.',
        });
        await loadData(); // Reload patch data
      } else {
        toast({
          title: 'Failed to apply patch',
          description: 'There was an error applying the patch.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to apply security patch: ${(error as Error).message}`,
        variant: 'destructive',
      });
    }
  };

  const handleVerifyPatch = async (patchId: string, verified: boolean) => {
    try {
      const success = await securityScanningService.verifySecurityPatch(
        patchId, 
        verified, 
        verified ? 'Verified as successfully applied' : 'Verification failed'
      );
      
      if (success) {
        toast({
          title: verified ? 'Patch verified' : 'Patch verification failed',
          description: verified 
            ? 'Security patch has been verified as successfully applied.'
            : 'Patch verification failed. Please check logs and try again.',
          variant: verified ? 'default' : 'destructive',
        });
        await loadData(); // Reload patch data
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to verify security patch: ${(error as Error).message}`,
        variant: 'destructive',
      });
    }
  };

  const renderSeverityBadge = (severity: string) => {
    const styles = {
      critical: 'bg-red-500 hover:bg-red-600',
      high: 'bg-orange-500 hover:bg-orange-600',
      medium: 'bg-yellow-500 hover:bg-yellow-600',
      low: 'bg-blue-500 hover:bg-blue-600',
      info: 'bg-gray-500 hover:bg-gray-600'
    };
    
    return (
      <Badge className={styles[severity as keyof typeof styles] || 'bg-gray-500'}>
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </Badge>
    );
  };

  const renderStatusBadge = (status: string) => {
    const styles = {
      scheduled: 'bg-blue-500 hover:bg-blue-600',
      'in_progress': 'bg-purple-500 hover:bg-purple-600',
      completed: 'bg-green-500 hover:bg-green-600',
      failed: 'bg-red-500 hover:bg-red-600',
      planned: 'bg-blue-500 hover:bg-blue-600',
      applied: 'bg-yellow-500 hover:bg-yellow-600',
      verified: 'bg-green-500 hover:bg-green-600'
    };
    
    return (
      <Badge className={styles[status as keyof typeof styles] || 'bg-gray-500'}>
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
      </Badge>
    );
  };

  const renderOverviewTab = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <ShieldAlert className="h-8 w-8 text-red-500" />
                <span className="text-2xl font-bold">
                  {latestScan?.critical_issues || 0}
                </span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">High Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Shield className="h-8 w-8 text-orange-500" />
                <span className="text-2xl font-bold">
                  {latestScan?.high_issues || 0}
                </span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending Patches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Clock className="h-8 w-8 text-blue-500" />
                <span className="text-2xl font-bold">
                  {patches.filter(p => p.status === 'planned' || p.status === 'in_progress').length}
                </span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Last Scan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-6 w-6 text-gray-500" />
                <span className="text-sm">
                  {latestScan 
                    ? format(new Date(latestScan.scan_date), 'dd/MM/yyyy HH:mm')
                    : 'Never'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {(latestScan?.critical_issues || 0) > 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Critical security issues found</AlertTitle>
            <AlertDescription>
              Your application has {latestScan?.critical_issues} critical security issues that require immediate attention.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Scans</CardTitle>
              <CardDescription>History of security scans</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Issues</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scans.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No scans found. Run your first security scan.
                        </TableCell>
                      </TableRow>
                    ) : (
                      scans.map((scan) => (
                        <TableRow key={scan.id}>
                          <TableCell>
                            {format(new Date(scan.scan_date), 'dd/MM/yyyy HH:mm')}
                          </TableCell>
                          <TableCell>{scan.scan_type}</TableCell>
                          <TableCell>{renderStatusBadge(scan.scan_status)}</TableCell>
                          <TableCell>
                            {scan.total_issues > 0 ? (
                              <div className="flex space-x-1">
                                {scan.critical_issues > 0 && (
                                  <Badge variant="destructive">{scan.critical_issues} critical</Badge>
                                )}
                                {scan.high_issues > 0 && (
                                  <Badge variant="outline" className="bg-orange-500 text-white">{scan.high_issues} high</Badge>
                                )}
                              </div>
                            ) : (
                              <Badge variant="outline" className="bg-green-500 text-white">
                                Clean
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleViewScanDetails(scan.id)}
                            >
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleRunScan} 
                disabled={isScanRunning}
                className="ml-auto"
              >
                {isScanRunning ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Run New Scan
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Security Patches</CardTitle>
              <CardDescription>Pending and applied security fixes</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patch</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No security patches found
                        </TableCell>
                      </TableRow>
                    ) : (
                      patches.map((patch) => (
                        <TableRow key={patch.id}>
                          <TableCell>
                            <div className="font-medium">{patch.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {patch.affected_components.join(', ')}
                            </div>
                          </TableCell>
                          <TableCell>{renderSeverityBadge(patch.severity)}</TableCell>
                          <TableCell>{renderStatusBadge(patch.status)}</TableCell>
                          <TableCell>
                            {patch.status === 'planned' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleApplyPatch(patch.id)}
                              >
                                Apply
                              </Button>
                            )}
                            {patch.status === 'applied' && (
                              <div className="flex space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="bg-green-50"
                                  onClick={() => handleVerifyPatch(patch.id, true)}
                                >
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  Verify
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="bg-red-50"
                                  onClick={() => handleVerifyPatch(patch.id, false)}
                                >
                                  <AlertCircle className="mr-1 h-3 w-3" />
                                  Failed
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </>
    );
  };

  const renderFindingsTab = () => {
    if (!selectedScan) {
      return (
        <div className="p-6 text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No scan selected</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Select a scan from the overview tab to view its findings
          </p>
          <Button 
            className="mt-4" 
            variant="outline" 
            onClick={() => setActiveTab('overview')}
          >
            Go to overview
          </Button>
        </div>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Vulnerability Findings</CardTitle>
          <CardDescription>
            Detailed results from scan on {selectedScan && 
              format(new Date(scans.find(s => s.id === selectedScan)?.scan_date || ''), 'dd/MM/yyyy HH:mm')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recommendation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedFindings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No vulnerabilities found in this scan
                    </TableCell>
                  </TableRow>
                ) : (
                  selectedFindings.map((finding) => (
                    <TableRow key={finding.id}>
                      <TableCell>
                        <div className="font-medium">{finding.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {finding.description}
                        </div>
                        {finding.cve_id && (
                          <Badge variant="outline" className="mt-1">
                            {finding.cve_id}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{renderSeverityBadge(finding.severity)}</TableCell>
                      <TableCell>
                        {finding.component_name || finding.file_path ? (
                          <div>
                            <div>{finding.component_name || finding.file_path}</div>
                            {finding.line_number && (
                              <div className="text-sm text-muted-foreground">
                                Line: {finding.line_number}
                              </div>
                            )}
                            {finding.component_version && (
                              <div className="text-sm text-muted-foreground">
                                Version: {finding.component_version}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={finding.remediation_status === 'fixed' ? 'default' : 'outline'}
                          className={
                            finding.remediation_status === 'fixed' 
                              ? 'bg-green-500 hover:bg-green-600' 
                              : finding.remediation_status === 'in_progress'
                                ? 'bg-yellow-500 hover:bg-yellow-600'
                                : ''
                          }
                        >
                          {finding.remediation_status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm max-w-md">
                          {finding.recommendation}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Security Scanning</h1>
          <p className="text-muted-foreground">
            Monitor and manage security vulnerabilities
          </p>
        </div>
        <Button onClick={handleRunScan} disabled={isScanRunning}>
          {isScanRunning ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Run Security Scan
            </>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="findings">Findings</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          {renderOverviewTab()}
        </TabsContent>
        <TabsContent value="findings">
          {renderFindingsTab()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SecurityScanningDashboard; 