import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";
import { useIsAdmin } from "@/hooks/useStarsBalance";
import { BottomNav } from "@/components/BottomNav";
import { Star } from "lucide-react";

type Purchase = { id: string; amount_stars: number; created_at: string };

export default function History() {
  const { user, loading } = useTelegramAuth();
  const isAdmin = useIsAdmin(user?.id);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sentCount, setSentCount] = useState(0);
  const [sentSum, setSentSum] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("purchases")
      .select("id, amount_stars, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => setPurchases(data ?? []));

    supabase
      .from("transactions")
      .select("price_stars")
      .eq("sender_id", user.id)
      .then(({ data }) => {
        setSentCount(data?.length ?? 0);
        setSentSum((data ?? []).reduce((s, r) => s + r.price_stars, 0));
      });
  }, [user]);

  if (loading || !user) return null;

  return (
    <>
      <main className="mx-auto max-w-xl px-4 pb-28 pt-8">
        <h1 className="mb-6 text-3xl font-bold text-gold">History</h1>

        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border gradient-card p-4">
            <p className="text-xs uppercase text-muted-foreground">Gifts sent</p>
            <p className="mt-1 text-2xl font-bold">{sentCount}</p>
          </div>
          <div className="rounded-2xl border border-border gradient-card p-4">
            <p className="text-xs uppercase text-muted-foreground">Stars spent</p>
            <p className="mt-1 inline-flex items-center gap-1 text-2xl font-bold">
              <Star className="h-5 w-5 fill-primary text-primary" />{sentSum}
            </p>
          </div>
        </div>

        <h2 className="mb-3 text-sm uppercase tracking-wide text-muted-foreground">Top-ups</h2>
        {purchases.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No top-ups yet.</p>
        ) : (
          <ul className="space-y-2">
            {purchases.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-xl border border-border gradient-card px-4 py-3">
                <span className="text-sm text-muted-foreground">{new Date(p.created_at).toLocaleString()}</span>
                <span className="inline-flex items-center gap-1 font-semibold text-primary">
                  +<Star className="h-4 w-4 fill-primary" />{p.amount_stars}
                </span>
              </li>
            ))}
          </ul>
        )}
      </main>
      <BottomNav isAdmin={isAdmin} />
    </>
  );
}
