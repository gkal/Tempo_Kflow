import { useState, useEffect } from "react";
import { SearchBar } from "@/components/ui/search-bar";
import { Button } from "@/components/ui/button";
import { Plus, Eye, EyeOff } from "lucide-react";
import { DataTableBase } from "@/components/ui/data-table-base";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { checkPermission } from "@/lib/permissions";
import SimpleUserDialog from "./SimpleUserDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function SettingsPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchColumn, setSearchColumn] = useState("fullname");

  const isAdmin = user?.role?.toLowerCase() === "admin";
  const isSuperUser = user?.role === "Super User" || user?.role?.toLowerCase() === "super user";

  // Define the full columns array for the admin view
  const columns = [
    { header: "Όνομα Χρήστη", accessor: "username" },
    { header: "Ονοματεπώνυμο", accessor: "fullname" },
    { header: "Email", accessor: "email" },
    { header: "Τμήμα", accessor: "department" },
    { 
      header: "Ρόλος", 
      accessor: "role",
      cell: (value) => {
        // Map 'readonly' to 'Μόνο ανάγνωση'
        return value?.toLowerCase() === 'readonly' ? 'Μόνο ανάγνωση' : value;
      }
    },
    {
      header: "Ημ/νία Δημιουργίας",
      accessor: "created_at",
      cell: (value) =>
        value
          ? new Date(value).toLocaleDateString("el-GR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }) +
            " " +
            new Date(value).toLocaleTimeString("el-GR", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          : "-",
    },
    {
      header: "Τελευταία Σύνδεση",
      accessor: "last_login_at",
      cell: (value) =>
        value
          ? new Date(value).toLocaleDateString("el-GR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }) +
            " " +
            new Date(value).toLocaleTimeString("el-GR", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          : "-",
    }
  ];

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
                setUserToDelete(row);
                setShowDeleteDialog(true);
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
    // Super users can't edit admin users
    if (isSuperUser && (row.role === "Admin" || row.role?.toLowerCase() === "admin")) {
      return;
    }
    
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
      // TODO: Add proper error handling/notification here
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user]);

  const handleToggleUserStatus = async () => {
    if (
      !userToDelete ||
      !checkPermission(user?.role || "", "users", "delete")
    ) {
      return;
    }

    try {
      // Toggle the status between active and inactive
      const newStatus = userToDelete.status === "active" ? "inactive" : "active";
      
      const { error } = await supabase
        .from("users")
        .update({ status: newStatus })
        .eq("id", userToDelete.id);

      if (error) throw error;
      await fetchUsers();
    } catch (error) {
      console.error("Error toggling user status:", error);
      // TODO: Add proper error handling/notification here
    } finally {
      setShowDeleteDialog(false);
      setUserToDelete(null);
    }
  };

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
          currentUserRole={user?.role === "user" ? "User" : user?.role === "readonly" ? "Μόνο ανάγνωση" : user?.role}
          fetchUsers={fetchUsers}
        />
      </div>
    );
  }

  // Admin view
  return (
    <div className="p-4">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-[#cad2c5] mb-2">
          Διαχείριση Χρηστών
        </h1>
        {isAdmin && (
          <Button
            onClick={() => {
              setSelectedUser(null);
              setShowUserDialog(true);
            }}
            className="bg-[#52796f] hover:bg-[#52796f]/90 text-[#cad2c5] mb-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            Νέος Χρήστης
          </Button>
        )}
      </div>

      <div className="flex justify-between mb-4">
        <div className="w-1/4">
          {/* Empty div to maintain layout */}
        </div>
        
        <div className="flex-1 flex justify-center">
          <SearchBar
            onChange={setSearchTerm}
            value={searchTerm}
            options={columns.map(col => ({ value: col.accessor, label: col.header }))}
            selectedColumn={searchColumn}
            onColumnChange={setSearchColumn}
          />
        </div>
        
        <div className="w-1/4">
          {/* Empty div to maintain layout */}
        </div>
      </div>

      <DataTableBase
        columns={columnsWithActions}
        data={users}
        defaultSortColumn="fullname"
        searchTerm={searchTerm}
        searchColumn={searchColumn}
        onRowClick={handleRowClick}
        containerClassName="bg-[#354f52] rounded-lg border border-[#52796f] overflow-hidden"
        rowClassName={`hover:bg-[#354f52]/50 ${isSuperUser ? 'cursor-pointer [&[data-role="Admin"]]:cursor-not-allowed [&[data-role="Admin"]]:opacity-50' : ""}`}
        isLoading={loading}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent 
          className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5]"
          aria-describedby="toggle-user-status-description"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>
              {userToDelete?.status === "active" ? "Απενεργοποίηση Χρήστη" : "Ενεργοποίηση Χρήστη"}
            </AlertDialogTitle>
            <AlertDialogDescription id="toggle-user-status-description" className="text-[#84a98c]">
              {userToDelete?.status === "active" 
                ? `Είστε σίγουροι ότι θέλετε να απενεργοποιήσετε τον χρήστη ${userToDelete?.fullname}?`
                : `Είστε σίγουροι ότι θέλετε να ενεργοποιήσετε τον χρήστη ${userToDelete?.fullname}?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#354f52] text-[#cad2c5] hover:bg-[#354f52]/90">
              Άκυρο
            </AlertDialogCancel>
            <AlertDialogAction
              className={`text-white ${userToDelete?.status === "active" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}
              onClick={handleToggleUserStatus}
            >
              {userToDelete?.status === "active" ? "Απενεργοποίηση" : "Ενεργοποίηση"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SimpleUserDialog
        open={showUserDialog}
        onClose={() => {
          setShowUserDialog(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        currentUserRole={user?.role === "user" ? "User" : user?.role === "readonly" ? "Μόνο ανάγνωση" : user?.role}
        fetchUsers={fetchUsers}
      />
    </div>
  );
}
