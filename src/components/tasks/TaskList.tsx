import { useState, useEffect } from 'react';
import { TaskItem } from './TaskItem';
import { Button } from '@/components/ui/button';
import { TaskDialog } from './TaskDialog';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Plus } from 'lucide-react';
import { Task } from '@/services/api/types';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';

interface TaskListProps {
  offerId?: string;
  showAssignedToMe?: boolean;
  tasks?: Task[];
  loading?: boolean;
  onTaskStatusChange?: (taskId: string, newStatus: string) => Promise<void>;
  onTaskDelete?: (taskId: string) => Promise<void>;
  refreshTrigger?: boolean;
}

export function TaskList({ 
  offerId, 
  showAssignedToMe = false, 
  tasks: propTasks, 
  loading: propLoading, 
  onTaskStatusChange, 
  onTaskDelete,
  refreshTrigger
}: TaskListProps) {
  const { user } = useAuth();
  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Use provided tasks if available, otherwise fetch them
  const tasks = propTasks || localTasks;
  const loading = propLoading !== undefined ? propLoading : isLoading;

  const fetchTasks = async () => {
    setIsLoading(true);
    
    if (propTasks) {
      setLocalTasks(propTasks);
      setIsLoading(false);
      return;
    }
    
    let query = supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Filter by offer ID if provided
    if (offerId) {
      query = query.eq('offer_id', offerId);
    }
    
    // Filter by assigned to me if requested
    if (showAssignedToMe) {
      query = query.eq('assigned_to', user.id);
    }
    
    const { data, error } = await query;
    
    if (data && !error) {
      // Use type assertion to handle missing required properties
      setLocalTasks(data as unknown as Task[]);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, [offerId, showAssignedToMe, user, propTasks, refreshTrigger]);

  // Add real-time subscription for tasks through Supabase's built-in channel capability
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-[#cad2c5]">
          {showAssignedToMe ? 'Tasks Assigned to Me' : 'Tasks'}
        </h2>
        <Button 
          onClick={() => setIsDialogOpen(true)}
          className="bg-transparent hover:bg-[#52796f] text-[#84a98c] hover:text-[#cad2c5] flex items-center gap-2 transition-colors font-normal"
        >
          <Plus className="h-4 w-4 text-white" />
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
        taskId={null}
        offerId={offerId}
        onTaskCreated={fetchTasks}
        onTaskStatusChange={async (taskId, newStatus) => {
          if (onTaskStatusChange) {
            await onTaskStatusChange(taskId, newStatus);
          } else {
            await supabase
              .from('tasks')
              .update({ status: newStatus })
              .eq('id', taskId);
            fetchTasks();
          }
        }}
        onTaskDelete={async (taskId) => {
          if (onTaskDelete) {
            await onTaskDelete(taskId);
          } else {
            await supabase
              .from('tasks')
              .delete()
              .eq('id', taskId);
            fetchTasks();
          }
        }}
      />
    </div>
  );
} 