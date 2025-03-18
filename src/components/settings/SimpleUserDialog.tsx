import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { CloseButton } from "@/components/ui/close-button";
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
import { useFormRegistration } from '@/lib/FormContext';

interface SimpleUserDialogProps {
  open: boolean;
  onClose: () => void;
  user?: any;
  currentUserRole?: string;
  fetchUsers: () => Promise<void>;
}

export default function SimpleUserDialog({
  open,
  onClose,
  user,
  currentUserRole,
  fetchUsers,
}: SimpleUserDialogProps) {
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

  // Reset success and error states when dialog opens
  useEffect(() => {
    if (open) {
      setSuccess(false);
      setError("");
    }
  }, [open]);

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
        if (currentUserRole === "User" || currentUserRole?.toLowerCase() === "user" || 
            currentUserRole === "Μόνο ανάγνωση" || currentUserRole?.toLowerCase() === "readonly") {
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
          
          // Ensure superusers can't set Admin role even if they bypass frontend restrictions
          if (currentUserRole === "Super User" || currentUserRole?.toLowerCase() === "super user") {
            // If trying to set Admin role, revert to original role or set to Super User for new users
            if (formData.role === "Admin" || formData.role?.toLowerCase() === "admin") {
              updateData.role = user ? user.role : "Super User";
            }
          }
        }

        // Admin permissions
        if (currentUserRole === "Admin" || currentUserRole?.toLowerCase() === "admin") {
          updateData.username = formData.username;
        }

        const { error: updateError } = await supabase
          .from("users")
          .update(updateData)
          .eq("id", user.id);

        if (updateError) {
          throw updateError;
        }
      } else {
        // Create new user
        // Ensure superusers can't set Admin role even if they bypass frontend restrictions
        if (currentUserRole === "Super User" || currentUserRole?.toLowerCase() === "super user") {
          if (formData.role === "Admin" || formData.role?.toLowerCase() === "admin") {
            formData.role = "Super User";
          }
        }
        
        const { error: createError } = await supabase
          .from("users")
          .insert([{
            username: formData.username,
            password: formData.password,
            fullname: formData.fullname,
            email: formData.email,
            phone: formData.phone,
            department_id: formData.department_id,
            role: formData.role,
            status: formData.status,
          }]);

        if (createError) {
          throw createError;
        }
      }

      setSuccess(false); // Don't show success message
      await fetchUsers();

      // Close dialog immediately without showing success message
      onClose();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Define what fields can be edited based on user role
  const isAdmin = currentUserRole === "Admin" || currentUserRole?.toLowerCase() === "admin";
  const isSuperUser = currentUserRole === "Super User" || currentUserRole?.toLowerCase() === "super user";
  const isRegularUser = currentUserRole === "User" || currentUserRole?.toLowerCase() === "user";
  const isReadOnly = currentUserRole === "Μόνο ανάγνωση" || currentUserRole?.toLowerCase() === "readonly";
  
  const canEditUsername = isAdmin;
  const canEditFullname = isAdmin || isSuperUser;
  const canEditEmail = isAdmin || isSuperUser;
  const canEditPhone = isAdmin || isSuperUser;
  const canEditDepartment = true; // All users can edit department
  const canEditRole = isAdmin || (isSuperUser && user?.role !== "Admin" && user?.role?.toLowerCase() !== "admin");
  const canEditStatus = true; // All users can edit status

  // Register this form when it's open
  useFormRegistration(
    user?.id 
      ? `Επεξεργασία Χρήστη: ${user?.fullname || user?.username}` 
      : "Νέος Χρήστης", 
    open
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setSuccess(false);
          onClose();
        }
      }}
    >
      <DialogContent 
        className="max-w-md bg-[#354f52] rounded-lg border border-[#52796f] text-[#cad2c5] z-[9999] shadow-lg"
        aria-describedby="user-dialog-description"
      >
        <DialogHeader>
          <DialogTitle className="text-[#cad2c5]">
            {user ? "Επεξεργασία" : "Νέος Χρήστης"}
          </DialogTitle>
          <DialogDescription id="user-dialog-description" className="text-[#84a98c]">
            {user ? (
              <>
                <span className="font-bold text-lg">{user.username}</span>,{" "}
                {user.fullname}
              </>
            ) : (
              "Συμπληρώστε τα στοιχεία του νέου χρήστη"
            )}
          </DialogDescription>
        </DialogHeader>

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

          <div className="flex justify-end space-x-2">
            <Button
              type="submit"
              disabled={loading}
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
      </DialogContent>
    </Dialog>
  );
} 