# AppTabs Component Documentation

## Overview
`AppTabs` is the standardized tab system for K-Flow. It provides consistent styling and behavior across the application, based on Radix UI Tabs implementation.

## Components

### AppTabs
The container component for the entire tabs system.

```tsx
<AppTabs defaultValue="tab1" className="optional-additional-classes">
  {/* TabsList, TabsTrigger, and TabsContent components go here */}
</AppTabs>
```

**Props:**
- `defaultValue`: String - The value of the tab that should be active by default
- `value`: String - (Optional) For controlled components, the current active tab value
- `onValueChange`: Function - (Optional) Callback for value changes in controlled mode
- `children`: React nodes - The tab list and content components
- `className`: Optional string - Additional classes to apply to the container

### AppTabsList
Container for tab triggers/buttons.

```tsx
<AppTabsList className="optional-additional-classes">
  {/* TabsTrigger components go here */}
</AppTabsList>
```

**Props:**
- `children`: React nodes - The tab trigger components
- `className`: Optional string - Additional classes to apply to the list

### AppTabsTrigger
Individual tab buttons/triggers.

```tsx
<AppTabsTrigger value="tab1" className="optional-additional-classes">
  Tab 1
</AppTabsTrigger>
```

**Props:**
- `value`: String - The value of this tab (must match a TabsContent value)
- `children`: React nodes - The content of the tab trigger (typically text)
- `className`: Optional string - Additional classes to apply to the trigger

### AppTabsContent
The content displayed when a tab is active.

```tsx
<AppTabsContent value="tab1" className="optional-additional-classes">
  Content for Tab 1
</AppTabsContent>
```

**Props:**
- `value`: String - The value of this content (must match a TabsTrigger value)
- `children`: React nodes - The content to display when this tab is active
- `className`: Optional string - Additional classes to apply to the content

## Usage Examples

### Basic Usage

```tsx
import { AppTabs, AppTabsList, AppTabsTrigger, AppTabsContent } from "@/components/ui/app-tabs";

function TabsExample() {
  return (
    <AppTabs defaultValue="customers">
      <AppTabsList>
        <AppTabsTrigger value="customers">Customers</AppTabsTrigger>
        <AppTabsTrigger value="orders">Orders</AppTabsTrigger>
        <AppTabsTrigger value="invoices">Invoices</AppTabsTrigger>
      </AppTabsList>
      
      <AppTabsContent value="customers">
        <CustomersList />
      </AppTabsContent>
      
      <AppTabsContent value="orders">
        <OrdersList />
      </AppTabsContent>
      
      <AppTabsContent value="invoices">
        <InvoicesList />
      </AppTabsContent>
    </AppTabs>
  );
}
```

### Controlled Tabs

```tsx
import { useState } from "react";
import { AppTabs, AppTabsList, AppTabsTrigger, AppTabsContent } from "@/components/ui/app-tabs";

function ControlledTabs() {
  const [activeTab, setActiveTab] = useState("tab1");
  
  return (
    <AppTabs value={activeTab} onValueChange={setActiveTab}>
      <AppTabsList>
        <AppTabsTrigger value="tab1">Tab 1</AppTabsTrigger>
        <AppTabsTrigger value="tab2">Tab 2</AppTabsTrigger>
      </AppTabsList>
      
      <AppTabsContent value="tab1">
        Content for Tab 1
      </AppTabsContent>
      
      <AppTabsContent value="tab2">
        Content for Tab 2
      </AppTabsContent>
      
      <button onClick={() => setActiveTab("tab2")}>
        Go to Tab 2
      </button>
    </AppTabs>
  );
}
```

## Migration Guide

### From Basic Tabs:

```diff
- import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
+ import { AppTabs, AppTabsList, AppTabsTrigger, AppTabsContent } from "@/components/ui/app-tabs";

- <Tabs defaultValue="tab1">
-   <TabsList>
-     <TabsTrigger value="tab1">Tab 1</TabsTrigger>
-     <TabsTrigger value="tab2">Tab 2</TabsTrigger>
-   </TabsList>
-   <TabsContent value="tab1">Content 1</TabsContent>
-   <TabsContent value="tab2">Content 2</TabsContent>
- </Tabs>
+ <AppTabs defaultValue="tab1">
+   <AppTabsList>
+     <AppTabsTrigger value="tab1">Tab 1</AppTabsTrigger>
+     <AppTabsTrigger value="tab2">Tab 2</AppTabsTrigger>
+   </AppTabsList>
+   <AppTabsContent value="tab1">Content 1</AppTabsContent>
+   <AppTabsContent value="tab2">Content 2</AppTabsContent>
+ </AppTabs>
```

## Best Practices

1. **Use Semantic Tab Values**: Instead of using generic "tab1", "tab2" values, use semantic values like "details", "settings", "history".

2. **Consistent Styling**: Use the built-in styling of AppTabs components. Only override when absolutely necessary.

3. **Accessibility**: The tabs are already accessible with keyboard navigation and ARIA attributes.

4. **Responsive Design**: The AppTabs component adapts well to different screen sizes. For mobile views, consider using alternative layouts or scrollable tab lists.

5. **Use Controlled Mode**: For complex interactions, use the controlled mode with value/onValueChange props.

6. **Tab Content Organization**: Keep tab content components clean and focused. Consider creating separate components for complex tab content.

7. **Naming Conventions**: Use clear, descriptive names for tabs that indicate their purpose.

## Performance Considerations

- Avoid rendering heavy content in hidden tabs
- For very complex tab systems, consider lazy loading tab content
- Use React.memo for expensive tab content that doesn't change often 