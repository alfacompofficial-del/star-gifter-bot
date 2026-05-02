import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";
import { useIsAdmin } from "@/hooks/useStarsBalance";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast, Toaster } from "sonner";
import { Trash2, Upload, Star } from "lucide-react";

type Gift = {
  id: string;
  name: string;
  description: string | null;
  price_stars: number;
  image_url: string;
  is_active: boolean;
  sort_order: number;
};

export default function Admin() {
  const { user, loading } = useTelegramAuth();
  const isAdmin = useIsAdmin(user?.id);
  const [gifts, setGifts] = useState<Gift[]>([]);

  // settings
  const [groupId, setGroupId] = useState("");
  const [recvMsg, setRecvMsg] = useState("");
  const [recvImg, setRecvImg] = useState("");

  // new gift
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPrice, setNewPrice] = useState<number>(50);

  async function loadAll() {
    const [{ data: g }, { data: s }] = await Promise.all([
      supabase.from("gifts").select("*").order("sort_order"),
      supabase.from("app_settings").select("*").eq("id", 1).single(),
    ]);
    setGifts(g ?? []);
    setGroupId(s?.notification_group_id ?? "");
    setRecvMsg(s?.gift_received_message ?? "");
    setRecvImg(s?.gift_received_image_url ?? "");
  }

  useEffect(() => { if (isAdmin) loadAll(); }, [isAdmin]);

  async function uploadFile(file: File, prefix: string): Promise<string | null> {
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${prefix}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("gift-assets").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    if (error) { toast.error(error.message); return null; }
    const { data: pub } = supabase.storage.from("gift-assets").getPublicUrl(path);
    return pub.publicUrl;
  }

  async function createGift(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const file = (form.elements.namedItem("image") as HTMLInputElement).files?.[0];
    if (!file) return toast.error("Pick an image");
    const url = await uploadFile(file, "gifts");
    if (!url) return;
    const { error } = await supabase.from("gifts").insert({
      name: newName, description: newDesc || null, price_stars: newPrice, image_url: url,
      sort_order: gifts.length,
    });
    if (error) return toast.error(error.message);
    toast.success("Gift created");
    setNewName(""); setNewDesc(""); setNewPrice(50); form.reset();
    loadAll();
  }

  async function toggleActive(g: Gift) {
    await supabase.from("gifts").update({ is_active: !g.is_active }).eq("id", g.id);
    loadAll();
  }

  async function deleteGift(id: string) {
    if (!confirm("Delete gift?")) return;
    await supabase.from("gifts").delete().eq("id", id);
    loadAll();
  }

  async function uploadReceivedImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file, "received");
    if (url) setRecvImg(url);
  }

  async function saveSettings() {
    const { error } = await supabase
      .from("app_settings")
      .update({
        notification_group_id: groupId || null,
        gift_received_message: recvMsg || null,
        gift_received_image_url: recvImg || null,
      })
      .eq("id", 1);
    if (error) toast.error(error.message);
    else toast.success("Settings saved");
  }

  async function registerWebhook() {
    const url = prompt(
      "Webhook URL (e.g. https://<project-ref>.supabase.co/functions/v1/telegram-webhook):",
    );
    if (!url) return;
    const { data, error } = await supabase.functions.invoke("set-telegram-webhook", {
      body: { webhook_url: url },
    });
    if (error) toast.error(error.message);
    else toast.success(JSON.stringify(data));
  }

  if (loading) return null;
  if (!isAdmin) {
    return (
      <main className="grid min-h-screen place-items-center">
        <p className="text-muted-foreground">Admin only.</p>
      </main>
    );
  }

  return (
    <>
      <Toaster theme="dark" richColors position="top-center" />
      <main className="mx-auto max-w-xl px-4 pb-28 pt-8 space-y-8">
        <h1 className="text-3xl font-bold text-gold">Admin panel</h1>

        {/* Settings */}
        <Card className="gradient-card border-primary/20 p-5 space-y-4">
          <h2 className="text-lg font-semibold">App settings</h2>
          <div className="space-y-2">
            <Label>Notification group ID</Label>
            <Input value={groupId} onChange={(e) => setGroupId(e.target.value)} placeholder="-1001234567890" />
            <p className="text-xs text-muted-foreground">Add the bot to your group as admin, then paste the group's chat ID here.</p>
          </div>
          <div className="space-y-2">
            <Label>"Gift received" message</Label>
            <Textarea value={recvMsg} onChange={(e) => setRecvMsg(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>"Gift received" image</Label>
            <div className="flex items-center gap-3">
              {recvImg && <img src={recvImg} alt="" className="h-16 w-16 rounded-xl object-cover" />}
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-primary/40 px-3 py-2 text-sm hover:bg-primary/5">
                <Upload className="h-4 w-4" />
                Upload
                <input type="file" accept="image/*" className="hidden" onChange={uploadReceivedImage} />
              </label>
              {recvImg && <Button variant="ghost" size="sm" onClick={() => setRecvImg("")}>Clear</Button>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={saveSettings} className="gradient-gold text-primary-foreground font-semibold">Save settings</Button>
            <Button variant="outline" onClick={registerWebhook}>Register bot webhook</Button>
          </div>
        </Card>

        {/* New gift */}
        <Card className="gradient-card border-primary/20 p-5 space-y-4">
          <h2 className="text-lg font-semibold">Add gift to catalog</h2>
          <form onSubmit={createGift} className="space-y-3">
            <Input placeholder="Gift name" value={newName} onChange={(e) => setNewName(e.target.value)} required />
            <Textarea placeholder="Description (optional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Price (⭐)</Label>
                <Input type="number" min={1} value={newPrice} onChange={(e) => setNewPrice(Number(e.target.value))} required />
              </div>
              <div>
                <Label>Image</Label>
                <Input type="file" name="image" accept="image/*" required />
              </div>
            </div>
            <Button type="submit" className="w-full gradient-gold text-primary-foreground font-semibold">Create gift</Button>
          </form>
        </Card>

        {/* Gift list */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Catalog ({gifts.length})</h2>
          {gifts.map((g) => (
            <div key={g.id} className="flex items-center gap-3 rounded-2xl border border-border gradient-card p-3">
              <img src={g.image_url} alt={g.name} className="h-14 w-14 rounded-xl object-cover" />
              <div className="flex-1">
                <div className="font-medium">{g.name}</div>
                <div className="inline-flex items-center gap-1 text-sm text-primary">
                  <Star className="h-3 w-3 fill-primary" />{g.price_stars}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => toggleActive(g)}>
                {g.is_active ? "Hide" : "Show"}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => deleteGift(g.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </section>
      </main>
      <BottomNav isAdmin={isAdmin} />
    </>
  );
}
