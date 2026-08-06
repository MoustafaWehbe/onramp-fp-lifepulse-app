import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface Goal {
  slug: string;
  label: string;
}

export function useGoals() {
  return useQuery({
    queryKey: ["goals"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Goal[] }>("/goals");
      return data.data;
    },
    staleTime: Infinity, 
  });
}