import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { GuestRoute } from "./GuestRoute";
import { Landing } from "../pages/Landing";
import { Login } from "../pages/auth/Login";
import { Register } from "../pages/auth/Register";
import { Dashboard } from "../pages/dashboard/Dashboard";
import { TodayPage } from "../pages/Today";
import { ProgressPage } from "../pages/Progress";
import { ProfilePage } from "../pages/Profile";
import { Onboarding } from "../pages/Onboarding";
import { AreaDetail } from "../pages/AreaDetail";
import { NotFound } from "../pages/NotFound";

export function AppRoutes() {
  return (
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
  );
}
