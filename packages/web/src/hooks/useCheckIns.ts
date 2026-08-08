import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface CheckIn {
  id: string;
  habitId: string;
  date: string;
  createdAt: string;
}

export interface CheckInFilters {
  from?: string;
  to?: string;
  habitId?: string;
}

export const checkInKeys = {
  all: ["check-ins"] as const,
  today: () => [...checkInKeys.all, "today"] as const,
  list: (filters: CheckInFilters = {}) =>
    [...checkInKeys.all, "list", filters] as const,
};

async function fetchTodayCheckIns(): Promise<CheckIn[]> {
  const { data } = await apiClient.get<{ data: CheckIn[] }>("/check-ins/today");
  return data.data;
}

async function fetchCheckIns(filters: CheckInFilters = {}): Promise<CheckIn[]> {
  const { data } = await apiClient.get<{ data: CheckIn[] }>("/check-ins", {
    params: filters,
  });
  return data.data;
}

/**
 * Completions for "today" — the server computes "today" per-habit using
 * that habit's own timezone (falling back to this browser's timezone, sent
 * automatically via the X-Timezone header — see lib/api-client.ts). This is
 * what makes a tick disappear at local midnight rather than UTC midnight.
 */
export function useTodayCheckIns() {
  return useQuery({
    queryKey: checkInKeys.today(),
    queryFn: fetchTodayCheckIns,
  });
}

export function useCheckIns(filters: CheckInFilters = {}) {
  return useQuery({
    queryKey: checkInKeys.list(filters),
    queryFn: () => fetchCheckIns(filters),
  });
}

/**
 * Toggle today's completion for a habit.
 * - Not yet checked in → POST with no `date` (server defaults it to "today"
 *   in the habit's own timezone).
 * - Already checked in → DELETE, which the server treats as a soft
 *   un-complete (the row and its history are kept, not destroyed).
 */
export function useToggleCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ habitId }: { habitId: string }) => {
      const today = queryClient.getQueryData<CheckIn[]>(checkInKeys.today());
      const existing = today?.find((c) => c.habitId === habitId);

      if (existing) {
        await apiClient.delete(`/check-ins/${existing.id}`);
        return { action: "removed" as const, habitId };
      }

      await apiClient.post("/check-ins", { habitId });
      return { action: "created" as const, habitId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checkInKeys.all });
    },
  });
}

/** Membership check. Omit `date` to test against a "today" list (already
 * scoped server-side); pass `date` when checking a historical range. */
export function isChecked(
  checkIns: CheckIn[],
  habitId: string,
  date?: string,
): boolean {
  return checkIns.some(
    (c) => c.habitId === habitId && (date === undefined || c.date === date),
  );
}
