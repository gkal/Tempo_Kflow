import { useState, useRef, useEffect } from "react";
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
  Database,
  ChevronDown,
  ChevronRight,
  Layers,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/AuthContext";

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  
  // Check if user is admin
  const isAdmin = user?.role?.toLowerCase() === "admin";
  // Check if user is super user
  const isSuperUser = user?.role === "Super User" || user?.role?.toLowerCase() === "super user";

  // Close settings dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const navigation = [
    { name: "Κεντρική Σελίδα", href: "/dashboard", icon: Home },
    { name: "Πελάτες", href: "/customers", icon: Users },
    { name: "Προσφορές", href: "/offers", icon: FileText },
    { name: "Εργασίες", href: "/tasks", icon: CheckSquare },
    { name: "Κλήσεις", href: "/calls", icon: Phone },
  ];
  
  // Settings submenu items
  const settingsItems = [
    { name: "Ρυθμίσεις Χρηστών", href: "/dashboard/settings", icon: Settings },
  ];
  
  // Add the service types menu item for admin and super users
  if (isAdmin || isSuperUser) {
    settingsItems.push({ 
      name: "Τύποι Υπηρεσίας", 
      href: "/admin/service-types", 
      icon: Layers 
    });
  }
  
  // Add the recovery and backup page links for admin users only
  if (isAdmin) {
    settingsItems.push({ 
      name: "Ανάκτηση Δεδομένων", 
      href: "/admin/recovery", 
      icon: RotateCcw 
    });
    
    settingsItems.push({ 
      name: "Αντίγραφα Ασφαλείας", 
      href: "/admin/backup", 
      icon: Database 
    });
  }

  // Check if current path is in settings submenu
  const isSettingsActive = settingsItems.some(item => location.pathname === item.href);
  
  // Check if current path starts with the menu href for better active state detection
  const isMenuActive = (href: string) => {
    // Special case for dashboard to avoid it matching everything
    if (href === "/dashboard") {
      return location.pathname === "/dashboard" || location.pathname === "/dashboard/";
    }
    
    // For all other routes, check if the path matches exactly or starts with the href
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  // If a settings page is active, automatically open the settings menu
  useEffect(() => {
    if (isSettingsActive) {
      setSettingsOpen(true);
    }
  }, [isSettingsActive, location.pathname]);

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
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <Menu /> : <X />}
          </button>
        </div>
        <Separator className="my-4 bg-[#52796f]" />
        <nav className="space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center px-2 py-2 text-sm font-medium rounded-md group transition-colors",
                isMenuActive(item.href)
                  ? "bg-[#52796f] text-[#cad2c5]"
                  : "text-[#84a98c] hover:bg-[#354f52] hover:text-[#cad2c5]",
              )}
            >
              <item.icon className={cn(
                "h-5 w-5",
                isMenuActive(item.href)
                  ? "text-[#cad2c5]"
                  : "text-[#84a98c] group-hover:text-[#cad2c5]"
              )} />
              {!isCollapsed && <span className={cn(
                "ml-3",
                isMenuActive(item.href)
                  ? "text-[#cad2c5]"
                  : "text-[#84a98c] group-hover:text-[#cad2c5]"
              )}>{item.name}</span>}
            </Link>
          ))}
          
          {/* Settings dropdown */}
          <div
            onClick={() => setSettingsOpen(!settingsOpen)}
            className={cn(
              "flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md group transition-colors cursor-pointer",
              isSettingsActive || settingsOpen
                ? "bg-[#52796f] text-[#cad2c5]"
                : "text-[#84a98c] hover:bg-[#354f52] hover:text-[#cad2c5]",
            )}
            aria-expanded={settingsOpen}
          >
            <div className="flex items-center">
              <Settings className={cn(
                "h-5 w-5",
                isSettingsActive || settingsOpen
                  ? "text-[#cad2c5]"
                  : "text-[#84a98c] group-hover:text-[#cad2c5]"
              )} />
              {!isCollapsed && <span className={cn(
                "ml-3",
                isSettingsActive || settingsOpen
                  ? "text-[#cad2c5]"
                  : "text-[#84a98c] group-hover:text-[#cad2c5]"
              )}>Ρυθμίσεις</span>}
            </div>
            {!isCollapsed && (
              settingsOpen 
                ? <ChevronDown className={cn(
                    "h-4 w-4",
                    isSettingsActive || settingsOpen
                      ? "text-[#cad2c5]"
                      : "text-[#84a98c] group-hover:text-[#cad2c5]"
                  )} />
                : <ChevronRight className={cn(
                    "h-4 w-4",
                    isSettingsActive || settingsOpen
                      ? "text-[#cad2c5]"
                      : "text-[#84a98c] group-hover:text-[#cad2c5]"
                  )} />
            )}
          </div>
            
          {settingsOpen && !isCollapsed && (
            <div className="mt-1 pl-7 space-y-1 border-l-2 border-[#52796f]">
              {settingsItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center px-2 py-2 text-sm font-medium rounded-md group transition-colors",
                    isMenuActive(item.href)
                      ? "bg-[#52796f] text-[#cad2c5]"
                      : "text-[#84a98c] hover:bg-[#354f52] hover:text-[#cad2c5]",
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <item.icon className={cn(
                    "h-4 w-4",
                    isMenuActive(item.href)
                      ? "text-[#cad2c5]"
                      : "text-[#84a98c] group-hover:text-[#cad2c5]"
                  )} />
                  <span className={cn(
                    "ml-3",
                    isMenuActive(item.href)
                      ? "text-[#cad2c5]"
                      : "text-[#84a98c] group-hover:text-[#cad2c5]"
                  )}>{item.name}</span>
                </Link>
              ))}
            </div>
          )}
        </nav>
      </div>
    </div>
  );
}
