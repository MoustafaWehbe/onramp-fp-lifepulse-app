import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";
import { ErrorBoundary } from "./components/error-boundary";
import "./styles/globals.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      // A few retries with backoff so a brief backend blip (e.g. the API dev
      // server restarting) doesn't surface as an error to the user — matches
      // the tolerance built into AuthProvider's own session check.
      retry: 3,
      retryDelay: (attempt) => Math.min(300 * 2 ** attempt, 3000),
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
