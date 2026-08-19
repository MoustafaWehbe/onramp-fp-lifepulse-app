import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { AreaColor } from "@/lib/area-colors";
import type { Frequency, HabitDifficulty } from "@/hooks/useHabits";

/**
 * A client habit as their coach sees it. `completionDates` is raw rather than
 * a pre-computed percentage so the coach view can score consistency with
 * lib/habit-schedule.ts — the same helper behind the client's own Progress
 * page — instead of a second, quietly different formula.
 */
export interface ClientHabit {
  id: string;
  areaId: string;
  name: string;
  frequency: Frequency;
  daysOfWeek: number[] | null;
  durationMinutes: number | null;
  difficulty: HabitDifficulty | null;
  notes: string | null;
  completionDates: string[];
  currentStreak: number;
  lastCompletedOn: string | null;
}

export interface ClientArea {
  id: string;
  name: string;
  color: AreaColor;
  description: string | null;
  habits: ClientHabit[];
}

export interface ClientData {
  /** Whether this coach may edit the habits below, or only read them. */
  canEditHabits: boolean;
  /** The 30 days the view covers, ascending. Absent when habits aren't shared. */
  windowDates?: string[];
  areas?: ClientArea[];
  profile?: Record<string, unknown>;
}

export interface CoachUpdateHabitInput {
  name?: string;
  frequency?: Frequency;
  daysOfWeek?: number[] | null;
  durationMinutes?: number | null;
  difficulty?: HabitDifficulty | null;
  notes?: string | null;
}

export interface FeedbackEntry {
  id: string;
  /** "note" is written by the coach; "habit_change" is recorded by the API. */
  kind: "note" | "habit_change";
  body: string;
  createdAt: string;
  coach?: { id: string; name: string };
}

const clientDataKey = (requestId: string) =>
  ["coach-requests", requestId, "client-data"] as const;
const feedbackKey = (requestId: string) =>
  ["coach-requests", requestId, "feedback"] as const;

export function useClientData(requestId: string) {
  return useQuery({
    queryKey: clientDataKey(requestId),
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: ClientData }>(
        `/coach-requests/${requestId}/client-data`,
      );
      return data.data;
    },
    enabled: !!requestId,
  });
}

export function useFeedback(requestId: string) {
  return useQuery({
    queryKey: feedbackKey(requestId),
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: FeedbackEntry[] }>(
        `/coach-requests/${requestId}/feedback`,
      );
      return data.data;
    },
    enabled: !!requestId,
  });
}

export function useAddFeedback(requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const { data } = await apiClient.post<{ data: FeedbackEntry }>(
        `/coach-requests/${requestId}/feedback`,
        { body },
      );
      return data.data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: feedbackKey(requestId) }),
  });
}

/**
 * A coach adjusting a client's habit. Refreshes the thread as well as the
 * habits: the API records every change there, and the coach should see the
 * entry their edit just produced.
 */
export function useUpdateClientHabit(requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      habitId,
      ...input
    }: CoachUpdateHabitInput & { habitId: string }) => {
      const { data } = await apiClient.patch(
        `/coach-requests/${requestId}/habits/${habitId}`,
        input,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientDataKey(requestId) });
      queryClient.invalidateQueries({ queryKey: feedbackKey(requestId) });
    },
  });
}
