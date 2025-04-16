import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';

export function NavSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="w-64 bg-[#2f3e46] text-white p-4">
      {/* Your sidebar content */}
      <div className="space-y-4">
        <div className="text-xl font-bold">K-Flow</div>
        
        {/* Navigation items */}
        <nav className="space-y-2">
          <button 
            onClick={() => navigate('/customers')}
            className="w-full text-left px-4 py-2 hover:bg-[#354f52] rounded"
          >
            Customers
          </button>
          <button 
            onClick={() => navigate('/offers')}
            className="w-full text-left px-4 py-2 hover:bg-[#354f52] rounded"
          >
            Offers
          </button>
        </nav>
        
        {/* User info and logout */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="text-sm">{user?.fullname}</div>
          <button 
            onClick={handleLogout}
            className="mt-2 w-full px-4 py-2 bg-[#52796f] hover:bg-[#84a98c] rounded"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
} 