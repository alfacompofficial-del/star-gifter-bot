import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe: any;
        ready: () => void;
        expand: () => void;
        colorScheme: "light" | "dark";
        themeParams: any;
        openTelegramLink: (url: string) => void;
        showAlert: (msg: string) => void;
      };
    };
  }
}

export type TgUser = {
  id: string;
  telegram_id: number;
  username?: string;
  first_name?: string;
  photo_url?: string;
};

export function useTelegramAuth() {
  const [user, setUser] = useState<TgUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        // If session already exists, just hydrate
        const { data: existing } = await supabase.auth.getSession();
        if (existing.session) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("user_id, telegram_id, username, first_name, photo_url")
            .eq("user_id", existing.session.user.id)
            .maybeSingle();
          if (profile && !cancelled) {
            setUser({
              id: profile.user_id,
              telegram_id: Number(profile.telegram_id),
              username: profile.username ?? undefined,
              first_name: profile.first_name ?? undefined,
              photo_url: profile.photo_url ?? undefined,
            });
            setLoading(false);
            return;
          }
        }

        const tg = window.Telegram?.WebApp;
        if (!tg || !tg.initData) {
          setError("Open this app inside Telegram to sign in.");
          setLoading(false);
          return;
        }
        tg.ready();
        tg.expand();

        const { data, error: fnErr } = await supabase.functions.invoke("telegram-auth", {
          body: { initData: tg.initData },
        });
        if (fnErr) throw fnErr;

        if (data?.session) {
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
          if (!cancelled) setUser(data.user);
        } else {
          throw new Error("No session returned");
        }
      } catch (e: any) {
        console.error(e);
        if (!cancelled) setError(e?.message ?? "Authentication failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, []);

  return { user, loading, error };
}
