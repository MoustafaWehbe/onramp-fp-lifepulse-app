import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useProfile } from "../hooks/useProfile";
import { Loader2 } from "lucide-react";

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const { data: profile, isPending, isError } = useProfile();
  const location = useLocation();

  if (isLoading || (user && isPending)) {
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

     if (isError || !profile) {
     return (
       <div className="grid min-h-screen place-items-center bg-surface">
         <p className="text-sm text-destructive">
           Couldn't load your profile. Try refreshing the page.
         </p>
       </div>
     );
   }
  

  const needsOnboarding = !profile.onboarded;
  if (needsOnboarding && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
