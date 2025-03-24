# Tabs Standardization Documentation

## Overview

This document outlines the standardization of tabs across the K-Flow application. All tabs now use the same consistent UI component based on Radix UI Tabs with a standardized styling that matches the application's design system.

## Components

The standardized tab system consists of the following components:

- `AppTabs`: The container component for tabs
- `AppTabsList`: The list/container for tab triggers
- `AppTabsTrigger`: The clickable tab header
- `AppTabsContent`: The content shown when a tab is active

## Implementation Files

- **Component Implementation**: `src/components/ui/app-tabs.tsx`
- **Documentation**: `src/components/ui/README-APP-TABS.md`

## Migration Process

The following files have been updated to use the standardized tab components:

1. `src/components/customers/OffersDialog.tsx`
2. `src/components/tasks/TaskDialog.tsx`
3. `src/components/tasks/TasksPage.tsx`
4. `src/components/offers/OfferHistoryTab.tsx`
5. `src/components/customers/CustomerDetailPage.tsx`
6. `src/components/admin/RecoveryPage.tsx`
7. `src/components/admin/ServiceTypesPage.tsx`

## Previous Tab Implementations (Deprecated)

The following tab implementations are now considered deprecated:

1. **TabsContainer** - A simple tab container that was previously used in OffersDialog
2. **SimpleTabs** - A basic implementation of tabs
3. **CustomTabs** - A more complex implementation for named tabs

## Migration Guide

To update existing tab implementations to the new standard:

### From Radix UI Tabs (direct usage)

```diff
- import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
+ import { AppTabs, AppTabsList, AppTabsTrigger, AppTabsContent } from "@/components/ui/app-tabs";

- <Tabs defaultValue="tab1" className="w-full">
-   <TabsList className="...">
-     <TabsTrigger value="tab1" className="...">
+ <AppTabs defaultValue="tab1">
+   <AppTabsList>
+     <AppTabsTrigger value="tab1">
        Tab 1
-     </TabsTrigger>
-     <TabsTrigger value="tab2" className="...">
+     </AppTabsTrigger>
+     <AppTabsTrigger value="tab2">
        Tab 2
-     </TabsTrigger>
-   </TabsList>
-   <TabsContent value="tab1" className="...">
+     </AppTabsTrigger>
+   </AppTabsList>
+   <AppTabsContent value="tab1">
      Content 1
-   </TabsContent>
-   <TabsContent value="tab2" className="...">
+   </AppTabsContent>
+   <AppTabsContent value="tab2">
      Content 2
-   </TabsContent>
- </Tabs>
+   </AppTabsContent>
+ </AppTabs>
```

### From SimpleTabs or TabsContainer

```diff
- import { SimpleTabs } from "@/components/ui/custom-tabs";
+ import { AppTabs, AppTabsList, AppTabsTrigger, AppTabsContent } from "@/components/ui/app-tabs";

- <SimpleTabs>
-   <div>First tab content</div>
-   <div>Second tab content</div>
- </SimpleTabs>
+ <AppTabs defaultValue="tab1">
+   <AppTabsList>
+     <AppTabsTrigger value="tab1">Tab 1</AppTabsTrigger>
+     <AppTabsTrigger value="tab2">Tab 2</AppTabsTrigger>
+   </AppTabsList>
+   <AppTabsContent value="tab1">First tab content</AppTabsContent>
+   <AppTabsContent value="tab2">Second tab content</AppTabsContent>
+ </AppTabs>
```

## Benefits of Standardization

1. **Consistent User Experience**: All tabs look and behave the same way throughout the application
2. **Reduced Code Duplication**: A single implementation for all tabs
3. **Easier Maintenance**: Changes to tab styling can be made in one place
4. **Improved Accessibility**: The standard implementation includes keyboard navigation and ARIA attributes
5. **Better Theme Integration**: Tabs now consistently follow the application's color scheme

## Future Improvements

- Consider adding more variants to the AppTabs component for different use cases
- Add animation options for tab transitions
- Create a context-based API for dynamic tabs (adding/removing tabs) 