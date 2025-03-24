/**
 * Codebase Cleanup Script
 * 
 * This script runs the cleanup helpers to analyze and clean up the codebase.
 * It generates a report of potential issues and can automatically fix some of them.
 * 
 * Usage:
 * ts-node src/scripts/run-cleanup.ts [--auto-replace] [--output-file=<path>]
 */

import { runCodebaseCleanup } from './cleanup-helpers';
import path from 'path';

// Parse command line arguments
const args = process.argv.slice(2);
const autoReplace = args.includes('--auto-replace');
const outputFileArg = args.find(arg => arg.startsWith('--output-file='));
const outputFile = outputFileArg 
  ? outputFileArg.split('=')[1] 
  : 'src/CLEANUP-REPORT.md';

// Get the src directory path
const srcDir = path.resolve(__dirname, '..');

console.log('Starting codebase cleanup analysis...');
console.log(`Source directory: ${srcDir}`);
console.log(`Auto-replace console statements: ${autoReplace}`);
console.log(`Output report file: ${outputFile}`);
console.log('');

// Run the cleanup
(async () => {
  try {
    await runCodebaseCleanup(
      srcDir,
      ['.ts', '.tsx', '.js', '.jsx'],
      outputFile,
      autoReplace
    );
    
    console.log('');
    console.log('Cleanup analysis completed successfully!');
    console.log(`Report saved to: ${outputFile}`);
    
    if (autoReplace) {
      console.log('');
      console.log('Note: Console statements were automatically replaced with loggingUtils functions.');
      console.log('Please review the changes and ensure they work as expected.');
    }
  } catch (error) {
    console.error('Error during cleanup analysis:', error);
    process.exit(1);
  }
})(); 