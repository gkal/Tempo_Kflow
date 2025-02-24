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
import { motion } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, CheckCircle } from "lucide-react";

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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 rounded-xl space-y-6"
        style={{
          background: "rgba(53, 79, 82, 0.7)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(132, 169, 140, 0.3)",
        }}
      >
        <div className="text-center space-y-2">
          <motion.img
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            src="https://kronoseco.gr/favicon.ico"
            alt="K-Flow Logo"
            className="h-16 w-16 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-[#cad2c5]">K-Flow</h1>
          <p className="text-[#84a98c]">
            {isFirstUser ? "Δημιουργία Διαχειριστή" : "Σύστημα Διαχείρισης"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Όνομα χρήστη"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              className="bg-[#354f52] border-[#52796f] text-[#cad2c5] placeholder:text-[#84a98c]"
              required
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
                  className="bg-[#354f52] border-[#52796f] text-[#cad2c5] placeholder:text-[#84a98c]"
                  required
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
                  className="bg-[#354f52] border-[#52796f] text-[#cad2c5] placeholder:text-[#84a98c]"
                  required
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
                  className="bg-[#354f52] border-[#52796f] text-[#cad2c5] placeholder:text-[#84a98c]"
                  required
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
              className="bg-[#354f52] border-[#52796f] text-[#cad2c5] placeholder:text-[#84a98c]"
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="rememberMe"
              checked={formData.rememberMe}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, rememberMe: checked as boolean })
              }
              className="border-[#84a98c] data-[state=checked]:bg-[#84a98c] data-[state=checked]:border-[#84a98c]"
            />
            <label
              htmlFor="rememberMe"
              className="text-sm font-medium text-[#cad2c5] cursor-pointer"
            >
              Να με θυμάσαι
            </label>
          </div>

          {(error || success) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
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
            </motion.div>
          )}

          <Button
            type="submit"
            className="w-full bg-[#52796f] hover:bg-[#84a98c] text-[#cad2c5] transition-all duration-300"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <motion.div
                  className="h-2 w-2 bg-[#cad2c5] rounded-full"
                  animate={{ scale: [1, 0.5, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                />
                <motion.div
                  className="h-2 w-2 bg-[#cad2c5] rounded-full"
                  animate={{ scale: [1, 0.5, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: 0.1 }}
                />
                <motion.div
                  className="h-2 w-2 bg-[#cad2c5] rounded-full"
                  animate={{ scale: [1, 0.5, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: 0.2 }}
                />
              </div>
            ) : isFirstUser ? (
              "Δημιουργία Διαχειριστή"
            ) : (
              "Σύνδεση"
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
