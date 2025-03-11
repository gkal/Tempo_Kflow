import { formatDistanceToNow } from 'date-fns';
import { el } from 'date-fns/locale';
import { Check } from 'lucide-react';

interface NotificationItemProps {
  notification: {
    id: string;
    message: string;
    created_at: string;
    read: boolean;
    type: string;
    related_task_id?: string | null;
  };
  onMarkAsRead: (id: string) => void;
  onClick?: () => void;
}

export function NotificationItem({ notification, onMarkAsRead, onClick }: NotificationItemProps) {
  return (
    <div
      className={`px-4 py-3 hover:bg-[#354f52] ${
        !notification.read ? 'bg-[#354f52]/50' : ''
      } cursor-pointer group`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="text-[#cad2c5] text-sm">{notification.message}</p>
          <p className="text-[#84a98c] text-xs mt-1">
            {formatDistanceToNow(new Date(notification.created_at), { 
              addSuffix: true,
              locale: el 
            })}
          </p>
        </div>
        {!notification.read && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead(notification.id);
            }}
            className="ml-2 text-[#84a98c] hover:text-[#cad2c5] opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Check className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
} 