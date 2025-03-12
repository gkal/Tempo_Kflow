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
    try {
      // Always create a notification, regardless of who the task is assigned to
      console.log("Creating notification for task assignment");
      
      // Get sender's fullname
      const { data: senderData, error: senderError } = await supabase
        .from('users')
        .select('fullname')
        .eq('id', createdBy)
        .single();
        
      if (senderError) {
        console.error("Error fetching sender data for notification:", senderError);
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
            console.error("Error fetching offer data for task:", offerError);
          } else if (offerData) {
            if (offerData?.customers && Array.isArray(offerData.customers) && offerData.customers.length > 0) {
              const customerCompanyName = offerData.customers[0]?.company_name;
              if (customerCompanyName) {
                customerName = ` για τον πελάτη ${customerCompanyName}`;
              }
            } else if (offerData?.customers && typeof offerData.customers === 'object' && 'company_name' in offerData.customers) {
              customerName = ` για τον πελάτη ${offerData.customers.company_name}`;
            }
          }
        } catch (error) {
          console.error("Exception fetching offer data for task:", error);
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
      
      const notificationData = {
        user_id: assignedTo,
        sender_id: createdBy, // Add back the sender_id field
        message: notificationMessage,
        type: 'task_assigned',
        related_task_id: task.id,
        read: false,
        created_at: new Date().toISOString()
      };
      
      console.log("Notification data:", notificationData);
      
      const { data: notification, error: notificationError } = await supabase
        .from('notifications')
        .insert(notificationData)
        .select()
        .single();

      if (notificationError) {
        console.error("Error creating notification:", notificationError);
      } else if (notification) {
        // Dispatch the notification event
        console.log("Notification created successfully:", notification);
        if (typeof notifyNewNotification === 'function') {
          console.log("Dispatching notification event for new task");
          notifyNewNotification(notification, assignedTo);
        } else {
          console.warn("notifyNewNotification function not available");
        }
      }
    } catch (notificationError) {
      console.error("Exception creating notification:", notificationError);
      // Continue even if notification creation fails
    }

    return { success: true, task };
  } catch (error) {
    console.error("Exception creating task:", error);
    return { success: false, error };
  }
} 