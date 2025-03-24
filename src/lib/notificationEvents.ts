/**
 * Custom event system for notifications
 * Provides a reliable way to notify components about notification events
 */

export type NotificationEventType = 'new-notification' | 'notification-read' | 'notifications-cleared';

export type NotificationData = {
  id: string;
  content: string;
  timestamp: string;
  read: boolean;
  [key: string]: any;
};

export interface NotificationEventData {
  type: NotificationEventType;
  notificationId?: string;
  notification?: NotificationData;
  userId?: string;
}

type EventListener = (data: NotificationEventData) => void;

class NotificationEventManager {
  private listeners: Map<NotificationEventType, EventListener[]> = new Map();

  /**
   * Adds an event listener for a specific notification event type
   * @returns Function to remove this specific listener
   */
  public addEventListener(type: NotificationEventType, callback: EventListener): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    
    const listeners = this.listeners.get(type);
    listeners?.push(callback);
    
    return () => this.removeEventListener(type, callback);
  }

  /**
   * Removes a specific event listener
   */
  public removeEventListener(type: NotificationEventType, callback: EventListener): void {
    const listeners = this.listeners.get(type);
    if (!listeners) return;
    
    const index = listeners.indexOf(callback);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Dispatches an event to all registered listeners
   */
  public dispatchEvent(data: NotificationEventData): void {
    const listeners = this.listeners.get(data.type);
    if (!listeners || listeners.length === 0) return;
    
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in notification event listener:', error);
      }
    });
  }
}

// Singleton instance
export const notificationEvents = new NotificationEventManager();

/**
 * Notifies about a new notification
 */
export function notifyNewNotification(notification: NotificationData, userId: string): void {
  notificationEvents.dispatchEvent({
    type: 'new-notification',
    notification,
    userId
  });
}

/**
 * Notifies that a notification was read
 */
export function notifyNotificationRead(notificationId: string, userId: string): void {
  notificationEvents.dispatchEvent({
    type: 'notification-read',
    notificationId,
    userId
  });
}

/**
 * Notifies that all notifications were cleared
 */
export function notifyNotificationsCleared(userId: string): void {
  notificationEvents.dispatchEvent({
    type: 'notifications-cleared',
    userId
  });
} 