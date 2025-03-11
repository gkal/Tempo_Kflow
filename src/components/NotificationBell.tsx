import React, { useEffect, useState, useRef } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@/hooks/useUser'; // assuming you have this hook

interface Notification {
  id: string;
  message: string;
  read: boolean;
  created_at: string;
  type: string;
  related_task_id: string;
}

export function NotificationBell() {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Fetch initial notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data && !error) {
        setNotifications(data);
      }
    };

    fetchNotifications();
  }, [user]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications(current => [payload.new as Notification, ...current]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </div>
        )}
      </button>

      {isOpen && (
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
  );
} 