import { Suspense, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./components/home";
import LoginForm from "./components/auth/LoginForm";
import ProtectedRoute from "./components/ProtectedRoute";
import { FormProvider } from '@/lib/FormContext';
import { RealtimeProvider } from './lib/RealtimeProvider';
import { Toaster } from '@/components/ui/toaster';
import { useAuth } from "./lib/AuthContext";
import "./components/ui/dropdown.css";
import { OfferDialogContainer } from './components/customers/OfferDialogManager';
import GlobalOffersDialog from './components/customers/GlobalOffersDialog';

function App() {
  const { user, loading } = useAuth();

  useEffect(() => {
    // Override validation messages globally
    const originalValidationMessage = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'validationMessage'
    );

    // Try to override the browser's validation message
    try {
      // Override the validationMessage property
      Object.defineProperty(HTMLInputElement.prototype, 'validationMessage', {
        get: function() {
          if (!this.validity.valid) {
            if (this.validity.valueMissing) {
              return 'Παρακαλώ συμπληρώστε αυτό το πεδίο';
            } else if (this.validity.typeMismatch) {
              if (this.type === 'email') {
                return 'Παρακαλώ συμπληρώστε έγκυρο email';
              } else {
                return 'Παρακαλώ εισάγετε έγκυρη τιμή';
              }
            } else if (this.validity.patternMismatch) {
              return 'Η μορφή δεν είναι σωστή';
            }
          }
          return originalValidationMessage?.get?.call(this) || '';
        },
        configurable: true
      });
    } catch (e) {
      console.error('Failed to override validationMessage', e);
    }

    // Also try to override the validation message for textareas and selects
    try {
      Object.defineProperty(HTMLTextAreaElement.prototype, 'validationMessage', {
        get: function() {
          if (!this.validity.valid) {
            if (this.validity.valueMissing) {
              return 'Παρακαλώ συμπληρώστε αυτό το πεδίο';
            }
          }
          return '';
        },
        configurable: true
      });
    } catch (e) {
      console.error('Failed to override validationMessage for textarea', e);
    }

    try {
      Object.defineProperty(HTMLSelectElement.prototype, 'validationMessage', {
        get: function() {
          if (!this.validity.valid) {
            if (this.validity.valueMissing) {
              return 'Παρακαλώ επιλέξτε μια τιμή';
            }
          }
          return '';
        },
        configurable: true
      });
    } catch (e) {
      console.error('Failed to override validationMessage for select', e);
    }

    // Fix dropdown styling issues
    // fixDropdowns();
  }, []);

  // Check if running in StrictMode
  useEffect(() => {
    const isStrictMode = import.meta.env.DEV;
    console.log("Running in StrictMode:", isStrictMode);
    
    if (isStrictMode) {
      console.warn("React StrictMode is enabled, which causes components to mount twice in development. This is normal behavior and won't happen in production.");
    }
  }, []);

  useEffect(() => {
    // Suppress specific accessibility warnings
    const originalConsoleWarn = console.warn;
    console.warn = function(message, ...args) {
      if (typeof message === 'string' && (
        message.includes('Missing `Description` or `aria-describedby`') ||
        message.includes('aria-describedby={undefined}')
      )) {
        // Suppress these specific warnings
        return;
      }
      originalConsoleWarn.apply(console, [message, ...args]);
    };

    return () => {
      console.warn = originalConsoleWarn; // Restore original console.warn on unmount
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#2f3e46]">
        <div className="flex items-center justify-center space-x-2">
          <div className="h-2 w-2 bg-[#cad2c5] rounded-full animate-bounce" />
          <div className="h-2 w-2 bg-[#cad2c5] rounded-full animate-bounce [animation-delay:0.2s]" />
          <div className="h-2 w-2 bg-[#cad2c5] rounded-full animate-bounce [animation-delay:0.4s]" />
        </div>
      </div>
    );
  }

  return (
    <RealtimeProvider>
      <Toaster />
      <FormProvider>
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#2f3e46]">
              <div className="flex items-center justify-center space-x-2">
                <div className="h-2 w-2 bg-[#cad2c5] rounded-full animate-bounce" />
                <div className="h-2 w-2 bg-[#cad2c5] rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="h-2 w-2 bg-[#cad2c5] rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          }
        >
          <Routes>
            <Route
              path="/"
              element={
                user ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/login"
              element={user ? <Navigate to="/dashboard" replace /> : <LoginForm />}
            />
            <Route
              path="/dashboard/*"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers/:id"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/tasks"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/offers"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/recovery"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />

            {import.meta.env.VITE_TEMPO === "true" && (
              <Route path="/tempobook/*" element={<div />} />
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <OfferDialogContainer />
          <GlobalOffersDialog />
        </Suspense>
      </FormProvider>
    </RealtimeProvider>
  );
}

export default App;
