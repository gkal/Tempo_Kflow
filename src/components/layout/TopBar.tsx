import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { VERSION } from "@/lib/version";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Settings, LogOut, Bell } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { CustomMenu, CustomMenuItem } from "@/components/ui/custom-menu";
import { VersionHistory } from "@/components/ui/version-history";
import { useFormContext } from "@/lib/FormContext";
import { supabase } from "@/lib/supabaseClient";
import { debugLog } from "@/lib/featureFlags";
import { notificationEvents, NotificationEventData } from "@/lib/notificationEvents";

// Add interface for notifications
interface Notification {
  id: string;
  message: string;
  read: boolean;
  created_at: string;
  type: string;
  related_task_id: string;
}

// Get the current environment
const isDevelopment = import.meta.env.MODE === 'development';

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
  
  // Add notification state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const [bellAnimation, setBellAnimation] = useState(false);
  
  // Get form context
  const { toggleFormInfo, registerForm, showFormInfo, currentForm } = useFormContext();
  
  // Update date every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch initial notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;
      
      console.log("Fetching notifications for user:", user.id);
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data && !error) {
        console.log("Fetched notifications:", data);
        setNotifications(data);
      } else if (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchNotifications();
    
    // Set up a minimal polling fallback (every 60 seconds)
    const refreshInterval = setInterval(fetchNotifications, 60000);
    
    return () => clearInterval(refreshInterval);
  }, [user]);

  // Listen for notification events
  useEffect(() => {
    if (!user) return;
    
    console.log("Setting up notification event listener for user:", user.id);
    
    // Request notification permission
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
      console.log("Requesting notification permission");
      Notification.requestPermission().then(permission => {
        console.log("Notification permission:", permission);
      });
    }
    
    // Handle new notification events
    const handleNewNotification = (data: NotificationEventData) => {
      console.log("Received notification event:", data);
      
      // Only process notifications for the current user
      if (data.userId === user.id && data.notification) {
        console.log("Processing notification for current user");
        
        // Show browser notification if permission is granted
        if (Notification.permission === "granted") {
          try {
            new window.Notification("New Task Notification", {
              body: data.notification.message,
              icon: "/vite.svg"
            });
          } catch (error) {
            console.error("Error showing browser notification:", error);
          }
        }
        
        // Update the notifications state
        setNotifications(current => {
          // Check if notification already exists to avoid duplicates
          const exists = current.some(n => n.id === data.notification.id);
          if (exists) {
            console.log("Notification already exists in state");
            return current;
          }
          console.log("Adding new notification to state");
          return [data.notification, ...current];
        });
        
        // Trigger bell animation
        setBellAnimation(true);
        setTimeout(() => setBellAnimation(false), 2000);
      }
    };
    
    // Subscribe to notification events
    const unsubscribe = notificationEvents.addEventListener('new-notification', handleNewNotification);
    
    return () => {
      // Clean up the event listener
      unsubscribe();
    };
  }, [user]);

  // Handle clicking outside to close notifications dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (!error) {
      setNotifications(current =>
        current.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
    }
  };

  // Get unread count
  const unreadCount = notifications.filter(n => !n.read).length;

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
          src="https://kronoseco.gr/wp-content/uploads/2020/11/KronosEkoWhite.png"
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

      <div className="flex items-center space-x-4">
        {/* Environment Indicator */}
        {isDevelopment && (
          <div className="ml-4 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-md">
            DEVELOPMENT
          </div>
        )}
        
        {/* Enhanced NotificationBell component - positioned before the date */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className={`relative p-2 text-[#cad2c5] hover:text-[#84a98c] focus:outline-none ${bellAnimation ? 'animate-bounce' : ''}`}
            style={{ marginTop: '-16px' }}
          >
            <Bell className={`h-6 w-6 ${bellAnimation ? 'text-yellow-400' : ''}`} />
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadCount}
              </div>
            )}
          </button>
          
          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-[#2f3e46] rounded-md shadow-lg py-1 z-50">
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-2 text-sm text-[#cad2c5]">
                    No notifications
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`px-4 py-2 hover:bg-[#354f52] cursor-pointer ${
                        !notification.read ? 'bg-[#3a5a40]' : ''
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="text-sm text-[#cad2c5]">
                        {notification.message}
                      </div>
                      <div className="text-xs text-[#84a98c] mt-1">
                        {new Date(notification.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
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
    </div>
  );
}
