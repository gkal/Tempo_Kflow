import { useState, useEffect } from 'react';
import { TaskItem } from './TaskItem';
import { Button } from '@/components/ui/button';
import { TaskDialog } from './TaskDialog';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Plus } from 'lucide-react';
import { useRealtimeSubscription } from '@/lib/useRealtimeSubscription';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  due_date: string;
  created_by: string;
  assigned_to: string;
  created_at: string;
  offer_id?: string;
  assigned_user?: {
    fullname: string;
  };
  created_user?: {
    fullname: string;
  };
}

interface TaskListProps {
  offerId?: string;
  showAssignedToMe?: boolean;
  tasks?: Task[];
  loading?: boolean;
  onTaskStatusChange?: (taskId: string, newStatus: string) => Promise<void>;
  onTaskDelete?: (taskId: string) => Promise<void>;
}

export function TaskList({ 
  offerId, 
  showAssignedToMe = false, 
  tasks: propTasks, 
  loading: propLoading, 
  onTaskStatusChange, 
  onTaskDelete 
}: TaskListProps) {
  const { user } = useAuth();
  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Use provided tasks if available, otherwise fetch them
  const tasks = propTasks || localTasks;
  const loading = propLoading !== undefined ? propLoading : isLoading;

  const fetchTasks = async () => {
    // Skip fetching if tasks are provided via props
    if (propTasks !== undefined) return;
    if (!user) return;
    
    setIsLoading(true);
    
    let query = supabase
      .from('tasks')
      .select(`
        *,
        assigned_user:assigned_to(fullname),
        created_user:created_by(fullname)
      `)
      .order('created_at', { ascending: false });
    
    // Filter by offer if provided
    if (offerId) {
      query = query.eq('offer_id', offerId);
    }
    
    // Filter by assigned to me if requested
    if (showAssignedToMe) {
      query = query.eq('assigned_to', user.id);
    }
    
    const { data, error } = await query;
    
    if (data && !error) {
      setLocalTasks(data);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, [user, offerId, showAssignedToMe]);

  // Set up real-time subscription for tasks
  useEffect(() => {
    if (!user) return;

    let filter = {};
    
    if (offerId) {
      filter = { offer_id: `eq.${offerId}` };
    } else if (showAssignedToMe) {
      filter = { assigned_to: `eq.${user.id}` };
    }

    const subscription = supabase
      .channel('tasks')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'tasks',
          ...filter
        },
        (payload) => {
          // Refresh the task list when changes occur
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, offerId, showAssignedToMe]);

  // Add real-time subscription for tasks
  useRealtimeSubscription(
    { table: 'tasks' },
    (payload) => {
      // Handle different types of changes
      if (payload.eventType === 'INSERT') {
        // A new task was created - refresh the task list
        // You'll need to implement a refresh function or use a state management solution
        // For example, you could call a refreshTasks() function here
      } else if (payload.eventType === 'UPDATE') {
        // A task was updated - update it in the local state
        const updatedTask = payload.new;
        // Update the task in your local state
        // This depends on how you're managing state in this component
      } else if (payload.eventType === 'DELETE') {
        // A task was deleted - remove it from the local state
        const deletedTask = payload.old;
        // Remove the task from your local state
        // This depends on how you're managing state in this component
      }
    }
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-[#cad2c5]">
          {showAssignedToMe ? 'Tasks Assigned to Me' : 'Tasks'}
        </h2>
        <Button 
          onClick={() => setIsDialogOpen(true)}
          className="bg-[#52796f] hover:bg-[#52796f]/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>
      
      {loading ? (
        <div className="flex justify-center p-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="h-2 w-2 bg-[#cad2c5] rounded-full animate-bounce" />
            <div className="h-2 w-2 bg-[#cad2c5] rounded-full animate-bounce [animation-delay:0.2s]" />
            <div className="h-2 w-2 bg-[#cad2c5] rounded-full animate-bounce [animation-delay:0.4s]" />
          </div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-8 text-[#84a98c]">
          No tasks found. Create a new task to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskItem 
              key={task.id} 
              task={task} 
              onStatusChange={onTaskStatusChange 
                ? () => onTaskStatusChange(task.id, task.status) 
                : () => fetchTasks()}
              onDelete={onTaskDelete 
                ? () => onTaskDelete(task.id) 
                : undefined}
            />
          ))}
        </div>
      )}
      
      <TaskDialog 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
        offerId={offerId}
        onTaskCreated={fetchTasks}
      />
    </div>
  );
} 