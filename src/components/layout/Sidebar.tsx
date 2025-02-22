import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Phone,
  Settings,
  LogOut,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
  { name: "Πίνακας Ελέγχου", href: "/", icon: LayoutDashboard },
  { name: "Πελάτες", href: "/customers", icon: Users },
  { name: "Προσφορές", href: "/offers", icon: Package },
  { name: "Κλήσεις", href: "/calls", icon: Phone },
  { name: "Ρυθμίσεις", href: "/settings", icon: Settings },
];

const Sidebar = ({ className = "", collapsed = false }: SidebarProps) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };
  return (
    <div
      className={cn(
        "flex h-screen flex-col justify-between p-4",
        collapsed ? "w-16" : "w-64",
        className,
        "bg-[#2f3e46] text-[#cad2c5]",
      )}
    >
      <div>
        {/* Logo */}
        <div className="flex items-center justify-center py-4">
          {collapsed ? (
            <div className="h-8 w-8 rounded-full bg-[#84a98c] text-[#2f3e46] flex items-center justify-center font-bold">
              K
            </div>
          ) : (
            <div className="text-xl font-bold text-[#84a98c]">K-Flow</div>
          )}
        </div>

        <Separator className="my-4 bg-[#52796f]" />

        {/* Navigation */}
        <nav className="space-y-2">
          <TooltipProvider>
            {navigation.map((item) => (
              <Tooltip key={item.name}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.href}
                    className="flex items-center rounded-lg px-3 py-2 text-[#cad2c5] hover:bg-[#354f52] transition-colors"
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

      {/* User Profile */}
      <div className="space-y-4">
        <Separator className="bg-[#52796f]" />
        <div className="flex flex-col gap-4">
          <div
            className={cn(
              "flex items-center",
              collapsed ? "justify-center" : "space-x-3 px-3",
            )}
          >
            <Avatar>
              <AvatarImage
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || "admin"}`}
              />
              <AvatarFallback>
                {user?.fullname
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("") || "U"}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1">
                <p className="text-sm font-medium text-[#cad2c5]">
                  {user?.fullname || "User"}
                </p>
                <p className="text-xs text-[#84a98c] capitalize">
                  {user?.role || "User"}
                </p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className={cn(
              "w-full justify-start text-[#cad2c5] hover:bg-[#354f52] hover:text-[#cad2c5]",
              collapsed && "justify-center px-0",
            )}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span className="ml-2">Αποσύνδεση</span>}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
