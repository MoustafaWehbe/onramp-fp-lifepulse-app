import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface CoachCredential {
  id: string;
  name: string;
  issuer: string | null;
  verified: boolean;
}

export interface Coach {
  id: string;
  name: string;
  displayName: string;
  coachingTitle: string | null;
  bio: string | null;
  specialties: string[];
  yearsExperience: number | null;
  credentials: CoachCredential[];
}

const MY_PROFILE_KEY = ["coaches", "me"];


export function useCoaches() {
  return useQuery({
    queryKey: ["coaches"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Coach[] }>("/coaches");
      return data.data;
    },
  });
}

export function useCoach(id: string) {
  return useQuery({
    queryKey: ["coach", id],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Coach }>(
        `/coaches/${id}`,
      );

      return data.data;
    },
    enabled: Boolean(id),
  });
}


export interface MyCoachProfile {
  id: string;
  userId: string;
  displayName: string | null;
  coachingTitle: string | null;
  bio: string | null;
  specialties: string[];
  yearsExperience: number | null;
  verificationStatus: "pending" | "verified" | "rejected";
  credentials: CoachCredential[];
}

export function useMyCoachProfile() {
  return useQuery({
    queryKey: MY_PROFILE_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: MyCoachProfile }>(
        "/coaches/me",
      );
      return data.data;
    },
  });
}

export function useUpdateMyCoachProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      displayName?: string;
      coachingTitle?: string;
      bio?: string;
      specialties?: string[];
      yearsExperience?: number;
    }) => {
      const { data } = await apiClient.patch<{ data: MyCoachProfile }>(
        "/coaches/me",
        input,
      );
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_PROFILE_KEY }),
  });
}

export function useAddMyCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; issuer?: string }) => {
      const { data } = await apiClient.post<{ data: MyCoachProfile }>(
        "/coaches/me/credentials",
        input,
      );
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_PROFILE_KEY }),
  });
}

export function useRemoveMyCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (credentialId: string) => {
      const { data } = await apiClient.delete<{ data: MyCoachProfile }>(
        `/coaches/me/credentials/${credentialId}`,
      );
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_PROFILE_KEY }),
  });
}