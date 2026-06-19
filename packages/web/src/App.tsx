import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./providers/AuthProvider";
import { AppStateProvider } from "./lib/store";
import { AppRoutes } from "./routes";
import { Toaster } from "./components/ui/sonner";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppStateProvider>
          <AppRoutes />
          <Toaster />
        </AppStateProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
