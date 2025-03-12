import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Home,
  Users,
  FileText,
  Phone,
  Settings,
  Menu,
  X,
  CheckSquare,
  RotateCcw,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/lib/AuthContext";

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  
  // Check if user is admin
  const isAdmin = user?.role?.toLowerCase() === "admin";

  const navigation = [
    { name: "Κεντρική Σελίδα", href: "/dashboard", icon: Home },
    { name: "Πελάτες", href: "/customers", icon: Users },
    { name: "Προσφορές", href: "/offers", icon: FileText },
    { name: "Εργασίες", href: "/tasks", icon: CheckSquare },
    { name: "Κλήσεις", href: "/calls", icon: Phone },
    { name: "Ρυθμίσεις", href: "/dashboard/settings", icon: Settings },
  ];
  
  // Add the recovery page link for admin users only
  if (isAdmin) {
    navigation.push({ 
      name: "Ανάκτηση Δεδομένων", 
      href: "/admin/recovery", 
      icon: RotateCcw 
    });
  }

  return (
    <div
      className={cn(
        "flex h-[calc(100vh-4rem)] flex-col justify-between p-4",
        isCollapsed ? "w-16" : "w-64",
        "bg-[#2f3e46] text-[#cad2c5]",
      )}
    >
      <div>
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <h2 className="text-xl font-bold">K-Flow</h2>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-md hover:bg-[#354f52]"
          >
            {isCollapsed ? <Menu /> : <X />}
          </button>
        </div>
        <Separator className="my-4 bg-[#52796f]" />
        <nav className="space-y-1">
          <TooltipProvider>
            {navigation.map((item) => (
              <Tooltip key={item.name}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.href}
                    className={cn(
                      "flex items-center px-2 py-2 text-sm font-medium rounded-md",
                      location.pathname === item.href
                        ? "bg-[#52796f] text-[#cad2c5]"
                        : "text-[#84a98c] hover:bg-[#354f52] hover:text-[#cad2c5]",
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {!isCollapsed && <span className="ml-3">{item.name}</span>}
                  </Link>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">{item.name}</TooltipContent>
                )}
              </Tooltip>
            ))}
          </TooltipProvider>
        </nav>
      </div>
    </div>
  );
}
