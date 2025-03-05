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
        role: "",
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
        const updateData: any = {
          fullname: formData.fullname,
          email: formData.email,
          phone: formData.phone,
          department_id: formData.department_id,
        };

        // Only include password if it was changed and not the placeholder
        if (formData.password && formData.password !== "••••••") {
          updateData.password = formData.password;
        }

        // Super User and Admin permissions
        if (currentUserRole === "Admin" || currentUserRole === "Super User") {
          // Only Admin can change username
          if (currentUserRole === "Admin") {
            updateData.username = formData.username;
          }

          // Super User can't edit Admin users and can't make someone Admin
          if (currentUserRole === "Super User") {
            if (user.role !== "Admin") {
              updateData.role =
                formData.role !== "Admin" ? formData.role : user.role;
              updateData.status = formData.status;
            }
          } else if (currentUserRole === "Admin") {
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
          .insert([formData]);

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
        if (currentUserRole === "User" || currentUserRole === "Μόνο ανάγνωση") {
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

  const isAdmin = currentUserRole === "Admin";
  const isSuperUser = currentUserRole === "Super User";
  const canEditRoles = isAdmin || (isSuperUser && user?.role !== "Admin");

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

  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        if (currentUserRole === "User" || currentUserRole === "Μόνο ανάγνωση") {
          window.location.href = window.location.pathname.includes("/settings")
            ? "/dashboard"
            : window.location.pathname;
        } else {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md bg-[#354f52] rounded-lg border border-[#52796f] text-[#cad2c5] z-[9999] shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-[#cad2c5]">
            {user ? "Επεξεργασία" : "Νέος Χρήστης"}
          </DialogTitle>
          <DialogDescription className="text-[#84a98c]">
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
              disabled={user && (isSuperUser || !isAdmin)}
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
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="app-input"
              required
              autoComplete="off"
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
            />
          </div>

          {(isAdmin || isSuperUser) && (
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
              />
            </div>
          )}

          {canEditRoles && (
            <>
              <div className="space-y-2">
                <Label htmlFor="role">Ρόλος</Label>
                <GlobalDropdown
                  options={["Χρήστης", "Διαχειριστής", "Μόνο ανάγνωση", "Διαχειριστής Συστήματος"]}
                  value={
                    formData.role === "user" ? "Χρήστης" :
                    formData.role === "moderator" ? "Διαχειριστής" :
                    formData.role === "readonly" ? "Μόνο ανάγνωση" :
                    formData.role === "admin" ? "Διαχειριστής Συστήματος" : ""
                  }
                  onSelect={(value) => {
                    const role = 
                      value === "Χρήστης" ? "user" :
                      value === "Διαχειριστής" ? "moderator" :
                      value === "Μόνο ανάγνωση" ? "readonly" :
                      value === "Διαχειριστής Συστήματος" ? "admin" : "";
                    setFormData(prev => ({ ...prev, role }));
                  }}
                  placeholder="Επιλέξτε ρόλο"
                />
              </div>

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
            </>
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
      </DialogContent>
    </Dialog>
  );
}
