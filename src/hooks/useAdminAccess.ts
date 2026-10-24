import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Список разрешённых IP
const ALLOWED_ADMIN_IPS: string[] = [
  "213.230.78.107",
  "144.124.196.27", // Новый IP
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

const isLocalhost = (): boolean => {
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
};

const isAllowedIp = (ip: string | null): boolean => {
  if (!ip) return false;
  const normalized = ip.replace(/^::ffff:/, "");
  return ALLOWED_ADMIN_IPS.includes(normalized);
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

export const isUserAdmin = (): boolean => {
  if (typeof window === "undefined") return false;
  if (isLocalhost()) return true;
  try {
    if (sessionStorage.getItem("alfacomp_admin_auth") === "1") return true;
    if (localStorage.getItem("alfacomp_admin_auth") === "1") return true;
  } catch {}
  return cachedAllowed === true;
};

const checkAccess = async (): Promise<boolean> => {
  if (isUserAdmin()) return true;
  // Instant access on localhost — no IP fetch needed
  if (isLocalhost()) {
    cachedAllowed = true;
    try {
      localStorage.setItem(CACHE_KEY, "localhost");
      localStorage.setItem(CACHE_ALLOWED_KEY, "1");
    } catch {}
    return true;
  }

  if (inflight) return inflight;

  inflight = (async () => {
    const info = await fetchIpInfo();
    if (!info) return isUserAdmin() || (cachedAllowed ?? false);

    // Логируем визит (одноразово за сессию)
    logVisit(info);

    const result = isAllowedIp(info.ip) || isUserAdmin();
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
  const [allowed, setAllowed] = useState<boolean | null>(() => {
    if (isUserAdmin()) return true;
    return isLocalhost() ? true : cachedAllowed;
  });

  useEffect(() => {
    const handleAuthChange = () => {
      setAllowed(isUserAdmin() ? true : cachedAllowed);
    };

    window.addEventListener("admin-auth-changed", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);

    let cancelled = false;
    checkAccess().then((result) => {
      if (!cancelled) {
        setAllowed(isUserAdmin() ? true : result);
      }
    });

    return () => {
      cancelled = true;
      window.removeEventListener("admin-auth-changed", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, []);

  return isUserAdmin() ? true : allowed;
};
