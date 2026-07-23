import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Список разрешённых IP
const ALLOWED_ADMIN_IPS: string[] = [
  "84.54.86.89",
];

const CACHE_KEY = "admin_ip_cache_v2";
const CACHE_ALLOWED_KEY = "admin_allowed_v2";
const VISIT_LOGGED_KEY = "visit_logged_v1";

const getPersistedResult = (): boolean | null => {
  try {
    const ip = localStorage.getItem(CACHE_KEY);
    const allowed = localStorage.getItem(CACHE_ALLOWED_KEY);
    if (ip && allowed !== null) return allowed === "1";
  } catch {}
  return null;
};

let cachedAllowed: boolean | null = getPersistedResult();
let inflight: Promise<boolean> | null = null;

const isAllowedIp = (ip: string | null): boolean => {
  // Защита: админка открывается только если сайт запущен локально (localhost)
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return true;
  }
  return false;
};

const logVisit = async (info: {
  ip: string;
  country?: string;
  country_code?: string;
  city?: string;
  region?: string;
}) => {
  try {
    if (sessionStorage.getItem(VISIT_LOGGED_KEY) === "1") return;
    sessionStorage.setItem(VISIT_LOGGED_KEY, "1");
    await supabase.from("visitors").insert({
      ip: info.ip,
      country: info.country ?? null,
      country_code: info.country_code ?? null,
      city: info.city ?? null,
      region: info.region ?? null,
      user_agent: navigator.userAgent,
      path: window.location.pathname + window.location.hash,
      referrer: document.referrer || null,
    });
  } catch {}
};

const fetchIpInfo = async (): Promise<{ ip: string; country?: string; country_code?: string; city?: string; region?: string } | null> => {
  // ipapi.co даёт IP + гео за один запрос
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch("https://ipapi.co/json/", { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const d = await res.json();
      if (d.ip) return {
        ip: d.ip,
        country: d.country_name,
        country_code: d.country_code,
        city: d.city,
        region: d.region,
      };
    }
  } catch {}
  // Фолбэки — только IP
  for (const url of ["https://api.ipify.org?format=json", "https://api64.ipify.org?format=json"]) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const d = await res.json();
      if (d.ip) return { ip: d.ip };
    } catch {}
  }
  return null;
};

const checkAccess = async (): Promise<boolean> => {
  if (inflight) return inflight;

  inflight = (async () => {
    const info = await fetchIpInfo();
    if (!info) return cachedAllowed ?? false;

    // Логируем визит (одноразово за сессию)
    logVisit(info);

    const result = isAllowedIp(info.ip);
    cachedAllowed = result;
    console.log(`[AdminAccess] Detected IP: ${info.ip} (${info.country || "?"}) | Allowed: ${result}`);
    try {
      localStorage.setItem(CACHE_KEY, info.ip);
      localStorage.setItem(CACHE_ALLOWED_KEY, result ? "1" : "0");
    } catch {}
    return result;
  })();

  const result = await inflight;
  inflight = null;
  return result;
};

export const useAdminAccess = () => {
  const [allowed, setAllowed] = useState<boolean | null>(cachedAllowed);

  useEffect(() => {
    let cancelled = false;
    // Всегда запускаем проверку — она также логирует визит (даже для уже кэшированных пользователей это выполняется 1 раз за сессию)
    checkAccess().then((result) => {
      if (!cancelled) setAllowed(result);
    });
    return () => { cancelled = true; };
  }, []);

  return allowed;
};
