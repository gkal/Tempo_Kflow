import { supabaseClient } from '@/lib/supabaseClient';
import { createRecord, updateRecord, fetchRecords } from '@/services/api/supabaseService';
import { toast } from '@/components/ui/use-toast';
import axios from 'axios';

// Types
export interface VulnerabilityScan {
  id: string;
  scan_date: string;
  scan_type: 'dependency' | 'code' | 'network' | 'config';
  scan_status: 'scheduled' | 'in_progress' | 'completed' | 'failed';
  findings: VulnerabilityFinding[];
  total_issues: number;
  critical_issues: number;
  high_issues: number;
  medium_issues: number;
  low_issues: number;
  created_by: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface VulnerabilityFinding {
  id: string;
  scan_id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  component_name?: string;
  component_version?: string;
  vulnerable_code?: string;
  file_path?: string;
  line_number?: number;
  recommendation: string;
  cve_id?: string;
  remediation_status: 'open' | 'in_progress' | 'fixed' | 'wont_fix' | 'false_positive';
  assigned_to?: string;
  fix_version?: string;
  fixed_date?: string;
  is_deleted: boolean;
}

export interface SecurityPatch {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  affected_components: string[];
  patch_date: string;
  status: 'planned' | 'in_progress' | 'applied' | 'verified' | 'failed';
  applied_by?: string;
  verified_by?: string;
  verification_date?: string;
  related_findings: string[];
  notes?: string;
  is_deleted: boolean;
}

export interface DependencyCheckResult {
  packageName: string;
  currentVersion: string;
  latestVersion: string;
  vulnerabilities: {
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    fixedInVersion: string;
  }[];
  updateAvailable: boolean;
  isSecurity: boolean;
}

// Security Scanning Service
class SecurityScanningService {
  private static instance: SecurityScanningService;
  private scanInProgress: boolean = false;
  private lastScanDate: Date | null = null;
  private scanInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  /**
   * Get the singleton instance of the SecurityScanningService
   */
  public static getInstance(): SecurityScanningService {
    if (!SecurityScanningService.instance) {
      SecurityScanningService.instance = new SecurityScanningService();
    }
    return SecurityScanningService.instance;
  }

  /**
   * Start automated security scanning on a schedule
   * @param intervalHours The number of hours between scans
   */
  public startAutomatedScanning(intervalHours: number = 24): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
    }

    // Convert hours to milliseconds
    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    this.scanInterval = setInterval(() => {
      this.runAllSecurityScans();
    }, intervalMs);

    console.log(`Automated security scanning scheduled every ${intervalHours} hours`);
  }

  /**
   * Stop automated security scanning
   */
  public stopAutomatedScanning(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
      console.log('Automated security scanning stopped');
    }
  }

  /**
   * Run all security scans (dependency, code, network, config)
   */
  public async runAllSecurityScans(): Promise<string> {
    if (this.scanInProgress) {
      return 'A scan is already in progress. Please try again later.';
    }
    
    try {
      this.scanInProgress = true;
      
      // Create a new scan record
      const userId = (await supabaseClient.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('User not authenticated');
      
      const scanRecord = await createRecord<Omit<VulnerabilityScan, 'id'>>('vulnerability_scans', {
        scan_date: new Date().toISOString(),
        scan_type: 'dependency',
        scan_status: 'in_progress',
        findings: [],
        total_issues: 0,
        critical_issues: 0,
        high_issues: 0,
        medium_issues: 0,
        low_issues: 0,
        created_by: userId,
        updated_at: new Date().toISOString(),
        is_deleted: false
      });
      
      const scanId = scanRecord.id;
      
      // Run all scan types in parallel
      const [dependencyResults, codeResults, networkResults, configResults] = await Promise.all([
        this.runDependencyCheck(),
        this.runCodeSecurityAnalysis(),
        this.runNetworkVulnerabilityCheck(),
        this.runConfigSecurityCheck()
      ]);
      
      // Combine all findings
      const allFindings = [
        ...dependencyResults, 
        ...codeResults,
        ...networkResults,
        ...configResults
      ];
      
      // Update scan record with results
      const criticalCount = allFindings.filter(f => f.severity === 'critical').length;
      const highCount = allFindings.filter(f => f.severity === 'high').length;
      const mediumCount = allFindings.filter(f => f.severity === 'medium').length;
      const lowCount = allFindings.filter(f => f.severity === 'low').length;
      
      await updateRecord<Partial<VulnerabilityScan>>('vulnerability_scans', scanId, {
        scan_status: 'completed',
        findings: allFindings,
        total_issues: allFindings.length,
        critical_issues: criticalCount,
        high_issues: highCount,
        medium_issues: mediumCount,
        low_issues: lowCount,
        updated_at: new Date().toISOString()
      });
      
      this.lastScanDate = new Date();
      this.scanInProgress = false;
      
      // If critical or high findings, create security patches
      if (criticalCount > 0 || highCount > 0) {
        await this.createSecurityPatches(allFindings.filter(f => 
          f.severity === 'critical' || f.severity === 'high'
        ));
      }
      
      return `Security scan completed. Found ${allFindings.length} issues (${criticalCount} critical, ${highCount} high, ${mediumCount} medium, ${lowCount} low)`;
      
    } catch (error) {
      this.scanInProgress = false;
      console.error('Error running security scans:', error);
      return `Error running security scans: ${(error as Error).message}`;
    }
  }

  /**
   * Run dependency security check
   */
  private async runDependencyCheck(): Promise<VulnerabilityFinding[]> {
    try {
      // In a real implementation, this would call npm audit or similar
      // For demonstration, we'll simulate the check with sample data
      
      const findings: VulnerabilityFinding[] = [];
      const dependencies = await this.fetchProjectDependencies();
      
      for (const dep of dependencies) {
        if (dep.vulnerabilities && dep.vulnerabilities.length > 0) {
          for (const vuln of dep.vulnerabilities) {
            findings.push({
              id: `dep-${crypto.randomUUID()}`,
              scan_id: '',  // Will be updated when saving to DB
              title: vuln.title || `Vulnerability in ${dep.packageName}`,
              description: vuln.description || `A security vulnerability was found in ${dep.packageName} version ${dep.currentVersion}`,
              severity: vuln.severity,
              component_name: dep.packageName,
              component_version: dep.currentVersion,
              recommendation: `Update to version ${vuln.fixedInVersion} or later`,
              cve_id: vuln.id,
              remediation_status: 'open',
              is_deleted: false
            });
          }
        }
      }
      
      return findings;
      
    } catch (error) {
      console.error('Error running dependency check:', error);
      return [];
    }
  }
  
  /**
   * Run code security analysis
   */
  private async runCodeSecurityAnalysis(): Promise<VulnerabilityFinding[]> {
    try {
      // In a real implementation, this would integrate with tools like SonarQube or ESLint security rules
      // For demonstration, we'll simulate the analysis with sample data
      
      // Sample findings that would come from a real code scanner
      const sampleFindings = [
        {
          title: 'Potential XSS vulnerability',
          description: 'Unsanitized user input is directly rendered to the DOM',
          severity: 'high' as const,
          file_path: 'src/components/forms/FormInput.tsx',
          line_number: 45,
          vulnerable_code: 'div.innerHTML = userInput;',
          recommendation: 'Use DOMPurify or React\'s dangerouslySetInnerHTML with sanitization'
        },
        {
          title: 'SQL Injection risk',
          description: 'Raw user input is used in database query',
          severity: 'critical' as const,
          file_path: 'src/services/customerService.ts',
          line_number: 127,
          vulnerable_code: 'const result = await supabase.rpc("search_customers", { search_term: userInput });',
          recommendation: 'Use parameterized queries and validate user input'
        }
      ];
      
      return sampleFindings.map(finding => ({
        id: `code-${crypto.randomUUID()}`,
        scan_id: '',  // Will be updated when saving to DB
        title: finding.title,
        description: finding.description,
        severity: finding.severity,
        file_path: finding.file_path,
        line_number: finding.line_number,
        vulnerable_code: finding.vulnerable_code,
        recommendation: finding.recommendation,
        remediation_status: 'open',
        is_deleted: false
      }));
      
    } catch (error) {
      console.error('Error running code security analysis:', error);
      return [];
    }
  }
  
  /**
   * Run network vulnerability check
   */
  private async runNetworkVulnerabilityCheck(): Promise<VulnerabilityFinding[]> {
    try {
      // In a real implementation, this would use tools like OWASP ZAP or Burp Suite API
      // For demonstration, we'll simulate the check with sample data
      
      // This would typically be a scan of the deployed application
      return [];
      
    } catch (error) {
      console.error('Error running network vulnerability check:', error);
      return [];
    }
  }
  
  /**
   * Run configuration security check
   */
  private async runConfigSecurityCheck(): Promise<VulnerabilityFinding[]> {
    try {
      // In a real implementation, this would check configuration files
      // For demonstration, we'll simulate the check with sample data
      
      // Sample findings that would come from a real config scanner
      const sampleFindings = [
        {
          title: 'Missing CSP header',
          description: 'Content Security Policy header is not set in the application',
          severity: 'medium' as const,
          component_name: 'next.config.js',
          recommendation: 'Add Content-Security-Policy header with appropriate restrictions'
        },
        {
          title: 'Insecure cookie settings',
          description: 'Cookies are not set with secure and httpOnly flags',
          severity: 'high' as const,
          component_name: 'Authentication configuration',
          recommendation: 'Enable secure and httpOnly flags for all cookies'
        }
      ];
      
      return sampleFindings.map(finding => ({
        id: `config-${crypto.randomUUID()}`,
        scan_id: '',  // Will be updated when saving to DB
        title: finding.title,
        description: finding.description,
        severity: finding.severity,
        component_name: finding.component_name,
        recommendation: finding.recommendation,
        remediation_status: 'open',
        is_deleted: false
      }));
      
    } catch (error) {
      console.error('Error running config security check:', error);
      return [];
    }
  }
  
  /**
   * Create security patches for critical and high severity findings
   */
  private async createSecurityPatches(findings: VulnerabilityFinding[]): Promise<void> {
    try {
      const userId = (await supabaseClient.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('User not authenticated');
      
      // Group findings by component
      const componentGroups = findings.reduce((groups, finding) => {
        const component = finding.component_name || finding.file_path || 'unknown';
        if (!groups[component]) {
          groups[component] = [];
        }
        groups[component].push(finding);
        return groups;
      }, {} as Record<string, VulnerabilityFinding[]>);
      
      // Create a patch for each component with issues
      for (const [component, componentFindings] of Object.entries(componentGroups)) {
        const highestSeverity = this.getHighestSeverity(componentFindings);
        
        // Create security patch record
        await createRecord<Omit<SecurityPatch, 'id'>>('security_patches', {
          title: `Security patch for ${component}`,
          description: `Fixes ${componentFindings.length} security issues in ${component}`,
          severity: highestSeverity,
          affected_components: [component],
          patch_date: new Date().toISOString(),
          status: 'planned',
          related_findings: componentFindings.map(f => f.id),
          notes: `This patch addresses the following issues:\n${componentFindings.map(f => `- ${f.title}`).join('\n')}`,
          is_deleted: false
        });
      }
      
    } catch (error) {
      console.error('Error creating security patches:', error);
    }
  }
  
  /**
   * Get the highest severity from a list of findings
   */
  private getHighestSeverity(findings: VulnerabilityFinding[]): 'critical' | 'high' | 'medium' | 'low' {
    if (findings.some(f => f.severity === 'critical')) return 'critical';
    if (findings.some(f => f.severity === 'high')) return 'high';
    if (findings.some(f => f.severity === 'medium')) return 'medium';
    return 'low';
  }
  
  /**
   * Fetch project dependencies using package.json
   * In a real implementation, this would parse package.json and check npm audit
   */
  private async fetchProjectDependencies(): Promise<DependencyCheckResult[]> {
    try {
      // Simulated dependency check results
      return [
        {
          packageName: 'react',
          currentVersion: '18.2.0',
          latestVersion: '18.2.0',
          vulnerabilities: [],
          updateAvailable: false,
          isSecurity: false
        },
        {
          packageName: 'next',
          currentVersion: '13.4.12',
          latestVersion: '14.0.3',
          vulnerabilities: [],
          updateAvailable: true,
          isSecurity: false
        },
        {
          packageName: 'axios',
          currentVersion: '1.4.0',
          latestVersion: '1.6.2',
          vulnerabilities: [
            {
              id: 'CVE-2023-45857',
              severity: 'high',
              title: 'Axios SSRF vulnerability',
              description: 'Axios before 1.6.0 is vulnerable to Server-Side Request Forgery (SSRF) due to improper validation of URLs.',
              fixedInVersion: '1.6.0'
            }
          ],
          updateAvailable: true,
          isSecurity: true
        }
      ];
    } catch (error) {
      console.error('Error fetching project dependencies:', error);
      return [];
    }
  }
  
  /**
   * Get all security patches with pagination
   */
  public async getSecurityPatches(page = 1, limit = 10): Promise<SecurityPatch[]> {
    try {
      const { data, error } = await supabaseClient
        .from('security_patches')
        .select('*')
        .eq('is_deleted', false)
        .order('patch_date', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);
        
      if (error) throw error;
      return data as SecurityPatch[];
      
    } catch (error) {
      console.error('Error fetching security patches:', error);
      return [];
    }
  }
  
  /**
   * Apply a security patch
   */
  public async applySecurityPatch(patchId: string): Promise<boolean> {
    try {
      const userId = (await supabaseClient.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('User not authenticated');
      
      // Update patch status
      await updateRecord<Partial<SecurityPatch>>('security_patches', patchId, {
        status: 'applied',
        applied_by: userId,
        updated_at: new Date().toISOString()
      });
      
      // In a real implementation, this would trigger CI/CD pipeline
      // or apply the patch through automation
      
      return true;
      
    } catch (error) {
      console.error('Error applying security patch:', error);
      return false;
    }
  }
  
  /**
   * Verify a security patch
   */
  public async verifySecurityPatch(patchId: string, verified: boolean, notes?: string): Promise<boolean> {
    try {
      const userId = (await supabaseClient.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('User not authenticated');
      
      // Update patch status
      await updateRecord<Partial<SecurityPatch>>('security_patches', patchId, {
        status: verified ? 'verified' : 'failed',
        verified_by: userId,
        verification_date: new Date().toISOString(),
        notes: notes ? `${notes}\n\n${notes}` : undefined,
        updated_at: new Date().toISOString()
      });
      
      return true;
      
    } catch (error) {
      console.error('Error verifying security patch:', error);
      return false;
    }
  }
  
  /**
   * Get all vulnerability scans with pagination
   */
  public async getVulnerabilityScans(page = 1, limit = 10): Promise<VulnerabilityScan[]> {
    try {
      const { data, error } = await supabaseClient
        .from('vulnerability_scans')
        .select('*')
        .eq('is_deleted', false)
        .order('scan_date', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);
        
      if (error) throw error;
      return data as VulnerabilityScan[];
      
    } catch (error) {
      console.error('Error fetching vulnerability scans:', error);
      return [];
    }
  }
  
  /**
   * Get scan details with findings
   */
  public async getScanDetails(scanId: string): Promise<VulnerabilityScan | null> {
    try {
      const { data, error } = await supabaseClient
        .from('vulnerability_scans')
        .select('*')
        .eq('id', scanId)
        .eq('is_deleted', false)
        .single();
        
      if (error) throw error;
      return data as VulnerabilityScan;
      
    } catch (error) {
      console.error('Error fetching scan details:', error);
      return null;
    }
  }
  
  /**
   * Get vulnerability findings by scan ID
   */
  public async getVulnerabilityFindings(scanId: string): Promise<VulnerabilityFinding[]> {
    try {
      const scan = await this.getScanDetails(scanId);
      return scan?.findings || [];
      
    } catch (error) {
      console.error('Error fetching vulnerability findings:', error);
      return [];
    }
  }
  
  /**
   * Update a vulnerability finding status
   */
  public async updateFindingStatus(
    scanId: string,
    findingId: string,
    status: VulnerabilityFinding['remediation_status'],
    assignedTo?: string,
    notes?: string
  ): Promise<boolean> {
    try {
      const scan = await this.getScanDetails(scanId);
      if (!scan) return false;
      
      const findings = [...scan.findings];
      const findingIndex = findings.findIndex(f => f.id === findingId);
      
      if (findingIndex === -1) return false;
      
      findings[findingIndex] = {
        ...findings[findingIndex],
        remediation_status: status,
        assigned_to: assignedTo || findings[findingIndex].assigned_to
      };
      
      // Update the scan record with the modified findings
      await updateRecord<Partial<VulnerabilityScan>>('vulnerability_scans', scanId, {
        findings: findings,
        updated_at: new Date().toISOString()
      });
      
      return true;
      
    } catch (error) {
      console.error('Error updating finding status:', error);
      return false;
    }
  }
}

// Export singleton instance
export const securityScanningService = SecurityScanningService.getInstance();
export default securityScanningService; 