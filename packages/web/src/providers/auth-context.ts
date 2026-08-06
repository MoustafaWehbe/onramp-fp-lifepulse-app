import { createContext, useContext } from "react";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
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
