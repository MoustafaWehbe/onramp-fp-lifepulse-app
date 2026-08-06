import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type Frequency = "daily" | "weekdays" | "3x" | "5x" | "weekly";
export type HabitDifficulty = "easy" | "medium" | "hard";

export interface Habit {
  id: string;
  areaId: string;
  name: string;
  frequency: Frequency;
  durationMinutes: number | null;
  difficulty: HabitDifficulty | null;
  notes: string | null;
  reminderEnabled: boolean;
  reminderTime: string | null;
  timezone: string | null;
  /** 0=Sun..6=Sat. Only meaningful for "3x"/"5x"/"weekly" frequencies. */
  daysOfWeek: number[] | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHabitInput {
  areaId: string;
  name: string;
  frequency: Frequency;
  durationMinutes?: number;
  difficulty?: HabitDifficulty;
  notes?: string;
  reminderEnabled?: boolean;
  reminderTime?: string;
  timezone?: string;
  daysOfWeek?: number[];
}

export interface UpdateHabitInput {
  id: string;
  areaId?: string;
  name?: string;
  frequency?: Frequency;
  durationMinutes?: number | null;
  difficulty?: HabitDifficulty | null;
  notes?: string | null;
  reminderEnabled?: boolean;
  reminderTime?: string | null;
  timezone?: string | null;
  daysOfWeek?: number[] | null;
}

// Single query key for the habits list — every mutation invalidates this so
// all screens (Dashboard, AreaDetail, Today, Progress) stay in sync.
export const habitKeys = {
  all: ["habits"] as const,
};

async function fetchHabits(): Promise<Habit[]> {
  const { data } = await apiClient.get<{ data: Habit[] }>("/habits");
  return data.data;
}

export function useHabits() {
  return useQuery({
    queryKey: habitKeys.all,
    queryFn: fetchHabits,
  });
}

export function useCreateHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateHabitInput) => {
      const { data } = await apiClient.post<{ data: Habit }>("/habits", input);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: habitKeys.all });
    },
  });
}

export function useUpdateHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateHabitInput) => {
      const { data } = await apiClient.patch<{ data: Habit }>(
        `/habits/${id}`,
        input,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: habitKeys.all });
    },
  });
}

export function useDeleteHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/habits/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: habitKeys.all });
    },
  });
}
