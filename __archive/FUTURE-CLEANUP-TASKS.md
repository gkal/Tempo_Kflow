# Future Cleanup Tasks

This document outlines additional cleanup tasks that can be performed to further improve code organization, maintainability, and reduce technical debt.

## Code Cleanup Tools

We've created the following tools to assist with code cleanup:

1. **Component Utilities** (`src/utils/componentUtils.ts`)
   - `logDeprecationWarning`: Logs standardized deprecation warnings
   - `withDeprecationWarning`: HOC for wrapping deprecated components

2. **Dialog Helpers** (`src/hooks/useDialogHelpers.ts` and `src/hooks/useDialogCleanup.ts`)
   - Consolidated dialog management utilities
   - Added support for dialog cleanup on component unmount

3. **Unused Code Detection** (`src/scripts/find-unused-code.js`)
   - Script for identifying potentially unused exports
   - Helps find dead code that can be safely removed

### Unused Code Detection

We've created a script to help identify potentially unused exports in the codebase. This can be a starting point for finding dead code that can be safely removed.

#### Key Features

- **Confidence scoring**: Exports are categorized by confidence level (1-5) for easier review
- **Smart detection**: Considers dynamic imports, index files, and common patterns
- **Priority scanning**: Option to focus on high-value targets first
- **Detailed reporting**: JSON output with comprehensive analysis

#### Usage

```bash
# Basic usage
npm run find-unused

# Save results to a file
npm run find-unused -- --output=unused-code.json

# Advanced options
npm run find-unused -- --batch-size=50 --delay=1000 --verbose --prioritize

# Focus on specific directories and exclude others
npm run find-unused -- --focus=components/customers --exclude=components/ui

# Common use cases
npm run find-unused -- --focus=utils --output=unused-utils.json
npm run find-unused -- --focus=services --exclude=services/api/types.ts --verbose
```

#### Options

- `--output=<filename>`: Save results to a JSON file
- `--batch-size=<number>`: Number of exports to check in each batch (default: 50)
- `--delay=<ms>`: Delay between batches in milliseconds (default: 100)
- `--verbose`: Enable detailed output
- `--focus=<subdirectory>`: Only scan files in the specified subdirectory
- `--exclude=<pattern1,pattern2,...>`: Skip files matching these patterns
- `--prioritize`: Sort files to check high-value targets first (utils, helpers, lib)

#### Confidence Levels

The tool assigns confidence scores to potentially unused exports:

1. **LIKELY USED (PROBABLE FALSE POSITIVE)**: UI components, pages, providers, contexts
2. **POSSIBLY USED (CHECK MANUALLY)**: Components with dynamic imports
3. **POSSIBLY UNUSED**: General exports with no clear usage patterns
4. **LIKELY UNUSED**: Utility functions, helpers, hooks with no detected usage
5. **VERY LIKELY UNUSED**: Internal/private helpers with no usage

#### Specialized NPM Scripts

We've added several convenience scripts for common scanning tasks:

- `npm run find-unused:utils`: Scan the utils directory
- `npm run find-unused:services`: Scan the services directory
- `npm run find-unused:business`: Scan business components (excluding UI components)

#### Limitations

Always manually verify before removing any identified code. The script cannot detect:
- Dynamic imports with variable paths
- String-based references or eval usage
- Re-exports through multiple levels
- External usage in files outside the scanned directories

## Immediate Tasks

These tasks can be completed in the short term:

1. **Run the Unused Code Detector**
   ```
   node src/scripts/find-unused-code.js src ts,tsx
   ```
   Review results and remove any confirmed unused code.

2. **Migrate Remaining Component Usage**
   - Continue migrating usage of deprecated components to their preferred replacements
   - Remove deprecated components once all instances are migrated

3. **Clean Up Remaining lib/ Files**
   - Move any remaining useful utility functions from lib/ to utils/
   - Update imports to use the new locations

## Medium-term Tasks

These tasks require more planning and should be done gradually:

1. **Consolidate Hook Directories**
   - Consider moving `src/lib/hooks` content to `src/hooks`
   - Update all imports accordingly

2. **Standardize Component Imports**
   - Consider creating an index.ts file for each component directory
   - Simplify imports with a consistent pattern

3. **Remove Duplicate Code**
   - Identify and remove duplicate utility functions
   - Create shared components for repeated UI patterns

## Long-term Tasks

These are larger efforts that should be tackled as part of a broader refactoring:

1. **Component Library Standardization**
   - Review all UI components
   - Standardize props and API surface
   - Document components with consistent JSDoc

2. **State Management Refactoring**
   - Review state management patterns
   - Consider consolidating with a consistent approach
   - Document state management patterns

3. **Performance Optimization**
   - Analyze component render performance
   - Add memoization where appropriate
   - Remove unnecessary re-renders

## Guidelines for Cleanup

1. **Always Test Thoroughly**
   - Ensure no functionality is lost during cleanup
   - Test both happy paths and edge cases

2. **One Change at a Time**
   - Make isolated changes that can be reviewed independently
   - Avoid mixing refactoring with feature changes

3. **Documentation**
   - Update documentation as code changes
   - Document the reasons for changes

4. **No UI Changes**
   - Ensure refactoring doesn't change UI appearance or behavior
   - Prioritize backward compatibility

## Monitoring and Maintenance

After cleanup:

1. **Add Linting Rules**
   - Add ESLint rules to prevent re-introducing deprecated patterns
   - Consider using custom ESLint plugins for project-specific rules

2. **Regular Cleanup**
   - Run the unused code detector periodically
   - Schedule regular code cleanup sprints

3. **Track Technical Debt**
   - Keep a list of technical debt items
   - Prioritize and address them systematically 