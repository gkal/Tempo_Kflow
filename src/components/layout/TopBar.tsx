import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { VERSION } from "@/lib/version";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, LogOut } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

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

  // Update current date every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

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

  return (
    <>
      <div className="h-32 bg-[#2f3e46] border-b border-[#52796f] flex items-center justify-between px-6">
        <div className="flex flex-col items-start">
          <img
            src="https://kronoseco.gr/wp-content/uploads/2020/11/KronosEkoWhite.png"
            alt="Kronos Eco"
            className="h-14 mb-1"
          />
          <div className="flex items-center space-x-2 ml-24">
            <h1 className="text-2xl font-bold text-[#cad2c5]">K-Flow</h1>
            <div className="px-2 py-0.5 rounded-full bg-[#84a98c]/10 text-[#84a98c] text-xs border border-[#84a98c]/20 ml-2">
              v{VERSION}
            </div>
          </div>
        </div>

        <div className="flex-1 text-center ml-8">
          <h1 className="text-2xl font-bold text-[#cad2c5]">
            {getPageTitle(location.pathname)}
          </h1>
        </div>

        <div className="flex items-center space-x-4">
          <div className="px-3 py-1 border border-[#84a98c]/50 rounded-full text-[#84a98c] text-xs mr-1 bg-[#354f52] -mt-8">
            {formatGreekDate(currentDate)}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
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
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48 bg-[#2f3e46] border-[#52796f]"
            >
              <DropdownMenuItem
                className="cursor-pointer hover:bg-[#324249] text-[#cad2c5] transition-colors"
                onClick={() => navigate("/dashboard/settings")}
              >
                <Settings className="mr-2 h-4 w-4" />
                Ρυθμίσεις
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer hover:bg-[#324249] text-[#cad2c5] transition-colors"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Αποσύνδεση
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
}
