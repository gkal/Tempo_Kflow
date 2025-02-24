import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Phone,
  Settings,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  className?: string;
  collapsed?: boolean;
}

const navigation = [
  { name: "Πίνακας Ελέγχου", href: "/dashboard", icon: LayoutDashboard },
  { name: "Πελάτες", href: "/dashboard/customers", icon: Users },
  { name: "Προσφορές", href: "/dashboard/offers", icon: Package },
  { name: "Κλήσεις", href: "/dashboard/calls", icon: Phone },
  { name: "Ρυθμίσεις", href: "/dashboard/settings", icon: Settings },
];

const Sidebar = ({ className = "", collapsed = false }: SidebarProps) => {
  const location = useLocation();

  return (
    <div
      className={cn(
        "flex h-[calc(100vh-4rem)] flex-col justify-between p-4",
        collapsed ? "w-16" : "w-64",
        className,
        "bg-[#2f3e46] text-[#cad2c5]",
      )}
    >
      <nav className="space-y-2">
        <TooltipProvider>
          {navigation.map((item) => (
            <Tooltip key={item.name}>
              <TooltipTrigger asChild>
                <Link
                  to={item.href}
                  className={`flex items-center rounded-lg px-3 py-2 text-[#cad2c5] transition-colors ${location.pathname === item.href ? "bg-[#354f52]" : "hover:bg-[#354f52]"}`}
                >
                  <item.icon className="h-5 w-5" />
                  {!collapsed && <span className="ml-3">{item.name}</span>}
                </Link>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right">{item.name}</TooltipContent>
              )}
            </Tooltip>
          ))}
        </TooltipProvider>
      </nav>
    </div>
  );
};

export default Sidebar;
