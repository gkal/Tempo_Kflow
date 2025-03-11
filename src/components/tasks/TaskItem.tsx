import { formatDistanceToNow } from 'date-fns';
import { el } from 'date-fns/locale';
import { Check, Clock, AlertCircle } from 'lucide-react';

interface TaskItemProps {
  task: {
    id: string;
    title: string;
    description: string;
    status: string;
    due_date: string;
    created_at: string;
    offer_id?: string | null;
  };
  onStatusChange: (id: string, status: string) => void;
}

export function TaskItem({ task, onStatusChange }: TaskItemProps) {
  return (
    <div className="bg-[#354f52] rounded-lg p-4 mb-4 border border-[#52796f]">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-[#cad2c5] font-medium">{task.title}</h3>
          <p className="text-[#84a98c] text-sm mt-1">{task.description}</p>
        </div>
        <div className="flex items-center space-x-2">
          {task.status === 'pending' && (
            <Clock className="h-5 w-5 text-yellow-500" />
          )}
          {task.status === 'in_progress' && (
            <AlertCircle className="h-5 w-5 text-blue-500" />
          )}
          {task.status === 'completed' && (
            <Check className="h-5 w-5 text-green-500" />
          )}
        </div>
      </div>
      <div className="mt-4 flex justify-between items-center">
        <span className="text-[#84a98c] text-xs">
          Due {formatDistanceToNow(new Date(task.due_date), { addSuffix: true, locale: el })}
        </span>
        <div className="flex space-x-2">
          {task.status !== 'completed' && (
            <button
              onClick={() => onStatusChange(task.id, 'completed')}
              className="text-xs bg-[#52796f] text-[#cad2c5] px-2 py-1 rounded hover:bg-[#52796f]/80"
            >
              Mark Complete
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 