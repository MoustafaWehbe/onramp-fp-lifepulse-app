import { useEffect, useState, type ReactNode } from "react";
import type { AxiosError } from "axios";
import { apiClient } from "../lib/api-client";
import { AuthContext, type AuthUser } from "./auth-context";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Retries only apply to "couldn't reach the server" failures (no response at
// all — e.g. ECONNREFUSED while the API dev server is mid-restart). A real
// 401/403 response means the cookie genuinely isn't valid, so that's trusted
// immediately without retrying.
const RETRY_DELAYS_MS = [300, 800, 1500];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount — access token cookie is sent automatically.
  // Tolerates brief backend unavailability (dev server restarts, network
  // blips) instead of bouncing a genuinely logged-in user to /login just
  // because one request landed in a bad window.
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      for (let attempt = 0; ; attempt++) {
        try {
          const { data } = await apiClient.get<{ data: AuthUser }>("/auth/me");
          if (!cancelled) setUser(data.data);
          return;
        } catch (err) {
          const hasResponse = Boolean((err as AxiosError).response);
          const canRetry = !hasResponse && attempt < RETRY_DELAYS_MS.length;
          if (!canRetry) {
            if (!cancelled) setUser(null);
            return;
          }
          await sleep(RETRY_DELAYS_MS[attempt]);
        }
      }
    }

    restoreSession().finally(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function login(email: string, password: string): Promise<void> {
    const { data } = await apiClient.post<{
      data: { user: AuthUser };
    }>("/auth/login", { email, password });
    setUser(data.data.user);
  }

  async function register(
    email: string,
    password: string,
    name: string,
  ): Promise<void> {
    await apiClient.post("/auth/register", { email, password, name });
  }

  async function logout(): Promise<void> {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
