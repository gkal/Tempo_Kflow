import { supabase, getCurrentSession } from '@/lib/supabaseClient';
import { isFeatureEnabled, debugLog } from '@/lib/featureFlags';
import { notifyNewNotification } from '@/lib/notificationEvents';
import { createPrefixedLogger, logError, logWarning } from '@/utils/loggingUtils';

// Create a logger for this module
const logger = createPrefixedLogger('createTask');

interface CreateTaskParams {
  title: string;
  description: string;
  assignedTo: string;
  createdBy: string;
  offerId?: string;
  // Keeping dueDate in the interface for future compatibility
  // but not using it in the function
  dueDate?: string | Date;
}

interface TaskData {
  title: string;
  description: string;
  assigned_to: string;
  created_by: string;
  status: string;
  offer_id?: string;
}

interface NotificationData {
  user_id: string;
  sender_id: string;
  message: string;
  type: string;
  related_task_id: string;
  read: boolean;
  created_at: string;
}

// Define a minimal Task interface for return type
interface Task {
  id: string;
  [key: string]: any;
}

// Helper type for customers data
interface CustomerData {
  company_name?: string;
}

export async function createTask({
  title,
  description,
  assignedTo,
  createdBy,
  offerId,
  // dueDate is still in the parameter list for compatibility
  // but we're not using it
  dueDate
}: CreateTaskParams) {
  try {
    // Get the current user session to ensure we have proper authentication
    const session = await getCurrentSession();
    if (!session) {
      logError("No authenticated user found. Please log in again.");
      return { success: false, error: new Error("Authentication required") };
    }

    // Create task data object with all required fields
    const taskData: TaskData = {
      title,
      description: description || '',
      assigned_to: assignedTo,
      created_by: createdBy || session.id, // Use current user as fallback
      status: 'pending'
    };

    // Only add offer_id if it exists and a task is being created
    if (offerId) {
      taskData.offer_id = offerId;
    }

    // Insert the task with the current user's ID
    const { data: task, error } = await supabase
      .from('tasks' as any)
      .insert(taskData as any)
      .select()
      .single();

    if (error) {
      logError("Error creating task:", error);
      
      // If we get an RLS error, try to provide more helpful information
      if (error.code === '42501') {
        logError("Row Level Security policy violation. Make sure you have permission to create tasks.");
        return { 
          success: false, 
          error: new Error("Permission denied: You don't have permission to create tasks. Please contact your administrator.") 
        };
      }
      
      return { success: false, error };
    }

    // Type assertion for task - first convert to unknown
    const taskWithId = task as unknown as Task;

    // Create notification for the assigned user
    try {
      // Always create a notification, regardless of who the task is assigned to
      
      // Get sender's fullname
      const { data: senderData, error: senderError } = await supabase
        .from('users')
        .select('fullname')
        .eq('id', createdBy)
        .single();
        
      if (senderError) {
        logger.error("Error fetching sender data for notification:", senderError);
      }

      // Get customer name if this task is related to an offer
      let customerName = '';
      if (offerId) {
        try {
          const { data: offerData, error: offerError } = await supabase
            .from('offers')
            .select(`
              customer_id,
              customers:customer_id(
                company_name
              )
            `)
            .eq('id', offerId)
            .single();
          
          if (offerError) {
            logger.error("Error fetching offer data for task:", offerError);
          } else if (offerData && offerData.customers) {
            // Get customers data safely with a type assertion approach
            let companyName = '';
            
            // Force TypeScript to trust us that customers is not null at this point
            const customers = offerData.customers as any;
            
            if (Array.isArray(customers) && customers.length > 0) {
              companyName = customers[0]?.company_name || '';
            } else if (typeof customers === 'object') {
              companyName = customers.company_name || '';
            }
            
            if (companyName) {
              customerName = ` για τον πελάτη ${companyName}`;
            }
          }
        } catch (error) {
          logger.error("Exception fetching offer data for task:", error);
          // Continue with task creation even if we can't get the customer name
        }
      }

      const senderName = senderData?.fullname || 'Άγνωστος χρήστης';
      
      // Create a different message if the task is self-assigned
      let notificationMessage = '';
      if (assignedTo === createdBy) {
        notificationMessage = `Νέα εργασία που δημιουργήσατε: ${title}${customerName}`;
      } else {
        notificationMessage = `${senderName} → Νέα εργασία ανατέθηκε σε εσάς: ${title}${customerName}`;
      }
      
      const notificationData: NotificationData = {
        user_id: assignedTo,
        sender_id: createdBy, // Add back the sender_id field
        message: notificationMessage,
        type: 'task_assigned',
        related_task_id: taskWithId.id,
        read: false,
        created_at: new Date().toISOString()
      };
      
      const { data: notification, error: notificationError } = await supabase
        .from('notifications' as any)
        .insert(notificationData as any)
        .select()
        .single();

      if (notificationError) {
        logger.error("Error creating notification:", notificationError);
      } else if (notification) {
        // Dispatch the notification event
        if (typeof notifyNewNotification === 'function') {
          notifyNewNotification(notification as any, assignedTo);
        } else {
          logWarning("notifyNewNotification function not available");
        }
      }
    } catch (notificationError) {
      logger.error("Exception creating notification:", notificationError);
      // Continue even if notification creation fails
    }

    return { success: true, task: taskWithId };
  } catch (error) {
    logger.error("Exception creating task:", error);
    return { success: false, error };
  }
} 