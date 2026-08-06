import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { Profile } from "@/lib/store";

const PROFILE_KEY = ["profile"];

export function useProfile() {
  return useQuery({
    queryKey: PROFILE_KEY,
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