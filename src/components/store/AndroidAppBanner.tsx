import { useState, useEffect } from "react";
import { Download, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const APK_URL =
  "https://kpuqkdodgcspopidfuat.supabase.co/storage/v1/object/public/app//app-debug.apk";
const STORAGE_KEY = "alfacomp_android_banner_dismissed";

/**
 * Проверяет, запущен ли сайт уже внутри мобильного приложения (WebView / APK / PWA)
 */
const checkIfInsideApp = (): boolean => {
  if (typeof window === "undefined") return false;

  try {
    // 1. PWA / Standalone режим (если запущено как отдельное приложение)
    if (
      window.matchMedia &&
      window.matchMedia("(display-mode: standalone)").matches
    ) {
      return true;
    }
    if ((navigator as any).standalone) {
      return true;
    }

    // 2. Параметр в URL (?app=1, ?is_app=true, ?source=app)
    const search = window.location.search.toLowerCase();
    if (
      search.includes("app=1") ||
      search.includes("is_app=1") ||
      search.includes("app=true") ||
      search.includes("webview=1")
    ) {
      return true;
    }

    // 3. Определение встроенного Android WebView по официальному стандарту Google
    // В Chrome Android WebView всегда присутствует токен '; wv' или 'Version/X.X ... Chrome'
    const ua = (navigator.userAgent || navigator.vendor || "").toLowerCase();
    const isAndroidWebView =
      /\bwv\b/i.test(ua) ||
      /;\s*wv/i.test(ua) ||
      (ua.includes("android") && /version\/[0-9.]+/i.test(ua) && ua.includes("chrome"));

    if (isAndroidWebView) {
      return true;
    }

    // 4. Определение JS-моста Android WebView (если приложение пробрасывает объект)
    if (
      (window as any).Android ||
      (window as any).AndroidBridge ||
      (window as any).JSBridge ||
      (window as any).Capacitor ||
      (window as any).ReactNativeWebView
    ) {
      return true;
    }
  } catch {
    // Безопасный фолбэк
  }

  return false;
};

/**
 * Проверяет, нужно ли показывать баннер скачивания Android
 */
const shouldShowAndroidBanner = (): boolean => {
  if (typeof window === "undefined") return false;

  // 1. Ручной тестовый параметр (?android=1 или ?android_preview=1) для отладки
  const search = window.location.search;
  if (search.includes("android=1") || search.includes("android_preview=1")) {
    return true;
  }

  // 2. Если пользователь уже нажал «Отмена» в этой сессии
  try {
    if (sessionStorage.getItem(STORAGE_KEY) === "1") {
      return false;
    }
  } catch {}

  // 3. Если сайт уже открыт ВНУТРИ самого Android-приложения (WebView) — баннер скрываем!
  if (checkIfInsideApp()) {
    return false;
  }

  const ua = (navigator.userAgent || navigator.vendor || "").toLowerCase();

  // 4. Строгая проверка на iOS (iPhone, iPad, iPod) — для Apple баннер НЕ показываем!
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  if (isIOS) {
    return false;
  }

  // 5. Проверка на реальный браузер Android (Chrome, Samsung Internet, Firefox и т.д.)
  const isAndroid = /android/i.test(ua);
  return isAndroid;
};

const AndroidAppBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(shouldShowAndroidBanner());
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {}
  };

  const handleDownload = () => {
    try {
      const a = document.createElement("a");
      a.href = APK_URL;
      a.download = "alfacomp.apk";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Началась загрузка приложения AlfaComp для Android!");
    } catch {
      window.location.href = APK_URL;
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.aside
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative z-50 overflow-hidden bg-gradient-to-r from-[#0d1017] via-[#121622] to-[#0d1017] border-b border-[#1565C0]/30 shadow-[0_4px_20px_rgba(0,0,0,0.6)]"
          aria-label="Предложение скачать приложение AlfaComp для Android"
        >
          {/* Subtle accent glow line at top */}
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#1565C0]/60 to-transparent pointer-events-none" />

          <div className="w-full max-w-[1540px] mx-auto px-2.5 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4">
            {/* Left: App Info */}
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
              <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#181c28] border border-white/10 flex items-center justify-center shrink-0 shadow-sm">
                <img
                  src="/logo.png"
                  alt="AlfaComp"
                  className="w-4 h-4 sm:w-5 sm:h-5 object-contain"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#181c28]" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 leading-tight">
                  <span className="text-[12px] sm:text-[13px] font-bold text-white tracking-tight truncate">
                    AlfaComp
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[9.5px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#1565C0]/15 text-[#1565C0] border border-[#1565C0]/25 font-bold shrink-0">
                    <Smartphone className="w-2.5 h-2.5" /> Android
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-white/55 truncate leading-tight mt-0.5 hidden xs:block">
                  Быстрый каталог и заказы
                </p>
              </div>
            </div>

            {/* Right: Actions (always visible and never clipped) */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-[#1565C0] hover:bg-[#1976D2] active:scale-95 text-white text-[11px] sm:text-[12px] font-bold tracking-tight shadow-md shadow-[#1565C0]/20 transition-all shrink-0"
              >
                <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span>Скачать</span>
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] sm:text-[11.5px] font-medium text-white/60 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all border border-white/[0.1] shrink-0"
              >
                Отмена
              </button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

export default AndroidAppBanner;
