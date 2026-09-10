import { ErrorBoundary } from "./ErrorBoundary";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import "./styles.css";
import App from "./App.tsx";
import { APP_BASE_PATH } from "../shared/_critical/appMount";

// The schema is computed once per app lifetime on the server and cached there, so
// refetching it is pointless — and a refetch hands back a new object identity, which
// would re-initialise the composer and discard the request body being edited.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: Infinity, refetchOnWindowFocus: false, refetchOnReconnect: false },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={APP_BASE_PATH}>
        <ErrorBoundary><App /></ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
