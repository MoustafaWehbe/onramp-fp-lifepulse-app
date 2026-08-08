import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { LifeArea } from "@/lib/store";

const AREAS_KEY = ["areas"];

export function useCreateArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<LifeArea, "id">) => {
      const { data } = await apiClient.post<{ data: LifeArea }>(
        "/areas",
        input,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AREAS_KEY });
    },
  });
}