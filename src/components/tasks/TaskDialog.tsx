import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { CheckCircle, AlertCircle, Clock, ArrowUpRight, Trash2, Link, Link2Off, ExternalLink } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { openEditOfferDialog } from "@/components/customers/OfferDialogManager";
import { truncate } from "@/utils/textUtils";
import { DialogClose } from "@/components/ui/dialog";
import { AppTabs, AppTabsList, AppTabsTrigger, AppTabsContent } from "@/components/ui/app-tabs";

interface TaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string | null;
  offerId?: string;
  onTaskCreated: () => Promise<void>;
  onTaskStatusChange: (taskId: string, newStatus: string) => Promise<void>;
  onTaskDelete: (taskId: string) => Promise<void>;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  due_date?: string;
  created_by: string;
  assigned_to: string;
  created_at: string;
  updated_at: string;
  offer_id?: string;
  creator?: { id: string; email: string; fullname?: string };
  assignee?: { id: string; email: string; fullname?: string };
  offer?: { 
    id: string; 
    customer_id: string; 
    customers: { company_name: string };
    requirements?: string;
  };
}

interface User {
  id: string;
  email: string;
  fullname?: string;
}

interface Offer {
  id: string;
  customer_id: string;
  requirements?: string;
  amount?: number;
  offer_result?: string;
  result?: string;
  created_at: string;
  customers: {
    id: string;
    company_name: string;
  };
}

const statusOptions = [
  { value: "pending", label: "Εκκρεμεί", color: "text-amber-400", bg: "bg-amber-500/10", icon: Clock },
  { value: "in_progress", label: "Σε εξέλιξη", color: "text-blue-400", bg: "bg-blue-500/10", icon: ArrowUpRight },
  { value: "completed", label: "Ολοκληρώθηκε", color: "text-green-400", bg: "bg-green-500/10", icon: CheckCircle },
  { value: "cancelled", label: "Ακυρώθηκε", color: "text-gray-400", bg: "bg-gray-500/10", icon: AlertCircle },
];

export function TaskDialog({ isOpen, onClose, taskId, offerId: propOfferId, onTaskCreated, onTaskStatusChange, onTaskDelete }: TaskDialogProps) {
  const { user } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [offerId, setOfferId] = useState<string | null>(propOfferId || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  useEffect(() => {
    fetchUsers();
    fetchOffers();
    
    if (taskId) {
      fetchTask();
    } else {
      resetForm();
      if (propOfferId) {
        setOfferId(propOfferId);
      }
    }
  }, [taskId, propOfferId]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, email, fullname")
        .order("fullname", { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchOffers = async () => {
    try {
      // First get the offers with limit to improve performance
      const { data: offersData, error: offersError } = await supabase
        .from("offers")
        .select("id, customer_id, requirements, amount, offer_result, result, created_at")
        .order("created_at", { ascending: false })
        .limit(20); // Limit to most recent offers for better performance

      if (offersError) {
        console.error("Error fetching offers:", offersError);
        return;
      }
      
      if (!offersData || offersData.length === 0) {
        setOffers([]);
        return;
      }
      
      // Get all customer IDs in a single array
      const customerIds = offersData.map(offer => offer.customer_id).filter(Boolean);
      
      // Fetch all customers in a single query
      const { data: customersData, error: customersError } = await supabase
        .from("customers")
        .select("id, company_name")
        .in("id", customerIds);
        
      if (customersError) {
        console.error("Error fetching customers for offers:", customersError);
      }
      
      // Create a lookup map for customers
      const customerMap = (customersData || []).reduce((acc, customer) => {
        acc[customer.id] = customer;
        return acc;
      }, {});
      
      // Transform the data to match the Offer interface
      const transformedData = offersData.map((offerItem) => {
        const customer = customerMap[offerItem.customer_id] || { id: "", company_name: "" };
        
        return {
          id: offerItem.id,
          customer_id: offerItem.customer_id,
          requirements: offerItem.requirements,
          amount: offerItem.amount,
          offer_result: offerItem.offer_result,
          result: offerItem.result,
          created_at: offerItem.created_at,
          customers: {
            id: customer.id,
            company_name: customer.company_name
          }
        };
      });
      
      setOffers(transformedData);
    } catch (error) {
      console.error("Error in fetchOffers:", error);
    }
  };

  const fetchTask = async () => {
    setIsLoadingData(true);
    try {
      // First, get the basic task data
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .single();

      if (error) throw error;
      
      // Prepare task data object
      let taskData = { ...data };
      
      // Batch fetch users and offers instead of one by one
      const usersToFetch = [];
      if (data.created_by) usersToFetch.push(data.created_by);
      if (data.assigned_to) usersToFetch.push(data.assigned_to);
      
      // Fetch users in batch
      if (usersToFetch.length > 0) {
        const { data: usersData } = await supabase
          .from("users")
          .select("id, email, fullname")
          .in("id", usersToFetch);
          
        if (usersData) {
          // Map users to creator and assignee
          const userMap = usersData.reduce((acc, user) => {
            acc[user.id] = user;
            return acc;
          }, {});
          
          if (data.created_by && userMap[data.created_by]) {
            taskData.creator = userMap[data.created_by];
          }
          
          if (data.assigned_to && userMap[data.assigned_to]) {
            taskData.assignee = userMap[data.assigned_to];
          }
        }
      }
      
      // Fetch offer data if needed
      if (data.offer_id) {
        const offerResponse = await supabase
          .from("offers")
          .select(`
            id,
            customer_id,
            requirements
          `)
          .eq("id", data.offer_id)
          .limit(1);
        
        if (offerResponse.error) {
          console.error("Error fetching offer:", offerResponse.error);
        } else if (offerResponse.data && offerResponse.data.length > 0) {
          const offerData = offerResponse.data[0];
          
          // Fetch customer data
          const customerResponse = await supabase
            .from("customers")
            .select("id, company_name")
            .eq("id", offerData.customer_id)
            .limit(1);
            
          const customerData = customerResponse.data && customerResponse.data.length > 0
            ? customerResponse.data[0]
            : { id: "", company_name: "" };
            
          taskData.offer = {
            id: offerData.id,
            customer_id: offerData.customer_id,
            requirements: offerData.requirements,
            customers: customerData
          };
        }
      }

      setTask(taskData);
      setTitle(taskData.title);
      setDescription(taskData.description || "");
      setDueDate(taskData.due_date || "");
      setAssignedTo(taskData.assigned_to || (user ? user.id : ""));
      setOfferId(taskData.offer_id || null);
    } catch (error) {
      console.error("Error fetching task:", error);
      toast({
        title: "Σφάλμα",
        description: "Αποτυχία φόρτωσης λεπτομερειών εργασίας",
        variant: "destructive",
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  const resetForm = () => {
    setTask(null);
    setTitle("");
    setDescription("");
    setDueDate("");
    setAssignedTo(user?.id || "");
    // Only reset offerId if propOfferId is not provided
    if (!propOfferId) {
      setOfferId(null);
    } else {
      setOfferId(propOfferId);
    }
    setIsSubmitting(false);
    setError(null);
    setActiveTab("details");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      if (taskId) {
        // Update existing task
        const { error } = await supabase
          .from("tasks")
          .update({
            title,
            description,
            due_date: dueDate || null,
            assigned_to: assignedTo,
            offer_id: offerId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", taskId);

        if (error) throw error;
      } else {
        // Create new task
        const { error } = await supabase
          .from("tasks")
          .insert({
            title,
            description,
            status: "pending",
            due_date: dueDate || null,
            created_by: user.id,
            assigned_to: assignedTo || user.id,
            offer_id: offerId,
          });

        if (error) throw error;
      }

      await onTaskCreated();
      onClose();
      resetForm();

      toast({
        title: taskId ? "Η εργασία ενημερώθηκε" : "Η εργασία δημιουργήθηκε",
        description: taskId 
          ? "Οι αλλαγές αποθηκεύτηκαν επιτυχώς" 
          : "Η νέα εργασία δημιουργήθηκε επιτυχώς",
        variant: "default",
      });
    } catch (error) {
      console.error("Error saving task:", error);
      setError("Αποτυχία αποθήκευσης εργασίας. Παρακαλώ δοκιμάστε ξανά.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!taskId) return;
    try {
      await onTaskStatusChange(taskId, newStatus);
      
      const currentStatus = task?.status;
      const newStatusInfo = statusOptions.find(status => status.value === newStatus);
      const oldStatusInfo = statusOptions.find(status => status.value === currentStatus);
      
      if (setTask && task) {
        setTask({ ...task, status: newStatus });
      }
      
      toast({
        title: "Ενημέρωση κατάστασης",
        description: `Η κατάσταση άλλαξε από "${oldStatusInfo?.label || currentStatus}" σε "${newStatusInfo?.label}"`,
        variant: "default",
      });
    } catch (error) {
      console.error("Error updating task status:", error);
      toast({
        title: "Σφάλμα",
        description: "Αποτυχία ενημέρωσης κατάστασης εργασίας",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!taskId) return;
    try {
      await onTaskDelete(taskId);
      setIsDeleteModalOpen(false);
      onClose();
      resetForm();
      
      toast({
        title: "Η εργασία διαγράφηκε",
        description: "Η εργασία διαγράφηκε επιτυχώς",
        variant: "default",
      });
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({
        title: "Σφάλμα",
        description: "Αποτυχία διαγραφής εργασίας",
        variant: "destructive",
      });
    }
  };

  const handleViewOffer = () => {
    if (task?.offer) {
      onClose();
      openEditOfferDialog(task.offer.customer_id, task.offer.id, onTaskCreated);
    }
  };

  const getUserFullName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return "";
    return user.fullname || user.email;
  };

  const currentStatusInfo = statusOptions.find(status => status.value === task?.status);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-[#354f52] border-[#52796f] text-[#cad2c5] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl">
              {taskId ? "Επεξεργασία Εργασίας" : "Νέα Εργασία"}
              
              {taskId && task && (
                <div className="ml-auto flex items-center gap-2">
                  {currentStatusInfo && (
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${currentStatusInfo.bg}`}>
                      <currentStatusInfo.icon className={`h-4 w-4 ${currentStatusInfo.color}`} />
                      <span className={`text-sm font-medium ${currentStatusInfo.color}`}>
                        {currentStatusInfo.label}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </DialogTitle>
          </DialogHeader>

          {isLoadingData ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-pulse text-[#84a98c]">Φόρτωση...</div>
            </div>
          ) : (
            <>
              <AppTabs defaultValue={activeTab} onValueChange={setActiveTab}>
                <AppTabsList>
                  <AppTabsTrigger value="details">
                    Λεπτομέρειες
                  </AppTabsTrigger>
                  <AppTabsTrigger value="related">
                    Συσχετισμοί
                  </AppTabsTrigger>
                </AppTabsList>

                <form onSubmit={handleSubmit}>
                  <AppTabsContent value="details" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Τίτλος</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5] placeholder:text-[#84a98c]"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Περιγραφή</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5] placeholder:text-[#84a98c]"
                        rows={5}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dueDate">Ημερομηνία Ολοκλήρωσης</Label>
                        <Input
                          id="dueDate"
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5] placeholder:text-[#84a98c]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="assignedTo">Ανάθεση σε</Label>
                        <Select
                          value={assignedTo}
                          onValueChange={setAssignedTo}
                        >
                          <SelectTrigger className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5]">
                            <SelectValue placeholder="Επιλέξτε χρήστη" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5]">
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.fullname || user.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {taskId && (
                      <div className="space-y-2 pt-2">
                        <Label>Κατάσταση</Label>
                        <div className="flex flex-wrap gap-2">
                          {statusOptions.map((status) => {
                            const StatusIcon = status.icon;
                            return (
                              <button
                                key={status.value}
                                type="button"
                                onClick={() => handleStatusChange(status.value)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ring-1
                                  ${task?.status === status.value
                                    ? `${status.bg} ${status.color} font-medium shadow-[0_0_8px_2px_rgba(255,255,255,0.15)] ring-white/30`
                                    : "bg-white/10 text-white hover:bg-white/20 ring-transparent"}`}
                              >
                                <StatusIcon className="h-3.5 w-3.5" />
                                <span className="text-sm">{status.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </AppTabsContent>

                  <AppTabsContent value="related" className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="offerId">Προσφορά</Label>
                        <div className="flex gap-2">
                          <Select
                            value={offerId || ""}
                            onValueChange={(value) => setOfferId(value === "" ? null : value)}
                            disabled={isLoadingData || isSubmitting}
                          >
                            <SelectTrigger className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5]">
                              <SelectValue placeholder="Επιλέξτε προσφορά" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5] max-h-[300px]">
                              <SelectItem value="">Καμία προσφορά</SelectItem>
                              {offers.map((offer) => (
                                <SelectItem key={offer.id} value={offer.id}>
                                  {offer.customers?.company_name || "Άγνωστος"}
                                  {offer.requirements ? ` - ${truncate(offer.requirements, 30)}` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          {offerId && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                if (offerId) {
                                  window.dispatchEvent(
                                    new CustomEvent("open-edit-offer-dialog", {
                                      detail: { offerId: offerId },
                                    })
                                  );
                                }
                              }}
                              disabled={!offerId}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {offerId && (
                        <div className="mt-2 p-3 bg-[#2f3e46]/50 rounded-md border border-[#52796f]/50 text-sm">
                          {offers.find(o => o.id === offerId)?.requirements || "Χωρίς λεπτομέρειες"}
                        </div>
                      )}
                    </div>

                    {taskId && task && (
                      <div className="space-y-3 bg-[#2f3e46]/50 rounded-md border border-[#52796f]/50 p-3 mt-4">
                        <div className="text-sm text-[#a8c5b5]">
                          <span className="text-[#84a98c]">Δημιουργήθηκε από:</span>{" "}
                          {getUserFullName(task.created_by)}
                        </div>
                        <div className="text-sm text-[#a8c5b5]">
                          <span className="text-[#84a98c]">Ημ/νία δημιουργίας:</span>{" "}
                          {new Date(task.created_at).toLocaleDateString("el-GR")}
                        </div>
                        {task.updated_at && task.updated_at !== task.created_at && (
                          <div className="text-sm text-[#a8c5b5]">
                            <span className="text-[#84a98c]">Τελευταία ενημέρωση:</span>{" "}
                            {new Date(task.updated_at).toLocaleDateString("el-GR")}
                          </div>
                        )}
                      </div>
                    )}
                  </AppTabsContent>

                  {error && (
                    <div className="text-red-400 text-sm mt-4">{error}</div>
                  )}

                  <div className="flex justify-between items-center pt-4 mt-4 border-t border-[#52796f]/50">
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-[#52796f] hover:bg-[#52796f]/90 text-white"
                      >
                        {isSubmitting ? "Αποθήκευση..." : "Αποθήκευση"}
                      </Button>
                      <Button
                        type="button"
                        onClick={onClose}
                        className="bg-[#2f3e46] hover:bg-[#2f3e46]/90 text-white"
                      >
                        Ακύρωση
                      </Button>
                    </div>
                    {taskId && (
                      <Button
                        type="button"
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Διαγραφή
                      </Button>
                    )}
                  </div>
                </form>
              </AppTabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="bg-[#354f52] border-[#52796f] text-[#cad2c5]">
          <DialogHeader>
            <DialogTitle>Επιβεβαίωση Διαγραφής</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την εργασία;</p>
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => setIsDeleteModalOpen(false)}
                className="bg-[#2f3e46] hover:bg-[#2f3e46]/90 text-white"
              >
                Ακύρωση
              </Button>
              <Button
                onClick={handleDelete}
                className="bg-red-500 hover:bg-red-500/90 text-white"
              >
                Διαγραφή
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 