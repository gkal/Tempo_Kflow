import { NotificationBell } from './NotificationBell';

export function Navbar() {
  return (
    <nav className="bg-[#2f3e46] shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          {/* Your other navbar items */}
          
          <div className="flex items-center">
            <NotificationBell />
            {/* Other navbar right items */}
          </div>
        </div>
      </div>
    </nav>
  );
} 