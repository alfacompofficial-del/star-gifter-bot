import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import productsData from "@/data/products.json";

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
  created_at?: string;
}

export const useProducts = () => {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("priority", { ascending: true })
          .order("id", { ascending: true });
        
        if (error) {
          console.warn("Using local JSON fallback due to Supabase error:", error.message);
          return productsData as Product[];
        }
        
        if (!data || data.length === 0) {
          console.warn("Using local JSON fallback because table is empty.");
          return productsData as Product[];
        }
        
        return data as Product[];
      } catch (err) {
        console.error("Critical error fetching products:", err);
        return productsData as Product[];
      }
    },
    refetchInterval: 5000, 
  });
};
