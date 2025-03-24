import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Bell, Check, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Button } from './button';
import { formatDistanceToNow } from 'date-fns';
import { el } from 'date-fns/locale';
import { notifyNotificationRead } from '@/lib/notificationEvents';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils/styleUtils';

// Define strict types
type NotificationType = 'task' | 'message' | 'system' | 'offer';

interface NotificationSender {
  fullname: string;
}

interface NotificationTask {
  offer_id: string;
  title: string;
}

interface NotificationOffer {
  customer: {
    fullname: string;
  };
}

interface Notification {
  id: string;
  user_id: string;
  sender_id: string;
  message: string;
  type: NotificationType;
  read: boolean;
  created_at: string;
  related_task_id?: string;
  sender?: NotificationSender;
  task?: NotificationTask;
  offer?: NotificationOffer;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Utility functions
const formatRelativeTime = (dateString: string): string => {
  try {
    return formatDistanceToNow(new Date(dateString), { 
      addSuffix: true,
      locale: el
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'πρόσφατα';
  }
};

// Reusable components
interface NotificationActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  variant?: 'default' | 'destructive';
}

const NotificationActionButton = ({
  onClick,
  icon,
  label,
  variant = 'default'
}: NotificationActionButtonProps) => (
  <Button
    onClick={onClick}
    variant={variant === 'destructive' ? 'destructive' : 'outline'}
    size="sm"
    className="gap-1 ml-2"
  >
    {icon}
    <span className="whitespace-nowrap">{label}</span>
  </Button>
);

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClick: (notification: Notification) => Promise<void>;
}

const NotificationItem = React.memo(({
  notification,
  onMarkAsRead,
  onDelete,
  onClick
}: NotificationItemProps) => {
  // Format the message with context from related entities
  const formatMessage = (notification: Notification): string => {
    let message = notification.message;
    
    // Add task info if available
    if (notification.task?.title) {
      message += ` για την εργασία "${notification.task.title}"`;
    }
    
    // Add sender info if available
    if (notification.sender?.fullname) {
      message = `${notification.sender.fullname} ${message}`;
    }
    
    // Add customer info if available
    if (notification.offer?.customer?.fullname) {
      message += ` (${notification.offer.customer.fullname})`;
    }
    
    return message;
  };

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <div className="flex items-start">
        <div 
          className="flex-grow cursor-pointer" 
          onClick={() => onClick(notification)}
        >
          <p className="text-sm">{formatMessage(notification)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {formatRelativeTime(notification.created_at)}
          </p>
        </div>
        <div className="flex ml-4">
          <NotificationActionButton
            onClick={() => onMarkAsRead(notification.id)}
            icon={<Check size={16} />}
            label="Διαβασμένο"
          />
          <NotificationActionButton
            onClick={() => onDelete(notification.id)}
            icon={<Trash2 size={16} />}
            label="Διαγραφή"
            variant="destructive"
          />
        </div>
      </div>
    </div>
  );
});

NotificationItem.displayName = 'NotificationItem';

// Custom hook for notifications
const useNotifications = (userId: string | undefined, isOpen: boolean) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // 1. Get notifications
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('read', false)
        .order('created_at', { ascending: false });

      if (notificationsError) throw notificationsError;
      if (!notificationsData) {
        setNotifications([]);
        return;
      }

      // 2. Get unique IDs for related data
      const taskIds = notificationsData.map(n => n.related_task_id).filter(Boolean);
      const senderIds = notificationsData.map(n => n.sender_id).filter(Boolean);

      // 3. Fetch related data in parallel
      const [tasksResponse, sendersResponse] = await Promise.all([
        // Get tasks with their offers
        taskIds.length > 0 ? supabase
          .from('tasks')
          .select('id, title, offer_id')
          .in('id', taskIds) : { data: [] },
        
        // Get senders
        senderIds.length > 0 ? supabase
          .from('users')
          .select('id, fullname')
          .in('id', senderIds) : { data: [] }
      ]);

      // 4. Get offer IDs and fetch customer data
      const offerIds = (tasksResponse.data || [])
        .map(t => t.offer_id)
        .filter(Boolean);

      const offersResponse = offerIds.length > 0 ? await supabase
        .from('offers')
        .select('id, customer:customers(id, company_name)')
        .in('id', offerIds) : { data: [] };

      // Create lookup maps for faster access
      const tasksMap = Object.fromEntries((tasksResponse.data || []).map(t => [t.id, t]));
      const sendersMap = Object.fromEntries((sendersResponse.data || []).map(s => [s.id, s]));
      const offersMap = Object.fromEntries((offersResponse.data || []).map(o => [o.id, o]));

      // Transform notifications with all related data
      const transformedNotifications = notificationsData.map(notification => {
        const task = notification.related_task_id ? tasksMap[notification.related_task_id] : null;
        const sender = notification.sender_id ? sendersMap[notification.sender_id] : null;
        const offer = task?.offer_id ? offersMap[task.offer_id] : null;

        return {
          ...notification,
          sender: sender ? { fullname: sender.fullname } : undefined,
          task: task ? {
            offer_id: task.offer_id,
            title: task.title
          } : undefined,
          offer: offer?.customer ? {
            customer: {
              fullname: offer.customer.company_name
            }
          } : undefined
        };
      });

      setNotifications(transformedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Αδυναμία φόρτωσης ειδοποιήσεων');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen && userId) {
      fetchNotifications();
    }
  }, [isOpen, userId, fetchNotifications]);

  return { notifications, loading, error, fetchNotifications, setNotifications };
};

// Main component
export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [newNotificationText, setNewNotificationText] = useState('');
  const [showNewNotificationForm, setShowNewNotificationForm] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  
  const { 
    notifications, 
    loading, 
    error, 
    fetchNotifications, 
    setNotifications 
  } = useNotifications(user?.id, isOpen);

  // Handle closing animation
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300); // Match animation duration
  };

  const markAsRead = async (notificationId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
        
      if (error) throw error;
      
      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Send notification to parent component
      notifyNotificationRead();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return;
    
    try {
      const notificationIds = notifications.map(n => n.id);
      
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', notificationIds);
        
      if (error) throw error;
      
      // Clear all notifications
      setNotifications([]);
      
      // Send notification to parent component
      notifyNotificationRead();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const createNotification = async () => {
    if (!user || !newNotificationText.trim()) return;
    
    try {
      const newNotification = {
        user_id: user.id,
        sender_id: user.id,
        message: newNotificationText.trim(),
        type: 'system' as NotificationType,
        read: false
      };
      
      const { data, error } = await supabase
        .from('notifications')
        .insert(newNotification)
        .select('*')
        .single();
        
      if (error) throw error;
      
      if (data) {
        setNotifications(prev => [data, ...prev]);
        setNewNotificationText('');
        setShowNewNotificationForm(false);
      }
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
        
      if (error) throw error;
      
      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!user) return;
    
    try {
      // Mark as read first
      await markAsRead(notification.id);
      
      // Navigate to relevant page based on notification type
      if (notification.related_task_id) {
        navigate(`/tasks/${notification.related_task_id}`);
      }
      
      // Close panel after navigation
      handleClose();
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-25">
      <div className="flex min-h-screen items-end justify-center text-center sm:block">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-black bg-opacity-40 transition-opacity"
          onClick={handleClose}
          aria-hidden="true"
        ></div>
        
        {/* Notification panel */}
        <div
          ref={panelRef}
          className={cn(
            "fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-gray-900 shadow-lg transform transition-transform duration-300 ease-in-out overflow-hidden",
            isClosing ? 'translate-x-full' : 'translate-x-0'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <Bell className="h-5 w-5 mr-2 text-blue-500" />
              <h2 className="text-lg font-medium">Ειδοποιήσεις</h2>
            </div>
            <div className="flex">
              {notifications.length > 0 && (
                <Button 
                  onClick={markAllAsRead} 
                  variant="outline" 
                  size="sm" 
                  className="mr-2 gap-1"
                >
                  <Check size={16} />
                  <span>Όλα διαβασμένα</span>
                </Button>
              )}
              <Button 
                onClick={handleClose} 
                variant="ghost" 
                size="sm" 
                className="rounded-full p-1 h-8 w-8 flex items-center justify-center"
                aria-label="Κλείσιμο"
              >
                <X size={18} />
              </Button>
            </div>
          </div>
          
          {/* Notification list */}
          <div className="overflow-y-auto h-[calc(100%-8rem)]">
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            ) : error ? (
              <div className="text-center p-4 text-red-500">{error}</div>
            ) : notifications.length === 0 ? (
              <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                <p>Δεν έχετε νέες ειδοποιήσεις</p>
              </div>
            ) : (
              notifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                  onClick={handleNotificationClick}
                />
              ))
            )}
          </div>
          
          {/* New notification form */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            {showNewNotificationForm ? (
              <div className="space-y-3">
                <textarea
                  value={newNotificationText}
                  onChange={(e) => setNewNotificationText(e.target.value)}
                  placeholder="Γράψτε το κείμενο της ειδοποίησης..."
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm"
                  rows={2}
                />
                <div className="flex justify-end gap-2">
                  <Button 
                    onClick={() => setShowNewNotificationForm(false)} 
                    variant="ghost" 
                    size="sm"
                  >
                    Άκυρο
                  </Button>
                  <Button 
                    onClick={createNotification} 
                    disabled={!newNotificationText.trim()} 
                    size="sm"
                  >
                    Αποστολή
                  </Button>
                </div>
              </div>
            ) : (
              <Button 
                onClick={() => setShowNewNotificationForm(true)}
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                <span>Δημιουργία ειδοποίησης</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 