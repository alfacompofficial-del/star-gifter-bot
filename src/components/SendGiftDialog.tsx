import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { toast } from "sonner";

type Gift = {
  id: string;
  name: string;
  description: string | null;
  price_stars: number;
  image_url: string;
};

export function SendGiftDialog({
  open,
  onOpenChange,
  gift,
  balance,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  gift: Gift | null;
  balance: number;
}) {
  const [recipient, setRecipient] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => { if (!open) setRecipient(""); }, [open]);

  async function send() {
    if (!gift) return;
    const tgId = Number(recipient.trim().replace(/^@?/, ""));
    if (!tgId || Number.isNaN(tgId)) {
      toast.error("Enter a valid Telegram numeric ID");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-gift", {
        body: { gift_id: gift.id, recipient_telegram_id: tgId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Gift sent anonymously 🎁");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not send gift");
    } finally {
      setSending(false);
    }
  }

  if (!gift) return null;
  const insufficient = balance < gift.price_stars;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gradient-card border-primary/20">
        <DialogHeader>
          <DialogTitle className="text-gold text-2xl">Send anonymously</DialogTitle>
          <DialogDescription>
            The recipient will never see who sent the gift.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 rounded-2xl border border-border bg-secondary/40 p-4">
          <img src={gift.image_url} alt={gift.name} className="h-20 w-20 rounded-xl object-cover" />
          <div className="flex-1">
            <div className="font-semibold">{gift.name}</div>
            {gift.description && <div className="text-xs text-muted-foreground">{gift.description}</div>}
            <div className="mt-1 inline-flex items-center gap-1 text-primary font-medium">
              <Star className="h-4 w-4 fill-primary" /> {gift.price_stars}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Recipient Telegram ID</label>
          <Input
            inputMode="numeric"
            placeholder="e.g. 123456789"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            The recipient must have opened this app at least once.
          </p>
        </div>

        {insufficient && (
          <p className="text-sm text-destructive">
            Not enough stars. Top up via the bot — send /buy to it.
          </p>
        )}

        <Button
          onClick={send}
          disabled={sending || insufficient || !recipient}
          className="gradient-gold text-primary-foreground font-semibold shadow-gold hover:opacity-90"
        >
          {sending ? "Sending…" : `Send for ${gift.price_stars} ⭐`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
