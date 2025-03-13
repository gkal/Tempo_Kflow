import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import {
  checkIfFirstUser,
  createFirstAdmin,
  loginUser,
  getRememberedUser,
} from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, CheckCircle } from "lucide-react";
import type { User } from "@/types/auth";

export default function LoginForm() {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isFirstUser, setIsFirstUser] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    rememberMe: false,
    fullname: "",
    email: "",
    phone: "",
    department: "Administration",
    role: "Admin" as const,
    status: "active" as const,
  });

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
        console.error("Error checking first user:", error);
      }
    };
    checkFirst();
  }, []);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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
    } catch (error: any) {
      setError(error.message || "Λάθος στοιχεία σύνδεσης");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!formData.username) {
      setError("Παρακαλώ εισάγετε το όνομα χρήστη");
      return;
    }

    if (formData.password.length < 6) {
      setError("Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες");
      return;
    }

    setIsLoading(true);
    try {
      if (isFirstUser) {
        if (!formData.fullname || !formData.email || !formData.phone) {
          setError("Παρακαλώ συμπληρώστε όλα τα πεδία");
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
    } catch (error: any) {
      setError(error.message || "Λάθος στοιχεία σύνδεσης");
    } finally {
      setIsLoading(false);
    }
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
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              className="login-input"
              required
              autoComplete="off"
            />
          </div>
          {isFirstUser && (
            <>
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Ονοματεπώνυμο"
                  value={formData.fullname}
                  onChange={(e) =>
                    setFormData({ ...formData, fullname: e.target.value })
                  }
                  className="login-input"
                  required
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="login-input"
                  required
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Input
                  type="tel"
                  placeholder="Τηλέφωνο"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="login-input"
                  autoComplete="off"
                />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Κωδικός"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="login-input"
              required
              autoComplete="new-password"
            />
          </div>

          <div className="flex items-center space-x-2">
            <div className="h-5 w-5 rounded-md overflow-hidden bg-[#354f52] border border-[#52796f]">
              <Checkbox
                id="rememberMe"
                checked={formData.rememberMe}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, rememberMe: checked as boolean })
                }
                className="h-full w-full bg-[#354f52] border-0 rounded-none text-[#cad2c5] data-[state=checked]:bg-[#52796f]"
                style={{ backgroundColor: '#354f52' }}
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
            >
              {success ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <p>
                    Επιτυχής{" "}
                    {isFirstUser ? "δημιουργία λογαριασμού" : "σύνδεση"}!
                  </p>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4" />
                  <p>{error}</p>
                </>
              )}
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-[#52796f] hover:bg-[#84a98c] text-[#cad2c5] transition-all duration-300"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="h-2 w-2 bg-[#cad2c5] rounded-full" />
                <div className="h-2 w-2 bg-[#cad2c5] rounded-full" />
                <div className="h-2 w-2 bg-[#cad2c5] rounded-full" />
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
