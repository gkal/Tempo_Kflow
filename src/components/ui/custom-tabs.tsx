/**
 * @deprecated This file is deprecated in favor of app-tabs.tsx
 * 
 * This module is maintained for backward compatibility only.
 * For new code, please use components from @/components/ui/app-tabs instead.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Tabs as RadixTabs, TabsList as RadixTabsList, TabsTrigger as RadixTabsTrigger, TabsContent as RadixTabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { AppTabs, AppTabsList, AppTabsTrigger, AppTabsContent } from "@/components/ui/app-tabs";
import { logDeprecationWarning } from '@/utils/componentUtils';

// Log deprecation warning when this module is imported
(function logWarning() {
  // Will run once when the module is imported
  if (typeof window !== 'undefined') {
    logDeprecationWarning(
      'custom-tabs.tsx',
      'Please use components from @/components/ui/app-tabs instead.'
    );
  }
})();

// ======================================================
// Standard Tabs Export (Re-exporting the AppTabs)
// ======================================================
export {
  AppTabs as Tabs,
  AppTabsList as TabsList,
  AppTabsTrigger as TabsTrigger,
  AppTabsContent as TabsContent
} from "@/components/ui/app-tabs";

// ======================================================
// Simple Tabs Container (Similar to TabsContainer)
// ======================================================
interface SimpleTabsProps {
  children: React.ReactNode[];
  defaultTab?: number;
  tabTitles?: string[];
  className?: string;
  tabsClassName?: string;
  contentClassName?: string;
  tabsListClassName?: string;
  tabTriggerClassName?: string;
  minHeight?: string;
  variant?: "default" | "simple" | "underline";
}

export const SimpleTabs: React.FC<SimpleTabsProps> = ({
  children,
  defaultTab = 0,
  tabTitles = ["Βασικά Στοιχεία", "Λεπτομέρειες"],
  className = "",
  tabsClassName = "",
  contentClassName = "",
  tabsListClassName = "",
  tabTriggerClassName = "",
  minHeight = "450px",
  variant = "default"
}) => {
  useEffect(() => {
    logDeprecationWarning(
      'SimpleTabs',
      'Please use components from @/components/ui/app-tabs instead.'
    );
  }, []);

  const [activeTab, setActiveTab] = useState(defaultTab);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const contentRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      
      const direction = e.key === 'ArrowLeft' ? -1 : 1;
      const tabCount = React.Children.count(children);
      const newIndex = (index + direction + tabCount) % tabCount;
      
      setActiveTab(newIndex);
      tabRefs.current[newIndex]?.focus();
    }
  };

  // Set up refs for tab buttons
  useEffect(() => {
    tabRefs.current = tabRefs.current.slice(0, React.Children.count(children));
    contentRefs.current = contentRefs.current.slice(0, React.Children.count(children));
  }, [children]);

  // Styles based on variant
  const getTabStyles = () => {
    switch (variant) {
      case "simple":
        return "flex border-b border-[#52796f] mb-2";
      case "underline":
        return "flex bg-transparent border-b border-[#52796f]";
      default:
        return "flex border-b border-[#52796f] mb-2";
    }
  };

  const getTabTriggerStyles = (isActive: boolean) => {
    switch (variant) {
      case "simple":
        return `px-4 py-2 text-sm font-medium transition-all duration-200 relative ${
          isActive
            ? 'text-[#a8c5b5] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#a8c5b5] after:rounded-t-sm'
            : 'text-[#cad2c5] hover:text-[#a8c5b5]'
        }`;
      case "underline":
        return `px-4 py-2 text-sm font-medium transition-all duration-200 relative ${
          isActive
            ? 'text-[#a8c5b5] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#a8c5b5] after:rounded-t-sm'
            : 'text-[#cad2c5] hover:text-[#a8c5b5]'
        }`;
      default:
        return `px-4 py-2 text-sm font-medium transition-all duration-200 relative ${
          isActive
            ? 'text-[#a8c5b5] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#a8c5b5] after:rounded-t-sm'
            : 'text-[#cad2c5] hover:text-[#a8c5b5]'
        }`;
    }
  };

  return (
    <div className={`flex flex-col w-full ${className}`}>
      <div className={cn(getTabStyles(), tabsListClassName)} role="tablist">
        {tabTitles.slice(0, React.Children.count(children)).map((title, index) => (
          <button
            key={index}
            type="button"
            ref={el => (tabRefs.current[index] = el)}
            onClick={() => setActiveTab(index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              getTabTriggerStyles(activeTab === index),
              tabTriggerClassName
            )}
            aria-selected={activeTab === index}
            role="tab"
            tabIndex={activeTab === index ? 0 : -1}
            aria-controls={`tab-panel-${index}`}
            id={`tab-${index}`}
          >
            {title}
          </button>
        ))}
      </div>

      <div className={cn("tab-content", contentClassName)} style={{ minHeight }}>
        {React.Children.map(children, (child, index) => (
          <div
            ref={el => (contentRefs.current[index] = el)}
            className={`transition-opacity duration-200 h-full ${
              activeTab === index ? 'block' : 'hidden'
            }`}
            role="tabpanel"
            aria-hidden={activeTab !== index}
            id={`tab-panel-${index}`}
            aria-labelledby={`tab-${index}`}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
};

// ======================================================
// Radix-based Custom Tabs (For more complex use cases)
// ======================================================
interface CustomTabsProps {
  tabs: { value: string; label: string }[];
  children: React.ReactNode[];
  defaultValue?: string;
  className?: string;
  tabsListClassName?: string;
  tabsTriggerClassName?: string;
  tabsContentClassName?: string;
  variant?: "default" | "underlined" | "rounded";
  orientation?: "horizontal" | "vertical";
}

export const CustomTabs: React.FC<CustomTabsProps> = ({
  tabs,
  children,
  defaultValue = tabs[0]?.value,
  className = "",
  tabsListClassName = "",
  tabsTriggerClassName = "",
  tabsContentClassName = "",
  variant = "default",
  orientation = "horizontal"
}) => {
  useEffect(() => {
    logDeprecationWarning(
      'CustomTabs',
      'Please use components from @/components/ui/app-tabs instead.'
    );
  }, []);

  // Base and variant-specific styles
  const getBaseStyles = () => {
    const base = {
      tabsList: "inline-flex items-center justify-center text-[#cad2c5]",
      tabsTrigger: "inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5 text-sm font-medium transition-all",
      tabsContent: "mt-2 ring-offset-white focus-visible:outline-none"
    };

    const variants = {
      default: {
        tabsList: "h-10 rounded-md bg-[#2f3e46] p-1",
        tabsTrigger: "rounded-sm focus-visible:ring-2 focus-visible:ring-[#52796f] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-[#354f52] data-[state=active]:text-[#cad2c5] data-[state=active]:shadow-sm",
        tabsContent: "focus-visible:ring-2 focus-visible:ring-[#52796f] focus-visible:ring-offset-2"
      },
      underlined: {
        tabsList: "border-b border-[#52796f] bg-transparent",
        tabsTrigger: "border-b-2 border-transparent data-[state=active]:border-[#84a98c] data-[state=active]:text-[#a8c5b5] rounded-none bg-transparent",
        tabsContent: "mt-0 border-t-0 -mt-[1px]"
      },
      rounded: {
        tabsList: "bg-transparent gap-2",
        tabsTrigger: "rounded-lg px-4 py-2 data-[state=active]:bg-[#354f52] data-[state=active]:text-[#cad2c5]",
        tabsContent: "mt-4"
      }
    };

    return {
      tabsList: `${base.tabsList} ${variants[variant].tabsList}`,
      tabsTrigger: `${base.tabsTrigger} ${variants[variant].tabsTrigger}`,
      tabsContent: `${base.tabsContent} ${variants[variant].tabsContent}`
    };
  };

  const styles = getBaseStyles();
  const tabsListStyle = orientation === "vertical" ? "flex-col h-auto items-start" : "h-10";

  return (
    <RadixTabs defaultValue={defaultValue} className={cn("w-full", className)}>
      <RadixTabsList className={cn(styles.tabsList, tabsListStyle, tabsListClassName)}>
        {tabs.map((tab) => (
          <RadixTabsTrigger
            key={tab.value}
            value={tab.value}
            className={cn(styles.tabsTrigger, tabsTriggerClassName)}
          >
            {tab.label}
          </RadixTabsTrigger>
        ))}
      </RadixTabsList>
      
      {tabs.map((tab, index) => (
        <RadixTabsContent
          key={tab.value}
          value={tab.value}
          className={cn(styles.tabsContent, tabsContentClassName)}
        >
          {children[index]}
        </RadixTabsContent>
      ))}
    </RadixTabs>
  );
}; 
