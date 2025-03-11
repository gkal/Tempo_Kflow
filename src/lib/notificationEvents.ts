// Custom event system for notifications
// This provides a reliable way to notify components about new notifications

// Create a custom event type
export type NotificationEventType = 'new-notification' | 'notification-read' | 'notifications-cleared';

// Define the event data structure
export interface NotificationEventData {
  type: NotificationEventType;
  notificationId?: string;
  notification?: any;
  userId?: string;
}

// Create a class to manage notification events
class NotificationEventManager {
  private listeners: Map<NotificationEventType, Function[]> = new Map();

  // Add a listener for a specific event type
  public addEventListener(type: NotificationEventType, callback: Function) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)?.push(callback);
    
    // Return a function to remove this listener
    return () => this.removeEventListener(type, callback);
  }

  // Remove a listener
  public removeEventListener(type: NotificationEventType, callback: Function) {
    const listeners = this.listeners.get(type);
    if (!listeners) return;
    
    const index = listeners.indexOf(callback);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  // Dispatch an event to all listeners
  public dispatchEvent(data: NotificationEventData) {
    console.log(`Dispatching notification event: ${data.type}`, data);
    const listeners = this.listeners.get(data.type);
    if (!listeners) return;
    
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in notification event listener:', error);
      }
    });
  }
}

// Create and export a singleton instance
export const notificationEvents = new NotificationEventManager();

// Helper function to notify about a new notification
export function notifyNewNotification(notification: any, userId: string) {
  notificationEvents.dispatchEvent({
    type: 'new-notification',
    notification,
    userId
  });
}

// Helper function to notify about a read notification
export function notifyNotificationRead(notificationId: string, userId: string) {
  notificationEvents.dispatchEvent({
    type: 'notification-read',
    notificationId,
    userId
  });
}

// Helper function to notify about cleared notifications
export function notifyNotificationsCleared(userId: string) {
  notificationEvents.dispatchEvent({
    type: 'notifications-cleared',
    userId
  });
} 