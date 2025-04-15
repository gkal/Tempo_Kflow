import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import LoadingSpinner from './components/ui/LoadingSpinner';
import MuiThemeProvider from './theme/MuiThemeProvider';
import { LoadingProvider } from './lib/LoadingContext';
import { FormProvider } from './lib/FormContext';
import ProtectedRoute from "./components/ProtectedRoute";
import { OfferDialogContainer } from './components/offers/main_offers_form/OfferDialogManager';
import GlobalDialogProvider from './components/GlobalDialogManager';

// Lazy load components
const Home = lazy(() => import("./components/home"));
const LoginForm = lazy(() => import("./components/auth/LoginForm"));
const CustomersPage = lazy(() => import("@/components/customers/CustomersPage"));
const CustomerDetailPage = lazy(() => import("@/components/customers/CustomerDetailPage"));
const TestTable = lazy(() => import("@/components/test/TestTable"));
const TanStackTable = lazy(() => import("@/components/test/TanStackTable"));

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
            <GlobalDialogProvider>
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
                    "/customers/new", 
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
            </GlobalDialogProvider>
          </FormProvider>
        </LoadingProvider>
      </MuiThemeProvider>
    </AuthProvider>
  );
}

export default App;
