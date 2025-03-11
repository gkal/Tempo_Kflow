import { supabase, getCurrentSession } from '@/lib/supabaseClient';
import { isFeatureEnabled, debugLog } from '@/lib/featureFlags';
import { notifyNewNotification } from '@/lib/notificationEvents';

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
    const currentUser = await getCurrentSession();
    if (!currentUser) {
      console.error("No authenticated user found. Please log in again.");
      return { success: false, error: new Error("Authentication required") };
    }

    debugLog("Current user:", currentUser.id);

    // Create task data object with all required fields
    const taskData: any = {
      title,
      description: description || '',
      assigned_to: assignedTo,
      created_by: createdBy || currentUser.id, // Use current user as fallback
      status: 'pending'
    };

    // Only add offer_id if it exists and a task is being created
    if (offerId) {
      taskData.offer_id = offerId;
    }

    // IMPORTANT: We're not including due_date or due_date_time fields
    // until they are added to the database schema

    debugLog("Creating task with data:", taskData);

    // Insert the task with the current user's ID
    const { data: task, error } = await supabase
      .from('tasks')
      .insert(taskData)
      .select()
      .single();

    if (error) {
      console.error("Error creating task:", error);
      
      // If we get an RLS error, try to provide more helpful information
      if (error.code === '42501') {
        console.error("Row Level Security policy violation. Make sure you have permission to create tasks.");
        return { 
          success: false, 
          error: new Error("Permission denied: You don't have permission to create tasks. Please contact your administrator.") 
        };
      }
      
      return { success: false, error };
    }

    // Create notification for the assigned user
    if (task) {
      try {
        const notificationData = {
          user_id: assignedTo,
          message: `New task assigned to you: ${title}`,
          type: 'task_assigned',
          related_task_id: task.id,
          read: false,
          created_at: new Date().toISOString()
        };
        
        const { data: notification, error: notificationError } = await supabase
          .from('notifications')
          .insert(notificationData)
          .select()
          .single();

        if (notificationError) {
          console.error("Error creating notification:", notificationError);
        } else if (notification) {
          // Dispatch the notification event
          console.log("Dispatching notification event for new task");
          notifyNewNotification(notification, assignedTo);
        }
      } catch (notificationError) {
        console.error("Exception creating notification:", notificationError);
        // Continue even if notification creation fails
      }

      return { success: true, task };
    }

    return { success: false, error: new Error('Task created but no data returned') };
  } catch (error) {
    console.error("Exception creating task:", error);
    return { success: false, error };
  }
} 