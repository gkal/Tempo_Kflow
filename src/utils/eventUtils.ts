/**
 * Event Utilities
 * 
 * Global utility for working with custom events and event handling in the application.
 * These functions provide a standardized way to create, dispatch, and listen to
 * custom events across components.
 * 
 * Usage:
 * ```
 * // In any component that needs to listen to events
 * import { addEventListener, AppEventType } from '@/utils/eventUtils';
 * 
 * // Setup event listener
 * addEventListener(AppEventType.CUSTOMER_UPDATED, (event) => {
 *   console.log('Customer updated:', event.detail.data);
 *   // Handle the event...
 * });
 * 
 * // In components that trigger events
 * import { dispatchEvent, AppEventType } from '@/utils/eventUtils';
 * 
 * // Dispatch an event
 * dispatchEvent(AppEventType.CUSTOMER_UPDATED, {
 *   timestamp: Date.now(),
 *   entityId: customerId,
 *   data: updatedData
 * });
 * ```
 * 
 * Files using these utilities:
 * - src/components/customers/*.tsx: Customer-related events
 * - src/components/offers/*.tsx: Offer event handling
 * - src/components/tasks/*.tsx: Task management events
 * - src/lib/RealtimeProvider.tsx: Real-time event integration
 * 
 * Benefits:
 * - Type-safe custom event handling
 * - Centralized event definitions
 * - Easy component communication without prop drilling
 * - Standardized event patterns
 * 
 * @module eventUtils
 */

import logger from './loggingUtils';

/**
 * Known application event names
 */
export enum AppEventType {
  // Customer events
  CUSTOMER_CREATED = 'customer:created',
  CUSTOMER_UPDATED = 'customer:updated',
  CUSTOMER_DELETED = 'customer:deleted',
  
  // Offer events
  OFFER_CREATED = 'offer:created',
  OFFER_UPDATED = 'offer:updated',
  OFFER_DELETED = 'offer:deleted',
  OFFER_STATUS_CHANGED = 'offer:statusChanged',
  
  // Contact events
  CONTACT_CREATED = 'contact:created',
  CONTACT_UPDATED = 'contact:updated',
  CONTACT_DELETED = 'contact:deleted',
  
  // Task events
  TASK_CREATED = 'task:created',
  TASK_UPDATED = 'task:updated',
  TASK_DELETED = 'task:deleted',
  TASK_ASSIGNED = 'task:assigned',
  TASK_COMPLETED = 'task:completed',
  
  // Notification events
  NOTIFICATION_RECEIVED = 'notification:received',
  NOTIFICATION_READ = 'notification:read',
  
  // UI events
  UI_THEME_CHANGED = 'ui:themeChanged',
  UI_LANGUAGE_CHANGED = 'ui:languageChanged',
  
  // Application events
  APP_INITIALIZED = 'app:initialized',
  APP_ERROR = 'app:error',
  APP_LOADING_STATE = 'app:loadingState',
  
  // User events
  USER_LOGGED_IN = 'user:loggedIn',
  USER_LOGGED_OUT = 'user:loggedOut',
  USER_PROFILE_UPDATED = 'user:profileUpdated'
}

/**
 * Base event data interface
 */
export interface BaseEventData {
  timestamp: number;
  source?: string;
}

/**
 * Event data for entity create/update/delete events
 */
export interface EntityEventData<T> extends BaseEventData {
  entityId: string;
  data?: T;
}

/**
 * Map of event types to their data types
 */
export interface AppEventMap {
  [AppEventType.CUSTOMER_CREATED]: EntityEventData<any>;
  [AppEventType.CUSTOMER_UPDATED]: EntityEventData<any>;
  [AppEventType.CUSTOMER_DELETED]: EntityEventData<any>;
  
  [AppEventType.OFFER_CREATED]: EntityEventData<any>;
  [AppEventType.OFFER_UPDATED]: EntityEventData<any>;
  [AppEventType.OFFER_DELETED]: EntityEventData<any>;
  [AppEventType.OFFER_STATUS_CHANGED]: EntityEventData<any> & { oldStatus: string; newStatus: string };
  
  [AppEventType.CONTACT_CREATED]: EntityEventData<any>;
  [AppEventType.CONTACT_UPDATED]: EntityEventData<any>;
  [AppEventType.CONTACT_DELETED]: EntityEventData<any>;
  
  [AppEventType.TASK_CREATED]: EntityEventData<any>;
  [AppEventType.TASK_UPDATED]: EntityEventData<any>;
  [AppEventType.TASK_DELETED]: EntityEventData<any>;
  [AppEventType.TASK_ASSIGNED]: EntityEventData<any> & { assigneeId: string };
  [AppEventType.TASK_COMPLETED]: EntityEventData<any>;
  
  [AppEventType.NOTIFICATION_RECEIVED]: EntityEventData<any>;
  [AppEventType.NOTIFICATION_READ]: EntityEventData<any>;
  
  [AppEventType.UI_THEME_CHANGED]: BaseEventData & { theme: 'light' | 'dark' | 'system' };
  [AppEventType.UI_LANGUAGE_CHANGED]: BaseEventData & { language: string };
  
  [AppEventType.APP_INITIALIZED]: BaseEventData;
  [AppEventType.APP_ERROR]: BaseEventData & { error: any; context?: string };
  [AppEventType.APP_LOADING_STATE]: BaseEventData & { isLoading: boolean; context?: string };
  
  [AppEventType.USER_LOGGED_IN]: BaseEventData & { userId: string };
  [AppEventType.USER_LOGGED_OUT]: BaseEventData;
  [AppEventType.USER_PROFILE_UPDATED]: EntityEventData<any>;
}

/**
 * Type for event listeners with proper typing
 */
type AppEventListener<T extends AppEventType> = (event: CustomEvent<AppEventMap[T]>) => void;

/**
 * Custom event bus
 */
const eventTarget = window; 

/**
 * Register a listener for a specific event type
 * 
 * @param eventType - Type of event to listen for
 * @param listener - Event handler function
 * @param options - Event listener options
 * 
 * @example
 * ```typescript
 * import { AppEventType, addEventListener } from '@/utils/eventUtils';
 * 
 * // In a component
 * useEffect(() => {
 *   const handleCustomerUpdate = (event) => {
 *     const { entityId, data } = event.detail;
 *     // Update local state with the new data
 *     setCustomer(data);
 *   };
 *   
 *   addEventListener(AppEventType.CUSTOMER_UPDATED, handleCustomerUpdate);
 *   
 *   return () => {
 *     removeEventListener(AppEventType.CUSTOMER_UPDATED, handleCustomerUpdate);
 *   };
 * }, []);
 * ```
 * 
 * Used in:
 * - src/components/customers/CustomerDetailPage.tsx
 * - src/components/offers/OffersTable.tsx
 * - src/components/NotificationPanel.tsx
 */
export function addEventListener<T extends AppEventType>(
  eventType: T,
  listener: AppEventListener<T>,
  options?: AddEventListenerOptions
): void {
  logger.debug(`Adding event listener for ${eventType}`);
  eventTarget.addEventListener(eventType, listener as EventListener, options);
}

/**
 * Remove an event listener
 * 
 * @param eventType - Type of event
 * @param listener - Event handler to remove
 * @param options - Event listener options
 * 
 * Used in:
 * - src/components/customers/CustomerDetailPage.tsx
 * - src/components/offers/OffersTable.tsx
 * - src/components/NotificationPanel.tsx
 */
export function removeEventListener<T extends AppEventType>(
  eventType: T,
  listener: AppEventListener<T>,
  options?: EventListenerOptions
): void {
  logger.debug(`Removing event listener for ${eventType}`);
  eventTarget.removeEventListener(eventType, listener as EventListener, options);
}

/**
 * Dispatch a custom event
 * 
 * @param eventType - Type of event to dispatch
 * @param detail - Event data
 * @param options - CustomEvent options
 * @returns Whether the event was successfully dispatched
 * 
 * @example
 * ```typescript
 * import { AppEventType, dispatchEvent } from '@/utils/eventUtils';
 * 
 * // After updating a customer
 * const updatedCustomer = await updateCustomer(customerId, changes);
 * 
 * dispatchEvent(AppEventType.CUSTOMER_UPDATED, {
 *   entityId: customerId,
 *   data: updatedCustomer,
 *   timestamp: Date.now(),
 *   source: 'CustomerEditForm'
 * });
 * ```
 * 
 * Used in:
 * - src/components/customers/CustomerForm.tsx
 * - src/components/offers/OfferForm.tsx
 * - src/services/notificationService.ts
 */
export function dispatchEvent<T extends AppEventType>(
  eventType: T,
  detail: AppEventMap[T],
  options?: CustomEventInit
): boolean {
  // Ensure timestamp is set
  if (!detail.timestamp) {
    detail.timestamp = Date.now();
  }
  
  logger.debug(`Dispatching event ${eventType}`, detail);
  
  const event = new CustomEvent(eventType, {
    detail,
    bubbles: true,
    cancelable: true,
    ...options
  });
  
  return eventTarget.dispatchEvent(event);
}

/**
 * Create functions for a specific event type
 * 
 * @param eventType - Type of event
 * @returns Object with add, remove, and dispatch functions for the event
 * 
 * @example
 * ```typescript
 * const customerEvents = createEventHandlers(AppEventType.CUSTOMER_UPDATED);
 * 
 * // Add listener
 * customerEvents.addEventListener(handleCustomerUpdate);
 * 
 * // Dispatch event
 * customerEvents.dispatchEvent({
 *   entityId: customerId,
 *   data: updatedCustomer,
 *   timestamp: Date.now()
 * });
 * ```
 */
export function createEventHandlers<T extends AppEventType>(eventType: T) {
  return {
    addEventListener: (
      listener: AppEventListener<T>,
      options?: AddEventListenerOptions
    ) => addEventListener(eventType, listener, options),
    
    removeEventListener: (
      listener: AppEventListener<T>,
      options?: EventListenerOptions
    ) => removeEventListener(eventType, listener, options),
    
    dispatchEvent: (
      detail: AppEventMap[T],
      options?: CustomEventInit
    ) => dispatchEvent(eventType, detail, options)
  };
}

/**
 * Create a custom event with typing
 * 
 * @param eventType - Type of event
 * @param detail - Event data
 * @param options - CustomEvent options
 * @returns CustomEvent object
 */
export function createCustomEvent<T extends AppEventType>(
  eventType: T,
  detail: AppEventMap[T],
  options?: CustomEventInit
): CustomEvent<AppEventMap[T]> {
  return new CustomEvent(eventType, {
    detail,
    bubbles: true,
    cancelable: true,
    ...options
  });
}

/**
 * Execute a callback when a specific event occurs once
 * 
 * @param eventType - Type of event to listen for
 * @param callback - Function to execute when the event occurs
 * @param options - Event listener options
 * @returns Function to cancel the listener
 * 
 * @example
 * ```typescript
 * import { AppEventType, onceEvent } from '@/utils/eventUtils';
 * 
 * // Execute once when a customer is created
 * const cancel = onceEvent(AppEventType.CUSTOMER_CREATED, (event) => {
 *   const { entityId, data } = event.detail;
 *   navigate(`/customers/${entityId}`);
 * });
 * 
 * // Cancel if the component unmounts before the event fires
 * useEffect(() => cancel, []);
 * ```
 */
export function onceEvent<T extends AppEventType>(
  eventType: T,
  callback: AppEventListener<T>,
  options?: AddEventListenerOptions
): () => void {
  const listener: AppEventListener<T> = (event) => {
    removeEventListener(eventType, listener);
    callback(event);
  };
  
  addEventListener(eventType, listener, options);
  
  return () => removeEventListener(eventType, listener);
}

// Export a default object with all utilities
export default {
  addEventListener,
  removeEventListener,
  dispatchEvent,
  createEventHandlers,
  createCustomEvent,
  onceEvent,
  AppEventType
}; 