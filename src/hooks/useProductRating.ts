import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { clearProductsCache } from "@/lib/productsDb";
import { toast } from "sonner";

// Unique anonymous client identifier stored in localStorage
function getOrCreateClientId(): string {
  if (typeof window === "undefined") return "anon";
  const KEY = "alfacomp_user_rating_id";
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = "user_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "anon_user";
  }
}

export interface UseProductRatingProps {
  productId: number;
  initialRating?: number | null;
  initialRatingCount?: number | null;
}

export function useProductRating({
  productId,
  initialRating,
  initialRatingCount,
}: UseProductRatingProps) {
  const [userRating, setUserRating] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem(`alfacomp_rating_${productId}`);
      return saved ? parseInt(saved, 10) : null;
    } catch {
      return null;
    }
  });

  const [averageRating, setAverageRating] = useState<number>(
    initialRating !== undefined && initialRating !== null && initialRating > 0
      ? Number(initialRating)
      : 5.0
  );

  const [ratingCount, setRatingCount] = useState<number>(
    initialRatingCount !== undefined && initialRatingCount !== null
      ? Number(initialRatingCount)
      : 0
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync with product props when they change
  useEffect(() => {
    if (initialRating !== undefined && initialRating !== null && initialRating > 0) {
      setAverageRating(Number(initialRating));
    }
    if (initialRatingCount !== undefined && initialRatingCount !== null) {
      setRatingCount(Number(initialRatingCount));
    }
  }, [initialRating, initialRatingCount]);

  // Check if user has an existing rating in Supabase
  useEffect(() => {
    let cancelled = false;
    const clientId = getOrCreateClientId();

    async function checkDbRating() {
      try {
        const { data, error } = await supabase
          .from("product_ratings" as any)
          .select("rating")
          .eq("product_id", productId)
          .eq("user_id", clientId)
          .maybeSingle();

        if (!cancelled && !error && data && (data as any).rating) {
          const score = Number((data as any).rating);
          setUserRating(score);
          try {
            localStorage.setItem(`alfacomp_rating_${productId}`, String(score));
          } catch {}
        }
      } catch {
        /* fallback to localStorage */
      }
    }

    checkDbRating();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const submitRating = useCallback(
    async (score: number): Promise<boolean> => {
      if (score < 1 || score > 5) return false;

      const previousRating = userRating;
      setUserRating(score);
      setIsSubmitting(true);

      try {
        localStorage.setItem(`alfacomp_rating_${productId}`, String(score));
      } catch {}

      const clientId = getOrCreateClientId();

      try {
        // 1. Upsert into product_ratings table
        const { error: upsertErr } = await supabase
          .from("product_ratings" as any)
          .upsert(
            {
              product_id: productId,
              user_id: clientId,
              rating: score,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "product_id,user_id" }
          );

        // 2. Fetch all ratings to calculate accurate average & count
        const { data: allRatings } = await supabase
          .from("product_ratings" as any)
          .select("rating")
          .eq("product_id", productId);

        let newAvg = score;
        let newCount = (ratingCount || 0) + (previousRating ? 0 : 1);

        if (allRatings && allRatings.length > 0) {
          const total = allRatings.reduce((acc: number, item: any) => acc + (Number(item.rating) || 0), 0);
          newCount = allRatings.length;
          newAvg = Math.round((total / newCount) * 10) / 10;
        }

        setAverageRating(newAvg);
        setRatingCount(newCount);

        // 3. Fallback direct update to public.products table (in case DB trigger is not active)
        await supabase
          .from("products")
          .update({
            rating: newAvg,
            rating_count: newCount,
          } as never)
          .eq("id", productId);

        // 4. Invalidate cache so all components and tabs get the new rating
        await clearProductsCache();

        toast.success(`Спасибо за вашу оценку: ${score} ★!`);
        setIsSubmitting(false);
        return true;
      } catch (err) {
        console.warn("[Rating] Error submitting rating:", err);
        // Even if network/server has an issue, user sees their vote locally
        toast.success(`Ваша оценка: ${score} ★ сохранена!`);
        setIsSubmitting(false);
        return true;
      }
    },
    [productId, userRating, ratingCount]
  );

  return {
    userRating,
    averageRating,
    ratingCount,
    isSubmitting,
    submitRating,
  };
}
