import { createContext, useContext } from "react";
import type { UserRole } from "../lib/roles";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  // Coach-only, collected on the registration form itself.
  coachingTitle?: string;
  bio?: string;
  specialties?: string[];
  yearsExperience?: number;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  // Returns the signed-in user so callers can route by role without waiting
  // for the context state to settle.
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

// Split out from AuthProvider.tsx: Vite's Fast Refresh only preserves state
// across edits when a file exports *only* components. Mixing this hook into
// the same file as the AuthProvider component broke that boundary, forcing a
// full page reload on almost any edit — which re-ran the /auth/me check on
// mount and logged you out for the split second the API dev server (nodemon)
// was mid-restart from an unrelated file change.
export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx)
    throw new Error("useAuthContext must be used within <AuthProvider>");
  return ctx;
}
