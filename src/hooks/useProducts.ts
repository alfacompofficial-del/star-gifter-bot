import { useQuery } from "@tanstack/react-query";
import productsData from "@/data/products.json";

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
      // Имитация загрузки из сети (для сохранения эффекта подгрузки, если нужно)
      return productsData as Product[];
    },
    staleTime: Infinity, // Данные статичны, обновлять их не нужно
  });
};
