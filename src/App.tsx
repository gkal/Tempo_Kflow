import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import LoadingSpinner from './components/ui/LoadingSpinner';
import MuiThemeProvider from './theme/MuiThemeProvider';
import { LoadingProvider } from './lib/LoadingContext';
import { FormProvider } from './lib/FormContext';
import { RealtimeProvider } from './lib/RealtimeProvider';
import ProtectedRoute from "./components/ProtectedRoute";
import { OfferDialogContainer } from './components/customers/OfferDialogManager';

// Lazy load components
const Home = lazy(() => import("./components/home"));
const LoginForm = lazy(() => import("./components/auth/LoginForm"));
const CustomersPage = lazy(() => import("@/components/customers/CustomersPage"));
const EnhancedCustomersPage = lazy(() => import("@/components/customers/EnhancedCustomersPage"));
const CustomerDetailPage = lazy(() => import("@/components/customers/CustomerDetailPage"));
const TestTable = lazy(() => import("@/components/test/TestTable"));
const TanStackTable = lazy(() => import("@/components/test/TanStackTable"));
const ReusableCustomersPage = lazy(() => import("@/components/customers/ReusableCustomersPage"));

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
    <AuthProvider>
      <MuiThemeProvider>
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
                  
                  {/* New routes */}
                  <Route path="/enhanced-customers" element={<ProtectedRoute><EnhancedCustomersPage /></ProtectedRoute>} />
                  <Route path="/reusable-customers" element={<ProtectedRoute><ReusableCustomersPage /></ProtectedRoute>} />
                  <Route path="/test-table" element={<TestTable />} />
                  <Route path="/tanstack-table" element={<TanStackTable />} />
                  
                  {/* Fallback route */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                
                <OfferDialogContainer />
              </Suspense>
            </RealtimeProvider>
          </FormProvider>
        </LoadingProvider>
      </MuiThemeProvider>
    </AuthProvider>
  );
}

export default App;
