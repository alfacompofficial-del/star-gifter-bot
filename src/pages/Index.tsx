import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";
import { useStarsBalance, useIsAdmin } from "@/hooks/useStarsBalance";
import { BottomNav } from "@/components/BottomNav";
import { StarsBadge } from "@/components/StarsBadge";
import { SendGiftDialog } from "@/components/SendGiftDialog";
import { Button } from "@/components/ui/button";
import { Star, Sparkles } from "lucide-react";
import { Toaster } from "sonner";

type Gift = {
  id: string;
  name: string;
  description: string | null;
  price_stars: number;
  image_url: string;
};

export default function Index() {
  const { user, loading, error } = useTelegramAuth();
  const { balance, purchased } = useStarsBalance(user?.id);
  const isAdmin = useIsAdmin(user?.id);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [selected, setSelected] = useState<Gift | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase
      .from("gifts")
      .select("id, name, description, price_stars, image_url")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => setGifts(data ?? []));
  }, []);

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center">
        <div className="animate-pulse text-muted-foreground">Connecting to Telegram…</div>
      </main>
    );
  }

  if (error || !user) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div className="max-w-md space-y-4">
          <Sparkles className="mx-auto h-12 w-12 text-primary animate-float" />
          <h1 className="text-3xl font-bold text-gold">Anonymous Gifts</h1>
          <p className="text-muted-foreground">{error ?? "Open this app from Telegram to continue."}</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <Toaster theme="dark" richColors position="top-center" />
      <main className="mx-auto max-w-xl px-4 pb-28 pt-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Hello {user.first_name}</p>
            <h1 className="text-3xl font-bold text-gold">Send a gift</h1>
          </div>
          <StarsBadge value={balance} label="balance" />
        </header>

        <section className="mb-8 rounded-3xl border border-primary/20 gradient-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total purchased</p>
              <div className="mt-1 flex items-center gap-2">
                <Star className="h-6 w-6 fill-primary text-primary" />
                <span className="text-3xl font-bold tabular-nums">{purchased.toLocaleString()}</span>
              </div>
            </div>
            <Button
              variant="outline"
              className="border-primary/40 hover:bg-primary/10"
              onClick={() => window.Telegram?.WebApp?.openTelegramLink("https://t.me/")}
            >
              Buy ⭐ in bot
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Send <code className="rounded bg-secondary px-1">/buy</code> to the bot in Telegram to top up.
          </p>
        </section>

        <h2 className="mb-4 text-lg font-semibold">Gift catalog</h2>
        <div className="grid grid-cols-2 gap-4">
          {gifts.map((g) => (
            <button
              key={g.id}
              onClick={() => { setSelected(g); setOpen(true); }}
              className="group relative overflow-hidden rounded-3xl border border-border gradient-card p-3 text-left transition hover:border-primary/40 hover:shadow-gold"
            >
              <div className="aspect-square w-full overflow-hidden rounded-2xl bg-secondary">
                <img src={g.image_url} alt={g.name} className="h-full w-full object-cover transition group-hover:scale-105" />
              </div>
              <div className="mt-3">
                <div className="font-semibold leading-tight">{g.name}</div>
                <div className="mt-1 inline-flex items-center gap-1 text-primary text-sm font-medium">
                  <Star className="h-3.5 w-3.5 fill-primary" /> {g.price_stars}
                </div>
              </div>
            </button>
          ))}
          {gifts.length === 0 && (
            <p className="col-span-2 py-12 text-center text-sm text-muted-foreground">
              No gifts yet. {isAdmin && "Add some in the admin panel."}
            </p>
          )}
        </div>

        <SendGiftDialog open={open} onOpenChange={setOpen} gift={selected} balance={balance} />
      </main>
      <BottomNav isAdmin={isAdmin} />
    </>
  );
}
