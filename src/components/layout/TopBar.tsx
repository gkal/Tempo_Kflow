import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { VERSION } from "@/lib/version";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Settings, LogOut, Bell } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { CustomMenu, CustomMenuItem } from "@/components/ui/custom-menu";
import { VersionHistory } from "@/components/ui/version-history";
import { useFormContext } from "@/lib/FormContext";
import { NotificationPanel } from "@/components/ui/NotificationPanel";
import { supabase } from "@/lib/supabaseClient";
import { notificationEvents } from "@/lib/notificationEvents";

const getPageTitle = (pathname: string) => {
  switch (pathname) {
    case "/dashboard":
      return "Κεντρική Σελίδα";
    case "/customers":
      return "Πελάτες";
    case "/offers":
      return "Προσφορές";
    case "/calls":
      return "Κλήσεις";
    case "/dashboard/settings":
      return "Ρυθμίσεις";
    default:
      return "Κεντρική Σελίδα";
  }
};

export default function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Get form context
  const { toggleFormInfo, registerForm, showFormInfo, currentForm } = useFormContext();
  
  // Update current date every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch unread notification count
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      
      if (error) {
        console.error('Error fetching notification count:', error);
        return;
      }
      
      setUnreadCount(count || 0);
    };

    // Fetch initial unread count
    fetchUnreadCount();

    // Subscribe to notification events
    const unsubscribeNew = notificationEvents.addEventListener('new-notification', (data) => {
      if (data.userId === user.id) {
        setUnreadCount(prev => prev + 1);
      }
    });

    const unsubscribeRead = notificationEvents.addEventListener('notification-read', (data) => {
      if (data.userId === user.id) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    });

    return () => {
      unsubscribeNew();
      unsubscribeRead();
    };
  }, [user]);

  // Format current date in Greek
  const formatGreekDate = (date) => {
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    };
    return date.toLocaleDateString("el-GR", options);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Get initials from first and last name
  const getInitials = (fullname: string = "") => {
    const names = fullname.split(" ");
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`;
    }
    return names[0]?.[0] || "U";
  };

  // Generate consistent color based on fullname
  const generateAvatarColor = (fullname: string = "") => {
    const hash = fullname.split("").reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 60%)`;
  };

  // Keyboard event handler
  const handleKClick = useCallback((event: KeyboardEvent) => {
    if (event.key === 'k' || event.key === 'K') {
      toggleFormInfo();
    }
  }, [toggleFormInfo]);

  useEffect(() => {
    document.addEventListener('keydown', handleKClick);
    return () => {
      document.removeEventListener('keydown', handleKClick);
    };
  }, [handleKClick]);

  return (
    <div className="h-32 bg-[#2f3e46] border-b border-[#52796f] flex items-center justify-between px-6">
      <div className="flex flex-col items-start">
        <img
          src="/assets/images/logo.png"
          alt="Kronos Eco"
          className="h-14 mb-1"
        />
        <div className="flex items-center space-x-2 ml-24">
          <h1 className="text-2xl font-bold text-[#cad2c5]">
            <span 
              className="text-[#cad2c5] cursor-pointer"
              style={{ userSelect: 'none' }}
            >
              K
            </span>
            -Flow
          </h1>
          <div 
            className="px-2 py-0.5 rounded-full bg-[#84a98c]/10 text-[#84a98c] text-xs border border-[#84a98c]/20 ml-2 cursor-pointer hover:bg-[#84a98c]/20 transition-colors"
            onClick={() => setShowVersionHistory(true)}
            title="Προβολή ιστορικού εκδόσεων"
          >
            v{VERSION}
          </div>
          
          {/* Form info popup - make it more visible */}
          {showFormInfo && (
            <div className="ml-4 bg-[#354f52] text-[#cad2c5] px-3 py-1 rounded-md text-sm">
              {currentForm || "No form is currently open"}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 text-center ml-8">
        <h1 className="text-2xl font-bold text-[#cad2c5]">
          {getPageTitle(location.pathname)}
        </h1>
      </div>

      <div className="flex items-center space-x-6">
        {/* Notification bell with adjusted size */}
        <div className="relative -mt-8">
          <button 
            className="relative p-2 hover:bg-[#354f52] rounded-full transition-colors"
            onClick={() => setShowNotifications(true)}
          >
            <Bell className="h-6 w-6 text-[#84a98c]" />
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadCount}
              </div>
            )}
          </button>
        </div>

        <div className="px-3 py-1 border border-[#84a98c]/50 rounded-full text-[#84a98c] text-xs mr-1 bg-[#354f52] -mt-8">
          {formatGreekDate(currentDate)}
        </div>
        <CustomMenu
          trigger={
            <Avatar className="h-12 w-12 cursor-pointer">
              <AvatarFallback
                className="text-[#2f3e46] text-lg font-medium"
                style={{
                  backgroundColor: generateAvatarColor(user?.fullname),
                }}
              >
                {getInitials(user?.fullname)}
              </AvatarFallback>
            </Avatar>
          }
          align="end"
        >
          <CustomMenuItem onClick={() => navigate("/dashboard/settings")}>
            <Settings className="h-4 w-4" />
            Ρυθμίσεις
          </CustomMenuItem>
          <CustomMenuItem onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Αποσύνδεση
          </CustomMenuItem>
        </CustomMenu>
      </div>

      {/* Version History Modal */}
      <VersionHistory 
        open={showVersionHistory} 
        onOpenChange={setShowVersionHistory} 
      />
      
      {/* Notification Panel */}
      <NotificationPanel 
        isOpen={showNotifications} 
        onClose={() => setShowNotifications(false)} 
      />
    </div>
  );
}
