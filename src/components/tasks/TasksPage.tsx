import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useRealtimeSubscription } from "@/lib/useRealtimeSubscription";
import { toast } from "@/components/ui/use-toast";
import { DataTableBase } from "@/components/ui/data-table-base";
import { Search, Plus, CheckCircle, AlertCircle, Clock, ArrowUpRight, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskDialog } from "./TaskDialog";
import { cn } from "@/lib/utils";
import { SearchBar } from "@/components/ui/search-bar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { openEditOfferDialog } from "@/components/customers/OfferDialogManager";
import { Input } from "@/components/ui/input";

// Define interfaces
interface Task {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  creator_id?: string;
  assignee_id?: string;
  created_by?: string;
  assigned_to?: string;
  offer_id?: string;
  created_at?: string;
  updated_at?: string;
  creator?: {
    id: string;
    email: string;
    fullname?: string;
  };
  assignee?: {
    id: string;
    email: string;
    fullname?: string;
  };
  offer?: {
    id: string;
    customer_id: string;
    requirements?: string;
    amount?: number;
    offer_result?: string;
    result?: string;
    created_at?: string;
    customers?: {
      id: string;
      company_name: string;
    };
  };
  isParent?: boolean;
  children?: Task[];
}

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchColumn, setSearchColumn] = useState("title");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("offer-tasks");
  const [expandedOfferIds, setExpandedOfferIds] = useState<string[]>([]);
  const [offerTasksSearchTerm, setOfferTasksSearchTerm] = useState("");
  
  // Define columns for offer tasks
  const offerTasksColumns = useMemo(() => {
    return [
      {
        header: "",
        accessor: "expander",
        sortable: false,
        width: "40px",
      },
      {
        header: "Πελάτης",
        accessor: "offer.customers.company_name",
        sortable: true,
        type: "name" as const,
        priority: "high" as const,
        width: "20%",
        cell: (value, row) => (
          <div className="font-medium text-[#cad2c5] truncate">
            {row.offer?.customers?.company_name || "-"}
          </div>
        ),
      },
      {
        header: "Ζήτηση Πελάτη",
        accessor: "offer.requirements",
        sortable: true,
        type: "description" as const,
        width: "25%",
        cell: (value, row) => (
          <div className="text-sm text-[#a8c5b5] truncate max-w-sm">
            {row.offer?.requirements || "-"}
          </div>
        ),
      },
      {
        header: "Ποσό",
        accessor: "offer.amount",
        sortable: true,
        type: "numeric" as const,
        width: "10%",
        cell: (value, row) => (
          <div className="text-sm text-[#a8c5b5]">
            {row.offer?.amount || "-"}
          </div>
        ),
      },
      {
        header: "Κατάσταση",
        accessor: "offer.offer_result",
        sortable: true,
        type: "status" as const,
        width: "15%",
        cell: (value, row) => {
          const offerResult = row.offer?.offer_result;
          const status = {
            wait_for_our_answer: { label: "Αναμονή μας", color: "text-yellow-400" },
            wait_for_customer_answer: { label: "Αναμονή πελάτη", color: "text-blue-400" },
            ready: { label: "Ολοκληρώθηκε", color: "text-green-400" }
          }[offerResult || ""] || { label: "-", color: "text-gray-400" };
          
          return (
            <div className={`text-sm ${status.color}`}>
              {status.label}
            </div>
          );
        },
      },
      {
        header: "Αποτέλεσμα",
        accessor: "offer.result",
        sortable: true,
        type: "status" as const,
        width: "15%",
        cell: (value, row) => {
          const offerResult = row.offer?.result;
          const result = {
            success: { label: "Επιτυχία", color: "text-green-400" },
            failed: { label: "Αποτυχία", color: "text-red-400" },
            cancel: { label: "Ακύρωση", color: "text-yellow-400" },
            waiting: { label: "Αναμονή", color: "text-purple-400" }
          }[offerResult || ""] || { label: "-", color: "text-gray-400" };
          
          return (
            <div className={`text-sm ${result.color}`}>
              {result.label}
            </div>
          );
        },
      },
      {
        header: "Ημερομηνία",
        accessor: "created_at",
        sortable: true,
        type: "date" as const,
        width: "15%",
        cell: (value, row) => (
          <div className="text-sm text-[#a8c5b5]">
            {value ? new Date(value).toLocaleDateString("el-GR") : "-"}
          </div>
        ),
      }
    ];
  }, []);

  // Define columns for general tasks
  const generalTasksColumns = useMemo(() => [
    {
      header: "Τίτλος",
      accessor: "title",
      sortable: true,
      type: "name" as const,
      priority: "high" as const,
      width: "30%",
      cell: (value) => (
        <div className="font-medium text-[#cad2c5] truncate">
          {value || "-"}
        </div>
      ),
    },
    {
      header: "Περιγραφή",
      accessor: "description",
      sortable: false,
      type: "description" as const,
      width: "30%",
      cell: (value) => (
        <div className="text-sm text-[#a8c5b5] truncate max-w-sm">
          {value || "-"}
        </div>
      ),
    },
    {
      header: "Κατάσταση",
      accessor: "status",
      sortable: true,
      type: "status" as const,
      width: "15%",
      cell: (value) => {
        const status = {
          pending: { label: "Εκκρεμεί", color: "text-amber-400", icon: Clock },
          in_progress: { label: "Σε εξέλιξη", color: "text-blue-400", icon: ArrowUpRight },
          completed: { label: "Ολοκληρώθηκε", color: "text-green-400", icon: CheckCircle },
          cancelled: { label: "Ακυρώθηκε", color: "text-gray-400", icon: AlertCircle }
        }[value] || { label: "Άγνωστο", color: "text-gray-400", icon: Clock };
        
        const StatusIcon = status.icon;
        
        return (
          <div className={`flex items-center gap-1.5 ${status.color}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            <span className="text-sm">{status.label}</span>
          </div>
        );
      },
    },
    {
      header: "Ημερομηνία",
      accessor: "created_at",
      sortable: true,
      type: "date" as const,
      width: "15%",
      cell: (value) => (
        <div className="text-sm text-[#a8c5b5]">
          {value ? new Date(value).toLocaleDateString("el-GR") : "-"}
        </div>
      ),
    },
    {
      header: "Από",
      accessor: "creator.fullname",
      sortable: true,
      type: "name" as const,
      width: "10%",
      cell: (value, row) => (
        <div className="text-sm text-[#a8c5b5]">
          {row.creator?.fullname || row.creator?.email || "-"}
        </div>
      ),
    }
  ], []);

  // Function to fetch tasks
  const fetchTasks = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get tasks with all their data in a single query without joins
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("assigned_to", user.id)
        .order("created_at", { ascending: false });
        
      if (tasksError) {
        console.error("Error fetching tasks:", tasksError);
        setTasks([]);
        setLoading(false);
        return;
      }
      
      if (!tasksData || tasksData.length === 0) {
        setTasks([]);
        setLoading(false);
        return;
      }
      
      // Collect all offer_ids and user_ids
      const offerIds = tasksData
        .filter(task => task.offer_id)
        .map(task => task.offer_id)
        .filter((id, index, self) => id && self.indexOf(id) === index); // Unique offer IDs
        
      const userIds = [
        ...new Set([
          ...tasksData.map(task => task.created_by),
          ...tasksData.map(task => task.assigned_to)
        ].filter(Boolean))
      ];
      
      // Fetch all users in a single query
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, fullname, email")
        .in("id", userIds);
        
      if (usersError) {
        console.error("Error fetching users:", usersError);
      }
      
      // Prepare user lookup map
      const usersMap = (usersData || []).reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {});
      
      // Fetch all offers in a single query
      let offersMap = {};
      if (offerIds.length > 0) {
        try {
          // Use a single query to get all offers
          const { data: offersData, error: offersError } = await supabase
            .from("offers")
            .select("*")
            .in("id", offerIds);
            
          if (offersError) {
            console.error("Error fetching offers:", offersError);
          } else if (offersData && offersData.length > 0) {
            // Get all customer IDs from offers
            const customerIds = offersData
              .map(offer => offer.customer_id)
              .filter((id, index, self) => id && self.indexOf(id) === index); // Unique customer IDs
            
            // Fetch all customers in a single query
            const { data: customersData, error: customersError } = await supabase
              .from("customers")
              .select("id, company_name")
              .in("id", customerIds);
              
            if (customersError) {
              console.error("Error fetching customers:", customersError);
            }
            
            // Prepare customer lookup map
            const customersMap = (customersData || []).reduce((acc, customer) => {
              acc[customer.id] = customer;
              return acc;
            }, {});
            
            // Build offers with customer data
            offersMap = offersData.reduce((acc, offer) => {
              acc[offer.id] = {
                ...offer,
                customers: customersMap[offer.customer_id] || { id: "", company_name: "" }
              };
              return acc;
            }, {});
          }
        } catch (error) {
          console.error("Error in offer/customer fetch operations:", error);
        }
      }
      
      // Enrich tasks with related data from maps
      const enrichedTasks = tasksData.map(task => {
        const enrichedTask: Task = { ...task };
        
        // Add creator and assignee
        if (task.created_by && usersMap[task.created_by]) {
          enrichedTask.creator = usersMap[task.created_by];
        }
        
        if (task.assigned_to && usersMap[task.assigned_to]) {
          enrichedTask.assignee = usersMap[task.assigned_to];
        }
        
        // Add offer data
        if (task.offer_id && offersMap[task.offer_id]) {
          enrichedTask.offer = offersMap[task.offer_id];
        }
        
        return enrichedTask;
      });
      
      setTasks(enrichedTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast({
        title: "Σφάλμα",
        description: "Αποτυχία φόρτωσης εργασιών",
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
        fetchTasks();
      } else if (payload.eventType === "UPDATE") {
        fetchTasks();
      } else if (payload.eventType === "DELETE") {
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

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleColumnChange = (column: string) => {
    setSearchColumn(column);
  };

  const handleRowClick = (task: Task) => {
    if (task.isParent) {
      // Open offer dialog when clicking on parent row
      openEditOfferDialog(task.offer?.customer_id || "", task.offer_id || "", fetchTasks);
    } else if (task.offer_id) {
      // For child rows or single tasks with offer_id, open the task dialog
      setCurrentTaskId(task.id);
      setIsDialogOpen(true);
    } else {
      // For general tasks, open the task dialog
      setCurrentTaskId(task.id);
      setIsDialogOpen(true);
    }
  };

  // Search options for the SearchBar component
  const searchOptions = [
    { value: "title", label: "Τίτλος" },
    { value: "description", label: "Περιγραφή" }
  ];

  // Filter tasks based on the active tab and filters
  const filteredTasks = useMemo(() => {
    // First filter based on active tab
    const tabFiltered = tasks.filter(task => 
      activeTab === "offer-tasks" ? task.offer_id : !task.offer_id
    );
    
    // Apply search filter if exists
    let searchFiltered = tabFiltered;
    if (searchTerm) {
      searchFiltered = tabFiltered.filter(task => {
        if (activeTab === "offer-tasks") {
          // Search in offer-related fields
          if (searchColumn === "company_name") {
            return task.offer?.customers?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
          } else if (searchColumn === "requirements") {
            return task.offer?.requirements?.toLowerCase().includes(searchTerm.toLowerCase());
          }
        } else {
          // Search in task fields
          if (searchColumn === "title") {
            return task.title?.toLowerCase().includes(searchTerm.toLowerCase());
          } else if (searchColumn === "description") {
            return task.description?.toLowerCase().includes(searchTerm.toLowerCase());
          }
        }
        return false;
      });
    }
    
    // Apply status filter if not 'all'
    if (statusFilter !== 'all') {
      return searchFiltered.filter(task => task.status === statusFilter);
    }
    
    return searchFiltered;
  }, [tasks, activeTab, statusFilter, searchTerm, searchColumn]);

  // Prepare data for display with expandable rows
  const processedOfferTasks = useMemo(() => {
    // First filter tasks by activeTab and other filters
    const filteredOfferTasks = filteredTasks.filter(task => task.offer_id);
    if (!filteredOfferTasks || filteredOfferTasks.length === 0) return [];

    // Group tasks by offer_id
    const offerGroups: Record<string, Task> = filteredOfferTasks.reduce((acc: Record<string, Task>, task: Task) => {
      if (!task.offer_id || !task.offer) return acc;
      
      if (!acc[task.offer_id]) {
        acc[task.offer_id] = {
          ...task,
          isParent: true,
          children: []
        };
      }
      
      // Only add task to children if it passes the status filter
      if (statusFilter === 'all' || task.status === statusFilter) {
        acc[task.offer_id].children = [...(acc[task.offer_id].children || []), task];
      }
      
      return acc;
    }, {});
    
    // Convert to array and sort
    return Object.values(offerGroups).sort((a: Task, b: Task) => {
      const dateA = new Date(a.offer?.created_at || 0);
      const dateB = new Date(b.offer?.created_at || 0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [filteredTasks, statusFilter]);

  // Toggle expanded state for an offer
  const toggleExpandOffer = (offerId: string) => {
    setExpandedOfferIds(prevIds => 
      prevIds.includes(offerId)
        ? prevIds.filter(id => id !== offerId)
        : [...prevIds, offerId]
    );
  };

  // Render custom row for offer tasks
  const renderOfferTaskRow = (row: Task, index: number, defaultRow: JSX.Element) => {
    const isExpanded = expandedOfferIds.includes(row.id);
    
    // Create the row with data-offer-id attribute
    const rowWithDataAttr = (
      <tr
        key={`row-${row.id}`}
        onClick={() => handleRowClick(row)}
        className={cn(
          "transition-colors",
          "hover:bg-[#354f52]/50 cursor-pointer group"
        )}
        data-offer-id={row.id}
      >
        <td className="p-3">
          <div 
            className="flex items-center justify-center relative group cursor-pointer hover:bg-[#52796f]/60 rounded-full w-10 h-7 transition-colors duration-200"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpandOffer(row.id);
            }}
          >
            <span className="absolute inset-0 rounded-full bg-[#52796f]/0 group-hover:bg-[#52796f]/30 transition-colors duration-200"></span>
            <div className="flex items-center justify-center">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-[#84a98c] group-hover:text-white relative z-10" />
              ) : (
                <ChevronRight className="h-4 w-4 text-[#84a98c] group-hover:text-white relative z-10" />
              )}
            </div>
          </div>
        </td>
        {/* Use React.Children instead of Array.from */}
        {React.Children.map(defaultRow.props.children, (child, i) => {
          // Skip the first cell (expander column)
          if (i === 0) return null;
          return React.cloneElement(child, { key: `cell-${row.id}-${i}` });
        })}
      </tr>
    );
    
    // Create the expanded row with same data-offer-id attribute
    const expandedRow = isExpanded ? (
      <tr key={`expanded-${row.id}`} className="bg-[#2f3e46] border-t border-b border-[#52796f]" data-offer-id={row.id}>
        <td colSpan={offerTasksColumns.length} className="p-0">
          {renderSubRow(row)}
        </td>
      </tr>
    ) : null;
    
    return (
      <React.Fragment key={`fragment-${row.id}`}>
        {rowWithDataAttr}
        {expandedRow}
      </React.Fragment>
    );
  };

  // Inside the TasksPage component, update this helper function for expanding rows
  const renderSubRow = (task: Task) => {
    if (!task.offer) return null;
    
    const hasChildren = task.children && task.children.length > 0;
    
    return (
      <div className="pl-[70px]">
        {task.children && task.children.length === 0 ? (
          <div className="text-center py-4 text-[#84a98c]">
            Δεν υπάρχουν εργασίες σε αυτή την προσφορά
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#3a5258] text-[#a8c5b5]">
                <th className="px-2 py-2 text-left text-xs font-medium w-[160px]">Τίτλος</th>
                <th className="px-3 py-2 text-left text-xs font-medium">Περιγραφή</th>
                <th className="px-3 py-2 text-left text-xs font-medium w-[140px]">Κατάσταση</th>
                <th className="px-3 py-2 text-left text-xs font-medium w-[100px]">Από</th>
                <th className="px-3 py-2 text-left text-xs font-medium w-[100px]">Ημερομηνία</th>
              </tr>
            </thead>
            <tbody>
              {hasChildren ? task.children.map((childTask) => (
                <tr 
                  key={childTask.id} 
                  className="border-t border-[#52796f]/30 hover:bg-[#354f52]/30 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentTaskId(childTask.id);
                    setIsDialogOpen(true);
                  }}
                >
                  <td className="px-2 py-2 text-xs text-[#cad2c5]">{childTask.title || "-"}</td>
                  <td className="px-3 py-2 text-xs text-[#cad2c5]">
                    {childTask.description 
                      ? (childTask.description.length > 50 
                          ? `${childTask.description.substring(0, 50)}...` 
                          : childTask.description)
                      : "-"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {childTask.status && (
                      <span className={
                        childTask.status === "pending" ? "text-amber-400" : 
                        childTask.status === "in_progress" ? "text-blue-400" : 
                        childTask.status === "completed" ? "text-green-400" : 
                        "text-gray-400"
                      }>
                        {childTask.status === "pending" ? "Εκκρεμεί" : 
                         childTask.status === "in_progress" ? "Σε εξέλιξη" : 
                         childTask.status === "completed" ? "Ολοκληρώθηκε" : 
                         "Ακυρώθηκε"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-[#cad2c5]">
                    {childTask.creator?.fullname || childTask.creator?.email || "-"}
                  </td>
                  <td className="px-3 py-2 text-xs text-[#cad2c5]">
                    {childTask.created_at ? new Date(childTask.created_at).toLocaleDateString("el-GR") : "-"}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-[#84a98c]">
                    Δεν υπάρχουν εργασίες σε αυτή την προσφορά
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  // Function to handle task status changes
  const handleTaskStatusChange = useCallback(async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", taskId);
        
      if (error) throw error;
      
      // Update the local state to reflect the change
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId 
            ? { ...task, status: newStatus as Task["status"] } 
            : task
        )
      );
    } catch (error) {
      console.error("Error updating task status:", error);
      toast({
        title: "Σφάλμα",
        description: "Αποτυχία ενημέρωσης κατάστασης εργασίας",
        variant: "destructive",
      });
    }
  }, []);

  // Function to handle task deletion
  const handleTaskDelete = useCallback(async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);
        
      if (error) throw error;
      
      // Remove the deleted task from state
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({
        title: "Σφάλμα",
        description: "Αποτυχία διαγραφής εργασίας",
        variant: "destructive",
      });
    }
  }, []);

  return (
    <div className="container mx-auto py-1 space-y-1">
      <div className="bg-[#2f3e46] rounded-lg p-2">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex w-full bg-[#2f3e46] p-0 h-auto justify-start border-0">
            <TabsTrigger 
              value="offer-tasks" 
              className="px-4 py-2 text-[#cad2c5] font-normal data-[state=active]:bg-transparent data-[state=active]:border-b data-[state=active]:border-b-[#84a98c] data-[state=active]:font-normal hover:bg-[#52796f] hover:text-[#cad2c5]"
            >
              Εργασίες Προσφορών
            </TabsTrigger>
            <TabsTrigger 
              value="general-tasks" 
              className="px-4 py-2 text-[#cad2c5] font-normal data-[state=active]:bg-transparent data-[state=active]:border-b data-[state=active]:border-b-[#84a98c] data-[state=active]:font-normal hover:bg-[#52796f] hover:text-[#cad2c5]"
            >
              Γενικές Εργασίες
            </TabsTrigger>
          </TabsList>
          
          {/* Place the button below tabs, on the left side */}
          <div className="h-[30px]">
            {activeTab === "general-tasks" && (
              <div className="flex justify-start pt-1">
                <Button 
                  className="bg-transparent hover:bg-[#52796f] text-[#84a98c] hover:text-[#cad2c5] flex items-center gap-2 transition-colors font-normal"
                  onClick={() => {
                    setCurrentTaskId(null);
                    setIsDialogOpen(true);
                  }}
                >
                  <Plus className="h-5 w-5 text-white" /> Νέα Εργασία
                </Button>
              </div>
            )}
          </div>

          <div className="mb-2">
            <SearchBar 
              placeholder="Αναζήτηση εργασιών..."
              value={searchTerm}
              onChange={setSearchTerm}
              options={activeTab === "offer-tasks" ? [
                { label: "Πελάτης", value: "company_name" },
                { label: "Περιγραφή", value: "requirements" }
              ] : [
                { label: "Τίτλος", value: "title" },
                { label: "Περιγραφή", value: "description" }
              ]}
              selectedColumn={searchColumn}
              onColumnChange={setSearchColumn}
              className="w-96"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-1 mb-2 mt-1">
            <div className="flex flex-wrap items-center gap-2 ml-auto">
              {/* Status filters */}
              <div 
                onClick={() => setStatusFilter("all")}
                className="relative inline-block min-w-[70px]"
              >
                <span className={`cursor-pointer text-xs px-2 py-1 rounded-full transition-all ring-1 block text-center
                  ${statusFilter === "all" 
                    ? "bg-white/20 text-white font-medium shadow-[0_0_8px_2px_rgba(255,255,255,0.15)] ring-white/30" 
                    : "bg-white/10 text-white hover:bg-white/20 ring-transparent"}`}
                >
                  Όλες
                </span>
              </div>
              
              <div 
                onClick={() => setStatusFilter("pending")}
                className="relative inline-block min-w-[70px]"
              >
                <span className={`cursor-pointer text-xs px-2 py-1 rounded-full transition-all ring-1 block text-center
                  ${statusFilter === "pending" 
                    ? "bg-amber-500/20 text-amber-400 font-medium shadow-[0_0_8px_2px_rgba(245,158,11,0.15)] ring-amber-400/30" 
                    : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 ring-transparent"}`}
                >
                  Εκκρεμεί
                </span>
              </div>
              
              <div 
                onClick={() => setStatusFilter("in_progress")}
                className="relative inline-block min-w-[70px]"
              >
                <span className={`cursor-pointer text-xs px-2 py-1 rounded-full transition-all ring-1 block text-center
                  ${statusFilter === "in_progress" 
                    ? "bg-blue-500/20 text-blue-400 font-medium shadow-[0_0_8px_2px_rgba(59,130,246,0.15)] ring-blue-400/30" 
                    : "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 ring-transparent"}`}
                >
                  Σε εξέλιξη
                </span>
              </div>
              
              <div 
                onClick={() => setStatusFilter("completed")}
                className="relative inline-block min-w-[70px]"
              >
                <span className={`cursor-pointer text-xs px-2 py-1 rounded-full transition-all ring-1 block text-center
                  ${statusFilter === "completed" 
                    ? "bg-green-500/20 text-green-400 font-medium shadow-[0_0_8px_2px_rgba(34,197,94,0.15)] ring-green-400/30" 
                    : "bg-green-500/10 text-green-400 hover:bg-green-500/20 ring-transparent"}`}
                >
                  Ολοκληρώθηκε
                </span>
              </div>
              
              <div 
                onClick={() => setStatusFilter("cancelled")}
                className="relative inline-block min-w-[70px]"
              >
                <span className={`cursor-pointer text-xs px-2 py-1 rounded-full transition-all ring-1 block text-center
                  ${statusFilter === "cancelled" 
                    ? "bg-gray-500/20 text-gray-400 font-medium shadow-[0_0_8px_2px_rgba(156,163,175,0.15)] ring-gray-400/30" 
                    : "bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 ring-transparent"}`}
                >
                  Ακυρώθηκε
                </span>
              </div>
            </div>
          </div>

          <div>
            <TabsContent value="offer-tasks" className="mt-0">
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#84a98c]"></div>
                </div>
              ) : processedOfferTasks.length === 0 ? (
                <div className="text-center py-8 text-[#84a98c]">
                  Δεν βρέθηκαν εργασίες προσφοράς
                </div>
              ) : (
                <DataTableBase
                  columns={offerTasksColumns}
                  data={processedOfferTasks}
                  defaultSortColumn="created_at"
                  defaultSortDirection="desc"
                  searchTerm={searchTerm}
                  searchColumn={searchColumn}
                  onRowClick={handleRowClick}
                  renderRow={renderOfferTaskRow}
                  containerClassName="bg-[#354f52] rounded-lg border border-[#52796f] overflow-hidden"
                  rowClassName="hover:bg-[#354f52]/50 cursor-pointer group border-t border-[#52796f]/30"
                  emptyStateMessage="Δεν βρέθηκαν εργασίες σε προσφορές"
                  loadingStateMessage="Φόρτωση εργασιών..."
                />
              )}
            </TabsContent>

            <TabsContent value="general-tasks" className="mt-0">
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#84a98c]"></div>
                </div>
              ) : (
                <DataTableBase
                  columns={generalTasksColumns}
                  data={filteredTasks}
                  defaultSortColumn="created_at"
                  defaultSortDirection="desc"
                  searchTerm={searchTerm}
                  searchColumn={searchColumn}
                  onRowClick={handleRowClick}
                  containerClassName="bg-[#354f52] rounded-lg border border-[#52796f] overflow-hidden"
                  rowClassName="hover:bg-[#354f52]/50 cursor-pointer group border-t border-[#52796f]/30"
                  emptyStateMessage="Δεν βρέθηκαν γενικές εργασίες"
                  loadingStateMessage="Φόρτωση εργασιών..."
                />
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Task Dialog */}
      <TaskDialog 
        isOpen={isDialogOpen} 
        onClose={() => {
          setIsDialogOpen(false);
          setCurrentTaskId(null);
        }}
        taskId={currentTaskId}
        onTaskCreated={fetchTasks}
        onTaskStatusChange={handleTaskStatusChange}
        onTaskDelete={handleTaskDelete}
      />
    </div>
  );
} 