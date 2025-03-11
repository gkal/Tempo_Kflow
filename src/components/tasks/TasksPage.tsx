import { useState } from 'react';
import { TaskList } from './TaskList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function TasksPage() {
  const [activeTab, setActiveTab] = useState('assigned');

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold text-[#cad2c5] mb-6">Task Management</h1>
      
      <Tabs defaultValue="assigned" onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-[#354f52] border-b border-[#52796f]">
          <TabsTrigger value="assigned" className="data-[state=active]:bg-[#52796f]">
            Assigned to Me
          </TabsTrigger>
          <TabsTrigger value="all" className="data-[state=active]:bg-[#52796f]">
            All Tasks
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="assigned" className="mt-4">
          <TaskList showAssignedToMe={true} />
        </TabsContent>
        
        <TabsContent value="all" className="mt-4">
          <TaskList />
        </TabsContent>
      </Tabs>
    </div>
  );
} 