import React from "react";
import { cn } from "@/lib/utils";
import * as TabsPrimitive from "@radix-ui/react-tabs";

// Import Radix UI tabs directly instead of through local tabs.tsx
const Tabs = TabsPrimitive.Root;
const TabsList = TabsPrimitive.List;
const TabsTrigger = TabsPrimitive.Trigger;
const TabsContent = TabsPrimitive.Content;

/**
 * AppTabs - Standardized tabs component for K-Flow application
 * Based on Radix UI Tabs with consistent styling across the application
 */
interface AppTabsProps {
  children: React.ReactNode;
  className?: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

export const AppTabs = ({
  children,
  className,
  defaultValue,
  value,
  onValueChange,
  ...props
}: AppTabsProps) => {
  // Allow both controlled and uncontrolled usage
  const tabsProps = value !== undefined 
    ? { value, onValueChange } 
    : { defaultValue };

  return (
    <Tabs
      {...tabsProps}
      className={cn("w-full h-full flex flex-col", className)}
      {...props}
    >
      {children}
    </Tabs>
  );
};

/**
 * AppTabsList - Container for tab triggers with consistent styling
 */
export function AppTabsList({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string 
}) {
  return (
    <TabsList className={cn("flex w-full bg-[#2f3e46] p-0 h-auto justify-start border-0 sticky top-0", className)}
      style={{ zIndex: 5 }}
    >
      {children}
    </TabsList>
  );
}

/**
 * AppTabsTrigger - Individual tab button with consistent styling
 */
export function AppTabsTrigger({ 
  value, 
  children, 
  className 
}: { 
  value: string; 
  children: React.ReactNode; 
  className?: string 
}) {
  return (
    <TabsTrigger 
      value={value} 
      className={cn(
        "px-3 py-0.5 text-sm text-[#cad2c5] font-normal",
        "data-[state=active]:bg-transparent",
        "border-b-2 border-b-transparent",
        "data-[state=active]:border-b-[#84a98c]",
        "data-[state=active]:font-normal",
        "hover:bg-[#52796f] hover:text-[#cad2c5]",
        "inline-flex items-center justify-center whitespace-nowrap rounded-none",
        "relative",
        className
      )}
      style={{ zIndex: 10 }}
    >
      {children}
    </TabsTrigger>
  );
}

/**
 * AppTabsContent - Content container for each tab with consistent styling
 */
export const AppTabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("h-full pointer-events-auto", className)}
    style={{ 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'visible',
      position: 'relative',
      zIndex: 1,
      pointerEvents: 'auto'
    }}
    {...props}
  />
)) 
