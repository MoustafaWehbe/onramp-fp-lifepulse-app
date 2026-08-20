import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { homePathFor, type UserRole } from "../lib/roles";

/**
 * Keeps each role inside its own half of the app. Hiding the links isn't
 * enough — a coach who types /today or follows an old bookmark would otherwise
 * land on a screen built entirely around data they don't have.
 *
 * Nested inside ProtectedRoute, so `user` is already guaranteed here.
 */
export function RoleRoute({ allow }: { allow: UserRole }) {
  const { user } = useAuth();

  if (!user) return null;

  return user.role === allow ? (
    <Outlet />
  ) : (
    <Navigate to={homePathFor(user.role)} replace />
  );
}
