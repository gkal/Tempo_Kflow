import React, { useState, useEffect, useCallback } from "react";
import { TaskList } from "./TaskList";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useRealtimeSubscription } from "@/lib/useRealtimeSubscription";
import { toast } from "@/components/ui/use-toast";

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Function to fetch tasks
  const fetchTasks = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("assigned_to", user.id)
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      
      setTasks(data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast({
        title: "Error",
        description: "Failed to load tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Set up real-time subscription for tasks
  useRealtimeSubscription(
    { table: "tasks", filter: `assigned_to=eq.${user?.id}` },
    (payload) => {
      if (payload.eventType === "INSERT") {
        // A new task was assigned to the user
        const newTask = payload.new;
        setTasks(prevTasks => [newTask, ...prevTasks]);
        
        toast({
          title: "New Task Assigned",
          description: `You have been assigned a new task: ${newTask.title}`,
          variant: "default",
        });
      } else if (payload.eventType === "UPDATE") {
        // A task was updated
        const updatedTask = payload.new;
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === updatedTask.id ? updatedTask : task
          )
        );
      } else if (payload.eventType === "DELETE") {
        // A task was deleted
        const deletedTask = payload.old;
        setTasks(prevTasks => 
          prevTasks.filter(task => task.id !== deletedTask.id)
        );
      }
    },
    [user?.id]
  );

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", taskId);
        
      if (error) throw error;
      
      // Update local state
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );
      
      toast({
        title: "Task Updated",
        description: "Task status updated successfully",
        variant: "default",
      });
    } catch (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    }
  };

  const handleTaskDelete = async (taskId) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);
        
      if (error) throw error;
      
      // Update local state
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      
      toast({
        title: "Task Deleted",
        description: "Task deleted successfully",
        variant: "default",
      });
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-[#cad2c5] mb-4">My Tasks</h1>
      <TaskList 
        tasks={tasks} 
        loading={loading}
        onTaskStatusChange={handleTaskStatusChange}
        onTaskDelete={handleTaskDelete}
      />
    </div>
  );
} 