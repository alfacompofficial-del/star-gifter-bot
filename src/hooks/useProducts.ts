import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
  brand: string;
  in_stock: boolean;
  created_at?: string;
}

export const useProducts = () => {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      
      const products = data as Product[];
      // Хардкод фикс для картинки Archer AX72, так как RLS БД не дает изменить напрямую
      return products.map(p => {
        if (p.name === "Archer AX72 AX5400 Dual-Band Wi-Fi 6 Router") {
          return { 
            ...p, 
            image: "https://www.jumbo-computer.com/cdn/shop/files/71zNdUCbUtL._AC_SL1500_1200x.jpg?v=1734668150" 
          };
        }
        return p;
      });
    },
    // Keeps catalog price updates "automatic" after admin edits.
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
  });
};
