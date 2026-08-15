import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { ProtectedRoute } from "./ProtectedRoute";
import { GuestRoute } from "./GuestRoute";

// Route-level code splitting: each page (and whatever heavy libraries it
// alone depends on, e.g. Progress.tsx pulling in recharts/d3) ships as its
// own chunk instead of bloating the single main bundle every user has to
// download before seeing anything.
const Landing = lazy(() => import("../pages/Landing").then((m) => ({ default: m.Landing })));
const Login = lazy(() => import("../pages/auth/Login").then((m) => ({ default: m.Login })));
const Register = lazy(() =>
  import("../pages/auth/Register").then((m) => ({ default: m.Register })),
);
const Dashboard = lazy(() =>
  import("../pages/dashboard/Dashboard").then((m) => ({ default: m.Dashboard })),
);
const TodayPage = lazy(() => import("../pages/Today").then((m) => ({ default: m.TodayPage })));
const ProgressPage = lazy(() =>
  import("../pages/Progress").then((m) => ({ default: m.ProgressPage })),
);
const ProfilePage = lazy(() =>
  import("../pages/Profile").then((m) => ({ default: m.ProfilePage })),
);
const Onboarding = lazy(() =>
  import("../pages/Onboarding").then((m) => ({ default: m.Onboarding })),
);
const AreaDetail = lazy(() =>
  import("../pages/AreaDetail").then((m) => ({ default: m.AreaDetail })),
);
const NotFound = lazy(() => import("../pages/NotFound").then((m) => ({ default: m.NotFound })));

function RouteFallback() {
  return (
    <div
      className="grid min-h-screen place-items-center bg-surface"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        <span className="mono text-xs uppercase tracking-widest">Loading…</span>
      </div>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />

        <Route element={<GuestRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Protected app */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/today" element={<TodayPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/areas/:id" element={<AreaDetail />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
