import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface NotificationPreferences {
  emailRemindersEnabled: boolean;
  reengagementEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string | null;
}

export const notificationKeys = {
  all: ["notifications"] as const,
  preferences: () => [...notificationKeys.all, "preferences"] as const,
};

export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: NotificationPreferences }>(
        "/notifications/preferences",
      );
      return data.data;
    },
  });
}

/**
 * Sends the encouragement email to the signed-in user immediately, skipping the
 * 30-day lapse it normally waits for. The endpoint only exists outside
 * production, so this is a local demo aid rather than a product feature.
 */
export function useSendDemoEncouragement() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<{ data: { to: string } }>(
        "/notifications/demo/encouragement",
      );
      return data.data;
    },
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<NotificationPreferences>) => {
      const { data } = await apiClient.patch<{ data: NotificationPreferences }>(
        "/notifications/preferences",
        patch,
      );
      return data.data;
    },
    onSuccess: (preferences) =>
      queryClient.setQueryData(notificationKeys.preferences(), preferences),
  });
}
