/**
 * @deprecated This file is deprecated in favor of app-tabs.tsx
 * 
 * This module is maintained for backward compatibility only.
 * For new code, please use components from @/components/ui/app-tabs instead.
 */

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils"
import { logDeprecationWarning } from "@/utils/componentUtils"

// Log deprecation warning when this module is imported
(function logWarning() {
  // Will run once when the module is imported
  if (typeof window !== 'undefined') {
    logDeprecationWarning(
      'tabs.tsx',
      'Please use components from @/components/ui/app-tabs instead.'
    )
  }
})()

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => {
  React.useEffect(() => {
    logDeprecationWarning(
      'TabsList',
      'Please use AppTabsList from @/components/ui/app-tabs instead.'
    )
  }, [])

  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md bg-[#2f3e46] p-1 text-[#cad2c5]",
        className
      )}
      {...props}
    />
  )
})
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  React.useEffect(() => {
    logDeprecationWarning(
      'TabsTrigger',
      'Please use AppTabsTrigger from @/components/ui/app-tabs instead.'
    )
  }, [])

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52796f] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-[#354f52] data-[state=active]:text-[#cad2c5] data-[state=active]:shadow-sm",
        className
      )}
      {...props}
    />
  )
})
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => {
  React.useEffect(() => {
    logDeprecationWarning(
      'TabsContent',
      'Please use AppTabsContent from @/components/ui/app-tabs instead.'
    )
  }, [])

  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn(
        "mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52796f] focus-visible:ring-offset-2",
        className
      )}
      {...props}
    />
  )
})
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
