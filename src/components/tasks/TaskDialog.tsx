import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';

interface TaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  offerId?: string;
  onTaskCreated?: () => void;
}

export function TaskDialog({ isOpen, onClose, offerId, onTaskCreated }: TaskDialogProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        title,
        description,
        assigned_to: user.id,
        created_by: user.id,
        status: 'pending',
        offer_id: offerId,
        due_date: dueDate
      })
      .select()
      .single();

    if (!error && task) {
      // Create notification
      await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          message: `New task created: ${title}`,
          type: 'task_assigned',
          related_task_id: task.id
        });

      onTaskCreated?.();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#2f3e46] text-[#cad2c5] border-[#52796f]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
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
            <label className="text-sm">Due Date</label>
            <Input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="bg-[#354f52] border-[#52796f]"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-[#52796f]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#52796f] hover:bg-[#52796f]/90"
            >
              Create Task
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 