import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import "./index.css";

declare global {
  interface Window {
    Laravel?: Record<string, unknown>;
    Pusher?: unknown;
    Echo?: unknown;
    csrfToken?: string | null;
  }
}

// Remove legacy Laravel/Pusher bindings while the FastAPI stack stabilizes
if (typeof window !== "undefined") {
  if (window.Pusher) {
    console.warn("Disabling legacy Pusher integration for FastAPI backend.");
    window.Pusher = undefined;
  }

  if (window.Echo) {
    window.Echo = undefined;
  }

  if (window.Laravel) {
    Reflect.deleteProperty(window, "Laravel");
  }

  window.csrfToken = null;
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
