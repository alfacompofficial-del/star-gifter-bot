import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useStarsBalance(userId: string | undefined) {
  const [purchased, setPurchased] = useState(0);
  const [spent, setSpent] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function load() {
      const [{ data: profile }, { data: txs }] = await Promise.all([
        supabase.from("profiles").select("stars_purchased").eq("user_id", userId!).maybeSingle(),
        supabase.from("transactions").select("price_stars").eq("sender_id", userId!),
      ]);
      if (cancelled) return;
      setPurchased(Number(profile?.stars_purchased ?? 0));
      setSpent((txs ?? []).reduce((s, r) => s + (r.price_stars ?? 0), 0));
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel(`balance-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `user_id=eq.${userId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, load)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { purchased, spent, balance: purchased - spent, loading };
}

export function useIsAdmin(userId: string | undefined) {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!userId) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [userId]);
  return isAdmin;
}
