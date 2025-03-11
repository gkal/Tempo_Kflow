import { NotificationBell } from './NotificationBell';

export default function TopBar() {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-[#2f3e46] text-[#cad2c5]">
      <div className="flex items-center space-x-4">
        {/* ... existing left side content ... */}
      </div>

      <div className="flex items-center space-x-4">
        <NotificationBell />
        <span>{/* Your existing date component */}</span>
      </div>
    </div>
  );
} 