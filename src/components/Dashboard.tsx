import { useAuth } from "@/lib/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p>Welcome, {user?.fullname}</p>
    </div>
  );
} 