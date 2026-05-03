import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const getSessionId = () => {
  let id = sessionStorage.getItem("visitor_session_id");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("visitor_session_id", id);
  }
  return id;
};

export const useVisitorTracking = () => {
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const sessionId = getSessionId();

    const register = async () => {
      const { data } = await supabase
        .from("visitors")
        .select("id")
        .eq("session_id", sessionId)
        .maybeSingle();

      if (data) {
        await supabase
          .from("visitors")
          .update({ is_online: true, last_seen: new Date().toISOString() })
          .eq("session_id", sessionId);
      } else {
        await supabase
          .from("visitors")
          .insert({ session_id: sessionId, is_online: true });
      }
    };

    register();

    // Heartbeat every 30s
    intervalRef.current = setInterval(async () => {
      await supabase
        .from("visitors")
        .update({ last_seen: new Date().toISOString(), is_online: true })
        .eq("session_id", sessionId);
    }, 30000);

    const handleUnload = () => {
      supabase
        .from("visitors")
        .update({ is_online: false })
        .eq("session_id", sessionId)
        .then(() => {});
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      clearInterval(intervalRef.current);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);
};
