import { useState, useEffect } from "react";
import { SearchBar } from "@/components/ui/search-bar";
import { Button } from "@/components/ui/button";
import { Plus, Eye, EyeOff, Settings as SettingsIcon, File } from "lucide-react";
import { DataTableBase } from "@/components/ui/data-table-base";
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from "@/lib/AuthContext";
import { checkPermission } from "@/lib/permissions";
import SimpleUserDialog from "./SimpleUserDialog";
import './settings-cursor-fix.css'; // Import the CSS fix
import { toast } from "@/components/ui/use-toast";
import { AppTabs, AppTabsList, AppTabsTrigger, AppTabsContent } from "@/components/ui/app-tabs";
import { DocumentSettingsTab } from "./DocumentSettingsTab";

export default function SettingsPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchColumn, setSearchColumn] = useState("fullname");
  const [activeTab, setActiveTab] = useState("users");

  const isAdmin = user?.role?.toLowerCase() === "admin";
  const isSuperUser = user?.role === "Super User" || user?.role?.toLowerCase() === "super user";

  // Set up real-time subscription for users with Supabase's built-in capabilities
  useEffect(() => {
    const subscription = supabase
      .channel('users-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users'
        },
        () => {
          // Silently update the user list without any notifications
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Add a flag to prevent notifications
  const preventNotifications = true;

  // Define the base columns for the table
  const columns = [
    {
      header: "Όνομα χρήστη",
      accessor: "username",
      sortable: true,
    },
    {
      header: "Πλήρες όνομα",
      accessor: "fullname",
      sortable: true,
    },
    {
      header: "Email",
      accessor: "email",
      sortable: true,
    },
    {
      header: "Τηλέφωνο",
      accessor: "phone",
      sortable: true,
    },
    {
      header: "Ρόλος",
      accessor: "role",
      sortable: true,
    },
    {
      header: "Τμήμα",
      accessor: "department",
      sortable: true,
    },
  ];

  // Add a new function to directly toggle user status
  const toggleUserStatus = async (userRow) => {
    if (!userRow || !checkPermission(user?.role || "", "users", "delete")) {
      return;
    }

    try {
      // Toggle the status between active and inactive
      const newStatus = userRow.status === "active" ? "inactive" : "active";
      
      const { error } = await supabase
        .from("users")
        .update({ status: newStatus })
        .eq("id", userRow.id);

      if (error) throw error;
      await fetchUsers();
    } catch (error) {
      console.error("Error toggling user status:", error);
    }
  };

  // Define the full columns array with actions for all views
  const columnsWithActions = [
    ...columns,
    // Always include the actions column but conditionally render its content
    {
      header: "Κατάσταση",
      accessor: "status",
      sortable: true,
      cell: (value, row) => (
        <div className="flex justify-center" title={value === "active" ? "Ενεργός" : "Ανενεργός"}>
          {isAdmin ? (
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 hover:bg-[#354f52] ${value === "active" ? "text-green-400" : "text-red-400"}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleUserStatus(row); // Directly toggle user status without confirmation
              }}
            >
              {value === "active" ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <div className={`h-8 w-8 flex items-center justify-center ${value === "active" ? "text-green-400" : "text-red-400"}`}>
              {value === "active" ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </div>
          )}
        </div>
      ),
    },
  ];

  const handleRowClick = (row) => {
    setSelectedUser(row);
    setShowUserDialog(true);
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select(
          `
          *,
          departments:department_id (name)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Transform the data to flatten the departments object
      const transformedData =
        data?.map((user) => ({
          ...user,
          department: user.departments?.name || "N/A",
        })) || [];

      setUsers(transformedData);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error loading users",
        description: "There was a problem fetching the user data. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user]);

  // For regular users, show only their own data
  if (!isAdmin && !isSuperUser) {
    const currentUser = users.find((u) => u.id === user.id);
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold text-[#cad2c5] mb-2">
          Τα στοιχεία μου
        </h1>
        {currentUser && (
          <div className="mt-4">
            <DataTableBase
              columns={columnsWithActions}
              data={[currentUser]}
              onRowClick={handleRowClick}
              containerClassName="bg-[#354f52] rounded-lg border border-[#52796f] overflow-hidden"
              rowClassName="hover:bg-[#354f52]/50"
              isLoading={loading}
            />
          </div>
        )}

        <SimpleUserDialog
          open={showUserDialog}
          onClose={() => {
            setShowUserDialog(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          currentUserRole={user?.role?.toLowerCase() === "user" ? "User" : 
                          user?.role?.toLowerCase() === "readonly" ? "Μόνο ανάγνωση" : 
                          user?.role}
          fetchUsers={fetchUsers}
        />
      </div>
    );
  }

  // Admin view with tabs
  return (
    <>
      <style>
        {`
          .settings-page-container table tr {
            cursor: pointer !important;
          }
          
          .settings-page-container table td {
            cursor: pointer !important;
          }
          
          .settings-page-container table th {
            cursor: pointer !important;
          }
          
          .settings-page-container table td * {
            cursor: pointer !important;
          }
          
          .settings-page-container table td span,
          .settings-page-container table td div {
            cursor: pointer !important;
          }
        `}
      </style>
      
      <div className="p-4 settings-page-container">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#cad2c5] mb-4">
            Γενικές Ρυθμίσεις
          </h1>
          
          <AppTabs defaultValue="users" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <AppTabsList className="mb-6">
              <AppTabsTrigger value="users" className="flex items-center gap-2">
                <SettingsIcon className="h-4 w-4" />
                Ρυθμίσεις Χρηστών
              </AppTabsTrigger>
              <AppTabsTrigger value="documents" className="flex items-center gap-2">
                <File className="h-4 w-4" />
                Ρυθμίσεις Εγγράφων
              </AppTabsTrigger>
            </AppTabsList>
            
            <AppTabsContent value="users" className="mt-0">
              <div className="flex justify-between items-center mb-4">
                {isAdmin && (
                  <Button
                    onClick={() => {
                      setSelectedUser(null);
                      setShowUserDialog(true);
                    }}
                    className="bg-transparent hover:bg-[#52796f] text-[#84a98c] hover:text-[#cad2c5] flex items-center gap-2 transition-colors font-normal"
                  >
                    <Plus className="h-4 w-4 text-white" />
                    Νέος Χρήστης
                  </Button>
                )}
                
                <SearchBar
                  onChange={setSearchTerm}
                  value={searchTerm}
                  options={columns.map(col => ({ value: col.accessor, label: col.header }))}
                  selectedColumn={searchColumn}
                  onColumnChange={setSearchColumn}
                />
              </div>
              
              <div className="settings-page-table">
                <DataTableBase
                  columns={columnsWithActions}
                  data={users}
                  defaultSortColumn="fullname"
                  searchTerm={searchTerm}
                  searchColumn={searchColumn}
                  onRowClick={handleRowClick}
                  containerClassName="bg-[#354f52] rounded-lg border border-[#52796f] overflow-hidden"
                  rowClassName={`hover:bg-[#354f52]/50 ${isSuperUser ? '[&[data-role="Admin"]]:cursor-not-allowed [&[data-role="Admin"]]:opacity-50' : ""}`}
                  isLoading={loading}
                />
              </div>
            </AppTabsContent>
            
            <AppTabsContent value="documents" className="mt-0">
              <DocumentSettingsTab />
            </AppTabsContent>
          </AppTabs>
        </div>

        <SimpleUserDialog
          open={showUserDialog}
          onClose={() => {
            setShowUserDialog(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          currentUserRole={user?.role?.toLowerCase() === "user" ? "User" : 
                          user?.role?.toLowerCase() === "readonly" ? "Μόνο ανάγνωση" : 
                          user?.role}
          fetchUsers={fetchUsers}
        />
      </div>
    </>
  );
}
