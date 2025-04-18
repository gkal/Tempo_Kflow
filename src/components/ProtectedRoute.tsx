import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Loader } from './ui/Loader';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireSuperUser?: boolean;
}

/**
 * Route component that protects routes requiring authentication
 * Can optionally require specific role levels (admin, super user)
 */
export default function ProtectedRoute({ 
  children, 
  requireAdmin = false,
  requireSuperUser = false
}: ProtectedRouteProps) {
  const { user, loading, isAdmin, isSuperUser } = useAuth();
  const location = useLocation();

  // Show loader while auth status is being verified
  if (loading) {
    return <Loader />;
  }

  // Redirect unauthenticated users to login page
  if (!user) {
    // Save current location to redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role requirements
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireSuperUser && !(isAdmin || isSuperUser)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Render protected content for authenticated users with appropriate roles
  return <>{children}</>;
}
