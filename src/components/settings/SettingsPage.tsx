import { useState, useEffect } from "react";
import { SearchBar } from "@/components/ui/search-bar";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { DataTableBase } from "@/components/ui/data-table-base";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { checkPermission } from "@/lib/permissions";
import UserManagementDialog from "./UserManagementDialog";
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
  const isSuperUser = user?.role?.toLowerCase() === "moderator";

  // Define the full columns array for the admin view
  const columns = [
    { header: "Όνομα Χρήστη", accessor: "username" },
    { header: "Ονοματεπώνυμο", accessor: "fullname" },
    { header: "Email", accessor: "email" },
    { header: "Τμήμα", accessor: "department" },
    { header: "Ρόλος", accessor: "role" },
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
    },
    {
      header: "Κατάσταση",
      accessor: "status",
      cell: (value) => (
        <span
          className={`px-2 py-1 rounded-full text-xs ${value === "active" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
        >
          {value === "active" ? "Ενεργός" : "Ανενεργός"}
        </span>
      ),
    }
  ];

  const handleRowClick = (row) => {
    // Super users can't edit admin users
    if (isSuperUser && row.role === "Admin") return;

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

  const handleDeleteUser = async () => {
    if (
      !userToDelete ||
      !checkPermission(user?.role || "", "users", "delete")
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("users")
        .update({ status: "inactive" })
        .eq("id", userToDelete.id);

      if (error) throw error;
      await fetchUsers();
    } catch (error) {
      console.error("Error deactivating user:", error);
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
              columns={columns}
              data={[currentUser]}
              onRowClick={handleRowClick}
              containerClassName="bg-[#354f52] rounded-lg border border-[#52796f] overflow-hidden"
              rowClassName="hover:bg-[#354f52]/50"
            />
          </div>
        )}
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
        <SearchBar
          onChange={setSearchTerm}
          value={searchTerm}
          options={columns.map(col => ({ value: col.accessor, label: col.header }))}
          selectedColumn={searchColumn}
          onColumnChange={setSearchColumn}
        />
      </div>

      <DataTableBase
        columns={[
          ...columns,
          isAdmin && {
            header: "",
            accessor: "actions",
            sortable: false,
            cell: (_, row) => (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                {row.status === "active" ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-[#354f52] text-red-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUserToDelete(row);
                      setShowDeleteDialog(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="h-8 w-8"></div>
                )}
              </div>
            ),
          },
        ].filter(Boolean)}
        data={users}
        defaultSortColumn="fullname"
        searchTerm={searchTerm}
        searchColumn={searchColumn}
        onRowClick={handleRowClick}
        containerClassName="bg-[#354f52] rounded-lg border border-[#52796f] overflow-hidden"
        rowClassName={`hover:bg-[#354f52]/50 ${isSuperUser ? 'cursor-pointer [&[data-role="Admin"]]:cursor-not-allowed [&[data-role="Admin"]]:opacity-50' : ""}`}
      />

      <UserManagementDialog
        open={showUserDialog}
        onClose={() => {
          setShowUserDialog(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        currentUserRole={user?.role}
        fetchUsers={fetchUsers}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5]">
          <AlertDialogHeader>
            <AlertDialogTitle>Απενεργοποίηση Χρήστη</AlertDialogTitle>
            <AlertDialogDescription className="text-[#84a98c]">
              Είστε σίγουροι ότι θέλετε να απενεργοποιήσετε τον χρήστη{" "}
              {userToDelete?.fullname}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#354f52] text-[#cad2c5] hover:bg-[#354f52]/90">
              Άκυρο
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleDeleteUser}
            >
              Απενεργοποίηση
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
