import React, { useState, useEffect, useRef } from 'react';
import { X, Bell, Check, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Button } from './button';
import { formatDistanceToNow } from 'date-fns';
import { el } from 'date-fns/locale';
import { notifyNotificationRead } from '@/lib/notificationEvents';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  user_id: string;
  sender_id: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  related_task_id?: string;
  sender?: {
    fullname: string;
  };
  task?: {
    offer_id: string;
    title: string;
  };
  offer?: {
    customer: {
      fullname: string;
    };
  };
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNotificationText, setNewNotificationText] = useState('');
  const [showNewNotificationForm, setShowNewNotificationForm] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Handle closing animation
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300); // Match animation duration
  };

  // Fetch notifications
  useEffect(() => {
    if (isOpen && user) {
      fetchNotifications();
    }
  }, [isOpen, user]);

  const fetchNotifications = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      // 1. Get notifications
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('read', false)  // Only get unread notifications
        .order('created_at', { ascending: false });

      if (notificationsError) throw notificationsError;
      if (!notificationsData) return;

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
          sender: sender ? { fullname: sender.fullname } : null,
          task: task ? {
            offer_id: task.offer_id,
            title: task.title
          } : null,
          offer: offer?.customer ? {
            customer: {
              fullname: offer.customer.company_name
            }
          } : null
        };
      });

      setNotifications(transformedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
    
    if (!error) {
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true } 
            : notification
        )
      );
      // Notify that a notification has been read
      notifyNotificationRead(notificationId, user.id);
    }
  };

  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return;
    
    const unreadIds = notifications
      .filter(notification => !notification.read)
      .map(notification => notification.id);
    
    if (unreadIds.length === 0) return;
    
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', unreadIds);
    
    if (!error) {
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
      // Notify that all notifications have been read
      unreadIds.forEach(id => notifyNotificationRead(id, user.id));
    }
  };

  const createNotification = async () => {
    if (!user || !newNotificationText.trim()) return;
    
    const newNotification = {
      user_id: user.id,
      sender_id: user.id, // Add sender_id when creating notification
      message: newNotificationText.trim(),
      type: 'manual',
      read: false,
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('notifications')
      .insert(newNotification)
      .select()
      .single();
    
    if (data && !error) {
      // Add sender information to the new notification
      const notificationWithSender = {
        ...data,
        sender: { fullname: user.fullname }
      };
      
      setNotifications(prev => [notificationWithSender, ...prev]);
      setNewNotificationText('');
      setShowNewNotificationForm(false);
    } else {
      console.error('Error creating notification:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);
    
    if (!error) {
      setNotifications(prev => 
        prev.filter(notification => notification.id !== notificationId)
      );
    } else {
      console.error('Error deleting notification:', error);
    }
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true,
        locale: el 
      });
    } catch (error) {
      return 'Unknown time';
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    if (notification.task?.offer_id) {
      // Mark as read before navigating
      if (!notification.read) {
        await markAsRead(notification.id);
      }
      // Navigate to the offer with the task dialog open
      navigate(`/offers?offerId=${notification.task.offer_id}&openTask=true`);
      onClose();
    }
  };

  // Format message with bold customer name
  const formatMessage = (notification: Notification) => {
    if (notification.type === 'task_assigned' && notification.offer?.customer?.fullname) {
      const customerName = notification.offer.customer.fullname;
      return (
        <p className={`text-sm ${notification.read ? 'text-[#84a98c]' : 'text-[#cad2c5]'}`}>
          {notification.message.split(customerName).map((part, index, array) => (
            <React.Fragment key={index}>
              {part}
              {index < array.length - 1 && (
                <strong className="font-bold">{customerName}</strong>
              )}
            </React.Fragment>
          ))}
        </p>
      );
    }
    return (
      <p className={`text-sm ${notification.read ? 'text-[#84a98c]' : 'text-[#cad2c5]'}`}>
        {notification.message}
      </p>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm" 
        onClick={handleClose}
      />
      
      {/* Panel */}
      <div 
        ref={panelRef}
        className={`relative bg-[#2f3e46] border-l border-[#52796f] h-full w-80 md:w-96 overflow-auto shadow-xl ${
          isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'
        }`}
      >
        <div className="sticky top-0 bg-[#2f3e46] z-10 p-4 border-b border-[#52796f] flex justify-between items-center">
          <h2 className="text-xl font-semibold text-[#cad2c5] flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Ειδοποιήσεις
          </h2>
          <button 
            onClick={handleClose}
            className="text-[#84a98c] hover:text-[#cad2c5] transition-colors rounded-full p-1 hover:bg-[#354f52]/50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4">
          {/* Actions */}
          <div className="flex justify-between mb-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={markAllAsRead}
              className="text-xs border-[#52796f] text-[#84a98c] hover:bg-[#354f52] hover:text-[#cad2c5]"
              disabled={!notifications.some(n => !n.read)}
            >
              <Check className="h-3 w-3 mr-1" />
              Σημείωση όλων ως αναγνωσμένα
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowNewNotificationForm(prev => !prev)}
              className="text-xs border-[#52796f] text-[#84a98c] hover:bg-[#354f52] hover:text-[#cad2c5]"
            >
              <Plus className="h-3 w-3 mr-1" />
              Νέα
            </Button>
          </div>
          
          {/* New notification form */}
          {showNewNotificationForm && (
            <div className="mb-4 p-4 bg-[#354f52] rounded-lg shadow-inner">
              <textarea
                value={newNotificationText}
                onChange={(e) => setNewNotificationText(e.target.value)}
                placeholder="Εισάγετε το μήνυμα ειδοποίησης..."
                className="w-full p-3 mb-3 bg-[#2f3e46] border border-[#52796f] rounded-md text-[#cad2c5] text-sm focus:ring-1 focus:ring-[#84a98c] focus:border-[#84a98c]"
                rows={3}
              />
              <div className="flex justify-end">
                <Button 
                  size="sm"
                  onClick={createNotification}
                  className="text-xs bg-[#52796f] hover:bg-[#52796f]/80 text-[#cad2c5]"
                  disabled={!newNotificationText.trim()}
                >
                  Δημιουργία
                </Button>
              </div>
            </div>
          )}
          
          {/* Notifications list */}
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#84a98c]" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Bell className="h-12 w-12 text-[#52796f]/50 mx-auto mb-3" />
              <p className="text-[#84a98c] text-sm">Δεν υπάρχουν ειδοποιήσεις</p>
              <p className="text-[#84a98c]/70 text-xs mt-1">
                Οι ειδοποιήσεις θα εμφανιστούν εδώ όταν τις λάβετε
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-4 rounded-lg ${notification.read 
                    ? 'bg-[#2f3e46]/80 border border-[#52796f]/20' 
                    : 'bg-[#354f52] border border-[#52796f] shadow-md'} ${
                    notification.task?.offer_id ? 'cursor-pointer hover:bg-[#354f52]/80' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center">
                        {!notification.read && (
                          <span className="h-2 w-2 bg-red-500 rounded-full mr-2 animate-pulse" />
                        )}
                        <span className="text-xs text-[#84a98c]">
                          {formatRelativeTime(notification.created_at)}
                        </span>
                      </div>
                      {notification.sender && (
                        <span className="text-xs text-[#84a98c]/80 mt-1">
                          Από: {notification.sender.fullname}
                        </span>
                      )}
                    </div>
                    <div className="flex space-x-1">
                      {!notification.read && (
                        <button 
                          onClick={() => markAsRead(notification.id)}
                          className="text-[#84a98c] hover:text-[#cad2c5] transition-colors p-1 rounded hover:bg-[#354f52]/50"
                          title="Σημείωση ως αναγνωσμένο"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => deleteNotification(notification.id)}
                        className="text-[#84a98c] hover:text-red-400 transition-colors p-1 rounded hover:bg-[#354f52]/50"
                        title="Διαγραφή ειδοποίησης"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {formatMessage(notification)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 