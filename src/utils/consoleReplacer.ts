/**
 * Console Replacement Utilities
 * 
 * This module provides functions to help replace console.log statements with
 * appropriate loggingUtils functions throughout the codebase.
 * 
 * This is a temporary utility that should be removed once the codebase is fully
 * migrated to use loggingUtils for all logging.
 * 
 * @module consoleReplacer
 */

import { logDebug, logInfo, logWarning, logError } from './loggingUtils';

/**
 * Maps console methods to their equivalent loggingUtils functions
 */
const consoleMap = {
  log: logDebug,
  info: logInfo,
  warn: logWarning,
  error: logError
};

/**
 * A drop-in replacement for console functions that uses loggingUtils instead
 * 
 * This provides a migration path for components that still use console.log
 * directly. Using this object, you can replace direct console uses with
 * loggingConsole instead, and the appropriate logging utility will be called.
 * 
 * @example
 * ```tsx
 * // Instead of:
 * console.log("User logged in", user);
 * 
 * // Use:
 * loggingConsole.log("User logged in", user);
 * ```
 * 
 * Used in:
 * - Various components being migrated from direct console use
 */
export const loggingConsole = {
  log: (message: string, data?: any) => logDebug(message, data),
  info: (message: string, data?: any) => logInfo(message, data),
  warn: (message: string, data?: any) => logWarning(message, data),
  error: (message: string, error?: any, context?: string) => 
    logError(message, error, context)
};

/**
 * Helper function to check if a file has any direct console.log uses
 * 
 * @param fileContent - The content of the file to check
 * @returns An array of matches with line numbers and content
 * 
 * @example
 * ```typescript
 * const fileContent = fs.readFileSync('src/component.tsx', 'utf8');
 * const consoleUses = findConsoleStatements(fileContent);
 * console.log(`Found ${consoleUses.length} console statements`);
 * ```
 */
export function findConsoleStatements(fileContent: string): Array<{
  line: number;
  content: string;
  method: 'log' | 'info' | 'warn' | 'error';
}> {
  const lines = fileContent.split('\n');
  const consoleRegex = /console\.(log|info|warn|error)\((.*)\)/;
  
  return lines
    .map((content, i) => {
      const match = content.match(consoleRegex);
      if (match) {
        return {
          line: i + 1,
          content: match[0],
          method: match[1] as 'log' | 'info' | 'warn' | 'error'
        };
      }
      return null;
    })
    .filter(Boolean) as Array<{
      line: number;
      content: string;
      method: 'log' | 'info' | 'warn' | 'error';
    }>;
}

/**
 * Replaces console statements with equivalent loggingUtils functions
 * 
 * @param fileContent - The content of the file to modify
 * @returns The updated file content with console statements replaced
 * 
 * @example
 * ```typescript
 * const fileContent = fs.readFileSync('src/component.tsx', 'utf8');
 * const updatedContent = replaceConsoleStatements(fileContent);
 * fs.writeFileSync('src/component.tsx', updatedContent);
 * ```
 */
export function replaceConsoleStatements(fileContent: string): string {
  // Replace console.log
  let updated = fileContent.replace(
    /console\.log\((.*?)(?:,\s*(.*?))?\);/g, 
    (match, message, data) => {
      if (data) {
        return `logDebug(${message}, ${data});`;
      }
      return `logDebug(${message});`;
    }
  );
  
  // Replace console.info
  updated = updated.replace(
    /console\.info\((.*?)(?:,\s*(.*?))?\);/g, 
    (match, message, data) => {
      if (data) {
        return `logInfo(${message}, ${data});`;
      }
      return `logInfo(${message});`;
    }
  );
  
  // Replace console.warn
  updated = updated.replace(
    /console\.warn\((.*?)(?:,\s*(.*?))?\);/g, 
    (match, message, data) => {
      if (data) {
        return `logWarning(${message}, ${data});`;
      }
      return `logWarning(${message});`;
    }
  );
  
  // Replace console.error
  updated = updated.replace(
    /console\.error\((.*?)(?:,\s*(.*?))?\);/g, 
    (match, message, data) => {
      if (data) {
        return `logError(${message}, ${data});`;
      }
      return `logError(${message});`;
    }
  );
  
  return updated;
}

// Check if an import statement for loggingUtils already exists in the file
export function hasLoggingImport(fileContent: string): boolean {
  return /import.*from ['"].*loggingUtils['"]/.test(fileContent) ||
         /import {.*logDebug.*} from ['"].*utils['"]/.test(fileContent);
}

// Add the appropriate import statement for loggingUtils if it doesn't exist
export function addLoggingImport(fileContent: string): string {
  if (hasLoggingImport(fileContent)) {
    return fileContent;
  }
  
  // Check if there are any other imports to place this import after
  const importRegex = /import.*from ['"](.*)['"]/;
  const importMatch = fileContent.match(importRegex);
  
  if (importMatch) {
    // Find the last import statement
    const lines = fileContent.split('\n');
    let lastImportIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (importRegex.test(lines[i])) {
        lastImportIndex = i;
      }
    }
    
    if (lastImportIndex >= 0) {
      // Insert the import after the last import
      lines.splice(lastImportIndex + 1, 0, 'import { logDebug, logInfo, logWarning, logError } from \'../../utils/loggingUtils\';');
      return lines.join('\n');
    }
  }
  
  // If no imports found, add at the top
  return 'import { logDebug, logInfo, logWarning, logError } from \'../../utils/loggingUtils\';\n\n' + fileContent;
} 