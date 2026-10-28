import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  X, Heart, Share2, ShoppingCart, Send, ZoomIn, CheckCircle2,
  Check, Pencil, Plus, Trash2, Eye, ChevronRight, ChevronLeft,
  Cpu, HardDrive, Layers, Fan, ShieldCheck,
  MapPin, Sparkles, CircleDot, SlidersHorizontal, Play, Star
} from "lucide-react";
import { resolveProductPrices } from "@/lib/constants";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { getProductUrl, getCategoryUrl } from "@/lib/slugify";
import type { Product } from "@/hooks/useProducts";
import { useProductRating } from "@/hooks/useProductRating";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { clearProductsCache, broadcastProductsUpdate } from "@/lib/productsDb";

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
  isAdmin?: boolean;
}

type ModalTab = "overview" | "specs" | "warranty";

const DEFAULT_CATEGORY_SPECS: Record<string, Record<string, string>> = {
  "Видеокарты": {
    "Графический процессор": "NVIDIA GeForce RTX",
    "Память": "32 ГБ GDDR7X",
    "Интерфейс": "PCI Express 5.0",
    "Охлаждение": "Тройной вентилятор",
    "Гарантия": "До 36 месяцев",
  },
  "Комплектующие": {
    "Графический процессор": "Высокопроизводительный чипсет",
    "Память": "Высокоскоростная память DDR5 / PCIe",
    "Интерфейс": "PCI Express 5.0 / M.2 NVMe",
    "Охлаждение": "Эффективный радиатор",
    "Гарантия": "12–36 месяцев",
  },
  "Мониторы": {
    "Тип панели": "Fast IPS / OLED / VA",
    "Память": "144–360 Гц частота обновления",
    "Интерфейс": "HDMI 2.1, DisplayPort 1.4",
    "Охлаждение": "Пассивное охлаждение корпуса",
    "Гарантия": "24–36 месяцев",
  },
  "ИБП": {
    "Графический процессор": "Line-Interactive / Online микропроцессор",
    "Память": "Встроенный аккумулятор Ion",
    "Интерфейс": "USB, RS-232, LCD экран",
    "Охлаждение": "Интеллектуальный вентилятор",
    "Гарантия": "24 месяца",
  },
  "Сеть": {
    "Графический процессор": "Сетевой процессор Quad-Core",
    "Память": "Wi-Fi 6 (802.11ax) / Wi-Fi 7 Dual-Band",
    "Интерфейс": "Gigabit Ethernet (1000 Mbps)",
    "Охлаждение": "Пассивная вентиляция",
    "Гарантия": "24 месяца",
  },
  "Wi-Fi роутеры": {
    "Графический процессор": "Двухъядерный CPU с аппаратным ускорением",
    "Память": "Wi-Fi 6 / Wi-Fi 7 Dual-Band до 5400 Мбит/с",
    "Интерфейс": "Gigabit WAN + 4x LAN",
    "Охлаждение": "Решётчатый радиаторный корпус",
    "Гарантия": "24 месяца",
  },
  "Компьютеры": {
    "Графический процессор": "NVIDIA GeForce RTX 50-серии",
    "Память": "32–64 ГБ DDR5 Kingston Fury",
    "Интерфейс": "PCI Express 5.0 / Wi-Fi 6E",
    "Охлаждение": "Жидкостное СЖО / 3x ARGB",
    "Гарантия": "36 месяцев",
  },
  "Моноблоки": {
    "Графический процессор": "Intel Core i5 / i7 с графикой Iris Xe",
    "Память": "16 ГБ DDR4/DDR5 + 512 ГБ SSD NVMe",
    "Интерфейс": "USB-C, HDMI, Gigabit LAN, Wi-Fi",
    "Охлаждение": "Турбинный кулер с низким уровнем шума",
    "Гарантия": "12–24 месяца",
  },
};

const ProductModal = ({ product, onClose, onAddToCart, isAdmin }: ProductModalProps) => {
  const { exchangeRate } = useExchangeRate();
  const [activeTab, setActiveTab] = useState<ModalTab>("overview");
  const [liked, setLiked] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  // Rating hook
  const { userRating, averageRating, ratingCount, isSubmitting, submitRating } =
    useProductRating({
      productId: product?.id || 0,
      initialRating: product?.rating,
      initialRatingCount: product?.rating_count,
    });
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  // Admin inline editing
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceValue, setPriceValue] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);
  const [specs, setSpecs] = useState<Record<string, string>>({});
  const [editingSpecKey, setEditingSpecKey] = useState<string | null>(null);
  const [editingSpecValue, setEditingSpecValue] = useState("");
  const [addingSpec, setAddingSpec] = useState(false);
  const [newSpecKey, setNewSpecKey] = useState("");
  const [newSpecValue, setNewSpecValue] = useState("");
  const [savingSpec, setSavingSpec] = useState(false);

  useEffect(() => {
    if (!product) return;
    try {
      const likes = JSON.parse(localStorage.getItem("liked_products") || "[]");
      setLiked(likes.includes(product.id));
    } catch {}
  }, [product]);

  useEffect(() => {
    if (!product) return;

    let normalizedSpecs: Record<string, string> = {};
    if (Array.isArray(product.specs)) {
      product.specs.forEach((s: any) => {
        if (s && typeof s === "object" && s.key) {
          normalizedSpecs[s.key] = s.value || "";
        }
      });
    } else if (product.specs && typeof product.specs === "object") {
      normalizedSpecs = product.specs as Record<string, string>;
    }

    setSpecs(normalizedSpecs);
    setEditingPrice(false);
    setEditingSpecKey(null);
    setAddingSpec(false);

    // Track views
    const incrementView = async () => {
      if (isAdmin) return;
      try {
        await supabase
          .from("products")
          .update({ views: (product.views || 0) + 1 } as never)
          .eq("id", product.id);
      } catch {}
    };
    incrementView();
  }, [product, isAdmin]);

  // Handle ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (lightboxOpen) setLightboxOpen(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, lightboxOpen]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleLike = useCallback(async () => {
    if (!product) return;
    try {
      const likes: number[] = JSON.parse(localStorage.getItem("liked_products") || "[]");
      const nextLiked = !liked;
      setLiked(nextLiked);

      if (nextLiked) {
        localStorage.setItem("liked_products", JSON.stringify([...likes, product.id]));
        toast.success("Добавлено в избранное");
        await supabase
          .from("products")
          .update({ likes: (product.likes || 0) + 1 } as never)
          .eq("id", product.id);
      } else {
        localStorage.setItem("liked_products", JSON.stringify(likes.filter((id) => id !== product.id)));
        toast.info("Удалено из избранного");
        await supabase
          .from("products")
          .update({ likes: Math.max(0, (product.likes || 1) - 1) } as never)
          .eq("id", product.id);
      }
    } catch {}
  }, [product, liked]);

  const handleShare = useCallback(() => {
    if (!product) return;
    const url = `https://alfacomp.uz${getProductUrl(product)}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Ссылка скопирована в буфер обмена");
      setTimeout(() => setCopied(false), 2500);
    }
  }, [product]);

  const handleAddToCart = () => {
    if (!product) return;
    onAddToCart(product);
    setAddedToCart(true);
    toast.success("Товар добавлен в корзину!");
    setTimeout(() => setAddedToCart(false), 2400);
  };

  const handleBuyNow = () => {
    if (!product) return;
    const { formattedUZS } = resolveProductPrices(product.price, exchangeRate || 14000);
    const text = encodeURIComponent(
      `Здравствуйте! Хочу уточнить наличие товара в AlfaComp:\n\n📦 ${product.name}\n💰 Цена: ${formattedUZS} сум\n🔗 https://alfacomp.uz${getProductUrl(product)}`
    );
    window.open(`https://t.me/ALIBABO777?text=${text}`, "_blank");
  };

  const handleStarClick = async (starIndex: number) => {
    if (isSubmitting) return;
    await submitRating(starIndex);
  };

  const handlePriceClick = () => {
    if (!isAdmin || !product) return;
    const { priceUSD } = resolveProductPrices(product.price, exchangeRate || 14000);
    setPriceValue(priceUSD !== null ? String(priceUSD) : String(product.price));
    setEditingPrice(true);
  };

  const handlePriceSave = async () => {
    if (!product) return;
    const num = parseFloat(priceValue);
    if (isNaN(num) || num < 0) {
      toast.error("Введите корректную цену");
      return;
    }
    setSavingPrice(true);
    try {
      const { error } = await supabase.from("products").update({ price: num }).eq("id", product.id);
      if (!error) {
        product.price = num;
        setEditingPrice(false);
        toast.success(`Цена обновлена: $${num}`);
        await clearProductsCache();
        broadcastProductsUpdate();
      } else {
        toast.error("Ошибка сохранения цены");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setSavingPrice(false);
    }
  };

  const handleToggleStock = async () => {
    if (!isAdmin || !product) return;
    try {
      const { error } = await supabase.from("products").update({ in_stock: !product.in_stock }).eq("id", product.id);
      if (!error) {
        product.in_stock = !product.in_stock;
        toast.success(product.in_stock ? "Статус: В наличии" : "Статус: Под заказ");
        await clearProductsCache();
        broadcastProductsUpdate();
      } else {
        toast.error("Ошибка обновления статуса");
      }
    } catch {
      toast.error("Ошибка соединения");
    }
  };

  const handleSaveSpec = async (key: string) => {
    if (!product) return;
    setSavingSpec(true);
    try {
      const updated = { ...specs, [key]: editingSpecValue };
      const { error } = await supabase.from("products").update({ specs: updated }).eq("id", product.id);
      if (!error) {
        setSpecs(updated);
        product.specs = updated;
        setEditingSpecKey(null);
        toast.success(`Характеристика "${key}" обновлена`);
        await clearProductsCache();
        broadcastProductsUpdate();
      } else {
        toast.error("Ошибка сохранения характеристики");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setSavingSpec(false);
    }
  };

  const handleAddSpec = async () => {
    if (!product || !newSpecKey.trim()) return;
    setSavingSpec(true);
    try {
      const updated = { ...specs, [newSpecKey.trim()]: newSpecValue.trim() };
      const { error } = await supabase.from("products").update({ specs: updated }).eq("id", product.id);
      if (!error) {
        setSpecs(updated);
        product.specs = updated;
        setAddingSpec(false);
        setNewSpecKey("");
        setNewSpecValue("");
        toast.success("Характеристика добавлена");
        await clearProductsCache();
        broadcastProductsUpdate();
      } else {
        toast.error("Ошибка добавления характеристики");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setSavingSpec(false);
    }
  };

  const handleDeleteSpec = async (key: string) => {
    if (!product) return;
    const updated = { ...specs };
    delete updated[key];
    try {
      const { error } = await supabase.from("products").update({ specs: updated }).eq("id", product.id);
      if (!error) {
        setSpecs(updated);
        product.specs = updated;
        toast.success(`Характеристика "${key}" удалена`);
        await clearProductsCache();
        broadcastProductsUpdate();
      } else {
        toast.error("Ошибка удаления");
      }
    } catch {
      toast.error("Ошибка сети");
    }
  };

  if (!product) return null;

  const { formattedUZS: priceUZS, priceUSD: priceUSDRef } = resolveProductPrices(
    product.price,
    exchangeRate || 14000
  );

  const categoryDefaults = DEFAULT_CATEGORY_SPECS[product.category] || DEFAULT_CATEGORY_SPECS["Видеокарты"];
  const mergedSpecs = { ...categoryDefaults, ...specs };
  const specEntries = Object.entries(mergedSpecs);

  // 4 Main showcase specs mapped to modern tech icons
  const showcaseSpecs = [
    {
      icon: Cpu,
      label: "Графический процессор",
      value: mergedSpecs["Графический процессор"] || mergedSpecs["Процессор"] || product.name,
    },
    {
      icon: HardDrive,
      label: "Память",
      value: mergedSpecs["Память"] || mergedSpecs["Оперативная память"] || mergedSpecs["Хранилище"] || "Высокоскоростная GDDR",
    },
    {
      icon: Layers,
      label: "Интерфейс",
      value: mergedSpecs["Интерфейс"] || mergedSpecs["Подключение"] || "PCI Express 5.0",
    },
    {
      icon: Fan,
      label: "Охлаждение",
      value: mergedSpecs["Охлаждение"] || mergedSpecs["Форм-фактор"] || "Тройной вентилятор",
    },
  ];

  return (
    <>
      {/* Dark Blurred Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[200] bg-black/92 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Main Modal Dialog */}
      <div className="fixed inset-0 z-[201] flex items-center justify-center p-2 sm:p-4 md:p-6 pointer-events-none overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-[1280px] max-h-[95vh] bg-[#050814] border border-[#0066ff]/30 rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_0_90px_rgba(0,102,255,0.25)] pointer-events-auto flex flex-col text-white my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Ambient Lighting Behind Components */}
          <div className="absolute top-0 left-1/4 w-[500px] h-[300px] bg-[#0066ff]/15 blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-[450px] h-[300px] bg-[#00d2ff]/12 blur-[120px] pointer-events-none" />

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TOP SECTION: Breadcrumbs, Big Title, Status, and Close Cross Button */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          <div className="relative z-10 px-6 pt-5 pb-3 sm:px-8 sm:pt-6 sm:pb-3 flex items-start justify-between gap-4">
            <div className="min-w-0 pr-10">
              {/* Breadcrumbs */}
              <nav aria-label="Хлебные крошки" className="flex items-center gap-1.5 text-xs text-[#64748b] mb-1.5 font-medium flex-wrap">
                <Link to="/" onClick={onClose} className="hover:text-[#00d2ff] transition-colors">
                  Главная
                </Link>
                <span>/</span>
                <Link
                  to={getCategoryUrl(product.category)}
                  onClick={onClose}
                  className="hover:text-[#00d2ff] transition-colors"
                >
                  {product.category || "Видеокарты"}
                </Link>
                <span>/</span>
                <span className="text-[#94a3b8] truncate max-w-[200px] sm:max-w-md">{product.name}</span>
              </nav>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight mb-2">
                {product.name}
              </h1>

              {/* In-Stock Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-[#06231a] border border-[#10b981]/40 text-[#34d399] shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                <span>{product.in_stock ? "В наличии" : "Под заказ"}</span>
              </div>
            </div>

            {/* EXIT CROSS BUTTON ("крестик чтобы выйти") */}
            <button
              onClick={onClose}
              aria-label="Закрыть окно"
              title="Закрыть"
              className="w-10 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.14] border border-white/10 hover:border-[#00d2ff]/50 flex items-center justify-center text-white/70 hover:text-white transition-all duration-200 active:scale-95 shadow-lg group z-30 shrink-0"
            >
              <X className="w-5 h-5 transition-transform group-hover:rotate-90 duration-200" />
            </button>
          </div>

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* MAIN 3-COLUMN CONTENT AREA                                       */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          <div className="relative z-10 flex-1 overflow-y-auto px-4 py-3 sm:px-8 sm:py-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

              {/* ── LEFT COLUMN: Navigation Tabs & Rating Card ─────────────── */}
              <div className="lg:col-span-3 flex flex-col justify-between gap-4">
                {/* 3 Nav Tabs */}
                <div className="space-y-2">
                  <button
                    onClick={() => setActiveTab("overview")}
                    className={`w-full px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-between ${
                      activeTab === "overview"
                        ? "text-white bg-[#0066ff]/20 border border-[#00d2ff] shadow-[0_0_20px_rgba(0,102,255,0.35)]"
                        : "text-white/60 hover:text-white hover:bg-white/[0.04] border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CircleDot className={`w-4 h-4 ${activeTab === "overview" ? "text-[#00d2ff]" : "text-white/40"}`} />
                      <span>Обзор</span>
                    </div>
                    {activeTab === "overview" && <ChevronRight className="w-4 h-4 text-[#00d2ff]" />}
                  </button>

                  <button
                    onClick={() => setActiveTab("specs")}
                    className={`w-full px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-between ${
                      activeTab === "specs"
                        ? "text-white bg-[#0066ff]/20 border border-[#00d2ff] shadow-[0_0_20px_rgba(0,102,255,0.35)]"
                        : "text-white/60 hover:text-white hover:bg-white/[0.04] border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <SlidersHorizontal className={`w-4 h-4 ${activeTab === "specs" ? "text-[#00d2ff]" : "text-white/40"}`} />
                      <span>Характеристики</span>
                    </div>
                    {activeTab === "specs" && <ChevronRight className="w-4 h-4 text-[#00d2ff]" />}
                  </button>

                  <button
                    onClick={() => setActiveTab("warranty")}
                    className={`w-full px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-between ${
                      activeTab === "warranty"
                        ? "text-white bg-[#0066ff]/20 border border-[#00d2ff] shadow-[0_0_20px_rgba(0,102,255,0.35)]"
                        : "text-white/60 hover:text-white hover:bg-white/[0.04] border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ShieldCheck className={`w-4 h-4 ${activeTab === "warranty" ? "text-[#00d2ff]" : "text-white/40"}`} />
                      <span>Гарантия</span>
                    </div>
                    {activeTab === "warranty" && <ChevronRight className="w-4 h-4 text-[#00d2ff]" />}
                  </button>
                </div>

                {/* Rating Card matching the mockup */}
                <div className="bg-[#070e1c] border border-white/[0.08] rounded-2xl p-4 space-y-3">
                  {/* Rating value and stars */}
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-white">{averageRating.toFixed(1)}</span>
                    <span className="text-xs text-white/40 font-medium">/ 5.0</span>
                  </div>

                  <div className="flex items-center gap-1 text-[#0080ff]">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          averageRating >= i - 0.2 ? "fill-[#0080ff] text-[#0080ff]" : "text-white/20 fill-white/[0.05]"
                        }`}
                      />
                    ))}
                  </div>

                  <div className="text-xs text-white/50">
                    На основе {ratingCount > 0 ? ratingCount : 12} отзывов
                  </div>

                  {/* Interactive Star Voting */}
                  <div className="pt-2 border-t border-white/[0.06]">
                    <div className="text-[11px] text-white/50 mb-1.5">Оценить товар:</div>
                    <div className="flex items-center gap-1.5" onMouseLeave={() => setHoverRating(null)}>
                      {[1, 2, 3, 4, 5].map((s) => {
                        const active = (hoverRating ?? userRating ?? 0) >= s;
                        return (
                          <button
                            key={s}
                            type="button"
                            onMouseEnter={() => setHoverRating(s)}
                            onClick={() => handleStarClick(s)}
                            disabled={isSubmitting}
                            className="p-0.5 focus:outline-none transition-transform hover:scale-125"
                            title={`Поставить ${s} звёзд`}
                          >
                            <Star
                              className={`w-4 h-4 transition-colors ${
                                active ? "fill-[#00d2ff] text-[#00d2ff]" : "text-white/30"
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Favorite & Share Buttons */}
                  <div className="pt-2 border-t border-white/[0.06] flex items-center gap-2">
                    <button
                      onClick={handleLike}
                      className={`flex-1 py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-semibold transition-all ${
                        liked
                          ? "bg-red-500/15 border-red-500/40 text-red-400"
                          : "bg-white/[0.04] border-white/10 text-white/70 hover:text-white hover:bg-white/[0.08]"
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${liked ? "fill-current text-red-400" : ""}`} />
                      <span>{liked ? "В избранном" : "Избранное"}</span>
                    </button>

                    <button
                      onClick={handleShare}
                      title="Скопировать ссылку"
                      className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white/70 hover:text-white hover:bg-white/[0.08] transition-all"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-[#22c55e]" /> : <Share2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* ── CENTER COLUMN: Showcase Stage Card ────────────────────── */}
              <div className="lg:col-span-5 flex flex-col justify-between bg-gradient-to-b from-[#091326]/75 via-[#060c18]/90 to-[#030610] border border-[#0066ff]/25 rounded-2xl p-5 relative min-h-[460px] overflow-hidden">
                {/* Top Right Showcase Controls */}
                <div className="flex items-center justify-between w-full mb-2">
                  <div className="text-[11px] font-mono text-white/40 tracking-wider uppercase">
                    ORIGINAL HARDWARE
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setActivePhotoIdx((p) => Math.max(0, p - 1))}
                      className="w-7 h-7 rounded-full bg-black/50 border border-white/10 hover:border-[#00d2ff]/40 flex items-center justify-center text-white/50 hover:text-white transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setActivePhotoIdx((p) => (p + 1) % 4)}
                      className="w-7 h-7 rounded-full bg-black/50 border border-white/10 hover:border-[#00d2ff]/40 flex items-center justify-center text-white/50 hover:text-white transition-all"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* View switcher between Overview and Full Specs */}
                {activeTab === "overview" && (
                  <>
                    {/* Centered Product Stage with Ambient Cyan Spotlight */}
                    <div
                      className="relative flex-1 flex items-center justify-center p-4 cursor-zoom-in group select-none min-h-[280px]"
                      onClick={() => setLightboxOpen(true)}
                    >
                      {/* Cyan Spotlight */}
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background:
                            "radial-gradient(circle at 50% 50%, rgba(0, 160, 255, 0.28) 0%, rgba(0, 90, 220, 0.10) 50%, transparent 75%)",
                        }}
                      />

                      <img
                        src={product.image}
                        alt={`${product.name} — AlfaComp`}
                        className="max-h-[290px] w-auto max-w-full object-contain filter drop-shadow-[0_20px_45px_rgba(0,0,0,0.9)] group-hover:scale-105 transition-transform duration-300 relative z-10"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.svg";
                        }}
                      />
                    </div>

                    {/* Bottom Thumbnail Strip matching mockup */}
                    <div className="pt-3 border-t border-white/[0.06] flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                      <div
                        onClick={() => setActivePhotoIdx(0)}
                        className={`w-14 h-12 rounded-xl bg-black/60 p-1 flex items-center justify-center cursor-pointer transition-all ${
                          activePhotoIdx === 0
                            ? "border-2 border-[#00d2ff] shadow-[0_0_12px_rgba(0,210,255,0.4)]"
                            : "border border-white/10 hover:border-white/30 opacity-70"
                        }`}
                      >
                        <img src={product.image} alt="Ракурс 1" className="max-h-full object-contain" />
                      </div>

                      <div
                        onClick={() => setActivePhotoIdx(1)}
                        className={`w-14 h-12 rounded-xl bg-black/60 p-1 flex items-center justify-center cursor-pointer transition-all ${
                          activePhotoIdx === 1
                            ? "border-2 border-[#00d2ff] shadow-[0_0_12px_rgba(0,210,255,0.4)]"
                            : "border border-white/10 hover:border-white/30 opacity-70"
                        }`}
                      >
                        <img src={product.image} alt="Ракурс 2" className="max-h-full object-contain scale-110" />
                      </div>

                      <div
                        onClick={() => setActivePhotoIdx(2)}
                        className={`w-14 h-12 rounded-xl bg-black/60 p-1 flex items-center justify-center cursor-pointer transition-all ${
                          activePhotoIdx === 2
                            ? "border-2 border-[#00d2ff] shadow-[0_0_12px_rgba(0,210,255,0.4)]"
                            : "border border-white/10 hover:border-white/30 opacity-70"
                        }`}
                      >
                        <img src={product.image} alt="Ракурс 3" className="max-h-full object-contain scale-125" />
                      </div>

                      <div
                        onClick={() => setActivePhotoIdx(3)}
                        className={`w-14 h-12 rounded-xl bg-black/60 p-1 flex items-center justify-center cursor-pointer transition-all ${
                          activePhotoIdx === 3
                            ? "border-2 border-[#00d2ff] shadow-[0_0_12px_rgba(0,210,255,0.4)]"
                            : "border border-white/10 hover:border-white/30 opacity-70"
                        }`}
                      >
                        <img src={product.image} alt="Ракурс 4" className="max-h-full object-contain scale-95" />
                      </div>

                      {/* Video Thumbnail Box with Play Icon */}
                      <div
                        onClick={() => setLightboxOpen(true)}
                        title="Просмотреть видео/обзор"
                        className="w-14 h-12 rounded-xl bg-black/60 border border-white/10 hover:border-[#00d2ff]/60 flex items-center justify-center text-white/50 hover:text-[#00d2ff] cursor-pointer transition-all"
                      >
                        <Play className="w-4 h-4 fill-current" />
                      </div>
                    </div>
                  </>
                )}

                {activeTab === "specs" && (
                  <div className="flex-1 flex flex-col justify-start text-left overflow-y-auto pr-1 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                      <span className="font-bold text-sm text-white flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-[#00d2ff]" />
                        <span>Все характеристики</span>
                      </span>
                      {isAdmin && (
                        <button
                          onClick={() => setAddingSpec(true)}
                          className="px-2.5 py-1 rounded bg-[#0066ff]/20 text-[#00d2ff] text-xs font-mono flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Добавить
                        </button>
                      )}
                    </div>

                    <div className="divide-y divide-white/[0.06] text-xs">
                      {specEntries.map(([k, v]) => (
                        <div key={k} className="py-2.5 flex items-center justify-between gap-3 group">
                          <span className="text-white/50">{k}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white/90 text-right">{v}</span>
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteSpec(k)}
                                className="opacity-0 group-hover:opacity-100 text-red-400 p-0.5"
                                title="Удалить"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {isAdmin && addingSpec && (
                      <div className="p-3 rounded-xl bg-[#0b1326] border border-blue-500/30 space-y-2 mt-2">
                        <input
                          type="text"
                          placeholder="Название"
                          value={newSpecKey}
                          onChange={(e) => setNewSpecKey(e.target.value)}
                          className="w-full bg-[#050811] border border-white/10 rounded px-2 py-1 text-xs text-white"
                        />
                        <input
                          type="text"
                          placeholder="Значение"
                          value={newSpecValue}
                          onChange={(e) => setNewSpecValue(e.target.value)}
                          className="w-full bg-[#050811] border border-white/10 rounded px-2 py-1 text-xs text-white"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleAddSpec}
                            disabled={savingSpec}
                            className="px-3 py-1 rounded bg-[#0066ff] text-white text-xs font-semibold"
                          >
                            Сохранить
                          </button>
                          <button
                            onClick={() => setAddingSpec(false)}
                            className="px-3 py-1 rounded bg-white/10 text-white text-xs"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "warranty" && (
                  <div className="flex-1 flex flex-col justify-start text-left text-xs space-y-3 pt-2">
                    <div className="font-bold text-sm text-white flex items-center gap-2 pb-2 border-b border-white/[0.08]">
                      <ShieldCheck className="w-4 h-4 text-[#22c55e]" />
                      <span>Гарантийное обслуживание</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#070e1c] border border-white/[0.07] space-y-1.5">
                      <div className="font-semibold text-white">Официальная гарантия до 36 месяцев</div>
                      <div className="text-white/60 leading-relaxed">
                        Все комплектующие поставляются в запечатанной оригинальной упаковке от официальных дистрибьюторов с гарантийным талоном.
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#070e1c] border border-white/[0.07] space-y-1.5">
                      <div className="font-semibold text-white">Пункт выдачи и проверка при покупке</div>
                      <div className="text-white/60 leading-relaxed">
                        Самовывоз и бесплатная проверка товара на специализированном стенде в Ташкенте (базар Малика, блок А27).
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── RIGHT COLUMN: Specs & Purchase Panel ─────────────────── */}
              <div className="lg:col-span-4 flex flex-col justify-between gap-5 bg-[#060c18]/95 border border-[#0066ff]/25 rounded-2xl p-6 backdrop-blur-md shadow-xl">
                {/* Header: ХАРАКТЕРИСТИКИ */}
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-[#00d2ff] flex items-center gap-2 pb-3 mb-4 border-b border-white/[0.07]">
                    <Sparkles className="w-4 h-4" />
                    <span className="font-bold">ХАРАКТЕРИСТИКИ</span>
                  </div>

                  {/* 4 Spec Rows */}
                  <div className="space-y-4">
                    {showcaseSpecs.map((item, idx) => {
                      const IconComp = item.icon;
                      return (
                        <div key={idx} className="flex items-start gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-[#0066ff]/15 border border-[#0066ff]/30 flex items-center justify-center text-[#00d2ff] shrink-0 mt-0.5">
                            <IconComp className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] text-white/45 font-medium leading-none mb-1.5">
                              {item.label}
                            </div>
                            <div className="text-sm font-bold text-white tracking-tight truncate">
                              {item.value}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Price, Trust info and CTAs */}
                <div className="pt-4 border-t border-white/[0.08]">
                  {/* Price Row */}
                  {isAdmin && editingPrice ? (
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-mono text-sm text-[#00d2ff]">$</span>
                      <input
                        type="number"
                        value={priceValue}
                        onChange={(e) => setPriceValue(e.target.value)}
                        placeholder="USD"
                        className="w-28 bg-[#050811] border border-[#0066ff] rounded px-2 py-1 text-sm text-white font-mono outline-none"
                      />
                      <button
                        onClick={handlePriceSave}
                        disabled={savingPrice}
                        className="p-1.5 bg-[#22c55e]/20 text-[#22c55e] rounded"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingPrice(false)}
                        className="p-1.5 bg-red-500/20 text-red-400 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`flex items-baseline gap-2 mb-2 ${isAdmin ? "cursor-pointer group" : ""}`}
                      onClick={handlePriceClick}
                      title={isAdmin ? "Кликните для изменения цены (в USD)" : undefined}
                    >
                      <span className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none drop-shadow-[0_2px_12px_rgba(0,102,255,0.3)]">
                        {priceUZS}
                      </span>
                      <span className="text-sm font-semibold text-white/50">сум</span>
                      {isAdmin && <Pencil className="w-3.5 h-3.5 text-[#00d2ff] opacity-0 group-hover:opacity-100 ml-1 transition-opacity" />}
                    </div>
                  )}

                  {priceUSDRef && (
                    <div className="text-[11px] font-mono text-white/40 mb-3.5">
                      ≈ ${priceUSDRef} · 1$ = {exchangeRate ? exchangeRate.toLocaleString() : "14 000"} UZS
                    </div>
                  )}

                  {/* Trust Details (Гарантия & Малика А27) */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-white/70 mb-4">
                    <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-[#091428]/80 border border-white/[0.06]">
                      <ShieldCheck className="w-4 h-4 text-[#22c55e] shrink-0" />
                      <span className="truncate">Гарантия до 36 мес</span>
                    </div>
                    <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-[#091428]/80 border border-white/[0.06]">
                      <MapPin className="w-4 h-4 text-[#00d2ff] shrink-0" />
                      <span className="truncate">Малика, блок А27</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2.5">
                    {/* Primary Button */}
                    <button
                      onClick={handleAddToCart}
                      disabled={!product.in_stock}
                      className={`w-full h-12 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-between px-5 active:scale-[0.98] ${
                        !product.in_stock
                          ? "bg-white/[0.04] text-white/30 border border-white/10 cursor-not-allowed"
                          : addedToCart
                            ? "bg-[#22c55e] text-white shadow-[0_0_24px_rgba(34,197,94,0.4)]"
                            : "bg-gradient-to-r from-[#0066ff] to-[#0080ff] hover:from-[#0052cc] hover:to-[#0070f3] text-white shadow-[0_8px_30px_rgba(0,102,255,0.45)] hover:shadow-[0_10px_36px_rgba(0,102,255,0.65)] hover:-translate-y-0.5"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {addedToCart ? <CheckCircle2 className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
                        <span>{product.in_stock ? (addedToCart ? "В корзине!" : "Уточнить наличие / В корзину") : "Нет в наличии"}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-80" />
                    </button>

                    {/* Secondary Button */}
                    <button
                      onClick={handleBuyNow}
                      className="w-full h-11 rounded-xl font-semibold text-xs sm:text-sm tracking-wide text-white/90 bg-[#0066ff]/10 hover:bg-[#0066ff]/20 border border-[#0066ff]/30 hover:border-[#00d2ff]/50 flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
                    >
                      <Send className="w-4 h-4 text-[#00d2ff]" />
                      <span>Связаться в Telegram</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </motion.div>
      </div>

      {/* Lightbox / Zoom Fullscreen Preview */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
            onClick={() => setLightboxOpen(false)}
          >
            <button
              onClick={() => setLightboxOpen(false)}
              aria-label="Закрыть"
              className="absolute top-5 right-5 w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <motion.img
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ duration: 0.22 }}
              src={product.image}
              alt={product.name}
              className="max-w-full max-h-full object-contain filter drop-shadow-[0_20px_50px_rgba(0,102,255,0.3)]"
              onClick={(e) => e.stopPropagation()}
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.svg";
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ProductModal;
