import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import "./index.css";

declare global {
  interface Window {
    Laravel?: { csrfToken?: string | null };
    Pusher?: unknown;
  }
}

// Disable CSRF until API stabilization
if (typeof window !== "undefined") {
  window.Laravel = window.Laravel || {};
  window.Laravel.csrfToken = null;

  // Disable WebSockets for now (no SSL connection yet)
  if (window.Pusher) {
    window.Pusher = undefined;
  }
}

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);
