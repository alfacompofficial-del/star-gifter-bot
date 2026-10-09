import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  setCachedProducts,
  subscribeToProductsUpdate,
  getSynchronousPreload,
  waitForPreload,
} from "@/lib/productsDb";

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

  // 1. Подписка на обновления товаров (локально + между вкладками через BroadcastChannel)
  useEffect(() => {
    const unsubscribe = subscribeToProductsUpdate(() => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    });
    return unsubscribe;
  }, [queryClient]);

  // 2. Асинхронная гидратация из IndexedDB, если в React Query памяти еще пусто
  useEffect(() => {
    let isMounted = true;
    const currentData = queryClient.getQueryData<Product[]>(["products"]);

    if (!currentData || currentData.length === 0) {
      waitForPreload().then((cached) => {
        if (!isMounted) return;
        if (cached && cached.products && cached.products.length > 0) {
          const freshCheck = queryClient.getQueryData<Product[]>(["products"]);
          // Записываем кэш в React Query только если сетевой запрос еще не успел вернуть данные
          if (!freshCheck || freshCheck.length === 0) {
            queryClient.setQueryData(["products"], cached.products, {
              updatedAt: cached.timestamp,
            });
          }
        }
      });
    }

    return () => {
      isMounted = false;
    };
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

      const products = (data || []) as Product[];

      // При успешном получении свежих данных из Supabase обновляем IndexedDB в фоне
      if (products.length > 0) {
        setCachedProducts(products).catch((err) => {
          console.warn("[IndexedDB] Could not sync products to persistent cache:", err);
        });
      }

      return products;
    },
    // Мгновенная инициализация из предзагруженного кэша IndexedDB (если готов)
    initialData: () => {
      const preload = getSynchronousPreload();
      return preload && preload.products.length > 0 ? preload.products : undefined;
    },
    initialDataUpdatedAt: () => {
      const preload = getSynchronousPreload();
      return preload ? preload.timestamp : 0;
    },
    // При повторном открытии сайта показывать кэш сразу, но ВСЕГДА проверять Supabase в фоне
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 1000 * 30, // 30 секунд — активная сессия без лишних запросов
    gcTime: 1000 * 60 * 60 * 24, // 24 часа в памяти React Query
    retry: 2,
  });
};
