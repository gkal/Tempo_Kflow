import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createTask } from './createTask';
import { isFeatureEnabled } from '@/lib/featureFlags';

interface User {
  id: string;
  fullname: string;
}

interface TaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  offerId?: string;
  taskId?: string;
  onTaskCreated?: (task: any) => void;
}

export function TaskDialog({ isOpen, onClose, offerId, taskId, onTaskCreated }: TaskDialogProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [originalAssignedTo, setOriginalAssignedTo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Check if due date fields are enabled - using the updated column names flag
  // since we're dealing with column name issues
  const dueDateEnabled = isFeatureEnabled('useUpdatedColumnNames');

  // Fetch users for assignment dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, fullname')
        .order('fullname');
      
      if (data && !error) {
        setUsers(data);
      }
    };

    fetchUsers();
  }, []);

  // Load task data if editing
  useEffect(() => {
    if (taskId && isOpen) {
      setIsEditing(true);
      
      const fetchTask = async () => {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', taskId)
          .single();
        
        if (data && !error) {
          setTitle(data.title);
          setDescription(data.description);
          setDueDate(data.due_date || '');
          setAssignedTo(data.assigned_to);
          setOriginalAssignedTo(data.assigned_to);
        }
      };

      fetchTask();
    } else {
      // Reset form when opening for a new task
      setIsEditing(false);
      setTitle('');
      setDescription('');
      setDueDate('');
      setAssignedTo('');
      setOriginalAssignedTo('');
    }
  }, [taskId, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setIsLoading(true);
    setError('');

    if (!user) {
      setError('You must be logged in to create or edit tasks');
      setIsLoading(false);
      return;
    }

    // Use the selected user or default to current user
    const targetUserId = assignedTo || user.id;

    if (isEditing && taskId) {
      // Update existing task
      try {
        // Create update object without due date fields
        const updateData: any = {
          title,
          description,
          assigned_to: targetUserId,
        };
        
        // Only include due date if the feature is enabled
        if (dueDateEnabled) {
          updateData.due_date = dueDate ? new Date(dueDate).toISOString() : null;
        }

        const { data: task, error } = await supabase
          .from('tasks')
          .update(updateData)
          .eq('id', taskId)
          .select()
          .single();

        if (error) {
          console.error("Error updating task:", error);
          setError("Failed to update task: " + error.message);
          return;
        }

        if (task) {
          // If the assigned user has changed, create a notification
          if (originalAssignedTo !== targetUserId) {
            await supabase
              .from('notifications')
              .insert({
                user_id: targetUserId,
                message: `Task reassigned to you: ${title}`,
                type: 'task_reassigned',
                related_task_id: task.id
              });
          }

          if (onTaskCreated) {
            onTaskCreated(task);
          }
          onClose();
          
          // Reset form
          setTitle('');
          setDescription('');
          setDueDate('');
          setAssignedTo('');
        }
      } catch (error: any) {
        console.error("Error updating task:", error);
        setError("An unexpected error occurred: " + error.message);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Create new task using the utility function
      try {
        const result = await createTask({
          title,
          description,
          assignedTo: targetUserId,
          createdBy: user.id,
          offerId,
          // Only include dueDate if the feature is enabled
          ...(dueDateEnabled ? { dueDate } : {})
        });

        if (result.success) {
          if (onTaskCreated) {
            onTaskCreated(result.task);
          }
          onClose();
          
          // Reset form
          setTitle('');
          setDescription('');
          setDueDate('');
          setAssignedTo('');
        } else {
          console.error("Failed to create task:", result.error);
          setError(result.error?.message || "Failed to create task. Please try again.");
        }
      } catch (error: any) {
        console.error("Error creating task:", error);
        setError("An unexpected error occurred: " + error.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#2f3e46] text-[#cad2c5] border-[#52796f]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Task' : 'Create New Task'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-[#354f52] border-[#52796f]"
            />
          </div>
          <div>
            <label className="text-sm">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#354f52] border-[#52796f] rounded-md p-2"
              rows={3}
            />
          </div>
          <div>
            <label className="text-sm">Assign To</label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger className="bg-[#354f52] border-[#52796f]">
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent className="bg-[#2f3e46] border-[#52796f]">
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id} className="text-[#cad2c5]">
                    {user.fullname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Only show due date field if the feature is enabled */}
          {dueDateEnabled && (
            <div>
              <label className="text-sm">Due Date</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-[#354f52] border-[#52796f] text-[#cad2c5]"
              />
            </div>
          )}
          
          {error && (
            <div className="bg-red-900/30 border border-red-500 text-red-200 p-2 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              onClick={onClose} 
              variant="outline" 
              className="border-[#52796f] hover:bg-[#52796f] hover:text-[#cad2c5]"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-[#52796f] hover:bg-[#84a98c] text-[#cad2c5]"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : isEditing ? 'Update Task' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 