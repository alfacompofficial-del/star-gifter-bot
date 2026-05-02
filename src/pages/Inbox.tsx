import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";
import { useIsAdmin } from "@/hooks/useStarsBalance";
import { BottomNav } from "@/components/BottomNav";
import { Star, Sparkles } from "lucide-react";

type Incoming = {
  id: string;
  price_stars: number;
  is_opened: boolean;
  created_at: string;
  gift: { name: string; image_url: string; description: string | null } | null;
};

export default function Inbox() {
  const { user, loading } = useTelegramAuth();
  const isAdmin = useIsAdmin(user?.id);
  const [items, setItems] = useState<Incoming[]>([]);
  const [overlay, setOverlay] = useState<{ image: string | null; message: string } | null>(null);

  useEffect(() => {
    if (!user) return;

    async function load() {
      // SECURITY: never select sender_id
      const { data } = await supabase
        .from("transactions")
        .select("id, price_stars, is_opened, created_at, gift:gifts(name, image_url, description)")
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false });
      setItems((data as any) ?? []);
    }
    load();

    const channel = supabase
      .channel(`inbox-${user.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions", filter: `recipient_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  async function open(item: Incoming) {
    if (!item.is_opened) {
      await supabase.from("transactions").update({ is_opened: true, opened_at: new Date().toISOString() }).eq("id", item.id);
    }
    const { data: settings } = await supabase
      .from("app_settings")
      .select("gift_received_image_url, gift_received_message")
      .eq("id", 1)
      .single();
    setOverlay({
      image: settings?.gift_received_image_url ?? item.gift?.image_url ?? null,
      message: settings?.gift_received_message ?? "🎁 You received an anonymous gift!",
    });
  }

  if (loading || !user) return null;

  return (
    <>
      <main className="mx-auto max-w-xl px-4 pb-28 pt-8">
        <h1 className="mb-6 text-3xl font-bold text-gold">Inbox</h1>
        {items.length === 0 ? (
          <div className="grid place-items-center py-20 text-center">
            <Sparkles className="h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">No gifts yet. They'll appear here magically ✨</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((it) => (
              <li key={it.id}>
                <button
                  onClick={() => open(it)}
                  className="flex w-full items-center gap-4 rounded-2xl border border-border gradient-card p-3 text-left transition hover:border-primary/40"
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-secondary">
                    <img src={it.gift?.image_url ?? ""} alt="" className="h-full w-full object-cover" />
                    {!it.is_opened && (
                      <span className="absolute -right-1 -top-1 inline-flex h-3 w-3 rounded-full bg-primary shadow-gold" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{it.gift?.name ?? "Anonymous gift"}</div>
                    <div className="text-xs text-muted-foreground">
                      from <span className="italic">someone</span> · {new Date(it.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-1 text-primary font-medium">
                    <Star className="h-4 w-4 fill-primary" />{it.price_stars}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      {overlay && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-background/90 backdrop-blur-xl px-6"
          onClick={() => setOverlay(null)}
        >
          <div className="max-w-sm space-y-6 text-center">
            {overlay.image && (
              <img src={overlay.image} alt="" className="mx-auto max-h-80 rounded-3xl shadow-gold animate-float" />
            )}
            <h2 className="text-2xl font-bold text-gold">{overlay.message}</h2>
            <p className="text-sm text-muted-foreground">Tap anywhere to close</p>
          </div>
        </div>
      )}

      <BottomNav isAdmin={isAdmin} />
    </>
  );
}
