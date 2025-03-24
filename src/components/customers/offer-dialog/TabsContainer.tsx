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