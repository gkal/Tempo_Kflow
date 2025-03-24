/**
 * Cleanup Helper Functions
 * 
 * Utility functions to assist with the codebase cleanup process.
 * These functions help identify and fix common issues like:
 * - Console statement replacements
 * - Unused imports
 * - Duplicate code
 * - Unused files
 * 
 * @module cleanup-helpers
 */

import fs from 'fs';
import path from 'path';
import { findConsoleStatements, replaceConsoleStatements, addLoggingImport } from '../utils/consoleReplacer';

/**
 * Result structure for file status
 */
interface FileStats {
  path: string;
  size: number;
  lines: number;
  consoleStatements: number;
  lastModified: Date;
}

/**
 * Find files matching a pattern recursively
 * 
 * @param startPath - Directory to start searching from
 * @param filter - File extension or pattern to match
 * @returns Array of file paths
 */
export function findFilesRecursive(startPath: string, filter: string): string[] {
  if (!fs.existsSync(startPath)) {
    return [];
  }

  const files: string[] = [];
  const entries = fs.readdirSync(startPath);

  for (const entry of entries) {
    const filePath = path.join(startPath, entry);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      files.push(...findFilesRecursive(filePath, filter));
    } else if (filePath.endsWith(filter)) {
      files.push(filePath);
    }
  }

  return files;
}

/**
 * Get file statistics including size, lines, and console statements
 * 
 * @param filePath - Path to the file
 * @returns File statistics
 */
export function getFileStats(filePath: string): FileStats {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').length;
  const consoleStatements = findConsoleStatements(content).length;
  const stat = fs.statSync(filePath);

  return {
    path: filePath,
    size: stat.size,
    lines,
    consoleStatements,
    lastModified: new Date(stat.mtime)
  };
}

/**
 * Replace console statements in a file with loggingUtils functions
 * 
 * @param filePath - Path to the file
 * @returns Number of replacements made
 */
export function replaceConsoleStatementsInFile(filePath: string): number {
  const content = fs.readFileSync(filePath, 'utf8');
  const consoleStatements = findConsoleStatements(content);
  
  if (consoleStatements.length === 0) {
    return 0;
  }
  
  // Add the appropriate import if needed
  let updatedContent = addLoggingImport(content);
  
  // Replace console statements
  updatedContent = replaceConsoleStatements(updatedContent);
  
  // Write back to the file
  fs.writeFileSync(filePath, updatedContent, 'utf8');
  
  return consoleStatements.length;
}

/**
 * Find unused files based on import analysis
 * 
 * This is a basic implementation and might need refinement.
 * It looks for files that are not imported anywhere in the codebase.
 * 
 * @param dir - Directory to scan for unused files
 * @param extensions - File extensions to check
 * @returns Array of potentially unused files
 */
export function findUnusedFiles(dir: string, extensions: string[]): string[] {
  // Get all files with the specified extensions
  let allFiles: string[] = [];
  for (const ext of extensions) {
    allFiles = [...allFiles, ...findFilesRecursive(dir, ext)];
  }
  
  // Read the content of all files to find imports
  const importMap = new Map<string, string[]>();
  
  for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf8');
    
    // Find all import statements
    const importRegex = /from ['"](.+?)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      
      // Skip node_modules and relative imports that start with ./
      if (
        !importPath.startsWith('.') &&
        !importPath.startsWith('@/') &&
        !importPath.startsWith('/')
      ) {
        continue;
      }
      
      // Normalize the import path
      const normalizedPath = importPath
        .replace(/^@\//, './src/') // Handle @ alias
        .replace(/^\.\//, `${dir}/`); // Handle relative paths
      
      // Add to the import map
      if (!importMap.has(normalizedPath)) {
        importMap.set(normalizedPath, []);
      }
      
      importMap.get(normalizedPath)!.push(file);
    }
  }
  
  // Find files that are not imported
  const unusedFiles: string[] = [];
  
  for (const file of allFiles) {
    const relativePath = file.replace(`${dir}/`, '');
    
    // Skip index files and main entry points
    if (
      relativePath.includes('index.') ||
      relativePath.includes('main.') ||
      relativePath.includes('App.')
    ) {
      continue;
    }
    
    // Check if this file is imported anywhere
    const isImported = Array.from(importMap.keys()).some(importPath => {
      // Handle both exact matches and directory imports
      return (
        importPath === file ||
        importPath.startsWith(file.replace(/\.[^.]+$/, ''))
      );
    });
    
    if (!isImported) {
      unusedFiles.push(file);
    }
  }
  
  return unusedFiles;
}

/**
 * Find duplicated code blocks across files
 * 
 * This is a simplified implementation. For real-world use,
 * more sophisticated algorithms would be needed.
 * 
 * @param dir - Directory to scan for duplicated code
 * @param extensions - File extensions to check
 * @param minLines - Minimum number of lines to consider as duplication
 * @returns Map of duplicated code blocks with their locations
 */
export function findDuplicatedCode(
  dir: string, 
  extensions: string[], 
  minLines: number = 5
): Map<string, string[]> {
  // Get all files with the specified extensions
  let allFiles: string[] = [];
  for (const ext of extensions) {
    allFiles = [...allFiles, ...findFilesRecursive(dir, ext)];
  }
  
  // Map to store code blocks and their locations
  const codeBlocks = new Map<string, string[]>();
  
  // Process each file
  for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    
    // Scan the file for blocks of code
    for (let i = 0; i <= lines.length - minLines; i++) {
      // Create a block of the specified minimum size
      const block = lines.slice(i, i + minLines).join('\n');
      
      // Skip blocks with very little code (e.g., lots of whitespace)
      if (block.replace(/\s+/g, '').length < 50) {
        continue;
      }
      
      // Add to the map of code blocks
      if (!codeBlocks.has(block)) {
        codeBlocks.set(block, []);
      }
      
      codeBlocks.get(block)!.push(`${file}:${i + 1}`);
    }
  }
  
  // Filter for blocks that appear in multiple files
  const duplicatedBlocks = new Map<string, string[]>();
  
  for (const [block, locations] of codeBlocks.entries()) {
    if (locations.length > 1) {
      // Get unique file paths (might be duplicated within the same file)
      const uniqueFiles = new Set(locations.map(loc => loc.split(':')[0]));
      
      if (uniqueFiles.size > 1) {
        duplicatedBlocks.set(block, locations);
      }
    }
  }
  
  return duplicatedBlocks;
}

/**
 * Generate a cleanup report based on the analysis
 * 
 * @param dir - Directory that was analyzed
 * @param fileStats - Statistics for all files
 * @param consoleReplacements - Number of console replacements made
 * @param unusedFiles - Array of potentially unused files
 * @param duplicatedCode - Map of duplicated code blocks
 * @returns Report content as a string
 */
export function generateCleanupReport(
  dir: string,
  fileStats: FileStats[],
  consoleReplacements: number,
  unusedFiles: string[],
  duplicatedCode: Map<string, string[]>
): string {
  const totalFiles = fileStats.length;
  const totalSize = fileStats.reduce((sum, stat) => sum + stat.size, 0);
  const totalLines = fileStats.reduce((sum, stat) => sum + stat.lines, 0);
  const totalConsoleStatements = fileStats.reduce((sum, stat) => sum + stat.consoleStatements, 0);
  
  let report = `# Codebase Cleanup Report\n\n`;
  report += `Generated: ${new Date().toISOString()}\n\n`;
  report += `## Summary\n\n`;
  report += `- Directory: ${dir}\n`;
  report += `- Total Files: ${totalFiles}\n`;
  report += `- Total Size: ${(totalSize / 1024 / 1024).toFixed(2)} MB\n`;
  report += `- Total Lines: ${totalLines}\n`;
  report += `- Console Statements: ${totalConsoleStatements}\n`;
  report += `- Console Replacements Made: ${consoleReplacements}\n`;
  report += `- Potentially Unused Files: ${unusedFiles.length}\n`;
  report += `- Duplicated Code Blocks: ${duplicatedCode.size}\n\n`;
  
  // List files with the most console statements
  report += `## Files with the Most Console Statements\n\n`;
  report += `| File | Console Statements | Lines | Size (KB) |\n`;
  report += `|------|-------------------|-------|----------|\n`;
  
  const topConsoleFiles = [...fileStats]
    .filter(stat => stat.consoleStatements > 0)
    .sort((a, b) => b.consoleStatements - a.consoleStatements)
    .slice(0, 10);
  
  for (const stat of topConsoleFiles) {
    report += `| ${stat.path.replace(dir, '')} | ${stat.consoleStatements} | ${stat.lines} | ${(stat.size / 1024).toFixed(2)} |\n`;
  }
  
  report += `\n`;
  
  // List potentially unused files
  report += `## Potentially Unused Files\n\n`;
  report += `These files may not be imported or used anywhere in the codebase:\n\n`;
  
  for (const file of unusedFiles) {
    report += `- ${file.replace(dir, '')}\n`;
  }
  
  report += `\n`;
  
  // List duplicated code blocks
  report += `## Duplicated Code Blocks\n\n`;
  report += `The following code blocks are duplicated across multiple files:\n\n`;
  
  let dupCounter = 1;
  for (const [block, locations] of duplicatedCode.entries()) {
    report += `### Duplication #${dupCounter++}\n\n`;
    report += `Found in ${locations.length} locations:\n\n`;
    
    for (const location of locations) {
      report += `- ${location.replace(dir, '')}\n`;
    }
    
    report += `\n\`\`\`typescript\n${block}\n\`\`\`\n\n`;
  }
  
  return report;
}

/**
 * Run a complete cleanup analysis and generate a report
 * 
 * @param dir - Directory to analyze and clean
 * @param extensions - File extensions to process
 * @param outputFile - Where to save the report
 * @param autoReplace - Whether to automatically replace console statements
 */
export async function runCodebaseCleanup(
  dir: string,
  extensions: string[] = ['.ts', '.tsx', '.js', '.jsx'],
  outputFile: string = 'cleanup-report.md',
  autoReplace: boolean = false
): Promise<void> {
  // Find all files
  let allFiles: string[] = [];
  for (const ext of extensions) {
    allFiles = [...allFiles, ...findFilesRecursive(dir, ext)];
  }
  
  // Get stats for all files
  const fileStats = allFiles.map(file => getFileStats(file));
  
  // Replace console statements if auto-replace is enabled
  let consoleReplacements = 0;
  if (autoReplace) {
    for (const file of allFiles) {
      consoleReplacements += replaceConsoleStatementsInFile(file);
    }
  }
  
  // Find unused files
  const unusedFiles = findUnusedFiles(dir, extensions);
  
  // Find duplicated code
  const duplicatedCode = findDuplicatedCode(dir, extensions);
  
  // Generate the report
  const report = generateCleanupReport(
    dir,
    fileStats,
    consoleReplacements,
    unusedFiles,
    duplicatedCode
  );
  
  // Write the report to a file
  fs.writeFileSync(outputFile, report, 'utf8');
  
  console.log(`Cleanup report generated: ${outputFile}`);
  console.log(`- Found ${unusedFiles.length} potentially unused files`);
  console.log(`- Found ${duplicatedCode.size} duplicated code blocks`);
  console.log(`- Replaced ${consoleReplacements} console statements`);
} 