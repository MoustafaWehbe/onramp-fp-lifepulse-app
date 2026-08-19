import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type CoachRequestStatus = "pending" | "accepted" | "declined";

export interface CoachRequest {
  id: string;
  requesterId: string;
  coachId: string;
  status: CoachRequestStatus;
  shareHabits: boolean;
  shareProfile: boolean;
  createdAt: string;
  coach?: { id: string; name: string };
  requester?: { id: string; name: string; email: string };
}

const SENT_KEY = ["coach-requests", "sent"];
const RECEIVED_KEY = ["coach-requests", "received"];

export function useSentRequests() {
  return useQuery({
    queryKey: SENT_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: CoachRequest[] }>(
        "/coach-requests/sent",
      );
      return data.data;
    },
  });
}

export function useReceivedRequests() {
  return useQuery({
    queryKey: RECEIVED_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: CoachRequest[] }>(
        "/coach-requests/received",
      );
      return data.data;
    },
  });
}

export function useCreateCoachRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      coachId: string;
      shareHabits: boolean;
      shareProfile: boolean;
    }) => {
      const { data } = await apiClient.post<{ data: CoachRequest }>(
        "/coach-requests",
        input,
      );
      return data.data;
    },
        onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: SENT_KEY });
        queryClient.invalidateQueries({ queryKey: RECEIVED_KEY });
        },
  });
}

export function useUpdateCoachRequestStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "accepted" | "declined";
    }) => {
      const { data } = await apiClient.patch<{ data: CoachRequest }>(
        `/coach-requests/${id}`,
        { status },
      );
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RECEIVED_KEY }),
  });
}