import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { apiClient } from "@/lib/api-client";
import { habitKeys, type Frequency, type HabitDifficulty } from "./useHabits";

export type AiSuggestionStatus = "pending" | "accepted" | "dismissed";

export interface AiSuggestion {
  id: string;
  areaId: string;
  suggestedName: string;
  rationale: string | null;
  /** Practical tip from the model. Copied onto the habit's own notes on accept. */
  notes: string | null;
  frequency: Frequency;
  durationMinutes: number | null;
  difficulty: HabitDifficulty | null;
  status: AiSuggestionStatus;
  createdAt: string;
}

export const aiSuggestionKeys = {
  all: ["ai-suggestions"] as const,
};

async function fetchAiSuggestions(): Promise<AiSuggestion[]> {
  const { data } = await apiClient.get<{ data: AiSuggestion[] }>("/ai/suggestions");
  return data.data;
}

/** Currently pending suggestions — repopulates the panel across page reloads. */
export function useAiSuggestions() {
  return useQuery({
    queryKey: aiSuggestionKeys.all,
    queryFn: fetchAiSuggestions,
  });
}

export function useGenerateAiSuggestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<{ data: AiSuggestion[] }>("/ai/suggestions");
      return data.data;
    },
    onSuccess: (suggestions) => {
      queryClient.setQueryData(aiSuggestionKeys.all, suggestions);
    },
  });
}

export function useAcceptAiSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post<{ data: AiSuggestion }>(
        `/ai/suggestions/${id}/accept`,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiSuggestionKeys.all });
      queryClient.invalidateQueries({ queryKey: habitKeys.all });
    },
  });
}

/** Accepts every currently pending suggestion in one atomic call. */
export function useAcceptAllAiSuggestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<{ data: AiSuggestion[] }>(
        "/ai/suggestions/accept-all",
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiSuggestionKeys.all });
      queryClient.invalidateQueries({ queryKey: habitKeys.all });
    },
  });
}

export function useDismissAiSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post<{ data: AiSuggestion }>(
        `/ai/suggestions/${id}/dismiss`,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiSuggestionKeys.all });
    },
  });
}

export interface AiErrorInfo {
  message: string;
  /** Present on 429 responses — seconds until the user can generate again. */
  retryAfterSeconds?: number;
  /** True on 503 — OPENAI_API_KEY isn't set, so the feature is quietly unavailable. */
  notConfigured?: boolean;
}

/** Extracts a friendly message plus structured hints from an AI-suggestions API
 * error, so the panel can show a cooldown countdown or a quiet "not available"
 * state instead of a generic failure toast. */
export function getAiErrorInfo(error: unknown): AiErrorInfo {
  if (isAxiosError<{ error?: string; retryAfterSeconds?: number }>(error)) {
    return {
      message: error.response?.data?.error ?? "Something went wrong. Please try again.",
      retryAfterSeconds: error.response?.data?.retryAfterSeconds,
      notConfigured: error.response?.status === 503,
    };
  }
  return { message: "Something went wrong. Please try again." };
}
