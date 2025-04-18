import { useAuth } from '@/lib/AuthContext';

export function HeaderBar() {
  const { user } = useAuth();

  return (
    <div className="h-16 bg-white border-b px-4 flex items-center justify-between">
      <div>
        {/* Add breadcrumbs or page title */}
      </div>
      
      <div className="flex items-center space-x-4">
        <span>{user?.fullname}</span>
      </div>
    </div>
  );
} 
