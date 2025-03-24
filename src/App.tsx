import { Suspense, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./components/home";
import LoginForm from "./components/auth/LoginForm";
import ProtectedRoute from "./components/ProtectedRoute";
import { FormProvider } from './lib/FormContext';
import { RealtimeProvider } from './lib/RealtimeProvider';
import { Toaster } from './components/ui/toaster';
import { useAuth } from "./lib/AuthContext";
import "./components/ui/dropdown.css";
import { OfferDialogContainer } from './components/customers/OfferDialogManager';
import LoadingSpinner from './components/ui/LoadingSpinner';
import { LoadingProvider } from './lib/LoadingContext';
import RecoveryPage from "./components/admin/RecoveryPage";

/**
 * Main application component that handles routing and global providers
 */
function App() {
  const { user, loading } = useAuth();

  // Show loading indicator while auth is being checked
  if (loading) {
    return (
      <LoadingSpinner 
        fullScreen={true}
      />
    );
  }

  // Main application rendering
  return (
    <LoadingProvider>
      <FormProvider>
        <RealtimeProvider>
          <Toaster />
          <Suspense 
            fallback={<LoadingSpinner fullScreen={true} />}
          >
            <Routes>
              {/* Public routes */}
              <Route
                path="/"
                element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
              />
              <Route
                path="/login"
                element={user ? <Navigate to="/dashboard" replace /> : <LoginForm />}
              />
              
              {/* Protected application routes */}
              {[
                "/dashboard/*",
                "/customers",
                "/customers/:id",
                "/tasks",
                "/offers",
                "/calls",
                "/admin/recovery",
                "/admin/backup",
                "/admin/service-types"
              ].map(path => (
                <Route 
                  key={path}
                  path={path}
                  element={<ProtectedRoute><Home /></ProtectedRoute>}
                />
              ))}
              
              {/* Development routes */}
              {import.meta.env.VITE_TEMPO === "true" && (
                <Route path="/tempobook/*" element={<div />} />
              )}
              
              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            
            <OfferDialogContainer />
          </Suspense>
        </RealtimeProvider>
      </FormProvider>
    </LoadingProvider>
  );
}

export default App;
