#!/usr/bin/env node

/**
 * Find Unused Code Script
 * 
 * This script helps identify potentially unused exports in your codebase.
 * It's a helpful tool during cleanup to find dead code that can be safely removed.
 * 
 * Usage:
 *   node src/scripts/find-unused-code.js <directory> <extensions> [--output=<filename>] [--batch-size=<number>] [--delay=<ms>] [--verbose] [--exclude=<pattern>] [--focus=<subdirectory>]
 * 
 * Example:
 *   node src/scripts/find-unused-code.js src ts,tsx
 *   node src/scripts/find-unused-code.js src/components tsx --output=unused-components.json
 *   node src/scripts/find-unused-code.js src ts,tsx --exclude=components/ui --focus=components/customers
 * 
 * Note: This script provides a starting point for identifying unused code.
 * Always manually verify before deleting any code.
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color codes for console output
const COLORS = {
  RESET: '\x1b[0m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m'
};

/**
 * Recursively find all files with specified extensions
 */
function findFiles(dir, extensions) {
  let results = [];
  const isWin = process.platform === "win32";
  const excludedDirs = ['node_modules', '.git', '.next', 'dist', 'build'];
  
  function explore(currentDir) {
    const files = fs.readdirSync(currentDir);
    
    for (const file of files) {
      const filepath = path.join(currentDir, file);
      const stat = fs.statSync(filepath);
      
      if (stat.isDirectory()) {
        if (!excludedDirs.includes(file)) {
          explore(filepath);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(file).slice(1);
        if (extensions.includes(ext)) {
          results.push(filepath);
        }
      }
    }
  }
  
  explore(dir);
  return results;
}

/**
 * Extract exports from a file
 */
function extractExports(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');
  const exports = [];
  
  // Match export statements
  const exportRegex = /export\s+(const|function|class|interface|type|enum|let|var)\s+([A-Za-z0-9_$]+)/g;
  let match;
  
  while ((match = exportRegex.exec(content))) {
    exports.push({
      name: match[2],
      filepath
    });
  }
  
  // Match named exports
  const namedExportRegex = /export\s+{\s*([^}]+)\s*}/g;
  let namedMatch;
  
  while ((namedMatch = namedExportRegex.exec(content))) {
    const names = namedMatch[1].split(',').map(n => n.trim().split(' as ')[0].trim());
    for (const name of names) {
      if (name && !name.includes('*')) {
        exports.push({
          name,
          filepath
        });
      }
    }
  }
  
  return exports;
}

/**
 * Check if a file likely uses dynamic imports
 */
function hasDynamicImports(filepath) {
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    // Check for dynamic import patterns
    return content.includes('import(') || 
           content.includes('require(') || 
           content.includes('React.lazy(');
  } catch (error) {
    return false;
  }
}

/**
 * Check if a file is likely imported by index files
 */
function isImportedViaIndex(filepath) {
  const dirPath = path.dirname(filepath);
  const indexFile = path.join(dirPath, 'index.ts');
  const indexTsxFile = path.join(dirPath, 'index.tsx');
  
  try {
    if (fs.existsSync(indexFile)) {
      const content = fs.readFileSync(indexFile, 'utf8');
      const filename = path.basename(filepath);
      return content.includes(filename.replace(/\.(ts|tsx)$/, ''));
    }
    
    if (fs.existsSync(indexTsxFile)) {
      const content = fs.readFileSync(indexTsxFile, 'utf8');
      const filename = path.basename(filepath);
      return content.includes(filename.replace(/\.(ts|tsx)$/, ''));
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Check if an export is used in other files
 */
async function isExportUsed(exportName, filepath, allFiles) {
  // Skip checking if name is index, default, or common words unlikely to be unique
  if (['index', 'default', 'props', 'state'].includes(exportName)) {
    return true;
  }
  
  // Skip common React component names that might be dynamically imported
  if (exportName.endsWith('Page') || exportName.endsWith('Dialog') || exportName.endsWith('Provider')) {
    return true;
  }

  // Skip checking UI component exports if in ui directory - these are often dynamically imported
  // or used through component libraries where detection is difficult
  if (filepath.includes('/components/ui/') || filepath.includes('\\components\\ui\\')) {
    const commonUIExports = [
      'Button', 'Dialog', 'Tooltip', 'Select', 'Input', 'Tabs', 'Card', 
      'Form', 'Table', 'Alert', 'Badge', 'Checkbox', 'Radio', 'Switch', 
      'Avatar', 'Progress', 'Popover', 'Modal', 'Drawer', 'Dropdown'
    ];
    
    // If it's a common UI component export, assume it's used
    if (commonUIExports.some(ui => exportName.includes(ui))) {
      return true;
    }
  }
  
  // Check if the file has dynamic imports or is imported via an index file
  if (hasDynamicImports(filepath) || isImportedViaIndex(filepath)) {
    // For files with dynamic imports or imported via index, be more cautious
    // and check for simpler patterns that might indicate usage
    const isWin = process.platform === "win32";
    try {
      const importPattern = `import { ${exportName}`;
      const destructurePattern = `{ ${exportName} }`;
      const usagePattern = ` ${exportName}(`;
      const tsxUsagePattern = `<${exportName}`;

      // Check for import/usage patterns
      const command = isWin
        ? `findstr /s /i /m /c:"${importPattern}" /c:"${destructurePattern}" /c:"${usagePattern}" /c:"${tsxUsagePattern}" "${path.resolve(process.cwd()).replace(/\\/g, '\\\\')}\\"*.*"`
        : `grep -r -l -e "${importPattern}" -e "${destructurePattern}" -e "${usagePattern}" -e "${tsxUsagePattern}" --include="*.{js,jsx,ts,tsx}" ${process.cwd()} | grep -v ${filepath}`;

      const { stdout } = await execPromise(command);
      return stdout.trim().length > 0;
    } catch (error) {
      // If error, assume not used
      return false;
    }
  }
  
  // Standard check for other files
  const isWin = process.platform === "win32";
  const command = isWin
    ? `findstr /s /i /m "${exportName}" "${path.resolve(process.cwd()).replace(/\\/g, '\\\\')}\\"*.*"`
    : `grep -r "${exportName}" --include="*.{js,jsx,ts,tsx}" ${process.cwd()} | grep -v ${filepath}`;
  
  try {
    const { stdout } = await execPromise(command);
    // If export name is found in files other than the source file, it's used
    return stdout.trim().length > 0;
  } catch (error) {
    // grep returns exit code 1 if no matches found
    return false;
  }
}

/**
 * Format progress bar
 */
function formatProgress(current, total) {
  const percent = Math.floor((current / total) * 100);
  const barLength = 30;
  const completedLength = Math.floor((barLength * current) / total);
  const completed = '='.repeat(completedLength);
  const remaining = ' '.repeat(barLength - completedLength);
  return `[${completed}>${remaining}] ${percent}% (${current}/${total})`;
}

/**
 * Sleep for ms milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get confidence level for an unused export
 * Returns a number from 1-5, where 5 is highest confidence that it's truly unused
 */
function getConfidenceLevel(exportName, filepath) {
  const filename = path.basename(filepath);
  let confidence = 3; // Default medium confidence
  
  // Lower confidence: UI components, pages, special file types
  if (filepath.includes('/components/ui/') || 
      filepath.includes('\\components\\ui\\') ||
      filepath.includes('/pages/') || 
      filepath.includes('\\pages\\') ||
      exportName.endsWith('Provider') ||
      exportName.endsWith('Context') ||
      exportName.endsWith('Page') ||
      exportName.includes('Dialog') ||
      exportName.includes('Modal')) {
    confidence = 1;
  }
  
  // Higher confidence: Utility functions, helpers, and non-component items
  if (filepath.includes('/utils/') || 
      filepath.includes('\\utils\\') ||
      filepath.includes('/helpers/') || 
      filepath.includes('\\helpers\\') ||
      exportName.startsWith('use') || // Custom hooks
      exportName.startsWith('format') ||
      exportName.startsWith('validate') ||
      exportName.startsWith('is') ||
      exportName.startsWith('get') ||
      exportName.startsWith('has')) {
    confidence = 4;
  }
  
  // Highest confidence: Private helpers inside a file not exported via index
  if ((exportName.startsWith('_') || exportName.includes('Internal')) &&
      !isImportedViaIndex(filepath)) {
    confidence = 5;
  }
  
  return confidence;
}

/**
 * Check if file is a priority for scanning (likely to have unused exports)
 */
function isPriorityFile(filepath) {
  return filepath.includes('/utils/') || 
         filepath.includes('\\utils\\') ||
         filepath.includes('/helpers/') || 
         filepath.includes('\\helpers\\') ||
         filepath.includes('/lib/') || 
         filepath.includes('\\lib\\') ||
         filepath.includes('/services/') ||
         filepath.includes('\\services\\');
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`${COLORS.YELLOW}Usage: node find-unused-code.js <directory> <extensions> [--output=<filename>] [--batch-size=<number>] [--delay=<ms>] [--verbose] [--exclude=<pattern>] [--focus=<subdirectory>]${COLORS.RESET}`);
    console.log(`Example: node find-unused-code.js src ts,tsx`);
    console.log(`Example: node find-unused-code.js src ts,tsx --output=unused-code.json --batch-size=50 --delay=1000 --verbose`);
    console.log(`Example: node find-unused-code.js src ts,tsx --exclude=components/ui --focus=components/customers`);
    process.exit(1);
  }
  
  const directory = args[0];
  const extensions = args[1].split(',');
  
  // Check for options
  let outputFile = null;
  const outputArg = args.find(arg => arg.startsWith('--output='));
  if (outputArg) {
    outputFile = outputArg.split('=')[1];
  }
  
  // Batch size for processing exports (to prevent system overload)
  let batchSize = 50;
  const batchArg = args.find(arg => arg.startsWith('--batch-size='));
  if (batchArg) {
    batchSize = parseInt(batchArg.split('=')[1], 10);
    if (isNaN(batchSize) || batchSize <= 0) {
      batchSize = 50;
    }
  }
  
  // Delay between batches in milliseconds
  let delay = 100;
  const delayArg = args.find(arg => arg.startsWith('--delay='));
  if (delayArg) {
    delay = parseInt(delayArg.split('=')[1], 10);
    if (isNaN(delay) || delay < 0) {
      delay = 100;
    }
  }
  
  // Verbose mode
  const verbose = args.includes('--verbose');
  
  // Exclude patterns
  let excludePatterns = [];
  const excludeArg = args.find(arg => arg.startsWith('--exclude='));
  if (excludeArg) {
    excludePatterns = excludeArg.split('=')[1].split(',');
  }

  // Focus on specific subdirectory
  let focusDir = null;
  const focusArg = args.find(arg => arg.startsWith('--focus='));
  if (focusArg) {
    focusDir = focusArg.split('=')[1];
  }
  
  console.log(`${COLORS.CYAN}Scanning ${directory}${focusDir ? '/' + focusDir : ''} for files with extensions: ${extensions.join(', ')}${COLORS.RESET}`);
  if (excludePatterns.length > 0) {
    console.log(`${COLORS.CYAN}Excluding patterns: ${excludePatterns.join(', ')}${COLORS.RESET}`);
  }
  if (outputFile) {
    console.log(`${COLORS.CYAN}Results will be saved to: ${outputFile}${COLORS.RESET}`);
  }
  console.log(`${COLORS.CYAN}Using batch size: ${batchSize}, delay between batches: ${delay}ms${COLORS.RESET}`);
  if (verbose) {
    console.log(`${COLORS.CYAN}Verbose mode enabled${COLORS.RESET}`);
  }
  
  try {
    // Find files based on directory and focus subdirectory
    let scanDir = directory;
    if (focusDir) {
      scanDir = path.join(directory, focusDir);
    }
    
    let files = findFiles(scanDir, extensions);
    
    // Apply exclude patterns
    if (excludePatterns.length > 0) {
      files = files.filter(file => {
        return !excludePatterns.some(pattern => file.includes(pattern));
      });
    }
    
    // Optionally sort files to prioritize certain directories (utils, helpers, lib)
    if (args.includes('--prioritize')) {
      files.sort((a, b) => {
        const aIsPriority = isPriorityFile(a);
        const bIsPriority = isPriorityFile(b);
        
        if (aIsPriority && !bIsPriority) return -1;
        if (!aIsPriority && bIsPriority) return 1;
        return 0;
      });
      
      console.log(`${COLORS.CYAN}Files sorted by priority (utils, helpers, lib first)${COLORS.RESET}`);
    }
    
    console.log(`${COLORS.GREEN}Found ${files.length} files to analyze${COLORS.RESET}`);
    
    if (verbose) {
      console.log(`${COLORS.BLUE}Files to analyze:${COLORS.RESET}`);
      files.forEach(file => console.log(`  - ${file}`));
    }
    
    let allExports = [];
    for (const file of files) {
      const fileExports = extractExports(file);
      allExports = [...allExports, ...fileExports];
    }
    
    console.log(`${COLORS.GREEN}Found ${allExports.length} exports to check${COLORS.RESET}`);
    
    if (verbose) {
      console.log(`${COLORS.BLUE}Exports to check:${COLORS.RESET}`);
      const groupedExports = {};
      allExports.forEach(exp => {
        if (!groupedExports[exp.filepath]) {
          groupedExports[exp.filepath] = [];
        }
        groupedExports[exp.filepath].push(exp.name);
      });
      
      for (const file in groupedExports) {
        console.log(`  ${file}:`);
        groupedExports[file].forEach(exp => console.log(`    - ${exp}`));
      }
    }
    
    console.log(`${COLORS.CYAN}Checking for unused exports (this may take a while)...${COLORS.RESET}`);
    
    const unusedExports = [];
    let counter = 0;
    
    // Process exports in batches
    for (let i = 0; i < allExports.length; i += batchSize) {
      const batch = allExports.slice(i, i + batchSize);
      
      // Process each export in the current batch
      for (const exp of batch) {
        counter++;
        const progress = formatProgress(counter, allExports.length);
        process.stdout.write(`Checking: ${exp.name} ${progress}\r`);
        const used = await isExportUsed(exp.name, exp.filepath, files);
        if (!used) {
          unusedExports.push(exp);
          if (verbose) {
            process.stdout.write('\n');
            console.log(`${COLORS.YELLOW}Potentially unused: ${exp.name} in ${exp.filepath}${COLORS.RESET}`);
          }
        }
      }
      
      // Add delay between batches to prevent system overload
      if (i + batchSize < allExports.length && delay > 0) {
        await sleep(delay);
      }
    }
    
    console.log('\n');
    
    if (unusedExports.length === 0) {
      console.log(`${COLORS.GREEN}Great! No unused exports found.${COLORS.RESET}`);
    } else {
      console.log(`${COLORS.YELLOW}Found ${unusedExports.length} potentially unused exports:${COLORS.RESET}`);
      
      // Add confidence score to each unused export
      const scoredExports = unusedExports.map(exp => ({
        ...exp,
        confidence: getConfidenceLevel(exp.name, exp.filepath)
      }));
      
      // Group by confidence level first, then by file
      const byConfidence = {
        5: [], // Very likely unused
        4: [], // Likely unused
        3: [], // Possibly unused
        2: [], // Probably used (false positive)
        1: []  // Almost certainly used (false positive)
      };
      
      scoredExports.forEach(exp => {
        byConfidence[exp.confidence].push(exp);
      });
      
      // Output results grouped by confidence
      for (let confidence = 5; confidence >= 1; confidence--) {
        const exportsAtConfidence = byConfidence[confidence];
        if (exportsAtConfidence.length === 0) continue;
        
        const confidenceLabels = {
          5: 'VERY LIKELY UNUSED',
          4: 'LIKELY UNUSED',
          3: 'POSSIBLY UNUSED',
          2: 'POSSIBLY USED (CHECK MANUALLY)',
          1: 'LIKELY USED (PROBABLE FALSE POSITIVE)'
        };
        
        console.log(`\n${COLORS.MAGENTA}${confidenceLabels[confidence]} (${exportsAtConfidence.length} items):${COLORS.RESET}`);
        
        // Group by file
        const byFile = {};
        for (const exp of exportsAtConfidence) {
          if (!byFile[exp.filepath]) {
            byFile[exp.filepath] = [];
          }
          byFile[exp.filepath].push(exp.name);
        }
        
        // Output by file
        for (const file in byFile) {
          console.log(`\n${COLORS.CYAN}${file}:${COLORS.RESET}`);
          byFile[file].forEach(exp => console.log(`  - ${exp}`));
        }
      }
      
      console.log(`\n${COLORS.YELLOW}Note: This is a best-effort analysis. Verify manually before removal.${COLORS.RESET}`);
      console.log(`${COLORS.YELLOW}Dynamic imports, string references, and re-exports may not be detected.${COLORS.RESET}`);
      
      // Save results to file if specified
      if (outputFile) {
        const results = {
          summary: {
            totalExports: allExports.length,
            potentiallyUnused: scoredExports.length,
            byConfidence: {
              5: byConfidence[5].length,
              4: byConfidence[4].length,
              3: byConfidence[3].length,
              2: byConfidence[2].length,
              1: byConfidence[1].length
            },
            scanDate: new Date().toISOString()
          },
          unusedExportsByConfidence: {
            5: byConfidence[5].map(e => ({ name: e.name, filepath: e.filepath })),
            4: byConfidence[4].map(e => ({ name: e.name, filepath: e.filepath })),
            3: byConfidence[3].map(e => ({ name: e.name, filepath: e.filepath })),
            2: byConfidence[2].map(e => ({ name: e.name, filepath: e.filepath })),
            1: byConfidence[1].map(e => ({ name: e.name, filepath: e.filepath }))
          }
        };
        
        fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
        console.log(`${COLORS.GREEN}Results saved to ${outputFile}${COLORS.RESET}`);
      }
    }
    
  } catch (error) {
    console.error(`${COLORS.RED}Error: ${error.message}${COLORS.RESET}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(`${COLORS.RED}Unhandled error: ${err}${COLORS.RESET}`);
  process.exit(1);
}); 