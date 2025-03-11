import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { TaskItem } from './TaskItem';
import { useAuth } from '@/lib/AuthContext';

export function TaskList() {
  const [tasks, setTasks] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: false });

      if (data && !error) {
        setTasks(data);
      }
    };

    fetchTasks();

    // Subscribe to changes
    const subscription = supabase
      .channel('tasks')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `assigned_to=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTasks(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTasks(prev =>
              prev.map(task => task.id === payload.new.id ? payload.new : task)
            );
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId);

    if (!error) {
      setTasks(prev =>
        prev.map(task =>
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );
    }
  };

  return (
    <div className="space-y-4">
      {tasks.map(task => (
        <TaskItem
          key={task.id}
          task={task}
          onStatusChange={handleStatusChange}
        />
      ))}
    </div>
  );
} 