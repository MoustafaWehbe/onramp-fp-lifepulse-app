import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { Profile } from "@/lib/store";

const PROFILE_KEY = ["profile"];

/**
 * `enabled: false` is used for coach accounts, which have no life-area profile
 * to load — fetching one would only produce an empty shell and a pointless
 * request on every screen.
 */
export function useProfile({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: PROFILE_KEY,
    enabled,
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Profile }>("/profile");
      return data.data;
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Profile>) => {
      const { data } = await apiClient.patch<{ data: Profile }>(
        "/profile",
        patch,
      );
      return data.data;
    },
    onSuccess: (profile) => queryClient.setQueryData(PROFILE_KEY, profile),
  });
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Profile> & { goals: string[] }) => {
      const { data } = await apiClient.patch<{ data: Profile }>(
        "/profile/onboarding",
        patch,
      );
      return data.data;
    },
    onSuccess: (profile) => queryClient.setQueryData(PROFILE_KEY, profile),
  });
}