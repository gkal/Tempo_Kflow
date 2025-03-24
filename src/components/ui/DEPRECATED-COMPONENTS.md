# Deprecated Components Migration Guide

## Overview

This document outlines the components that have been deprecated and provides guidance on migrating to their replacements. These components are currently maintained for backward compatibility but will be completely removed in a future update.

## Deprecated Components

### Tooltip Components

| Deprecated Component | Replacement | Migration Status |
|----------------------|-------------|-----------------|
| `tooltip.tsx` | `GlobalTooltip.tsx` | Maintained for backward compatibility with deprecation warnings |
| `truncated-text.tsx` | `TruncateWithTooltip` in `GlobalTooltip.tsx` | Maintained for backward compatibility with deprecation warnings |

#### Preferred Tooltip Implementation

The `TruncateWithTooltip` component from `GlobalTooltip.tsx` is the preferred implementation for tooltips, especially for truncated text. This is the component used in key pages like the ServiceTypesPage.

**Key Features to Preserve:**
- Text truncation with ellipsis
- Hover tooltip showing full text
- Configurable tooltip position
- Support for both single and multi-line truncation

```tsx
// Import the preferred tooltip component
import { TruncateWithTooltip } from '@/components/ui/GlobalTooltip';

// Example usage as seen in ServiceTypesPage
<TruncateWithTooltip 
  text={category.name} 
  maxLength={40} 
  tooltipPosition="top" 
/>
```

#### Complete Migration Example:

```tsx
// Old import 
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { TruncatedText } from '@/components/ui/truncated-text';

// New import
import { 
  Tooltip, 
  TooltipTrigger, 
  TooltipContent, 
  TruncateWithTooltip,
  GlobalTooltip
} from '@/components/ui/GlobalTooltip';

// Old usage (deprecated)
<TruncatedText text="Long text to truncate" maxLength={20} />

// New usage (preferred)
<TruncateWithTooltip text="Long text to truncate" maxLength={20} />
```

### Tabs Components

| Deprecated Component | Replacement | Migration Status |
|----------------------|-------------|-----------------|
| `tabs.tsx` | `app-tabs.tsx` | Maintained for backward compatibility with deprecation warnings |
| `custom-tabs.tsx` | Components in `app-tabs.tsx` | Maintained for backward compatibility with deprecation warnings |

#### Migration Example:

```tsx
// Old import
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
// or
import { SimpleTabs, CustomTabs } from '@/components/ui/custom-tabs';

// New import
import { 
  AppTabs, 
  AppTabsList, 
  AppTabsTrigger, 
  AppTabsContent 
} from '@/components/ui/app-tabs';
```

## Migration Strategy

1. **Step 1: Update Imports**
   - Update imports in all files to use the new component modules
   - Follow the migration examples above

2. **Step 2: Component Usage**
   - Replace deprecated component usage with their new equivalents
   - Refer to component documentation for any API differences

3. **Step 3: Testing**
   - Test thoroughly after migration to ensure functionality is preserved
   - Watch for console warnings that might indicate missed migrations

## Timeline

- **Current Phase**: Backward compatibility with deprecation warnings
- **Next Phase**: Remove deprecated components once all usages have been migrated

## Component Utils

We've added new utility functions in `src/utils/componentUtils.ts` to help with deprecation management:

- `logDeprecationWarning`: Logs a clear deprecation warning message
- `withDeprecationWarning`: Higher-order component for wrapping deprecated components

These utilities help provide clear migration paths and warnings while maintaining backward compatibility during the transition period.

## Affected Files

This migration impacts the following files:

1. `src/components/ui/tooltip.tsx`
2. `src/components/ui/truncated-text.tsx`
3. `src/components/ui/tabs.tsx`
4. `src/components/ui/custom-tabs.tsx`

## Important Note on UI Preservation

The migration plan is designed to maintain the exact same UI appearance and behavior. The `TruncateWithTooltip` component (already used in the ServiceTypesPage) will continue to function exactly as it currently does, with no visual or functional changes. This is a code organization change only, not a UI redesign.

## Notes

When migrating, ensure you don't change UI functionality as requested. The goal is to consolidate similar components without altering the user experience. 