import { TaskList } from './TaskList';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { TaskDialog } from './TaskDialog';
import { Plus } from 'lucide-react';

export function TasksPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#cad2c5]">Tasks</h1>
        <Button 
          onClick={() => setIsDialogOpen(true)}
          className="bg-[#52796f] hover:bg-[#52796f]/90 text-[#cad2c5]"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>

      <TaskList />

      <TaskDialog 
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onTaskCreated={() => setIsDialogOpen(false)}
      />
    </div>
  );
} 