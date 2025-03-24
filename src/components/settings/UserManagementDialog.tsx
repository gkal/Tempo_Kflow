import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from '@/lib/supabaseClient';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { GlobalDropdown } from "@/components/ui/GlobalDropdown";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserManagementDialogProps {
  open: boolean;
  onClose: () => void;
  user?: any;
  currentUserRole?: string;
  fetchUsers: () => Promise<void>;
}

export default function UserManagementDialog({
  open,
  onClose,
  user,
  currentUserRole,
  fetchUsers,
}: UserManagementDialogProps) {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    fullname: "",
    email: "",
    phone: "",
    department_id: "",
    role: "",
    status: "active",
  });
  const [showUsernameError, setShowUsernameError] = useState(false);
  const [showPasswordError, setShowPasswordError] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || "",
        password: "••••••",
        fullname: user.fullname || "",
        email: user.email || "",
        phone: user.phone || "",
        department_id: user.department_id || "",
        role: user.role || "User",
        status: user.status || "active",
      });
    } else {
      setFormData({
        username: "",
        password: "",
        fullname: "",
        email: "",
        phone: "",
        department_id: "",
        role: "User",
        status: "active",
      });
      setShowUsernameError(false);
      setShowPasswordError(false);
    }
  }, [user]);

  const fetchDepartments = async () => {
    const { data } = await supabase.from("departments").select("id, name");
    setDepartments(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    setError("");

    try {
      if (user) {
        // Update existing user
        let updateData: any = {};
        
        // For regular users and readonly users, only allow password, department, and status updates
        if (isRegularUser || isReadOnly) {
          updateData = {
            department_id: formData.department_id,
            status: formData.status, // Allow status updates
            // Don't update password if it's masked
            ...(formData.password !== "••••••" && { password: formData.password }),
          };
        } else {
          // For Admin and Super User, allow more fields
          updateData = {
            fullname: formData.fullname,
            email: formData.email,
            phone: formData.phone,
            department_id: formData.department_id,
            role: formData.role,
            status: formData.status,
            // Don't update password if it's masked
            ...(formData.password !== "••••••" && { password: formData.password }),
          };
        }

        // Super User and Admin permissions
        if (isAdmin || isSuperUser) {
          // Only Admin can change username
          if (isAdmin) {
            updateData.username = formData.username;
          }

          // Super User can't edit Admin users and can't make someone Admin
          if (isSuperUser) {
            if (user.role !== "Admin" && user.role?.toLowerCase() !== "admin") {
              // Ensure superusers can't set Admin role even if they bypass frontend restrictions
              updateData.role =
                formData.role !== "Admin" && formData.role?.toLowerCase() !== "admin" 
                  ? formData.role 
                  : user.role;
              updateData.status = formData.status;
            }
          } else if (isAdmin) {
            updateData.role = formData.role;
            updateData.status = formData.status;
          }
        }

        const { error: updateError } = await supabase
          .from("users")
          .update(updateData)
          .eq("id", user.id);

        if (updateError) {
          if (
            updateError.code === "23505" &&
            updateError.message.includes("users_username_key")
          ) {
            throw new Error(
              "Το όνομα χρήστη χρησιμοποιείται ήδη. Παρακαλώ επιλέξτε διαφορετικό.",
            );
          }
          throw updateError;
        }
      } else {
        // Create new user
        const { error: createError } = await supabase
          .from("users")
          .insert([{
            username: formData.username,
            password: formData.password,
            fullname: formData.fullname,
            email: formData.email,
            phone: formData.phone,
            department_id: formData.department_id,
            role: formData.role as any,
            status: formData.status,
          }]);

        if (createError) {
          if (
            createError.code === "23505" &&
            createError.message.includes("users_username_key")
          ) {
            throw new Error(
              "Το όνομα χρήστη χρησιμοποιείται ήδη. Παρακαλώ επιλέξτε διαφορετικό.",
            );
          }
          throw createError;
        }
      }

      setSuccess(true);
      await fetchUsers();

      setTimeout(() => {
        setSuccess(false);
        if (isRegularUser || isReadOnly) {
          window.location.href = window.location.pathname.includes("/settings")
            ? "/dashboard"
            : window.location.pathname;
        } else {
          onClose();
        }
      }, 1000);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = currentUserRole === "Admin" || currentUserRole?.toLowerCase() === "admin";
  const isSuperUser = currentUserRole === "Super User" || currentUserRole?.toLowerCase() === "super user";
  const isRegularUser = currentUserRole === "User" || currentUserRole?.toLowerCase() === "user";
  const isReadOnly = currentUserRole === "Μόνο ανάγνωση" || currentUserRole?.toLowerCase() === "readonly";
  const canEditRoles = isAdmin || (isSuperUser && user?.role !== "Admin" && user?.role?.toLowerCase() !== "admin");

  // For the Dialog's onOpenChange handler
  const isRegularOrReadOnlyUser = isRegularUser || isReadOnly;

  const isFormValid = () => {
    if (!user) {
      // New user mode
      return (
        formData.username.length >= 2 &&
        formData.password.length >= 6 &&
        formData.department_id &&
        formData.role
      );
    }
    return true;
  };

  // Define what fields can be edited based on user role
  const canEditUsername = isAdmin;
  const canEditFullname = isAdmin || isSuperUser;
  const canEditEmail = isAdmin || isSuperUser;
  const canEditPhone = isAdmin || isSuperUser;
  const canEditDepartment = true; // All users can edit department
  const canEditRole = canEditRoles;
  const canEditStatus = true; // All users can edit status

  // Add effect to handle open state changes
  useEffect(() => {
    // Reset success state when dialog opens
    if (open) {
      setSuccess(false);
      setError("");
    }
    
    // If the dialog is closing and the user is a regular user or readonly
    if (!open && isRegularOrReadOnlyUser) {
      window.location.href = window.location.pathname.includes("/settings")
        ? "/dashboard"
        : window.location.pathname;
    }
  }, [open, isRegularOrReadOnlyUser]);

  // If the dialog is not open, don't render anything
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-sm flex items-center justify-center">
      <div className="max-w-md bg-[#354f52] rounded-lg border border-[#52796f] text-[#cad2c5] z-[9999] shadow-lg p-6 relative">
        <button 
          className="absolute right-4 top-4 text-[#84a98c] hover:text-[#cad2c5]"
          onClick={() => {
            setSuccess(false);
            onClose();
          }}
        >
          ✕
        </button>
        
        <div className="flex flex-col space-y-1.5 text-center sm:text-left mb-4">
          <h2 className="text-lg font-semibold leading-none tracking-tight text-[#cad2c5]">
            {user ? "Επεξεργασία" : "Νέος Χρήστης"}
          </h2>
          <p className="text-sm text-[#84a98c]">
            {user ? (
              <>
                <span className="font-bold text-lg">{user.username}</span>,{" "}
                {user.fullname}
              </>
            ) : (
              "Συμπληρώστε τα στοιχεία του νέου χρήστη"
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div className="space-y-2">
            <Label htmlFor="username">Όνομα Χρήστη</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              disabled={user && !canEditUsername}
              className="app-input"
              required
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              {user
                ? "Νέος Κωδικός (αφήστε κενό για να μην αλλάξει)"
                : "Κωδικός"}
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="app-input"
              required={!user}
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullname">Ονοματεπώνυμο</Label>
            <Input
              id="fullname"
              value={formData.fullname}
              onChange={(e) =>
                setFormData({ ...formData, fullname: e.target.value })
              }
              className="app-input"
              required
              autoComplete="off"
              disabled={!canEditFullname}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="text"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="app-input"
              autoComplete="off"
              disabled={!canEditEmail}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Τηλέφωνο</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="app-input"
              autoComplete="off"
              disabled={!canEditPhone}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Τμήμα</Label>
            <GlobalDropdown
              options={departments.map(dept => dept.name)}
              value={departments.find(dept => dept.id === formData.department_id)?.name || ""}
              onSelect={(value) => {
                const dept = departments.find(d => d.name === value);
                setFormData(prev => ({ ...prev, department_id: dept?.id || "" }));
              }}
              placeholder="Επιλέξτε τμήμα"
              disabled={!canEditDepartment}
            />
          </div>

          {canEditRole && (
            <div className="space-y-2">
              <Label htmlFor="role">Ρόλος</Label>
              <GlobalDropdown
                options={isSuperUser ? ["Super User", "User", "Μόνο ανάγνωση"] : ["Admin", "Super User", "User", "Μόνο ανάγνωση"]}
                value={formData.role}
                onSelect={(value) => {
                  setFormData(prev => ({ ...prev, role: value }));
                }}
                placeholder="Select role"
              />
            </div>
          )}

          {canEditStatus && (
            <div className="space-y-2">
              <Label htmlFor="status">Κατάσταση</Label>
              <GlobalDropdown
                options={["Ενεργός", "Ανενεργός"]}
                value={formData.status === "active" ? "Ενεργός" : formData.status === "inactive" ? "Ανενεργός" : ""}
                onSelect={(value) => {
                  const status = value === "Ενεργός" ? "active" : "inactive";
                  setFormData(prev => ({ ...prev, status }));
                }}
                placeholder="Επιλέξτε κατάσταση"
              />
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 text-red-400 p-3 rounded-md flex items-center space-x-2">
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="bg-green-500/10 text-green-400 p-3 rounded-md flex items-center space-x-2">
              <span>Η ενημέρωση ολοκληρώθηκε με επιτυχία!</span>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              type="submit"
              disabled={loading || !isFormValid()}
              className="bg-[#52796f] hover:bg-[#52796f]/90 text-[#cad2c5]"
            >
              {loading
                ? "Παρακαλώ περιμένετε..."
                : user
                  ? "Αποθήκευση"
                  : "Δημιουργία"}
            </Button>
          </div>
        </form>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent aria-describedby="delete-user-description">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User</AlertDialogTitle>
              <AlertDialogDescription id="delete-user-description">
                Are you sure you want to delete this user? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
