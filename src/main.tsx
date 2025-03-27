import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

// Components
import App from "./App.tsx";

// Context providers
import { AuthProvider } from "./lib/AuthContext";

// Styles
import "./index.css";

// Utilities
import { setupUtilities } from "./utils";
import { disableAutocomplete } from "./lib/disableAutocomplete";
import { TempoDevtools } from "tempo-devtools";

// Initialize development tools
TempoDevtools.init();

// Initialize all utilities (logging, warning suppression, etc.)
setupUtilities();

// Disable browser autocomplete functionality
disableAutocomplete();

// Root element
const rootElement = document.getElementById("root") as HTMLElement;

// Render the application
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
); 