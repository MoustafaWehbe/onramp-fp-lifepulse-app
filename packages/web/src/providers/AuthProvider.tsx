import { useEffect, useState, type ReactNode } from "react";
import type { AxiosError } from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import { AuthContext, type AuthUser } from "./auth-context";
import { useQueryClient } from "@tanstack/react-query";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Only 401/403 means the cookie genuinely isn't valid; that's trusted
// immediately without retrying. Everything else — no response at all
// (ECONNREFUSED while the API dev server is mid-restart), a 429 from the rate
// limiter, a 5xx — means we failed to *verify* the session, not that it's
// gone, so those get retried. Budget is generous (~9s total) because a dev
// server restart can easily take longer than a couple seconds; bouncing a
// genuinely logged-in user to /login is worse than a short wait.
const RETRY_DELAYS_MS = [300, 800, 1500, 2500, 4000];

const AUTH_FAILURE_STATUSES = new Set([401, 403]);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
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
          const status = (err as AxiosError).response?.status;
          const rejected = status !== undefined && AUTH_FAILURE_STATUSES.has(status);
          const canRetry = !rejected && attempt < RETRY_DELAYS_MS.length;
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
  
  queryClient.clear();

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
    queryClient.clear();
  }
}

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
