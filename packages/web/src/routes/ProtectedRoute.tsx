import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useApp } from "../lib/store";
import { Loader2 } from "lucide-react";

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const { profile, hydrated } = useApp();
  const location = useLocation();

  if (isLoading || !hydrated) {
    return (
      <div
        className="grid min-h-screen place-items-center bg-surface"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          <span className="mono text-xs uppercase tracking-widest">
            Loading your garden…
          </span>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Redirect to onboarding when:
  // 1. profile.onboarded is explicitly false, OR
  // 2. the authenticated user's email doesn't match the stored profile
  //    (catches first login after register — seed data has a different email)
  const needsOnboarding =
    !profile.onboarded || user.email !== profile.email;

  if (needsOnboarding && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
