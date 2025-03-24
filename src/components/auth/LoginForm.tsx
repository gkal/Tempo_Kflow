import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import {
  checkIfFirstUser,
  createFirstAdmin,
  loginUser,
  getRememberedUser,
  AuthError
} from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import type { User } from "@/types/auth";
import type { Database } from "@/types/supabase";
import { useLoading } from '@/lib/LoadingContext';

// Type for the login form data
interface LoginFormData {
  username: string;
  password: string;
  rememberMe: boolean;
  fullname: string;
  email: string;
  phone: string;
  department: string;
  role: Database["public"]["Enums"]["user_role"];
  status: "active" | "inactive";
}

// Initial form data values
const initialFormData: LoginFormData = {
  username: "",
  password: "",
  rememberMe: false,
  fullname: "",
  email: "",
  phone: "",
  department: "Administration",
  role: "Admin",
  status: "active",
};

export default function LoginForm() {
  const navigate = useNavigate();
  const { checkAuth, error: authError } = useAuth();
  const { showLoading, hideLoading } = useLoading();
  const [isLoading, setIsLoading] = useState(false);
  const [isFirstUser, setIsFirstUser] = useState(false);
  const [formData, setFormData] = useState<LoginFormData>(initialFormData);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Load remembered user and check if first user on mount
  useEffect(() => {
    const remembered = getRememberedUser();
    if (remembered) {
      setFormData((prev) => ({
        ...prev,
        username: remembered.username || "",
        password: remembered.password || "",
        rememberMe: true,
      }));
    }

    const checkFirst = async () => {
      try {
        const isFirst = await checkIfFirstUser();
        setIsFirstUser(isFirst);
      } catch (error) {
        const errorMessage = error instanceof AuthError 
          ? error.message 
          : "Error checking first user";
        console.error(errorMessage, error);
        setError(errorMessage);
      }
    };
    
    checkFirst();
  }, []);

  // Update error from auth context
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const handleLogin = async (
    username: string,
    password: string,
    rememberMe: boolean,
  ) => {
    setError("");
    setSuccess(false);
    setIsLoading(true);

    try {
      const userData = await loginUser(username, password, rememberMe);
      setSuccess(true);
      await checkAuth();
      if (userData) {
        navigate("/dashboard");
      }
    } catch (error) {
      const errorMessage = error instanceof AuthError
        ? error.message
        : (error instanceof Error ? error.message : "Λάθος στοιχεία σύνδεσης");
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    showLoading();
    setError("");
    setSuccess(false);

    if (!formData.username) {
      setError("Παρακαλώ εισάγετε το όνομα χρήστη");
      hideLoading();
      return;
    }

    if (formData.password.length < 6) {
      setError("Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες");
      hideLoading();
      return;
    }

    setIsLoading(true);
    try {
      if (isFirstUser) {
        if (!formData.fullname || !formData.email || !formData.phone) {
          setError("Παρακαλώ συμπληρώστε όλα τα πεδία");
          setIsLoading(false);
          hideLoading();
          return;
        }
        await createFirstAdmin(formData);
        await checkAuth();
        setSuccess(true);
        setTimeout(() => {
          navigate("/dashboard");
        }, 1500);
      } else {
        await handleLogin(
          formData.username,
          formData.password,
          formData.rememberMe,
        );
      }
    } catch (error) {
      const errorMessage = error instanceof AuthError
        ? error.message
        : (error instanceof Error ? error.message : "Λάθος στοιχεία σύνδεσης");
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      hideLoading();
    }
  };

  // Field change handler with type safety
  const handleFieldChange = <K extends keyof LoginFormData>(
    field: K, 
    value: LoginFormData[K]
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#2f3e46] p-4">
      <style>
        {`
          .login-input::placeholder {
            color: #5d7a63 !important;
            opacity: 1 !important;
          }
        `}
      </style>
      <div
        className="w-full max-w-md p-8 rounded-xl space-y-6"
        style={{
          background: "rgba(53, 79, 82, 0.7)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(132, 169, 140, 0.3)",
        }}
      >
        <div className="text-center space-y-2">
          <img
            src="https://kronoseco.gr/favicon.ico"
            alt="K-Flow Logo"
            className="h-16 w-16 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-[#cad2c5]">K-Flow</h1>
          <p className="text-[#84a98c]">
            {isFirstUser ? "Δημιουργία Διαχειριστή" : "Σύστημα Διαχείρισης"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Όνομα χρήστη"
              value={formData.username}
              onChange={(e) => handleFieldChange("username", e.target.value)}
              className="login-input"
              required
              autoComplete="off"
              aria-label="Username field"
            />
          </div>
          {isFirstUser && (
            <>
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Ονοματεπώνυμο"
                  value={formData.fullname}
                  onChange={(e) => handleFieldChange("fullname", e.target.value)}
                  className="login-input"
                  required
                  autoComplete="off"
                  aria-label="Full name field"
                />
              </div>
              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => handleFieldChange("email", e.target.value)}
                  className="login-input"
                  required
                  autoComplete="off"
                  aria-label="Email field"
                />
              </div>
              <div className="space-y-2">
                <Input
                  type="tel"
                  placeholder="Τηλέφωνο"
                  value={formData.phone}
                  onChange={(e) => handleFieldChange("phone", e.target.value)}
                  className="login-input"
                  autoComplete="off"
                  aria-label="Phone field"
                />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Κωδικός"
              value={formData.password}
              onChange={(e) => handleFieldChange("password", e.target.value)}
              className="login-input"
              required
              autoComplete="new-password"
              aria-label="Password field"
            />
          </div>

          <div className="flex items-center space-x-2">
            <div className="h-5 w-5 rounded-md overflow-hidden bg-[#354f52] border border-[#52796f]">
              <Checkbox
                id="rememberMe"
                checked={formData.rememberMe}
                onCheckedChange={(checked) => 
                  handleFieldChange("rememberMe", checked as boolean)
                }
                className="h-full w-full bg-[#354f52] border-0 rounded-none text-[#cad2c5] data-[state=checked]:bg-[#52796f]"
                style={{ backgroundColor: '#354f52' }}
                aria-label="Remember me checkbox"
              />
            </div>
            <label
              htmlFor="rememberMe"
              className="text-sm font-medium text-[#cad2c5] cursor-pointer"
            >
              Να με θυμάσαι
            </label>
          </div>

          {(error || success) && (
            <div
              className={`flex items-center space-x-2 ${success ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"} text-sm p-3 rounded-md`}
              role={success ? "status" : "alert"}
            >
              {success ? (
                <>
                  <CheckCircle className="h-4 w-4" aria-hidden="true" />
                  <p>
                    Επιτυχής{" "}
                    {isFirstUser ? "δημιουργία λογαριασμού" : "σύνδεση"}!
                  </p>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  <p>{error}</p>
                </>
              )}
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-[#52796f] hover:bg-[#84a98c] text-[#cad2c5] transition-all duration-300"
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span className="sr-only">Loading...</span>
              </div>
            ) : isFirstUser ? (
              "Δημιουργία Διαχειριστή"
            ) : (
              "Σύνδεση"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
