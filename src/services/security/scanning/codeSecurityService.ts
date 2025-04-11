/**
 * Code Security Analysis Service
 * 
 * Provides functionality for analyzing code security:
 * - Static Application Security Testing (SAST)
 * - Security anti-pattern detection
 * - Security best practice enforcement
 * - Secure coding guidelines
 * - Security issue remediation
 */

import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

// Types for code security analysis
export interface CodeSecurityScan {
  id: string;
  timestamp: string;
  scanType: 'eslint' | 'custom' | 'sonarqube' | 'snyk' | 'manual';
  scanDuration: number;
  fileCount: number;
  issuesFound: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  scanStatus: 'in_progress' | 'completed' | 'failed';
  errorMessage?: string;
  scanTarget: string;
  issues: SecurityIssue[];
}

export interface SecurityIssue {
  id: string;
  scanId: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  issueType: string;
  location: string;
  lineNumber?: number;
  codeSnippet?: string;
  remediation?: string;
  cwes?: string[];
  isFixed: boolean;
  fixedAt?: string;
  fixedBy?: string;
  fixCommit?: string;
  detectionRule?: string;
  falsePositive: boolean;
  matchFingerprint?: string;
}

// Security rules for code analysis
interface SecurityRule {
  id: string;
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  pattern: RegExp;
  filePattern: RegExp;
  enabled: boolean;
  remediation: string;
  cwes?: string[];
  type: string;
}

// Configuration for code security analysis
const CODE_SECURITY_CONFIG = {
  SCAN_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
  SCAN_TIMEOUT: 10 * 60 * 1000, // 10 minutes
  MAX_ISSUES_PER_SCAN: 1000,
  SCAN_TARGETS: [
    '**/*.ts', 
    '**/*.tsx', 
    '**/*.js', 
    '**/*.jsx', 
    '**/*.html', 
    '**/*.css'
  ],
  EXCLUDED_DIRS: [
    'node_modules/**',
    'dist/**',
    'build/**',
    '.next/**',
    'coverage/**'
  ],
  MIN_SEVERITY_TO_REPORT: 'medium',
  USE_ESLINT: true,
  ESLINT_CONFIG: '.eslintrc.js',
  // Specific security rules to check
  SECURITY_RULES: [
    {
      id: 'hardcoded-secrets',
      name: 'Hardcoded secrets or credentials',
      description: 'Detects hardcoded API keys, tokens, passwords or credentials',
      severity: 'critical',
      pattern: /(password|secret|api.?key|token|credential|auth).*['"]([a-zA-Z0-9_\-\.=]{8,})['"]|['"]([a-zA-Z0-9_\-\.=]{32,})['"]/i,
      filePattern: /\.(ts|tsx|js|jsx)$/,
      enabled: true,
      remediation: 'Move secrets to environment variables or a secure vault',
      cwes: ['CWE-798'],
      type: 'credential-disclosure'
    },
    {
      id: 'sql-injection',
      name: 'Potential SQL injection',
      description: 'Detects potential SQL injection vulnerabilities',
      severity: 'high',
      pattern: /executeQuery\s*\(\s*['"`].*\$\{.*\}.*['"`]/,
      filePattern: /\.(ts|tsx|js|jsx)$/,
      enabled: true,
      remediation: 'Use parameterized queries or an ORM instead of string concatenation',
      cwes: ['CWE-89'],
      type: 'injection'
    },
    {
      id: 'xss-vulnerability',
      name: 'Potential XSS vulnerability',
      description: 'Detects potential cross-site scripting vulnerabilities',
      severity: 'high',
      pattern: /dangerouslySetInnerHTML|innerHTML\s*=|document\.write\(|eval\(|setTimeout\(\s*['"`]/,
      filePattern: /\.(ts|tsx|js|jsx|html)$/,
      enabled: true,
      remediation: 'Use safe alternatives like textContent instead of innerHTML, avoid using eval',
      cwes: ['CWE-79'],
      type: 'xss'
    },
    {
      id: 'insecure-random',
      name: 'Use of insecure random values',
      description: 'Detects use of insecure random value generation',
      severity: 'medium',
      pattern: /Math\.random\(\)|Date\.now\(\)/,
      filePattern: /\.(ts|tsx|js|jsx)$/,
      enabled: true,
      remediation: 'Use crypto.randomBytes() or crypto.randomUUID() for secure random values',
      cwes: ['CWE-338'],
      type: 'cryptographic'
    },
    {
      id: 'path-traversal',
      name: 'Potential path traversal vulnerability',
      description: 'Detects code that might enable path traversal attacks',
      severity: 'high',
      pattern: /require\([^)]*\$\{|fs\.(read|write)[^(]*\([^)]*\$\{|path\.(join|resolve)[^(]*\([^)]*\$\{/,
      filePattern: /\.(ts|tsx|js|jsx)$/,
      enabled: true,
      remediation: 'Validate and sanitize file paths, use path.normalize(), check for ".." sequences',
      cwes: ['CWE-22'],
      type: 'injection'
    }
  ] as SecurityRule[]
};

/**
 * Code Security Analysis Service
 */
class CodeSecurityService {
  private static instance: CodeSecurityService;
  private scanInterval: NodeJS.Timeout | null = null;
  
  // Make constructor private to enforce singleton
  private constructor() {}
  
  /**
   * Get singleton instance
   */
  public static getInstance(): CodeSecurityService {
    if (!CodeSecurityService.instance) {
      CodeSecurityService.instance = new CodeSecurityService();
    }
    return CodeSecurityService.instance;
  }
  
  /**
   * Initialize the code security analysis service
   */
  public async initialize(): Promise<boolean> {
    try {
      // Schedule regular scans
      this.scheduleRegularScans();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize code security analysis service:', error);
      return false;
    }
  }
  
  /**
   * Schedule regular code security scans
   */
  private scheduleRegularScans(): void {
    // Clear any existing interval
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
    }
    
    // Set up new interval
    this.scanInterval = setInterval(() => {
      this.scanCodeSecurity()
        .catch(error => console.error('Error running scheduled code security scan:', error));
    }, CODE_SECURITY_CONFIG.SCAN_INTERVAL);
  }
  
  /**
   * Perform a comprehensive code security scan
   */
  public async scanCodeSecurity(): Promise<CodeSecurityScan | null> {
    try {
      const scanId = uuidv4();
      const startTime = Date.now();
      
      // Create initial scan record
      const initialScan: CodeSecurityScan = {
        id: scanId,
        timestamp: new Date().toISOString(),
        scanType: 'custom',
        scanDuration: 0,
        fileCount: 0,
        issuesFound: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        infoCount: 0,
        scanStatus: 'in_progress',
        scanTarget: 'src/**',
        issues: []
      };
      
      // Save initial scan record
      await this.saveScanRecord(initialScan);
      
      // Find all files to scan
      const files = await this.findFilesToScan();
      
      // Update scan with file count
      initialScan.fileCount = files.length;
      await this.updateScanRecord(scanId, { fileCount: files.length });
      
      // Analyze each file
      const issues: SecurityIssue[] = [];
      for (const file of files) {
        const fileIssues = await this.analyzeFile(file, scanId);
        issues.push(...fileIssues);
        
        // Limit the number of issues to avoid performance problems
        if (issues.length >= CODE_SECURITY_CONFIG.MAX_ISSUES_PER_SCAN) {
          break;
        }
      }
      
      // Run ESLint security scan if configured
      if (CODE_SECURITY_CONFIG.USE_ESLINT) {
        const eslintIssues = await this.runEslintSecurityScan(scanId);
        issues.push(...eslintIssues);
      }
      
      // Count issues by severity
      const criticalCount = issues.filter(i => i.severity === 'critical').length;
      const highCount = issues.filter(i => i.severity === 'high').length;
      const mediumCount = issues.filter(i => i.severity === 'medium').length;
      const lowCount = issues.filter(i => i.severity === 'low').length;
      const infoCount = issues.filter(i => i.severity === 'info').length;
      
      // Calculate scan duration
      const scanDuration = Date.now() - startTime;
      
      // Create final scan result
      const scan: CodeSecurityScan = {
        id: scanId,
        timestamp: initialScan.timestamp,
        scanType: 'custom',
        scanDuration,
        fileCount: files.length,
        issuesFound: issues.length,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        infoCount,
        scanStatus: 'completed',
        scanTarget: 'src/**',
        issues
      };
      
      // Save scan results
      await this.updateScanRecord(scanId, {
        scanDuration,
        issuesFound: issues.length,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        infoCount,
        scanStatus: 'completed'
      });
      
      // Save all issues
      for (const issue of issues) {
        await this.saveSecurityIssue(issue);
      }
      
      return scan;
    } catch (error) {
      console.error('Error performing code security scan:', error);
      return null;
    }
  }
  
  /**
   * Find all files to scan based on configuration
   */
  private async findFilesToScan(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      // We're using the 'find' command for simplicity
      // In a real implementation, this would be replaced with a proper glob library
      // or something that works cross-platform
      
      // For simplicity in this example, just return some dummy files
      resolve([
        'src/components/Form.tsx',
        'src/services/apiService.ts',
        'src/pages/index.tsx',
        'src/utils/helpers.ts'
      ]);
    });
  }
  
  /**
   * Analyze a single file for security issues
   */
  private async analyzeFile(filePath: string, scanId: string): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];
    
    try {
      // Read the file
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      
      // Get applicable rules for this file
      const rules = CODE_SECURITY_CONFIG.SECURITY_RULES.filter(rule => 
        rule.enabled && rule.filePattern.test(filePath)
      );
      
      // Check each rule
      for (const rule of rules) {
        // Check for pattern matches in the content
        let match;
        let lineIndex = 0;
        
        for (const line of lines) {
          lineIndex++;
          
          if (rule.pattern.test(line)) {
            // Create a fingerprint to help identify duplicate issues
            const fingerprint = this.generateIssueFingerprint(filePath, lineIndex, rule.id);
            
            // Create an issue
            issues.push({
              id: uuidv4(),
              scanId,
              title: rule.name,
              description: rule.description,
              severity: rule.severity,
              issueType: rule.type,
              location: filePath,
              lineNumber: lineIndex,
              codeSnippet: this.getCodeSnippet(lines, lineIndex),
              remediation: rule.remediation,
              cwes: rule.cwes,
              isFixed: false,
              falsePositive: false,
              matchFingerprint: fingerprint,
              detectionRule: rule.id
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error analyzing file ${filePath}:`, error);
    }
    
    return issues;
  }
  
  /**
   * Get a code snippet from a specific line with context
   */
  private getCodeSnippet(lines: string[], lineNumber: number, context: number = 2): string {
    const start = Math.max(0, lineNumber - context - 1);
    const end = Math.min(lines.length, lineNumber + context);
    
    return lines.slice(start, end).join('\n');
  }
  
  /**
   * Generate a fingerprint for an issue to help identify duplicates
   */
  private generateIssueFingerprint(filePath: string, lineNumber: number, ruleId: string): string {
    const data = `${filePath}:${lineNumber}:${ruleId}`;
    return crypto.createHash('md5').update(data).digest('hex');
  }
  
  /**
   * Run ESLint security scan
   */
  private async runEslintSecurityScan(scanId: string): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];
    
    try {
      // Run ESLint with security rules
      const { stdout, stderr } = await this.runCommand('npx', [
        'eslint',
        'src/',
        '--config',
        CODE_SECURITY_CONFIG.ESLINT_CONFIG,
        '-f',
        'json'
      ]);
      
      if (stderr) {
        console.error('ESLint error:', stderr);
      }
      
      if (!stdout) {
        return issues;
      }
      
      // Parse ESLint output
      try {
        const eslintResults = JSON.parse(stdout);
        
        for (const result of eslintResults) {
          const filePath = result.filePath;
          
          for (const message of result.messages) {
            // Map ESLint severity to our severity levels
            let severity: 'critical' | 'high' | 'medium' | 'low' | 'info' = 'info';
            if (message.severity === 2) { // error
              severity = message.ruleId && message.ruleId.includes('security') ? 'high' : 'medium';
            } else { // warning
              severity = 'low';
            }
            
            // Create a fingerprint
            const fingerprint = this.generateIssueFingerprint(
              filePath,
              message.line,
              message.ruleId
            );
            
            // Create an issue
            issues.push({
              id: uuidv4(),
              scanId,
              title: `ESLint: ${message.ruleId}`,
              description: message.message,
              severity,
              issueType: 'eslint',
              location: filePath,
              lineNumber: message.line,
              codeSnippet: message.source,
              remediation: message.fix ? 'Automatic fix available' : 'Follow ESLint rule guidance',
              isFixed: false,
              falsePositive: false,
              matchFingerprint: fingerprint,
              detectionRule: message.ruleId
            });
          }
        }
      } catch (parseError) {
        console.error('Error parsing ESLint output:', parseError);
      }
    } catch (error) {
      console.error('Error running ESLint security scan:', error);
    }
    
    return issues;
  }
  
  /**
   * Run a shell command and return the output
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
      }, CODE_SECURITY_CONFIG.SCAN_TIMEOUT);
    });
  }
  
  /**
   * Save a scan record to the database
   */
  private async saveScanRecord(scan: CodeSecurityScan): Promise<void> {
    try {
      const { error } = await supabase
        .from('code_security_scans')
        .insert({
          id: scan.id,
          timestamp: scan.timestamp,
          scan_type: scan.scanType,
          scan_duration: scan.scanDuration,
          file_count: scan.fileCount,
          issues_found: scan.issuesFound,
          critical_count: scan.criticalCount,
          high_count: scan.highCount,
          medium_count: scan.mediumCount,
          low_count: scan.lowCount,
          info_count: scan.infoCount,
          scan_status: scan.scanStatus,
          error_message: scan.errorMessage,
          scan_target: scan.scanTarget
        });
      
      if (error) {
        console.error('Error saving code security scan:', error);
      }
    } catch (error) {
      console.error('Exception saving code security scan:', error);
    }
  }
  
  /**
   * Update an existing scan record
   */
  private async updateScanRecord(scanId: string, updates: Partial<CodeSecurityScan>): Promise<void> {
    try {
      const updateData: Record<string, any> = {};
      
      // Map camelCase properties to snake_case for database
      if (updates.scanDuration !== undefined) updateData.scan_duration = updates.scanDuration;
      if (updates.fileCount !== undefined) updateData.file_count = updates.fileCount;
      if (updates.issuesFound !== undefined) updateData.issues_found = updates.issuesFound;
      if (updates.criticalCount !== undefined) updateData.critical_count = updates.criticalCount;
      if (updates.highCount !== undefined) updateData.high_count = updates.highCount;
      if (updates.mediumCount !== undefined) updateData.medium_count = updates.mediumCount;
      if (updates.lowCount !== undefined) updateData.low_count = updates.lowCount;
      if (updates.infoCount !== undefined) updateData.info_count = updates.infoCount;
      if (updates.scanStatus !== undefined) updateData.scan_status = updates.scanStatus;
      if (updates.errorMessage !== undefined) updateData.error_message = updates.errorMessage;
      
      const { error } = await supabase
        .from('code_security_scans')
        .update(updateData)
        .eq('id', scanId);
      
      if (error) {
        console.error('Error updating code security scan:', error);
      }
    } catch (error) {
      console.error('Exception updating code security scan:', error);
    }
  }
  
  /**
   * Save a security issue to the database
   */
  private async saveSecurityIssue(issue: SecurityIssue): Promise<void> {
    try {
      const { error } = await supabase
        .from('code_security_issues')
        .insert({
          id: issue.id,
          scan_id: issue.scanId,
          title: issue.title,
          description: issue.description,
          severity: issue.severity,
          issue_type: issue.issueType,
          location: issue.location,
          line_number: issue.lineNumber,
          code_snippet: issue.codeSnippet,
          remediation: issue.remediation,
          cwes: issue.cwes,
          is_fixed: issue.isFixed,
          fixed_at: issue.fixedAt,
          fixed_by: issue.fixedBy,
          fix_commit: issue.fixCommit,
          detection_rule: issue.detectionRule,
          false_positive: issue.falsePositive,
          match_fingerprint: issue.matchFingerprint
        });
      
      if (error) {
        console.error('Error saving security issue:', error);
      }
    } catch (error) {
      console.error('Exception saving security issue:', error);
    }
  }
  
  /**
   * Get recent security scans
   */
  public async getRecentScans(limit: number = 10): Promise<CodeSecurityScan[]> {
    try {
      const { data, error } = await supabase
        .from('code_security_scans')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Error fetching recent security scans:', error);
        return [];
      }
      
      const scans: CodeSecurityScan[] = [];
      
      for (const scanData of (data || [])) {
        // Get issues for this scan
        const { data: issuesData, error: issuesError } = await supabase
          .from('code_security_issues')
          .select('*')
          .eq('scan_id', scanData.id);
        
        if (issuesError) {
          console.error('Error fetching security issues:', issuesError);
          continue;
        }
        
        // Map database records to SecurityIssue objects
        const issues: SecurityIssue[] = (issuesData || []).map(issue => ({
          id: issue.id,
          scanId: issue.scan_id,
          title: issue.title,
          description: issue.description,
          severity: issue.severity,
          issueType: issue.issue_type,
          location: issue.location,
          lineNumber: issue.line_number,
          codeSnippet: issue.code_snippet,
          remediation: issue.remediation,
          cwes: issue.cwes,
          isFixed: issue.is_fixed,
          fixedAt: issue.fixed_at,
          fixedBy: issue.fixed_by,
          fixCommit: issue.fix_commit,
          detectionRule: issue.detection_rule,
          falsePositive: issue.false_positive,
          matchFingerprint: issue.match_fingerprint
        }));
        
        // Create scan object
        scans.push({
          id: scanData.id,
          timestamp: scanData.timestamp,
          scanType: scanData.scan_type,
          scanDuration: scanData.scan_duration,
          fileCount: scanData.file_count,
          issuesFound: scanData.issues_found,
          criticalCount: scanData.critical_count,
          highCount: scanData.high_count,
          mediumCount: scanData.medium_count,
          lowCount: scanData.low_count,
          infoCount: scanData.info_count,
          scanStatus: scanData.scan_status,
          errorMessage: scanData.error_message,
          scanTarget: scanData.scan_target,
          issues
        });
      }
      
      return scans;
    } catch (error) {
      console.error('Error fetching recent security scans:', error);
      return [];
    }
  }
  
  /**
   * Get details of a specific security scan
   */
  public async getScanDetails(scanId: string): Promise<CodeSecurityScan | null> {
    try {
      // Get scan data
      const { data: scanData, error: scanError } = await supabase
        .from('code_security_scans')
        .select('*')
        .eq('id', scanId)
        .single();
      
      if (scanError || !scanData) {
        console.error('Error fetching security scan:', scanError);
        return null;
      }
      
      // Get issues for this scan
      const { data: issuesData, error: issuesError } = await supabase
        .from('code_security_issues')
        .select('*')
        .eq('scan_id', scanId);
      
      if (issuesError) {
        console.error('Error fetching security issues:', issuesError);
        return null;
      }
      
      // Map database records to SecurityIssue objects
      const issues: SecurityIssue[] = (issuesData || []).map(issue => ({
        id: issue.id,
        scanId: issue.scan_id,
        title: issue.title,
        description: issue.description,
        severity: issue.severity,
        issueType: issue.issue_type,
        location: issue.location,
        lineNumber: issue.line_number,
        codeSnippet: issue.code_snippet,
        remediation: issue.remediation,
        cwes: issue.cwes,
        isFixed: issue.is_fixed,
        fixedAt: issue.fixed_at,
        fixedBy: issue.fixed_by,
        fixCommit: issue.fix_commit,
        detectionRule: issue.detection_rule,
        falsePositive: issue.false_positive,
        matchFingerprint: issue.match_fingerprint
      }));
      
      // Create scan object
      return {
        id: scanData.id,
        timestamp: scanData.timestamp,
        scanType: scanData.scan_type,
        scanDuration: scanData.scan_duration,
        fileCount: scanData.file_count,
        issuesFound: scanData.issues_found,
        criticalCount: scanData.critical_count,
        highCount: scanData.high_count,
        mediumCount: scanData.medium_count,
        lowCount: scanData.low_count,
        infoCount: scanData.info_count,
        scanStatus: scanData.scan_status,
        errorMessage: scanData.error_message,
        scanTarget: scanData.scan_target,
        issues
      };
    } catch (error) {
      console.error('Error fetching security scan details:', error);
      return null;
    }
  }
  
  /**
   * Mark a security issue as fixed
   */
  public async markIssueAsFixed(
    issueId: string,
    fixedBy: string,
    fixCommit?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('code_security_issues')
        .update({
          is_fixed: true,
          fixed_at: new Date().toISOString(),
          fixed_by: fixedBy,
          fix_commit: fixCommit
        })
        .eq('id', issueId);
      
      if (error) {
        console.error('Error marking security issue as fixed:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Exception marking security issue as fixed:', error);
      return false;
    }
  }
  
  /**
   * Mark a security issue as a false positive
   */
  public async markIssueAsFalsePositive(issueId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('code_security_issues')
        .update({
          false_positive: true
        })
        .eq('id', issueId);
      
      if (error) {
        console.error('Error marking security issue as false positive:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Exception marking security issue as false positive:', error);
      return false;
    }
  }
}

// Export singleton instance
export const codeSecurityService = CodeSecurityService.getInstance();
export default codeSecurityService; 