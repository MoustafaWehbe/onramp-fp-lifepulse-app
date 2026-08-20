import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { AreaColor } from "@/lib/area-colors";

export interface Area {
  id: string;
  name: string;
  color: AreaColor;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAreaInput {
  name: string;
  color: AreaColor;
  description?: string;
}

export interface UpdateAreaInput {
  id: string;
  name?: string;
  color?: AreaColor;
  description?: string | null;
}

// Single query key for the areas list — every mutation invalidates this so
// all screens (Dashboard, AreaDetail, Today, Progress, AppShell) stay in sync.
export const areaKeys = {
  all: ["areas"] as const,
};

async function fetchAreas(): Promise<Area[]> {
  const { data } = await apiClient.get<{ data: Area[] }>("/areas");
  return data.data;
}

/** `enabled: false` is for coach accounts, which have no life areas of their own. */
export function useAreas({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: areaKeys.all,
    enabled,
    queryFn: fetchAreas,
  });
}

export function useCreateArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAreaInput) => {
      const { data } = await apiClient.post<{ data: Area }>("/areas", input);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areaKeys.all });
    },
  });
}

export function useUpdateArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateAreaInput) => {
      const { data } = await apiClient.patch<{ data: Area }>(
        `/areas/${id}`,
        input,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areaKeys.all });
    },
  });
}

export function useDeleteArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/areas/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areaKeys.all });
    },
  });
}
