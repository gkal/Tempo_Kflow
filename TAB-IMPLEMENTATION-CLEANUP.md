# Tab Implementation Cleanup Plan

## Current Status

We currently have 4 different tab implementations:

1. **AppTabs** (`src/components/ui/app-tabs.tsx`) - The standardized version used throughout the app
2. **Basic Tabs** (`src/components/ui/tabs.tsx`) - Only used internally by AppTabs and CustomTabs
3. **SimpleTabs** (`src/components/ui/custom-tabs.tsx`) - Only used by the deprecated TabsContainer
4. **CustomTabs** (`src/components/ui/custom-tabs.tsx`) - Not used anywhere in the codebase

## Migration Steps

### Phase 1: Refactor AppTabs to Import Directly from Radix UI

This removes the dependency on the basic tabs.tsx file.

1. Edit `src/components/ui/app-tabs.tsx` to import directly from Radix UI:

```tsx
// BEFORE
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import * as TabsPrimitive from "@radix-ui/react-tabs";

// AFTER
import { cn } from "@/lib/utils";
import * as TabsPrimitive from "@radix-ui/react-tabs";

const Tabs = TabsPrimitive.Root;
const TabsList = TabsPrimitive.List;
const TabsTrigger = TabsPrimitive.Trigger;
const TabsContent = TabsPrimitive.Content;
```

2. Test thoroughly to ensure AppTabs still works correctly in all components using it.

### Phase 2: Update TabsContainer to Use AppTabs Directly

This removes the dependency on SimpleTabs from custom-tabs.tsx.

1. Edit `src/components/customers/offer-dialog/TabsContainer.tsx`:

```tsx
// BEFORE
import React from 'react';
import { SimpleTabs } from '@/components/ui/custom-tabs';

/**
 * @deprecated This component is deprecated. Please use SimpleTabs from @/components/ui/custom-tabs instead.
 * Example usage:
 * ```tsx
 * <SimpleTabs>
 *   <div>First tab content</div>
 *   <div>Second tab content</div>
 * </SimpleTabs>
 * ```
 */
interface TabsContainerProps {
  children: React.ReactNode[];
}

const TabsContainer: React.FC<TabsContainerProps> = ({ children }) => {
  // Display deprecated warning in development
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        'WARNING: TabsContainer is deprecated. Please use SimpleTabs from @/components/ui/custom-tabs instead.'
      );
    }
  }, []);

  // For backward compatibility, we use the new SimpleTabs component underneath
  return (
    <SimpleTabs variant="simple" children={children} />
  );
};

// AFTER
import React from 'react';
import { AppTabs, AppTabsList, AppTabsTrigger, AppTabsContent } from '@/components/ui/app-tabs';

/**
 * @deprecated This component is deprecated. Please use AppTabs from @/components/ui/app-tabs instead.
 * Example usage:
 * ```tsx
 * <AppTabs defaultValue="tab1">
 *   <AppTabsList>
 *     <AppTabsTrigger value="tab1">Tab 1</AppTabsTrigger>
 *     <AppTabsTrigger value="tab2">Tab 2</AppTabsTrigger>
 *   </AppTabsList>
 *   <AppTabsContent value="tab1">First tab content</AppTabsContent>
 *   <AppTabsContent value="tab2">Second tab content</AppTabsContent>
 * </AppTabs>
 * ```
 */
interface TabsContainerProps {
  children: React.ReactNode[];
}

const TabsContainer: React.FC<TabsContainerProps> = ({ children }) => {
  // Display deprecated warning in development
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        'WARNING: TabsContainer is deprecated. Please use AppTabs from @/components/ui/app-tabs instead.'
      );
    }
  }, []);

  // Generate tab values and labels
  const tabValues = children.map((_, index) => `tab-${index}`);
  const defaultLabels = ["Βασικά Στοιχεία", "Λεπτομέρειες"];
  
  // For backward compatibility, transform to AppTabs format
  return (
    <AppTabs defaultValue={tabValues[0]} className="w-full">
      <AppTabsList>
        {tabValues.map((value, index) => (
          <AppTabsTrigger key={value} value={value}>
            {defaultLabels[index] || `Tab ${index + 1}`}
          </AppTabsTrigger>
        ))}
      </AppTabsList>
      
      {children.map((child, index) => (
        <AppTabsContent key={tabValues[index]} value={tabValues[index]}>
          {child}
        </AppTabsContent>
      ))}
    </AppTabs>
  );
};

export default TabsContainer;
```

2. Test thoroughly to ensure TabsContainer still works correctly in all components using it.

### Phase 3: Remove Unused Files

Once the dependencies are removed and everything is tested:

1. Delete the `src/components/ui/tabs.tsx` file
2. Delete the `src/components/ui/custom-tabs.tsx` file

### Phase 4: Update Documentation

1. Update `src/components/ui/README.md` to remove references to the deleted files
2. Update `src/components/ui/README-APP-TABS.md` to remove migration examples from SimpleTabs and CustomTabs
3. Update the `CODEBASE-CLEANUP.md` file to include these changes

## Validation Checklist

Before and after each phase, ensure:

- [ ] All components using tabs still work correctly
- [ ] No console errors or warnings (excluding the intentional deprecation warnings)
- [ ] Visual appearance of all tabs is maintained
- [ ] Functionality of all tabs is maintained
- [ ] Build process completes successfully

## Benefits

1. **Simplified Codebase**: Only one tab implementation instead of four
2. **Reduced Bundle Size**: Fewer components to load
3. **Improved Maintainability**: Fewer files to maintain and update
4. **Consistent UI**: All tabs use the same standardized implementation
5. **Clearer Documentation**: No confusing migration paths between multiple implementations

## Timeline

This migration can be completed in a single pull request, ideally during a period of low feature development activity. Total estimated time: 2-3 hours including thorough testing. 