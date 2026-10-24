import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_EXCHANGE_RATE, formatPrice } from "@/lib/constants";

const STORAGE_KEY = "alfacomp_exchange_rate";
const SETTING_NAME = "SETTINGS_EXCHANGE_RATE";

// Cached in memory so any consumer gets the latest value synchronously
let cachedRate: number = (() => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  }
  return DEFAULT_EXCHANGE_RATE;
})();

export const getCachedExchangeRate = () => cachedRate;

export const useExchangeRate = () => {
  const [exchangeRate, setExchangeRate] = useState<number>(cachedRate);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Sync across tabs and with custom events
  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      if (customEvent.detail && customEvent.detail > 0) {
        setExchangeRate(customEvent.detail);
        cachedRate = customEvent.detail;
      } else {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed) && parsed > 0) {
            setExchangeRate(parsed);
            cachedRate = parsed;
          }
        }
      }
    };

    window.addEventListener("exchange-rate-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("exchange-rate-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // Fetch latest from Supabase on mount
  useEffect(() => {
    let isMounted = true;
    const fetchRate = async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("sort_order")
          .eq("name", SETTING_NAME)
          .maybeSingle();

        if (!error && data?.sort_order && data.sort_order > 0) {
          if (isMounted) {
            setExchangeRate(data.sort_order);
            cachedRate = data.sort_order;
            localStorage.setItem(STORAGE_KEY, String(data.sort_order));
          }
        }
      } catch (err) {
        console.warn("Could not fetch exchange rate from server:", err);
      }
    };

    fetchRate();
    return () => {
      isMounted = false;
    };
  }, []);

  const updateExchangeRate = useCallback(async (newRate: number): Promise<boolean> => {
    if (!newRate || isNaN(newRate) || newRate <= 0) return false;
    setIsUpdating(true);
    try {
      const roundedRate = Math.round(newRate);

      // 1. Update localStorage & memory immediately
      localStorage.setItem(STORAGE_KEY, String(roundedRate));
      cachedRate = roundedRate;
      setExchangeRate(roundedRate);

      // 2. Dispatch event to update all components in current window
      window.dispatchEvent(new CustomEvent("exchange-rate-updated", { detail: roundedRate }));

      // 3. Save to Supabase (categories table used as key-value store)
      const { error } = await supabase.from("categories").upsert(
        {
          name: SETTING_NAME,
          sort_order: roundedRate,
        },
        { onConflict: "name" }
      );

      if (error) {
        console.error("Failed to save exchange rate to Supabase:", error);
        return false;
      }
      return true;
    } catch (err) {
      console.error("Error updating exchange rate:", err);
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const toUZS = useCallback((priceUSD: number) => {
    return Math.round(priceUSD * exchangeRate);
  }, [exchangeRate]);

  const toUSD = useCallback((priceUZS: number) => {
    return Math.round(priceUZS / exchangeRate);
  }, [exchangeRate]);

  const formatUZS = useCallback((priceUSD: number) => {
    return formatPrice(Math.round(priceUSD * exchangeRate));
  }, [exchangeRate]);

  return {
    exchangeRate,
    isUpdating,
    updateExchangeRate,
    toUZS,
    toUSD,
    formatUZS,
  };
};
