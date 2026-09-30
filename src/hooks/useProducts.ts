import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  old_price?: number | null;
  image: string;
  brand: string;
  in_stock: boolean;
  priority?: number;
  specs?: Record<string, string> | null;
  views?: number;
  likes?: number;
  created_at?: string;
}

export const useProducts = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    };
    window.addEventListener("products-updated", handleUpdate);
    return () => window.removeEventListener("products-updated", handleUpdate);
  }, [queryClient]);

  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("priority", { ascending: true })
        .order("id", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      if (!data || data.length === 0) {
        return [];
      }

      return data as Product[];
    },
    staleTime: 1000 * 30,          // 30 sec — show cached instantly, revalidate quickly
    gcTime: 1000 * 60 * 10,        // keep in memory 10 min
    refetchOnWindowFocus: true,    // refresh if user switches tabs and comes back
    refetchOnMount: true,          // always check for updates on mount
    retry: 2,
  });
};
