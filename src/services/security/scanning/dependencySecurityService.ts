/**
 * Dependency Security Service
 * 
 * Provides functionality for managing dependency security:
 * - Automated package security checks
 * - Scheduled security scans
 * - Tracking vulnerable dependencies
 * - Automated patching of vulnerable dependencies
 * - Audit logging for security updates
 */

import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

// Types for dependency security
interface PackageInfo {
  name: string;
  version: string;
  from?: string;
  license?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface DependencyScanResult {
  id: string;
  timestamp: string;
  packageCount: number;
  vulnerabilities: DependencyVulnerability[];
  highSeverityCount: number;
  mediumSeverityCount: number;
  lowSeverityCount: number;
  scanDuration: number;
  isAutofix: boolean;
  fixedVulnerabilities?: number;
}

interface DependencyVulnerability {
  id: string;
  packageName: string;
  packageVersion: string;
  vulnerableVersions: string;
  patchedVersions?: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  description?: string;
  recommendation?: string;
  url?: string;
  cveIds?: string[];
  cweIds?: string[];
  isFixed: boolean;
  fixedAt?: string;
  fixedVersion?: string;
}

/**
 * Configuration for dependency security service
 */
const DEPENDENCY_SECURITY_CONFIG = {
  SCAN_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
  SCAN_TIMEOUT: 5 * 60 * 1000, // 5 minutes
  AUTO_FIX_ALLOWED: true, // Whether to automatically fix vulnerabilities
  AUTO_FIX_SEVERITY_THRESHOLD: 'high', // Minimum severity to auto-fix
  MAX_FIX_ATTEMPTS: 3, // Maximum number of fix attempts
  PACKAGE_JSON_PATH: 'package.json',
  PACKAGE_LOCK_PATH: 'package-lock.json',
  AUDIT_LEVEL: 'high', // Minimum severity level to report
  ALLOWED_LICENSES: [ // Allowed licenses
    'MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', '0BSD',
    'CC0-1.0', 'Unlicense', 'WTFPL', 'MPL-2.0'
  ],
  PROHIBITED_LICENSES: [ // Prohibited licenses
    'GPL-2.0', 'GPL-3.0', 'AGPL-3.0', 'LGPL-2.1', 'LGPL-3.0'
  ]
};

/**
 * Dependency Security Service
 */
class DependencySecurityService {
  private static instance: DependencySecurityService;
  private scanInterval: NodeJS.Timeout | null = null;
  private isScanning = false;
  
  // Make constructor private to enforce singleton
  private constructor() {}
  
  /**
   * Get singleton instance
   */
  public static getInstance(): DependencySecurityService {
    if (!DependencySecurityService.instance) {
      DependencySecurityService.instance = new DependencySecurityService();
    }
    return DependencySecurityService.instance;
  }
  
  /**
   * Initialize the dependency security service
   */
  public async initialize(): Promise<boolean> {
    try {
      // Schedule regular scans
      this.scheduleRegularScans();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize dependency security service:', error);
      return false;
    }
  }
  
  /**
   * Schedule regular scans for vulnerable dependencies
   */
  private scheduleRegularScans(): void {
    // Clear any existing interval
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
    }
    
    // Set up new interval
    this.scanInterval = setInterval(async () => {
      if (!this.isScanning) {
        await this.scanDependencies();
      }
    }, DEPENDENCY_SECURITY_CONFIG.SCAN_INTERVAL);
    
    // Run initial scan immediately
    if (!this.isScanning) {
      this.scanDependencies()
        .catch(error => console.error('Error running initial dependency scan:', error));
    }
  }
  
  /**
   * Scan dependencies for security vulnerabilities
   */
  public async scanDependencies(autofix: boolean = false): Promise<DependencyScanResult | null> {
    if (this.isScanning) {
      console.log('Dependency scan already in progress');
      return null;
    }
    
    this.isScanning = true;
    
    try {
      const startTime = Date.now();
      const scanId = uuidv4();
      
      // Get package information
      const packageInfo = await this.getPackageInfo();
      if (!packageInfo) {
        this.isScanning = false;
        return null;
      }
      
      // Run npm audit to find vulnerabilities
      const auditResult = await this.runNpmAudit();
      if (!auditResult) {
        this.isScanning = false;
        return null;
      }
      
      // Parse audit results
      const vulnerabilities = this.parseAuditResults(auditResult);
      
      // Count vulnerabilities by severity
      const highSeverityCount = vulnerabilities.filter(v => v.severity === 'high' || v.severity === 'critical').length;
      const mediumSeverityCount = vulnerabilities.filter(v => v.severity === 'medium').length;
      const lowSeverityCount = vulnerabilities.filter(v => v.severity === 'low' || v.severity === 'info').length;
      
      // Fix vulnerabilities if autofix is enabled
      let fixedVulnerabilities = 0;
      if (autofix && DEPENDENCY_SECURITY_CONFIG.AUTO_FIX_ALLOWED && highSeverityCount > 0) {
        const fixResult = await this.fixVulnerabilities();
        if (fixResult.success) {
          fixedVulnerabilities = fixResult.fixed;
        }
      }
      
      // Calculate scan duration
      const scanDuration = Date.now() - startTime;
      
      // Create scan result
      const scanResult: DependencyScanResult = {
        id: scanId,
        timestamp: new Date().toISOString(),
        packageCount: this.countPackages(packageInfo),
        vulnerabilities,
        highSeverityCount,
        mediumSeverityCount,
        lowSeverityCount,
        scanDuration,
        isAutofix: autofix,
        fixedVulnerabilities: autofix ? fixedVulnerabilities : undefined
      };
      
      // Save scan result
      await this.saveScanResult(scanResult);
      
      this.isScanning = false;
      return scanResult;
    } catch (error) {
      console.error('Error scanning dependencies:', error);
      this.isScanning = false;
      return null;
    }
  }
  
  /**
   * Get package information
   */
  private async getPackageInfo(): Promise<PackageInfo | null> {
    try {
      const packageJsonPath = path.resolve(process.cwd(), DEPENDENCY_SECURITY_CONFIG.PACKAGE_JSON_PATH);
      const packageJsonData = await fs.readFile(packageJsonPath, 'utf8');
      return JSON.parse(packageJsonData);
    } catch (error) {
      console.error('Error reading package.json:', error);
      return null;
    }
  }
  
  /**
   * Count total packages (dependencies and devDependencies)
   */
  private countPackages(packageInfo: PackageInfo): number {
    const dependencies = packageInfo.dependencies ? Object.keys(packageInfo.dependencies).length : 0;
    const devDependencies = packageInfo.devDependencies ? Object.keys(packageInfo.devDependencies).length : 0;
    return dependencies + devDependencies;
  }
  
  /**
   * Run npm audit to check for vulnerabilities
   */
  private async runNpmAudit(): Promise<any> {
    return new Promise((resolve, reject) => {
      const process = spawn('npm', ['audit', '--json'], { shell: true });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        try {
          if (code !== 0 && code !== 1) {
            // npm audit returns 1 if vulnerabilities are found, which is expected
            console.error(`npm audit exited with code ${code}`);
            console.error('stderr:', stderr);
            resolve(null);
            return;
          }
          
          if (!stdout.trim()) {
            console.log('No audit output received');
            resolve({ vulnerabilities: {} });
            return;
          }
          
          const auditData = JSON.parse(stdout);
          resolve(auditData);
        } catch (error) {
          console.error('Error parsing npm audit output:', error);
          resolve(null);
        }
      });
      
      process.on('error', (err) => {
        console.error('Error running npm audit:', err);
        reject(err);
      });
      
      // Set timeout to prevent hanging
      setTimeout(() => {
        process.kill();
        reject(new Error('npm audit timed out'));
      }, DEPENDENCY_SECURITY_CONFIG.SCAN_TIMEOUT);
    });
  }
  
  /**
   * Parse npm audit results into vulnerabilities
   */
  private parseAuditResults(auditData: any): DependencyVulnerability[] {
    const vulnerabilities: DependencyVulnerability[] = [];
    
    try {
      if (!auditData || !auditData.vulnerabilities) {
        return vulnerabilities;
      }
      
      // Process each vulnerability
      for (const [pkgName, vuln] of Object.entries(auditData.vulnerabilities)) {
        const vulnData = vuln as any;
        
        // Create a vulnerability entry
        vulnerabilities.push({
          id: uuidv4(),
          packageName: pkgName,
          packageVersion: vulnData.version || 'unknown',
          vulnerableVersions: vulnData.range || 'unknown',
          patchedVersions: vulnData.fixAvailable?.version || 'none',
          title: vulnData.name || 'Unknown vulnerability',
          severity: this.mapSeverity(vulnData.severity),
          description: vulnData.overview || vulnData.url || 'No description available',
          recommendation: vulnData.recommendation || 'Update the package to a non-vulnerable version',
          url: vulnData.url,
          cveIds: vulnData.cves || undefined,
          cweIds: vulnData.cwe ? [vulnData.cwe] : undefined,
          isFixed: false
        });
      }
    } catch (error) {
      console.error('Error parsing npm audit results:', error);
    }
    
    return vulnerabilities;
  }
  
  /**
   * Map npm audit severity to our severity levels
   */
  private mapSeverity(npmSeverity: string): 'critical' | 'high' | 'medium' | 'low' | 'info' {
    switch (npmSeverity.toLowerCase()) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'high';
      case 'moderate':
        return 'medium';
      case 'low':
        return 'low';
      default:
        return 'info';
    }
  }
  
  /**
   * Save dependency scan result
   */
  private async saveScanResult(scan: DependencyScanResult): Promise<void> {
    try {
      // Store scan result in database
      const { error } = await supabase
        .from('dependency_scans')
        .insert({
          id: scan.id,
          timestamp: scan.timestamp,
          package_count: scan.packageCount,
          high_severity_count: scan.highSeverityCount,
          medium_severity_count: scan.mediumSeverityCount,
          low_severity_count: scan.lowSeverityCount,
          scan_duration: scan.scanDuration,
          is_autofix: scan.isAutofix,
          fixed_vulnerabilities: scan.fixedVulnerabilities
        });
      
      if (error) {
        console.error('Error saving dependency scan result:', error);
        return;
      }
      
      // Store vulnerabilities
      for (const vulnerability of scan.vulnerabilities) {
        const { error: vulnError } = await supabase
          .from('dependency_vulnerabilities')
          .insert({
            id: vulnerability.id,
            scan_id: scan.id,
            package_name: vulnerability.packageName,
            package_version: vulnerability.packageVersion,
            vulnerable_versions: vulnerability.vulnerableVersions,
            patched_versions: vulnerability.patchedVersions,
            title: vulnerability.title,
            severity: vulnerability.severity,
            description: vulnerability.description,
            recommendation: vulnerability.recommendation,
            url: vulnerability.url,
            cve_ids: vulnerability.cveIds,
            cwe_ids: vulnerability.cweIds,
            is_fixed: vulnerability.isFixed,
            fixed_at: vulnerability.fixedAt,
            fixed_version: vulnerability.fixedVersion
          });
        
        if (vulnError) {
          console.error('Error saving dependency vulnerability:', vulnError);
        }
      }
    } catch (error) {
      console.error('Error saving dependency scan result:', error);
    }
  }
  
  /**
   * Fix vulnerabilities using npm audit fix
   */
  public async fixVulnerabilities(): Promise<{ success: boolean, fixed: number }> {
    return new Promise((resolve) => {
      const process = spawn('npm', ['audit', 'fix', '--json'], { shell: true });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        try {
          if (code !== 0) {
            console.error('npm audit fix failed with code:', code);
            console.error('stderr:', stderr);
            resolve({ success: false, fixed: 0 });
            return;
          }
          
          // Parse the output to determine how many vulnerabilities were fixed
          let fixed = 0;
          try {
            const result = JSON.parse(stdout);
            if (result.audit && result.audit.remediation && result.audit.remediation.fixes) {
              fixed = Object.keys(result.audit.remediation.fixes).length;
            }
          } catch (parseError) {
            console.error('Error parsing npm audit fix output:', parseError);
          }
          
          resolve({ success: true, fixed });
        } catch (error) {
          console.error('Error in npm audit fix process:', error);
          resolve({ success: false, fixed: 0 });
        }
      });
      
      process.on('error', (err) => {
        console.error('Error running npm audit fix:', err);
        resolve({ success: false, fixed: 0 });
      });
      
      // Set timeout to prevent hanging
      setTimeout(() => {
        process.kill();
        resolve({ success: false, fixed: 0 });
      }, DEPENDENCY_SECURITY_CONFIG.SCAN_TIMEOUT);
    });
  }
  
  /**
   * Check if a package has a prohibited license
   */
  public async checkLicenseCompliance(): Promise<{
    compliant: boolean;
    prohibitedPackages: Array<{ name: string; license: string }>;
    unknownLicenses: Array<{ name: string }>;
  }> {
    try {
      // Run npm list to get package information including licenses
      const { stdout } = await this.runCommand('npm', ['list', '--json', '--all']);
      
      if (!stdout) {
        return { compliant: false, prohibitedPackages: [], unknownLicenses: [] };
      }
      
      const packageData = JSON.parse(stdout);
      const prohibitedPackages: Array<{ name: string; license: string }> = [];
      const unknownLicenses: Array<{ name: string }> = [];
      
      // Process dependencies recursively
      const processPackage = (pkg: any, pkgName: string) => {
        if (pkg.license) {
          // Single license
          if (typeof pkg.license === 'string') {
            if (DEPENDENCY_SECURITY_CONFIG.PROHIBITED_LICENSES.includes(pkg.license)) {
              prohibitedPackages.push({ name: pkgName, license: pkg.license });
            } else if (!DEPENDENCY_SECURITY_CONFIG.ALLOWED_LICENSES.includes(pkg.license)) {
              unknownLicenses.push({ name: pkgName });
            }
          }
          // License object
          else if (pkg.license.type) {
            if (DEPENDENCY_SECURITY_CONFIG.PROHIBITED_LICENSES.includes(pkg.license.type)) {
              prohibitedPackages.push({ name: pkgName, license: pkg.license.type });
            } else if (!DEPENDENCY_SECURITY_CONFIG.ALLOWED_LICENSES.includes(pkg.license.type)) {
              unknownLicenses.push({ name: pkgName });
            }
          }
        } else {
          // No license information
          unknownLicenses.push({ name: pkgName });
        }
        
        // Process dependencies
        if (pkg.dependencies) {
          for (const [depName, dep] of Object.entries(pkg.dependencies)) {
            if (typeof dep === 'object' && dep !== null) {
              processPackage(dep, depName);
            }
          }
        }
      };
      
      // Start processing from root
      if (packageData.dependencies) {
        for (const [depName, dep] of Object.entries(packageData.dependencies)) {
          if (typeof dep === 'object' && dep !== null) {
            processPackage(dep as any, depName);
          }
        }
      }
      
      return {
        compliant: prohibitedPackages.length === 0,
        prohibitedPackages,
        unknownLicenses
      };
    } catch (error) {
      console.error('Error checking license compliance:', error);
      return { compliant: false, prohibitedPackages: [], unknownLicenses: [] };
    }
  }
  
  /**
   * Run a shell command and return output
   */
  private runCommand(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, { shell: true });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
          return;
        }
        
        resolve({ stdout, stderr });
      });
      
      process.on('error', (err) => {
        reject(err);
      });
      
      // Set timeout to prevent hanging
      setTimeout(() => {
        process.kill();
        reject(new Error('Command timed out'));
      }, DEPENDENCY_SECURITY_CONFIG.SCAN_TIMEOUT);
    });
  }
  
  /**
   * Get recent dependency scan results
   */
  public async getRecentScans(limit: number = 10): Promise<DependencyScanResult[]> {
    try {
      const { data, error } = await supabase
        .from('dependency_scans')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Error fetching recent dependency scans:', error);
        return [];
      }
      
      // Convert database records to DependencyScanResult
      const scans: DependencyScanResult[] = [];
      
      for (const scan of data) {
        // Get vulnerabilities for this scan
        const { data: vulnData, error: vulnError } = await supabase
          .from('dependency_vulnerabilities')
          .select('*')
          .eq('scan_id', scan.id);
        
        if (vulnError) {
          console.error('Error fetching vulnerabilities for scan:', vulnError);
          continue;
        }
        
        // Convert to DependencyVulnerability objects
        const vulnerabilities: DependencyVulnerability[] = (vulnData || []).map(v => ({
          id: v.id,
          packageName: v.package_name,
          packageVersion: v.package_version,
          vulnerableVersions: v.vulnerable_versions,
          patchedVersions: v.patched_versions,
          title: v.title,
          severity: v.severity,
          description: v.description,
          recommendation: v.recommendation,
          url: v.url,
          cveIds: v.cve_ids,
          cweIds: v.cwe_ids,
          isFixed: v.is_fixed,
          fixedAt: v.fixed_at,
          fixedVersion: v.fixed_version
        }));
        
        scans.push({
          id: scan.id,
          timestamp: scan.timestamp,
          packageCount: scan.package_count,
          vulnerabilities,
          highSeverityCount: scan.high_severity_count,
          mediumSeverityCount: scan.medium_severity_count,
          lowSeverityCount: scan.low_severity_count,
          scanDuration: scan.scan_duration,
          isAutofix: scan.is_autofix,
          fixedVulnerabilities: scan.fixed_vulnerabilities
        });
      }
      
      return scans;
    } catch (error) {
      console.error('Error fetching recent dependency scans:', error);
      return [];
    }
  }
  
  /**
   * Mark a vulnerability as fixed
   */
  public async markVulnerabilityAsFixed(
    vulnerabilityId: string, 
    fixedVersion: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('dependency_vulnerabilities')
        .update({
          is_fixed: true,
          fixed_at: new Date().toISOString(),
          fixed_version: fixedVersion
        })
        .eq('id', vulnerabilityId);
      
      if (error) {
        console.error('Error marking vulnerability as fixed:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error marking vulnerability as fixed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const dependencySecurityService = DependencySecurityService.getInstance();
export default dependencySecurityService; 