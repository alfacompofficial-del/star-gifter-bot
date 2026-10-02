import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Heart, Share2, ShoppingCart, Send, ZoomIn, CheckCircle,
  Check, Pencil, Plus, Trash2, Eye, ArrowUpRight, Package
} from "lucide-react";
import { formatPrice } from "@/lib/constants";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { getProductUrl } from "@/lib/slugify";
import type { Product } from "@/hooks/useProducts";
import { toast } from "sonner";

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
  isAdmin?: boolean;
}

const ProductModal = ({ product, onClose, onAddToCart, isAdmin }: ProductModalProps) => {
  const { exchangeRate } = useExchangeRate();
  const [liked, setLiked] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [isZooming, setIsZooming] = useState(false);
  const imgContainerRef = useRef<HTMLDivElement>(null);

  // Admin: inline price editing
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceValue, setPriceValue] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);

  // Admin: specs editing
  const [specs, setSpecs] = useState<Record<string, string>>({});
  const [editingSpecKey, setEditingSpecKey] = useState<string | null>(null);
  const [editingSpecValue, setEditingSpecValue] = useState("");
  const [addingSpec, setAddingSpec] = useState(false);
  const [newSpecKey, setNewSpecKey] = useState("");
  const [newSpecValue, setNewSpecValue] = useState("");
  const [savingSpec, setSavingSpec] = useState(false);

  useEffect(() => {
    if (!product) return;
    const likes = JSON.parse(localStorage.getItem("liked_products") || "[]");
    setLiked(likes.includes(product.id));
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

    const incrementView = async () => {
      if (isAdmin) return;
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        await supabase.from("products").update({ views: (product.views || 0) + 1 }).eq("id", product.id);
      } catch {}
    };
    incrementView();
  }, [product, isAdmin]);

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

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleLike = useCallback(async () => {
    if (!product) return;
    const likes: number[] = JSON.parse(localStorage.getItem("liked_products") || "[]");
    const isLiking = !likes.includes(product.id);
    const newLikes = isLiking ? [...likes, product.id] : likes.filter((id) => id !== product.id);
    localStorage.setItem("liked_products", JSON.stringify(newLikes));
    setLiked(isLiking);
    try {
      const newGlobalLikes = Math.max(0, (product.likes || 0) + (isLiking ? 1 : -1));
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.from("products").update({ likes: newGlobalLikes }).eq("id", product.id);
      product.likes = newGlobalLikes;
    } catch {}
  }, [product]);

  const handleShare = useCallback(async () => {
    if (!product) return;
    const url = window.location.origin + window.location.pathname + getProductUrl(product.id, product.category).replace("/#", "#");
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, text: `${product.name} — ${formatPrice(Math.round(product.price * exchangeRate))} сум`, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  }, [product, exchangeRate]);

  const handleAddToCart = () => {
    if (!product) return;
    onAddToCart(product);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleBuyNow = () => {
    if (!product) return;
    const text = encodeURIComponent(
      `Заказ из каталога AlfaComp:\nТовар: ${product.name}\nБренд: ${product.brand || "—"}\nЦена: ${formatPrice(Math.round(product.price * exchangeRate))} сум (~$${product.price})\nСтатус: ${product.in_stock ? "В наличии" : "Под заказ"}`
    );
    window.open(`https://t.me/ALIBABO777?text=${text}`, "_blank");
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgContainerRef.current) return;
    const rect = imgContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  };

  // ── Admin Handlers ─────────────────────────────────────────────
  const handlePriceClick = () => {
    if (!isAdmin || !product) return;
    setPriceValue(String(product.price));
    setEditingPrice(true);
  };

  const handlePriceSave = async () => {
    if (!product) return;
    const val = parseFloat(priceValue);
    if (isNaN(val) || val <= 0) { toast.error("Введите корректную цену"); return; }
    setSavingPrice(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.from("products").update({ price: val }).eq("id", product.id);
      if (!error) {
        toast.success("Цена обновлена!");
        product.price = val;
        setEditingPrice(false);
        window.dispatchEvent(new CustomEvent("products-updated"));
      } else {
        toast.error("Ошибка сохранения");
      }
    } catch {
      toast.error("Ошибка соединения");
    }
    setSavingPrice(false);
  };

  const handleEditField = async (field: 'name' | 'brand' | 'category' | 'image', currentValue: string) => {
    if (!isAdmin || !product) return;
    const newValue = window.prompt(`Изменить ${field}:`, currentValue);
    if (newValue !== null && newValue.trim() !== "" && newValue !== currentValue) {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { error } = await supabase.from("products").update({ [field]: newValue.trim() }).eq("id", product.id);
        if (!error) {
          toast.success("Обновлено!");
          (product as any)[field] = newValue.trim();
          window.dispatchEvent(new CustomEvent("products-updated"));
        } else {
          toast.error("Ошибка сохранения");
        }
      } catch {
        toast.error("Ошибка соединения");
      }
    }
  };

  const handleDuplicate = async () => {
    if (!isAdmin || !product) return;
    localStorage.setItem("copied_product", JSON.stringify(product));
    toast.success(`Товар "${product.name}" скопирован в буфер для вставки.`);
    if (!window.confirm("Создать дубликат товара в текущей категории прямо сейчас?")) return;
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { id, created_at, ...productData } = product;
      const { data, error } = await supabase.from("products").insert({
        ...productData,
        name: `${product.name} (Копия)`
      }).select().single();
      if (!error && data) {
        toast.success("Товар продублирован!");
        window.dispatchEvent(new CustomEvent("products-updated"));
        onClose();
      } else {
        toast.error("Ошибка при дублировании");
      }
    } catch {
      toast.error("Ошибка соединения");
    }
  };

  const saveSpecs = async (newSpecs: Record<string, string>) => {
    if (!product) return false;
    setSavingSpec(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.from("products").update({ specs: newSpecs } as any).eq("id", product.id);
      if (!error) {
        setSpecs(newSpecs);
        product.specs = newSpecs;
        window.dispatchEvent(new CustomEvent("products-updated"));
        setSavingSpec(false);
        return true;
      } else {
        toast.error("Ошибка сохранения характеристики");
      }
    } catch {
      toast.error("Ошибка соединения");
    }
    setSavingSpec(false);
    return false;
  };

  const handleEditSpec = (key: string) => {
    setEditingSpecKey(key);
    setEditingSpecValue(specs[key] ?? "");
  };

  const handleSaveSpec = async (key: string) => {
    const updated = { ...specs, [key]: editingSpecValue };
    const ok = await saveSpecs(updated);
    if (ok) { toast.success("Характеристика обновлена!"); setEditingSpecKey(null); }
  };

  const handleDeleteSpec = async (key: string) => {
    const updated = { ...specs };
    delete updated[key];
    const ok = await saveSpecs(updated);
    if (ok) toast.success("Характеристика удалена!");
  };

  const handleAddSpec = async () => {
    const k = newSpecKey.trim();
    const v = newSpecValue.trim();
    if (!k || !v) { toast.error("Введите название и значение"); return; }
    if (specs[k] !== undefined) { toast.error("Такая характеристика уже есть"); return; }
    const updated = { ...specs, [k]: v };
    const ok = await saveSpecs(updated);
    if (ok) {
      toast.success("Характеристика добавлена!");
      setNewSpecKey("");
      setNewSpecValue("");
      setAddingSpec(false);
    }
  };

  const handleToggleStock = async () => {
    if (!isAdmin || !product) return;
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.from("products").update({ in_stock: !product.in_stock }).eq("id", product.id);
      if (!error) {
        product.in_stock = !product.in_stock;
        toast.success(product.in_stock ? "Статус: В наличии" : "Статус: Под заказ");
        window.dispatchEvent(new CustomEvent("products-updated"));
      } else {
        toast.error("Ошибка обновления статуса");
      }
    } catch {
      toast.error("Ошибка соединения");
    }
  };

  if (!product) return null;

  const priceUZS = formatPrice(Math.round(product.price * exchangeRate));
  const oldPriceUZS = product.old_price ? formatPrice(Math.round(product.old_price * exchangeRate)) : null;
  const discount = product.old_price && product.price < product.old_price
    ? Math.round((1 - product.price / product.old_price) * 100)
    : null;

  const DEFAULT_CATEGORY_SPECS: Record<string, Record<string, string>> = {
    "ИБП": {
      "Тип": "Источник бесперебойного питания",
      "Стандарт": "Line-Interactive / Online",
      "Форм-фактор": "Tower",
      "Интерфейс": "USB, RS-232",
      "Защита": "От перегрузки, короткого замыкания, скачков напряжения",
      "Гарантия": "24 месяца",
    },
    "Мониторы": {
      "Тип панели": "Fast IPS / VA",
      "Частота обновления": "144–320 Гц",
      "Время отклика": "1–5 мс",
      "Подсветка": "LED",
      "Подключение": "HDMI 2.1, DisplayPort 1.4",
      "Гарантия": "24 месяца",
    },
    "Сеть": {
      "Стандарт": "Wi-Fi 6 (802.11ax) / Wi-Fi 7",
      "Диапазоны": "2.4 ГГц + 5 ГГц Dual-Band",
      "LAN порты": "Gigabit Ethernet (1000 Mbps)",
      "Безопасность": "WPA3 / WPA2-Personal",
      "Гарантия": "24 месяца",
    },
    "Комплектующие": {
      "Форм-фактор": "ATX / mATX / NVMe M.2",
      "Гарантия": "12–36 месяцев",
    },
    "Моноблоки": {
      "Операционная система": "Windows 11",
      "Хранилище": "Высокоскоростной SSD NVMe",
      "Гарантия": "12 месяцев",
    },
  };

  const categoryDefaults = DEFAULT_CATEGORY_SPECS[product.category] || {};
  const mergedSpecs = { ...categoryDefaults, ...specs };

  const staticSpecs = [
    { key: "Производитель", value: product.brand || "—" },
    { key: "Категория", value: product.category || "—" },
    {
      key: "Склад",
      value: product.in_stock ? "В наличии (Ташкент)" : "Под заказ",
      colorClass: product.in_stock ? "text-[#22c55e]" : "text-red-400"
    },
  ];

  const dynamicSpecEntries = Object.entries(mergedSpecs);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[200] bg-black/88 backdrop-blur-[10px]"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-[201] flex items-center justify-center p-3 sm:p-6 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 10 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="surface-modal relative w-full max-w-4xl max-h-[92vh] overflow-y-auto pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            aria-label="Закрыть"
            className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-lg
              bg-[#181B22] border border-white/[0.09]
              hover:border-white/[0.2] hover:bg-[#20242E]
              flex items-center justify-center text-white/60 hover:text-white
              transition-all duration-150"
          >
            <X className="w-4 h-4" />
          </motion.button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">

            {/* ── LEFT: Image Stage ────────────────────── */}
            <div className="relative bg-[#08090c] p-6 sm:p-8 flex flex-col justify-between
              border-b md:border-b-0 md:border-r border-white/[0.07]">

              {/* Status & admin row */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06, duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center justify-between mb-5"
              >
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-mono font-semibold uppercase tracking-[0.08em] border ${
                  product.in_stock
                    ? "bg-[#22c55e]/08 border-[#22c55e]/22 text-[#22c55e]"
                    : "bg-red-500/08 border-red-500/20 text-red-400"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    product.in_stock ? "bg-[#22c55e] status-dot-pulse" : "bg-red-400"
                  }`} />
                  {product.in_stock ? "В наличии · Ташкент" : "Под заказ"}
                </span>

                {isAdmin && (
                  <button
                    onClick={() => handleEditField('image', product.image)}
                    className="text-[11px] font-mono text-[#FF5A00] flex items-center gap-1 hover:underline opacity-70 hover:opacity-100 transition-opacity"
                    title="Изменить фото"
                  >
                    <Pencil className="w-3 h-3" /> Фото
                  </button>
                )}
              </motion.div>

              {/* Zoomable image — first to appear */}
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.0, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                ref={imgContainerRef}
                className="relative aspect-square flex items-center justify-center p-4 cursor-zoom-in group select-none overflow-hidden"
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setIsZooming(true)}
                onMouseLeave={() => setIsZooming(false)}
                onClick={() => setLightboxOpen(true)}
              >
                {/* Ambient spotlight */}
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: "radial-gradient(ellipse 60% 55% at 50% 50%, rgba(255,90,0,0.04), transparent 70%)" }}
                />

                <img
                  src={product.image}
                  alt={product.name}
                  className="max-w-full max-h-full object-contain relative z-10 transition-all duration-200"
                  style={
                    isZooming
                      ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`, transform: "scale(1.75)" }
                      : {}
                  }
                  onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                />

                {/* Zoom hint */}
                <div className="absolute bottom-2.5 right-2.5 z-20 flex items-center gap-1
                  bg-black/75 border border-white/10 px-2 py-1 rounded
                  text-[10px] font-mono text-white/55
                  pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <ZoomIn className="w-3 h-3" />
                  <span>Увеличить</span>
                </div>
              </motion.div>

              {/* SKU bar */}
              <div className="pt-3.5 border-t border-white/[0.05] flex items-center justify-between">
                <span className="text-data text-[10px] text-white/25 tracking-[0.08em]">
                  SKU: AC-{product.id.toString().padStart(4, '0')}
                </span>
                <div className="flex items-center gap-1 text-data text-[10px] text-white/20">
                  <Package className="w-3 h-3" />
                  <span>ORIGINAL HARDWARE</span>
                </div>
              </div>
            </div>

            {/* ── RIGHT: Info & Actions ─────────────────── */}
            <div className="p-5 sm:p-7 flex flex-col gap-5">

              {/* Admin Control Bar */}
              {isAdmin && (
                <div className="flex items-center justify-between gap-2 p-2.5 bg-[#14171E]
                  border border-white/[0.07] rounded-lg text-[11px] font-mono">
                  <div className="flex items-center gap-3 text-white/50">
                    <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5 text-[#FF5A00]" /> {product.views || 0}</span>
                    <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-red-400" /> {product.likes || 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleToggleStock}
                      className="px-2 py-1 rounded bg-white/8 hover:bg-white/15 text-white font-semibold transition-colors"
                    >
                      {product.in_stock ? "Снять со склада" : "Поставить в наличие"}
                    </button>
                    <button
                      onClick={handleDuplicate}
                      className="px-2 py-1 rounded bg-[#FF5A00]/15 text-[#FF5A00] hover:bg-[#FF5A00]/25 transition-colors"
                    >
                      Дублировать
                    </button>
                  </div>
                </div>
              )}

              {/* Title & Brand */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                <div
                  className={`text-label text-[#FF5A00] mb-2 ${isAdmin ? 'cursor-pointer hover:underline' : ''}`}
                  onClick={() => isAdmin && handleEditField('brand', product.brand || '')}
                  title={isAdmin ? "Изменить бренд" : undefined}
                >
                  {product.brand || "ALFACOMP"}
                  {isAdmin && <Pencil className="w-2.5 h-2.5 inline-block ml-1 opacity-50" />}
                </div>

                <h1
                  className={`text-[1.25rem] sm:text-[1.5rem] font-bold text-white leading-snug mb-1.5 tracking-tight ${isAdmin ? 'cursor-pointer hover:underline' : ''}`}
                  onClick={() => isAdmin && handleEditField('name', product.name)}
                  title={isAdmin ? "Изменить название" : undefined}
                >
                  {product.name}
                  {isAdmin && <Pencil className="w-3 h-3 inline-block ml-1 opacity-50" />}
                </h1>

                <div
                  className={`text-data text-[11px] text-white/35 ${isAdmin ? 'cursor-pointer hover:underline' : ''}`}
                  onClick={() => isAdmin && handleEditField('category', product.category || '')}
                  title={isAdmin ? "Изменить категорию" : undefined}
                >
                  Категория: {product.category || "—"}
                  {isAdmin && <Pencil className="w-2.5 h-2.5 inline-block ml-1 opacity-50" />}
                </div>
              </motion.div>

              {/* Price block */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="p-4 bg-[#0f1117] border border-white/[0.07] rounded-xl"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {oldPriceUZS && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-data text-[11px] text-white/30 line-through">{oldPriceUZS} UZS</span>
                        {discount && (
                          <span className="text-data text-[9px] font-bold px-1.5 py-0.5 rounded
                            bg-[#FF5A00]/15 border border-[#FF5A00]/25 text-[#FF5A00]">
                            −{discount}%
                          </span>
                        )}
                      </div>
                    )}

                    {isAdmin && editingPrice ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-sm text-[#FF5A00]">$</span>
                        <input
                          type="number"
                          value={priceValue}
                          onChange={(e) => setPriceValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handlePriceSave();
                            if (e.key === "Escape") setEditingPrice(false);
                          }}
                          autoFocus
                          className="w-24 bg-[#181B22] border border-[#FF5A00] rounded px-2 py-1
                            text-sm font-mono text-white outline-none"
                        />
                        <button onClick={handlePriceSave} disabled={savingPrice} className="p-1 bg-[#22c55e]/20 text-[#22c55e] rounded">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingPrice(false)} className="p-1 bg-red-500/20 text-red-400 rounded">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div
                        className={`flex items-baseline gap-1.5 ${isAdmin ? "cursor-pointer group/p" : ""}`}
                        onClick={handlePriceClick}
                        title={isAdmin ? "Изменить цену" : undefined}
                      >
                        <span className="text-data text-[1.6rem] sm:text-[1.9rem] font-bold text-white tracking-tight leading-none">
                          {priceUZS}
                        </span>
                        <span className="text-data text-[11px] text-white/40">UZS</span>
                        {isAdmin && <Pencil className="w-3 h-3 text-[#FF5A00] opacity-0 group-hover/p:opacity-100 ml-1" />}
                      </div>
                    )}

                    <div className="text-data text-[11px] text-white/35 mt-1">
                      ≈ ${product.price}
                      <span className="text-white/20 ml-1.5">· 1$ = {exchangeRate.toLocaleString()} UZS</span>
                    </div>
                  </div>

                  {/* Like & Share */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={handleLike}
                      aria-label={liked ? "В избранном" : "Добавить в избранное"}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${
                        liked
                          ? "bg-red-500/15 border-red-500/30 text-red-400"
                          : "bg-white/[0.04] border-white/[0.09] text-white/40 hover:text-white hover:border-white/20"
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${liked ? "fill-current" : ""}`} />
                    </button>
                    <button
                      onClick={handleShare}
                      aria-label="Скопировать ссылку"
                      className="w-8 h-8 rounded-lg flex items-center justify-center border bg-white/[0.04] border-white/[0.09] text-white/40 hover:text-white hover:border-white/20 transition-all"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-[#22c55e]" /> : <Share2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {copied && (
                  <div className="text-data text-[10px] text-[#22c55e] mt-2 pt-2 border-t border-white/[0.05]">
                    Ссылка скопирована в буфер обмена
                  </div>
                )}
              </motion.div>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
              >
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleAddToCart}
                  disabled={!product.in_stock}
                  className={`h-11 px-4 rounded-lg font-semibold text-[12.5px] uppercase tracking-wider
                    flex items-center justify-center gap-2 transition-all ${
                    !product.in_stock
                      ? "bg-white/[0.03] text-white/18 border border-white/[0.05] cursor-not-allowed"
                      : addedToCart
                        ? "bg-[#22c55e] text-white shadow-[0_0_20px_rgba(34,197,94,0.25)]"
                        : "btn-primary shadow-[0_4px_20px_rgba(255,90,0,0.20)]"
                  }`}
                >
                  {addedToCart ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>В корзине</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" />
                      <span>{product.in_stock ? "В корзину" : "Нет в наличии"}</span>
                    </>
                  )}
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleBuyNow}
                  className="btn-ghost h-11 px-4 rounded-lg font-semibold text-[12.5px] uppercase tracking-wider"
                >
                  <Send className="w-3.5 h-3.5 text-[#FF5A00]" />
                  <span>Telegram</span>
                </motion.button>
              </motion.div>

              {/* Technical Specifications */}
              <div className="border-t border-white/[0.07] pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-label">Технические характеристики</span>
                  {isAdmin && (
                    <button
                      onClick={() => { setAddingSpec(true); setNewSpecKey(""); setNewSpecValue(""); }}
                      className="text-[10px] font-mono text-[#FF5A00] flex items-center gap-1 hover:underline opacity-70 hover:opacity-100"
                    >
                      <Plus className="w-3 h-3" /> Добавить
                    </button>
                  )}
                </div>

                <div className="space-y-0.5">
                  {/* Static specs */}
                  {staticSpecs.map(({ key, value, colorClass }) => (
                    <div key={key} className="spec-row">
                      <span className="spec-key">{key}</span>
                      <span className={`spec-val ${colorClass ?? ""}`}>{value}</span>
                    </div>
                  ))}

                  {/* Dynamic specs */}
                  {dynamicSpecEntries.map(([key, value]) => (
                    <div key={key} className="spec-row group/spec">
                      <span className="spec-key">{key}</span>
                      <div className="flex items-center gap-1.5">
                        {isAdmin && editingSpecKey === key ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editingSpecValue}
                              onChange={(e) => setEditingSpecValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveSpec(key);
                                if (e.key === "Escape") setEditingSpecKey(null);
                              }}
                              autoFocus
                              className="w-32 bg-[#181B22] border border-[#FF5A00] rounded px-1.5 py-0.5
                                text-xs font-mono text-white outline-none"
                            />
                            <button onClick={() => handleSaveSpec(key)} disabled={savingSpec} className="p-0.5 text-[#22c55e]">
                              <Check className="w-3 h-3" />
                            </button>
                            <button onClick={() => setEditingSpecKey(null)} className="p-0.5 text-red-400">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span
                              className={`spec-val ${isAdmin ? 'cursor-pointer hover:text-[#FF5A00]' : ''}`}
                              onClick={() => isAdmin && handleEditSpec(key)}
                            >
                              {value}
                            </span>
                            {isAdmin && (
                              <div className="flex items-center gap-1 opacity-0 group-hover/spec:opacity-100 transition-opacity">
                                <button onClick={() => handleEditSpec(key)} className="text-white/35 hover:text-white" title="Изменить">
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button onClick={() => handleDeleteSpec(key)} className="text-white/35 hover:text-red-400" title="Удалить">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Admin: add spec */}
                  {isAdmin && addingSpec && (
                    <div className="p-3 bg-[#14171E] border border-white/[0.09] rounded-lg mt-2 space-y-2">
                      <div className="text-label text-[#FF5A00]">Новая характеристика</div>
                      <input
                        type="text"
                        value={newSpecKey}
                        onChange={(e) => setNewSpecKey(e.target.value)}
                        placeholder="Название (напр: Частота)"
                        className="w-full bg-[#0e1016] border border-white/10 rounded px-2 py-1.5 text-xs font-mono text-white outline-none focus:border-[#FF5A00]/50"
                      />
                      <input
                        type="text"
                        value={newSpecValue}
                        onChange={(e) => setNewSpecValue(e.target.value)}
                        placeholder="Значение (напр: 240 Гц)"
                        className="w-full bg-[#0e1016] border border-white/10 rounded px-2 py-1.5 text-xs font-mono text-white outline-none focus:border-[#FF5A00]/50"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddSpec}
                          disabled={savingSpec}
                          className="px-3 py-1.5 bg-[#FF5A00] hover:bg-[#FF6A15] text-white rounded text-xs font-mono transition-colors"
                        >
                          Сохранить
                        </button>
                        <button
                          onClick={() => setAddingSpec(false)}
                          className="px-3 py-1.5 bg-white/8 text-white/55 hover:text-white rounded text-xs font-mono transition-colors"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[300] bg-black/97 flex items-center justify-center p-4 cursor-zoom-out"
            onClick={() => setLightboxOpen(false)}
          >
            <button
              onClick={() => setLightboxOpen(false)}
              aria-label="Закрыть просмотр"
              className="absolute top-4 right-4 w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20
                flex items-center justify-center text-white z-10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <motion.img
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.22 }}
              src={product.image}
              alt={product.name}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
              onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ProductModal;
