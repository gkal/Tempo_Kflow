import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Check, Clock, AlertCircle, User, Edit, Trash2 } from 'lucide-react';
import { TaskDialog } from './TaskDialog';
import { formatDateTime } from "@/utils/formatUtils";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  due_date: string;
  created_by: string;
  assigned_to: string;
  created_at: string;
  assigned_user?: {
    fullname: string;
  };
  created_user?: {
    fullname: string;
  };
}

interface TaskItemProps {
  task: Task;
  onStatusChange?: () => void;
  onDelete?: () => void;
}

export function TaskItem({ task, onStatusChange, onDelete }: TaskItemProps) {
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    if (!user || isUpdating) return;
    
    setIsUpdating(true);
    
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', task.id);
    
    if (!error) {
      // Create notification for task status change
      await supabase
        .from('notifications')
        .insert({
          user_id: task.created_by,
          message: `Task "${task.title}" status changed to ${newStatus}`,
          type: 'task_status_changed',
          related_task_id: task.id
        });
      
      onStatusChange?.();
    }
    
    setIsUpdating(false);
  };

  const getStatusIcon = () => {
    switch (task.status) {
      case 'completed':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const isAssignedToMe = user && task.assigned_to === user.id;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  return (
    <>
      <div className={`p-4 rounded-md ${isAssignedToMe ? 'bg-[#3a5a40]/30' : 'bg-[#354f52]'} ${isOverdue ? 'border-l-4 border-red-500' : ''}`}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center">
              <h3 className="text-lg font-medium text-[#cad2c5]">{task.title}</h3>
              <button 
                onClick={() => setIsEditDialogOpen(true)}
                className="ml-2 p-1 text-[#84a98c] hover:text-[#cad2c5] rounded-full hover:bg-[#2f3e46]"
                title="Edit task"
              >
                <Edit className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-[#84a98c] mt-1">{task.description}</p>
            
            <div className="flex flex-col mt-2 space-y-1">
              <div className="flex items-center text-xs text-[#84a98c]">
                <User className="h-3 w-3 mr-1" />
                <span>
                  Assigned to: {task.assigned_user?.fullname || 'Unknown'}
                  {isAssignedToMe && ' (You)'}
                </span>
              </div>
              
              <div className="flex items-center text-xs text-[#84a98c]">
                <User className="h-3 w-3 mr-1" />
                <span>
                  Created by: {task.created_user?.fullname || 'Unknown'}
                </span>
              </div>
              
              <div className="text-xs text-[#84a98c]">
                Due: {task.due_date ? formatDateTime(task.due_date) : 'No due date'}
                {isOverdue && <span className="ml-2 text-red-400">Overdue</span>}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            
            <select
              value={task.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={isUpdating}
              className="bg-[#2f3e46] text-[#cad2c5] text-sm rounded-md border border-[#52796f] p-1"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1 text-[#84a98c] hover:text-red-500 rounded-full hover:bg-[#2f3e46]"
                title="Delete task"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <TaskDialog 
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        taskId={task.id}
        onTaskCreated={async () => {
          if (onStatusChange) onStatusChange();
          return Promise.resolve();
        }}
        onTaskStatusChange={async () => Promise.resolve()}
        onTaskDelete={async () => Promise.resolve()}
      />
    </>
  );
} 
