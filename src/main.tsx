import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./suppressLogs";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./lib/AuthContext";
import { disableAutocomplete } from "./lib/disableAutocomplete";

import { TempoDevtools } from "tempo-devtools";
TempoDevtools.init();

// Disable browser autocomplete functionality
disableAutocomplete();

const basename = import.meta.env.BASE_URL;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
