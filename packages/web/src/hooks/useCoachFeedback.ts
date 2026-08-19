import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface ClientData {
  habits?: { id: string; name: string; frequency: string; recentCompletions: number }[];
  profile?: Record<string, unknown>;
}

export interface FeedbackEntry {
  id: string;
  body: string;
  createdAt: string;
  coach?: { id: string; name: string };
}

export function useClientData(requestId: string) {
  return useQuery({
    queryKey: ["coach-requests", requestId, "client-data"],
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
    queryKey: ["coach-requests", requestId, "feedback"],
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
      queryClient.invalidateQueries({
        queryKey: ["coach-requests", requestId, "feedback"],
      }),
  });
}