import { useState } from "react";
import { Helmet } from "react-helmet-async";
import Header from "@/components/store/Header";
import Footer from "@/components/store/Footer";
import CartModal from "@/components/store/CartModal";
import { useCart } from "@/hooks/useCart";
import { motion } from "framer-motion";
import {
  Download as DownloadIcon,
  Monitor,
  Smartphone,
  CheckCircle2,
  Zap,
  Shield,
  Star,
} from "lucide-react";

const PC_URL =
  "https://pvbjuttgvegjfhuqlrsw.supabase.co/storage/v1/object/public/dsf//alfacomp.exe";
const APK_URL =
  "https://pvbjuttgvegjfhuqlrsw.supabase.co/storage/v1/object/public/dsf//app-debug.apk";

const DownloadPage = () => {
  const cart = useCart();
  const [downloading, setDownloading] = useState<"pc" | "apk" | null>(null);

  const handleDownload = (type: "pc" | "apk") => {
    setDownloading(type);
    const url = type === "pc" ? PC_URL : APK_URL;
    const a = document.createElement("a");
    a.href = url;
    a.download = type === "pc" ? "alfacomp.exe" : "alfacomp.apk";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => setDownloading(null), 2500);
  };

  const pcFeatures = [
    "Мгновенный доступ с рабочего стола",
    "Удобный интерфейс без вкладок браузера",
    "Быстрые уведомления о новых поступлениях",
    "Поддержка Windows 10 / 11",
  ];

  const apkFeatures = [
    "Управляйте заказами прямо с телефона",
    "Push-уведомления о статусе заказа",
    "Оптимизировано для Android 8+",
    "Компактный размер, быстрая загрузка",
  ];

  const softwareJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "AlfaComp для Windows",
      operatingSystem: "Windows 10, Windows 11",
      applicationCategory: "BusinessApplication",
      downloadUrl: PC_URL,
      offers: { "@type": "Offer", price: "0", priceCurrency: "UZS" },
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "AlfaComp для Android",
      operatingSystem: "Android 8+",
      applicationCategory: "BusinessApplication",
      downloadUrl: APK_URL,
      offers: { "@type": "Offer", price: "0", priceCurrency: "UZS" },
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Скачать приложение AlfaComp для Windows и Android</title>
        <meta name="description" content="Скачайте AlfaComp для Windows 10/11 и Android 8+. Удобный доступ к каталогу, заказам и уведомлениям." />
        <link rel="canonical" href="https://star-gift-anon.lovable.app/download" />
        <meta property="og:title" content="Скачать AlfaComp — приложения для Windows и Android" />
        <meta property="og:description" content="Десктопное приложение и APK для Android. Управляйте заказами AlfaComp с компьютера и телефона." />
        <meta property="og:url" content="https://star-gift-anon.lovable.app/download" />
        <script type="application/ld+json">{JSON.stringify(softwareJsonLd)}</script>
      </Helmet>
      <Header cartCount={cart.count} onCartClick={() => cart.setIsOpen(true)} />

      <main className="pt-28 pb-20">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center px-4 mb-16"
        >
          <span className="text-xs font-semibold uppercase tracking-[3px] text-primary mb-3 block">
            Скачать приложение
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold gradient-text mb-4">
            AlfaComp Apps
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Выберите платформу и начните пользоваться AlfaComp ещё удобнее
          </p>
        </motion.div>

        {/* Cards */}
        <div className="container max-w-5xl mx-auto px-4 grid md:grid-cols-2 gap-8">
          {/* PC Card */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="glass rounded-2xl p-8 flex flex-col gap-6 border border-primary/20 hover:border-primary/50 transition-all group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-radial-glow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center glow-primary">
                <Monitor className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Для компьютера</h2>
                <p className="text-sm text-muted-foreground">Windows 10 / 11</p>
              </div>
            </div>

            <ul className="space-y-3 flex-1">
              {pcFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-3 text-xs text-muted-foreground border-t border-border/50 pt-4">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span>Файл: <strong className="text-foreground">alfacomp.exe</strong></span>
            </div>

            <button
              onClick={() => handleDownload("pc")}
              disabled={downloading === "pc"}
              className="w-full h-13 py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2
                bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95
                transition-all glow-primary disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {downloading === "pc" ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Загрузка...
                </>
              ) : (
                <>
                  <DownloadIcon className="w-4 h-4" />
                  Скачать для Windows (.exe)
                </>
              )}
            </button>
          </motion.div>

          {/* Android Card */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass rounded-2xl p-8 flex flex-col gap-6 border border-secondary/20 hover:border-secondary/50 transition-all group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-radial-glow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-secondary/10 flex items-center justify-center glow-accent">
                <Smartphone className="w-7 h-7 text-secondary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Для Android</h2>
                <p className="text-sm text-muted-foreground">Android 8.0+</p>
              </div>
            </div>

            <ul className="space-y-3 flex-1">
              {apkFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-secondary mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-3 text-xs text-muted-foreground border-t border-border/50 pt-4">
              <Shield className="w-4 h-4 text-green-400" />
              <span>Файл: <strong className="text-foreground">app-debug.apk</strong> — разрешите установку из неизвестных источников</span>
            </div>

            <button
              onClick={() => handleDownload("apk")}
              disabled={downloading === "apk"}
              className="w-full h-13 py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2
                bg-secondary text-secondary-foreground hover:bg-secondary/90 active:scale-95
                transition-all glow-accent disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {downloading === "apk" ? (
                <>
                  <div className="w-4 h-4 border-2 border-secondary-foreground border-t-transparent rounded-full animate-spin" />
                  Загрузка...
                </>
              ) : (
                <>
                  <DownloadIcon className="w-4 h-4" />
                  Скачать для Android (.apk)
                </>
              )}
            </button>
          </motion.div>
        </div>

        {/* Badge row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-wrap justify-center gap-6 mt-14 px-4"
        >
          {[
            { icon: <Star className="w-4 h-4 text-yellow-400" />, text: "Бесплатно" },
            { icon: <Shield className="w-4 h-4 text-green-400" />, text: "Безопасно" },
            { icon: <Zap className="w-4 h-4 text-primary" />, text: "Быстро" },
          ].map((b) => (
            <div
              key={b.text}
              className="flex items-center gap-2 glass rounded-full px-5 py-2 text-sm font-medium"
            >
              {b.icon}
              {b.text}
            </div>
          ))}
        </motion.div>
      </main>

      <Footer />
      <CartModal
        isOpen={cart.isOpen}
        onClose={() => cart.setIsOpen(false)}
        items={cart.items}
        total={cart.total}
        onUpdateQuantity={cart.updateQuantity}
        onRemove={cart.removeItem}
        onClear={cart.clearCart}
      />
    </div>
  );
};

export default DownloadPage;
