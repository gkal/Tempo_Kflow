/**
 * Patch Management Service
 * 
 * Provides functionality for managing security patches:
 * - Tracking security patches and updates
 * - Automated patch application
 * - Patch testing and verification
 * - Rollback capability for failed patches
 * - Audit logging for applied patches
 */

import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { dependencySecurityService } from './dependencySecurityService';

// Types for patch management
export interface Patch {
  id: string;
  name: string;
  description: string;
  packageName?: string;
  packageVersion?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'approved' | 'applied' | 'failed' | 'rolled_back';
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  appliedAt?: string;
  failedAt?: string;
  failureReason?: string;
  rolledBackAt?: string;
  patchType: 'dependency' | 'system' | 'application' | 'database';
  affectedComponents: string[];
  testResults?: PatchTestResult[];
  backupCreated?: boolean;
  backupLocation?: string;
  cveIds?: string[];
}

export interface PatchTestResult {
  id: string;
  patchId: string;
  testName: string;
  status: 'passed' | 'failed' | 'skipped';
  details?: string;
  timestamp: string;
}

export interface PatchApplication {
  success: boolean;
  message: string;
  details?: string;
  affectedPackages?: number;
  backupLocation?: string;
}

// Configuration for patch management
const PATCH_MANAGEMENT_CONFIG = {
  AUTO_APPROVE_PATCHES: false,
  AUTO_APPLY_PATCHES: false,
  TEST_BEFORE_APPLY: true,
  CREATE_BACKUPS: true,
  BACKUP_DIR: './backups/patches',
  SEVERITY_AUTO_APPROVAL: ['critical'], // Severities that get auto-approved
  SCAN_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
  OPERATION_TIMEOUT: 10 * 60 * 1000, // 10 minutes
  MAX_RETRY_COUNT: 3,
  ROLLBACK_ON_FAILURE: true
};

/**
 * Patch Management Service
 */
class PatchManagementService {
  private static instance: PatchManagementService;
  private scanInterval: NodeJS.Timeout | null = null;
  
  // Make constructor private to enforce singleton
  private constructor() {}
  
  /**
   * Get singleton instance
   */
  public static getInstance(): PatchManagementService {
    if (!PatchManagementService.instance) {
      PatchManagementService.instance = new PatchManagementService();
    }
    return PatchManagementService.instance;
  }
  
  /**
   * Initialize the patch management service
   */
  public async initialize(): Promise<boolean> {
    try {
      // Ensure directories exist
      await this.ensureDirectories();
      
      // Schedule regular patch checks
      this.scheduleRegularChecks();
      
      // Create database tables if they don't exist
      await this.setupPatchManagementSchema();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize patch management service:', error);
      return false;
    }
  }
  
  /**
   * Create necessary directories for patch management
   */
  private async ensureDirectories(): Promise<void> {
    try {
      const backupDir = path.resolve(process.cwd(), PATCH_MANAGEMENT_CONFIG.BACKUP_DIR);
      await fs.mkdir(backupDir, { recursive: true });
    } catch (error) {
      console.error('Error creating backup directory:', error);
      throw error;
    }
  }
  
  /**
   * Schedule regular patch checks
   */
  private scheduleRegularChecks(): void {
    // Clear any existing interval
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
    }
    
    // Set up new interval
    this.scanInterval = setInterval(async () => {
      await this.checkForPatches();
    }, PATCH_MANAGEMENT_CONFIG.SCAN_INTERVAL);
    
    // Run initial check
    this.checkForPatches()
      .catch(error => console.error('Error running initial patch check:', error));
  }
  
  /**
   * Set up database tables for patch management
   */
  private async setupPatchManagementSchema(): Promise<boolean> {
    try {
      // Create database tables for patch management
      const { error } = await supabase.rpc('create_patch_management_tables_if_not_exist');
      
      if (error) {
        console.error('Error creating patch management tables:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error setting up patch management schema:', error);
      return false;
    }
  }
  
  /**
   * Check for available security patches
   */
  public async checkForPatches(): Promise<Patch[]> {
    try {
      // Scan for dependency vulnerabilities
      const dependencyScan = await dependencySecurityService.scanDependencies();
      
      if (!dependencyScan) {
        return [];
      }
      
      // Convert vulnerabilities to patches
      const patches: Patch[] = await this.createPatchesFromVulnerabilities(dependencyScan.vulnerabilities);
      
      // Auto-approve patches if configured
      if (PATCH_MANAGEMENT_CONFIG.AUTO_APPROVE_PATCHES) {
        await this.autoApprovePatchesBySeverity(patches);
      }
      
      // Auto-apply patches if configured
      if (PATCH_MANAGEMENT_CONFIG.AUTO_APPLY_PATCHES) {
        await this.autoApplyApprovedPatches();
      }
      
      return patches;
    } catch (error) {
      console.error('Error checking for patches:', error);
      return [];
    }
  }
  
  /**
   * Create patches from detected vulnerabilities
   */
  private async createPatchesFromVulnerabilities(
    vulnerabilities: any[]
  ): Promise<Patch[]> {
    const patches: Patch[] = [];
    
    try {
      for (const vuln of vulnerabilities) {
        // Skip if already fixed
        if (vuln.isFixed) {
          continue;
        }
        
        // Check if patch already exists for this vulnerability
        const { data: existingPatches, error } = await supabase
          .from('security_patches')
          .select('id')
          .eq('package_name', vuln.packageName)
          .eq('status', 'pending');
        
        if (error) {
          console.error('Error checking existing patches:', error);
          continue;
        }
        
        // Skip if patch already exists
        if (existingPatches && existingPatches.length > 0) {
          continue;
        }
        
        // Create a new patch
        const patchId = uuidv4();
        const patch: Patch = {
          id: patchId,
          name: `Update ${vuln.packageName} to patch ${vuln.title}`,
          description: vuln.description || `Security update for ${vuln.packageName} to fix vulnerabilities`,
          packageName: vuln.packageName,
          packageVersion: vuln.packageVersion,
          severity: vuln.severity,
          status: 'pending',
          createdAt: new Date().toISOString(),
          patchType: 'dependency',
          affectedComponents: [vuln.packageName],
          cveIds: vuln.cveIds
        };
        
        // Save the patch to the database
        const { error: saveError } = await supabase
          .from('security_patches')
          .insert({
            id: patch.id,
            name: patch.name,
            description: patch.description,
            package_name: patch.packageName,
            package_version: patch.packageVersion,
            severity: patch.severity,
            status: patch.status,
            created_at: patch.createdAt,
            patch_type: patch.patchType,
            affected_components: patch.affectedComponents,
            cve_ids: patch.cveIds
          });
        
        if (saveError) {
          console.error('Error saving patch:', saveError);
          continue;
        }
        
        patches.push(patch);
      }
      
      return patches;
    } catch (error) {
      console.error('Error creating patches from vulnerabilities:', error);
      return patches;
    }
  }
  
  /**
   * Auto-approve patches based on severity
   */
  private async autoApprovePatchesBySeverity(patches: Patch[]): Promise<void> {
    try {
      for (const patch of patches) {
        // Auto-approve if severity is in the auto-approval list
        if (PATCH_MANAGEMENT_CONFIG.SEVERITY_AUTO_APPROVAL.includes(patch.severity)) {
          await this.approvePatch(patch.id, 'system');
        }
      }
    } catch (error) {
      console.error('Error auto-approving patches:', error);
    }
  }
  
  /**
   * Auto-apply approved patches
   */
  private async autoApplyApprovedPatches(): Promise<void> {
    try {
      // Get all approved patches
      const { data: approvedPatches, error } = await supabase
        .from('security_patches')
        .select('*')
        .eq('status', 'approved');
      
      if (error) {
        console.error('Error fetching approved patches:', error);
        return;
      }
      
      if (!approvedPatches || approvedPatches.length === 0) {
        return;
      }
      
      // Apply each patch
      for (const dbPatch of approvedPatches) {
        const patch: Patch = {
          id: dbPatch.id,
          name: dbPatch.name,
          description: dbPatch.description,
          packageName: dbPatch.package_name,
          packageVersion: dbPatch.package_version,
          severity: dbPatch.severity,
          status: dbPatch.status,
          createdAt: dbPatch.created_at,
          approvedAt: dbPatch.approved_at,
          approvedBy: dbPatch.approved_by,
          patchType: dbPatch.patch_type,
          affectedComponents: dbPatch.affected_components,
          cveIds: dbPatch.cve_ids
        };
        
        await this.applyPatch(patch.id);
      }
    } catch (error) {
      console.error('Error auto-applying patches:', error);
    }
  }
  
  /**
   * Approve a security patch
   */
  public async approvePatch(patchId: string, approverUserId: string): Promise<boolean> {
    try {
      // Update the patch status
      const { error } = await supabase
        .from('security_patches')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: approverUserId
        })
        .eq('id', patchId);
      
      if (error) {
        console.error('Error approving patch:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error approving patch:', error);
      return false;
    }
  }
  
  /**
   * Apply a security patch
   */
  public async applyPatch(patchId: string): Promise<boolean> {
    try {
      // Get the patch details
      const { data: patch, error: fetchError } = await supabase
        .from('security_patches')
        .select('*')
        .eq('id', patchId)
        .single();
      
      if (fetchError || !patch) {
        console.error('Error fetching patch:', fetchError);
        return false;
      }
      
      // Verify patch is approved
      if (patch.status !== 'approved') {
        console.error('Cannot apply unapproved patch');
        return false;
      }
      
      // Update patch to mark as in progress
      await supabase
        .from('security_patches')
        .update({ status: 'in_progress' })
        .eq('id', patchId);
      
      let backupLocation: string | undefined;
      
      // Create backup if configured
      if (PATCH_MANAGEMENT_CONFIG.CREATE_BACKUPS) {
        backupLocation = await this.createBackupBeforePatch(patch);
        
        // Update backup location
        await supabase
          .from('security_patches')
          .update({ 
            backup_created: true,
            backup_location: backupLocation
          })
          .eq('id', patchId);
      }
      
      // Run tests before applying if configured
      if (PATCH_MANAGEMENT_CONFIG.TEST_BEFORE_APPLY) {
        const testResults = await this.testPatchBeforeApplying(patch);
        
        // Save test results
        for (const test of testResults) {
          await supabase
            .from('patch_test_results')
            .insert({
              id: test.id,
              patch_id: patchId,
              test_name: test.testName,
              status: test.status,
              details: test.details,
              timestamp: test.timestamp
            });
        }
        
        // Check if any tests failed
        const failedTests = testResults.filter(test => test.status === 'failed');
        if (failedTests.length > 0) {
          // Update patch status
          await supabase
            .from('security_patches')
            .update({
              status: 'failed',
              failed_at: new Date().toISOString(),
              failure_reason: 'Pre-application tests failed'
            })
            .eq('id', patchId);
          
          return false;
        }
      }
      
      // Apply the patch based on type
      let applicationResult: PatchApplication = { success: false, message: 'Unknown patch type' };
      
      if (patch.patch_type === 'dependency') {
        applicationResult = await this.applyDependencyPatch(patch);
      } else if (patch.patch_type === 'system') {
        // System patches would be handled differently
        applicationResult = { success: false, message: 'System patches not implemented' };
      } else if (patch.patch_type === 'application') {
        // Application patches would be handled differently
        applicationResult = { success: false, message: 'Application patches not implemented' };
      } else if (patch.patch_type === 'database') {
        // Database patches would be handled differently
        applicationResult = { success: false, message: 'Database patches not implemented' };
      }
      
      // Handle result
      if (applicationResult.success) {
        // Update patch status
        await supabase
          .from('security_patches')
          .update({
            status: 'applied',
            applied_at: new Date().toISOString()
          })
          .eq('id', patchId);
        
        return true;
      } else {
        // If failed and rollback is enabled, attempt rollback
        if (PATCH_MANAGEMENT_CONFIG.ROLLBACK_ON_FAILURE && backupLocation) {
          await this.rollbackPatch(patch, backupLocation);
        }
        
        // Update patch status
        await supabase
          .from('security_patches')
          .update({
            status: 'failed',
            failed_at: new Date().toISOString(),
            failure_reason: applicationResult.message
          })
          .eq('id', patchId);
        
        return false;
      }
    } catch (error) {
      console.error('Error applying patch:', error);
      
      // Update patch status
      await supabase
        .from('security_patches')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          failure_reason: `Exception: ${(error as Error).message}`
        })
        .eq('id', patchId);
      
      return false;
    }
  }
  
  /**
   * Create backup before applying a patch
   */
  private async createBackupBeforePatch(patch: any): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.resolve(
        process.cwd(),
        PATCH_MANAGEMENT_CONFIG.BACKUP_DIR,
        `${patch.patch_type}_${timestamp}`
      );
      
      // Create backup directory
      await fs.mkdir(backupDir, { recursive: true });
      
      if (patch.patch_type === 'dependency') {
        // For dependency patches, backup package.json and package-lock.json
        const packageJsonPath = path.resolve(process.cwd(), 'package.json');
        const packageLockPath = path.resolve(process.cwd(), 'package-lock.json');
        
        // Copy package.json if it exists
        try {
          await fs.copyFile(
            packageJsonPath,
            path.join(backupDir, 'package.json')
          );
        } catch (error) {
          console.warn('Could not backup package.json:', error);
        }
        
        // Copy package-lock.json if it exists
        try {
          await fs.copyFile(
            packageLockPath,
            path.join(backupDir, 'package-lock.json')
          );
        } catch (error) {
          console.warn('Could not backup package-lock.json:', error);
        }
      }
      
      return backupDir;
    } catch (error) {
      console.error('Error creating backup:', error);
      return '';
    }
  }
  
  /**
   * Run tests before applying a patch
   */
  private async testPatchBeforeApplying(patch: any): Promise<PatchTestResult[]> {
    const results: PatchTestResult[] = [];
    
    // For dependency patches, run npm test
    if (patch.patch_type === 'dependency') {
      try {
        // Run tests
        const { stdout, stderr } = await this.runCommand('npm', ['test', '--silent']);
        
        const testId = uuidv4();
        
        if (stderr && stderr.includes('ERR!')) {
          // Test failed
          results.push({
            id: testId,
            patchId: patch.id,
            testName: 'npm-test',
            status: 'failed',
            details: stderr,
            timestamp: new Date().toISOString()
          });
        } else {
          // Test passed
          results.push({
            id: testId,
            patchId: patch.id,
            testName: 'npm-test',
            status: 'passed',
            details: stdout,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        // Error running tests
        results.push({
          id: uuidv4(),
          patchId: patch.id,
          testName: 'npm-test',
          status: 'failed',
          details: `Error running tests: ${(error as Error).message}`,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return results;
  }
  
  /**
   * Apply a dependency patch
   */
  private async applyDependencyPatch(patch: any): Promise<PatchApplication> {
    try {
      // For dependency patches, run npm update for a specific package
      if (patch.package_name) {
        const { stdout, stderr } = await this.runCommand('npm', ['update', '--save', patch.package_name]);
        
        if (stderr && stderr.includes('ERR!')) {
          return {
            success: false,
            message: 'Failed to update package',
            details: stderr
          };
        }
        
        return {
          success: true,
          message: 'Package updated successfully',
          details: stdout,
          affectedPackages: 1
        };
      } else {
        // If no specific package, run npm audit fix
        const { stdout, stderr } = await this.runCommand('npm', ['audit', 'fix', '--json']);
        
        try {
          const result = JSON.parse(stdout);
          const fixed = result.audit && result.audit.remediation && result.audit.remediation.fixes
            ? Object.keys(result.audit.remediation.fixes).length
            : 0;
          
          return {
            success: true,
            message: 'Vulnerabilities fixed with npm audit fix',
            details: stdout,
            affectedPackages: fixed
          };
        } catch (parseError) {
          console.error('Error parsing npm audit fix output:', parseError);
          
          return {
            success: stderr && stderr.includes('ERR!') ? false : true,
            message: stderr && stderr.includes('ERR!') 
              ? 'Error running npm audit fix' 
              : 'Completed npm audit fix',
            details: stderr || stdout
          };
        }
      }
    } catch (error) {
      console.error('Error applying dependency patch:', error);
      
      return {
        success: false,
        message: `Error: ${(error as Error).message}`,
        details: (error as Error).stack
      };
    }
  }
  
  /**
   * Rollback a patch using the backup
   */
  private async rollbackPatch(patch: any, backupLocation: string): Promise<boolean> {
    try {
      if (patch.patch_type === 'dependency') {
        // For dependency patches, restore package.json and package-lock.json
        const packageJsonBackup = path.join(backupLocation, 'package.json');
        const packageLockBackup = path.join(backupLocation, 'package-lock.json');
        
        const packageJsonDest = path.resolve(process.cwd(), 'package.json');
        const packageLockDest = path.resolve(process.cwd(), 'package-lock.json');
        
        // Restore package.json if backup exists
        try {
          if (await this.fileExists(packageJsonBackup)) {
            await fs.copyFile(packageJsonBackup, packageJsonDest);
          }
        } catch (error) {
          console.error('Error restoring package.json:', error);
        }
        
        // Restore package-lock.json if backup exists
        try {
          if (await this.fileExists(packageLockBackup)) {
            await fs.copyFile(packageLockBackup, packageLockDest);
          }
        } catch (error) {
          console.error('Error restoring package-lock.json:', error);
        }
        
        // Run npm install to restore node_modules
        try {
          await this.runCommand('npm', ['install', '--no-audit']);
        } catch (error) {
          console.error('Error running npm install during rollback:', error);
        }
        
        // Update patch status
        await supabase
          .from('security_patches')
          .update({
            status: 'rolled_back',
            rolled_back_at: new Date().toISOString()
          })
          .eq('id', patch.id);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error rolling back patch:', error);
      return false;
    }
  }
  
  /**
   * Check if a file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
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
        resolve({ stdout, stderr });
      });
      
      process.on('error', (err) => {
        reject(err);
      });
      
      // Set timeout to prevent hanging
      setTimeout(() => {
        process.kill();
        reject(new Error('Command timed out'));
      }, PATCH_MANAGEMENT_CONFIG.OPERATION_TIMEOUT);
    });
  }
  
  /**
   * Get all patches with optional filters
   */
  public async getPatches(filters?: {
    status?: string;
    severity?: string;
    patchType?: string;
  }): Promise<Patch[]> {
    try {
      let query = supabase
        .from('security_patches')
        .select('*, patch_test_results(*)');
      
      // Apply filters
      if (filters) {
        if (filters.status) {
          query = query.eq('status', filters.status);
        }
        
        if (filters.severity) {
          query = query.eq('severity', filters.severity);
        }
        
        if (filters.patchType) {
          query = query.eq('patch_type', filters.patchType);
        }
      }
      
      // Order by creation date
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching patches:', error);
        return [];
      }
      
      // Convert to Patch objects
      return (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        packageName: p.package_name,
        packageVersion: p.package_version,
        severity: p.severity,
        status: p.status,
        createdAt: p.created_at,
        approvedAt: p.approved_at,
        approvedBy: p.approved_by,
        appliedAt: p.applied_at,
        failedAt: p.failed_at,
        failureReason: p.failure_reason,
        rolledBackAt: p.rolled_back_at,
        patchType: p.patch_type,
        affectedComponents: p.affected_components,
        backupCreated: p.backup_created,
        backupLocation: p.backup_location,
        cveIds: p.cve_ids,
        testResults: (p.patch_test_results || []).map((t: any) => ({
          id: t.id,
          patchId: t.patch_id,
          testName: t.test_name,
          status: t.status,
          details: t.details,
          timestamp: t.timestamp
        }))
      }));
    } catch (error) {
      console.error('Error fetching patches:', error);
      return [];
    }
  }
  
  /**
   * Get details of a specific patch
   */
  public async getPatchDetails(patchId: string): Promise<Patch | null> {
    try {
      const { data, error } = await supabase
        .from('security_patches')
        .select('*, patch_test_results(*)')
        .eq('id', patchId)
        .single();
      
      if (error || !data) {
        console.error('Error fetching patch details:', error);
        return null;
      }
      
      // Convert to Patch object
      return {
        id: data.id,
        name: data.name,
        description: data.description,
        packageName: data.package_name,
        packageVersion: data.package_version,
        severity: data.severity,
        status: data.status,
        createdAt: data.created_at,
        approvedAt: data.approved_at,
        approvedBy: data.approved_by,
        appliedAt: data.applied_at,
        failedAt: data.failed_at,
        failureReason: data.failure_reason,
        rolledBackAt: data.rolled_back_at,
        patchType: data.patch_type,
        affectedComponents: data.affected_components,
        backupCreated: data.backup_created,
        backupLocation: data.backup_location,
        cveIds: data.cve_ids,
        testResults: (data.patch_test_results || []).map((t: any) => ({
          id: t.id,
          patchId: t.patch_id,
          testName: t.test_name,
          status: t.status,
          details: t.details,
          timestamp: t.timestamp
        }))
      };
    } catch (error) {
      console.error('Error fetching patch details:', error);
      return null;
    }
  }
}

// Export singleton instance
export const patchManagementService = PatchManagementService.getInstance();
export default patchManagementService; 