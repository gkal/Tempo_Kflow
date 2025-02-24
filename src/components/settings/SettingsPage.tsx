import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

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
    } finally {
      setShowDeleteDialog(false);
      setUserToDelete(null);
    }
  };

  // For regular users and readonly, show only their own data
  if (user?.role === "User" || user?.role === "Μόνο ανάγνωση") {
    const currentUser = users.find((u) => u.id === user.id);
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-[#cad2c5] mb-4">
          Διαχείριση Χρηστών
        </h1>
        <DataTableBase
          columns={[
            { header: "Όνομα Χρήστη", accessor: "username" },
            { header: "Ονοματεπώνυμο", accessor: "fullname" },
            { header: "Email", accessor: "email" },
            { header: "Τμήμα", accessor: "department" },
            { header: "Ρόλος", accessor: "role" },
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
            },
          ]}
          data={currentUser ? [currentUser] : []}
          defaultSortColumn="fullname"
          containerClassName="bg-[#354f52] rounded-lg border border-[#52796f] overflow-hidden"
          rowClassName="hover:bg-[#354f52]/50"
          showSearch={false}
        />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#cad2c5] mb-4">
          Διαχείριση Χρηστών
        </h1>
        {user?.role === "Admin" && (
          <Button
            onClick={() => setShowUserDialog(true)}
            className="bg-[#52796f] hover:bg-[#52796f]/90 text-[#cad2c5] mb-6"
          >
            <Plus className="h-4 w-4 mr-2" />
            Νέος Χρήστης
          </Button>
        )}
      </div>

      <DataTableBase
        columns={[
          { header: "Όνομα Χρήστη", accessor: "username" },
          { header: "Ονοματεπώνυμο", accessor: "fullname" },
          { header: "Email", accessor: "email" },
          { header: "Τμήμα", accessor: "department" },
          { header: "Ρόλος", accessor: "role" },
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
          },
          user?.role === "Admin" && {
            header: "",
            accessor: "actions",
            sortable: false,
            cell: (_, row) => (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
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
              </div>
            ),
          },
        ].filter(Boolean)}
        data={users}
        defaultSortColumn="fullname"
        searchPlaceholder="Αναζήτηση χρήστη..."
        onRowClick={(row) => {
          if (user?.role === "Admin") {
            setSelectedUser(row);
            setShowUserDialog(true);
          }
        }}
        containerClassName="bg-[#354f52] rounded-lg border border-[#52796f] overflow-hidden"
        rowClassName="hover:bg-[#354f52]/50"
      />

      {showUserDialog && (
        <UserManagementDialog
          open={showUserDialog}
          onClose={() => {
            setShowUserDialog(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          currentUserRole={user?.role}
        />
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5]">
          <AlertDialogHeader>
            <AlertDialogTitle>Απενεργοποίηση Χρήστη</AlertDialogTitle>
            <AlertDialogDescription className="text-[#84a98c]">
              Είστε σίγουροι ότι θέλετε να απενεργοποιήσετε τον χρήστη{" "}
              {userToDelete?.fullname};
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
