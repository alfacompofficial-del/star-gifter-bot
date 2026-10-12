import { Plus, Check, Star, Heart, Share2, Pencil, Eye, ShieldCheck, Zap } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { resolveProductPrices } from "@/lib/constants";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { getProductUrl } from "@/lib/slugify";
import type { Product } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onProductClick?: (product: Product) => void;
  isAdmin?: boolean;
  onPriceUpdate?: (id: number, newPrice: number) => void;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}

const ProductCard = ({
  product,
  onAddToCart,
  onProductClick,
  isAdmin,
  onPriceUpdate,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver: onDragOverProp,
  onDrop,
  onDragEnd,
}: ProductCardProps) => {
  const { exchangeRate } = useExchangeRate();
  const [added, setAdded] = useState(false);
  const [liked, setLiked] = useState(() => {
    try {
      const likes = JSON.parse(localStorage.getItem("liked_products") || "[]");
      return Array.isArray(likes) && likes.includes(product.id);
    } catch {
      return false;
    }
  });
  const [copied, setCopied] = useState(false);

  // Admin: inline price editing
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceValue, setPriceValue] = useState(String(product.price));
  const [savingPrice, setSavingPrice] = useState(false);

  // Extract key hardware specification tags for prominent display
  const specBadges = useMemo(() => {
    const badges: string[] = [];
    if (product.specs && typeof product.specs === "object") {
      const entries = Object.entries(product.specs).slice(0, 3);
      for (const [, val] of entries) {
        if (val && typeof val === "string" && val.length > 1 && val.length < 24) {
          badges.push(val);
        }
      }
    }
    if (badges.length === 0) {
      // Intelligently parse key hardware terms from name
      const matches = product.name.match(
        /\b(2K|4K|OLED|IPS|VA|144Hz|165Hz|180Hz|200Hz|240Hz|280Hz|360Hz|12GB|16GB|24GB|32GB|DDR5|DDR4|NVMe|PCIe\s*4\.0|Wi-Fi\s*6|Wi-Fi\s*7|RTX\s*\d{4}|Curved|G-Sync|FreeSync)\b/gi
      );
      if (matches) {
        badges.push(...Array.from(new Set(matches)).slice(0, 3));
      }
    }
    return badges;
  }, [product.specs, product.name]);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  const handleLike = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        const likes: number[] = JSON.parse(localStorage.getItem("liked_products") || "[]");
        const newLikes = likes.includes(product.id)
          ? likes.filter((id) => id !== product.id)
          : [...likes, product.id];
        localStorage.setItem("liked_products", JSON.stringify(newLikes));
        setLiked(newLikes.includes(product.id));
      } catch {}
    },
    [product.id]
  );

  const productUrl = getProductUrl(product);

  const handleShare = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      const url = `${window.location.origin}${productUrl}`;
      const shareData = {
        title: product.name,
        text: `${product.name} — ${resolveProductPrices(product.price, exchangeRate || 14000).formattedUZS} сум в AlfaComp`,
        url,
      };
      try {
        if (navigator.share) {
          await navigator.share(shareData);
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
        } catch {
          /* silent */
        }
      }
    },
    [product, exchangeRate, productUrl]
  );

  const handleCardClick = () => {
    if (editingPrice) return;
    onProductClick?.(product);
  };

  // Admin: price edit handlers
  const handlePriceClick = (e: React.MouseEvent) => {
    if (!isAdmin) return;
    e.stopPropagation();
    setPriceValue(String(product.price));
    setEditingPrice(true);
  };

  const handlePriceSave = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    const val = parseFloat(priceValue);
    if (isNaN(val) || val <= 0) {
      toast.error("Введите корректную цену");
      return;
    }
    setSavingPrice(true);
    try {
      const { error } = await supabase.from("products").update({ price: val } as never).eq("id", product.id);
      if (!error) {
        toast.success("Цена обновлена!");
        onPriceUpdate?.(product.id, val);
        setEditingPrice(false);
      } else {
        toast.error("Ошибка сохранения");
      }
    } catch {
      toast.error("Ошибка соединения");
    }
    setSavingPrice(false);
  };

  const handlePriceCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPrice(false);
  };

  const handlePriceKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handlePriceSave(e);
    if (e.key === "Escape") {
      e.stopPropagation();
      setEditingPrice(false);
    }
  };

  // Resolve prices: DB may store USD (e.g. 33) or UZS (e.g. 394350) — resolveProductPrices handles both
  const { formattedUZS: priceUZS, priceUSD: priceUSDRef } = resolveProductPrices(product.price, exchangeRate || 14000);
  const oldPriceUZS = product.old_price
    ? resolveProductPrices(product.old_price, exchangeRate || 14000).formattedUZS
    : null;
  const discount =
    product.old_price && product.price < product.old_price
      ? Math.round((1 - product.price / product.old_price) * 100)
      : null;

  return (
    <article
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleCardClick()}
      aria-label={`Открыть товар: ${product.name}`}
      onDragOver={isAdmin ? onDragOverProp : undefined}
      onDrop={isAdmin ? onDrop : undefined}
      className={`group relative flex flex-col h-full
        bg-[#0c0e14] rounded-xl border
        transition-all duration-300 ease-out cursor-pointer overflow-hidden
        ${isDragging ? "opacity-30 scale-[0.98]" : ""}
        ${
          isDragOver
            ? "border-[#ff5a00] shadow-[0_0_0_1px_rgba(255,90,0,0.35)]"
            : "border-white/[0.08] hover:border-white/[0.20] hover:shadow-[0_16px_40px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,90,0,0.18)] hover:-translate-y-[3px]"
        }`}
      style={{ willChange: "transform" }}
    >
      {/* Specular hairline top reflection */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.18] to-transparent pointer-events-none z-10" />

      {/* Admin drag handle */}
      {isAdmin && (
        <div
          className="absolute top-0 inset-x-0 z-30 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-[#141722] border border-white/20 text-[#ff5a00] text-[9px] font-mono px-3 py-0.5 rounded-b uppercase tracking-wider backdrop-blur-sm shadow-md">
            ⠿ Порядок
          </div>
        </div>
      )}

      {/* ── Studio Hardware Stage ─────────────────────────────── */}
      <div
        className="relative bg-gradient-to-b from-[#08090d] to-[#0a0c12] flex items-center justify-center p-5 sm:p-6 overflow-hidden border-b border-white/[0.06]"
        style={{ aspectRatio: "1/1" }}
      >
        {/* Subtle radial studio illumination behind hardware */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30 group-hover:opacity-100 transition-opacity duration-700 ease-out"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 55%, rgba(255,90,0,0.12) 0%, rgba(255,90,0,0.02) 45%, transparent 75%)",
          }}
        />

        {/* Ambient hardware grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none opacity-40 group-hover:opacity-80 transition-opacity" />

        <img
          src={product.image}
          alt={`${product.name} — купить в Ташкенте AlfaComp`}
          className="max-w-full max-h-full object-contain relative z-10
            transition-transform duration-500 group-hover:scale-[1.04]"
          style={{ willChange: "transform", transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder.svg";
          }}
        />

        {/* ── Badges (Top-Left) ── */}
        <div className="absolute top-2.5 left-2.5 z-20 flex flex-col gap-1.5 pointer-events-none">
          {product.in_stock ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 backdrop-blur-sm shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              В наличии
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.05] text-white/50 border border-white/[0.08] backdrop-blur-sm">
              Под заказ
            </span>
          )}

          {product.priority && product.priority < 10 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#ff5a00]/15 text-[#ff6a1a] border border-[#ff5a00]/30 backdrop-blur-sm shadow-sm">
              <Star className="w-2.5 h-2.5 fill-current" />
              ТОП
            </span>
          )}

          {discount && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-[#ff5a00] text-white shadow-sm">
              −{discount}%
            </span>
          )}

          {/* Admin analytics */}
          {isAdmin && (
            <div className="flex gap-1 mt-0.5 pointer-events-auto">
              <span className="bg-black/80 border border-white/10 text-white/70 text-[10px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1">
                <Eye className="w-2.5 h-2.5 text-[#ff5a00]" /> {product.views || 0}
              </span>
              <span className="bg-black/80 border border-white/10 text-white/70 text-[10px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1">
                <Heart className="w-2.5 h-2.5 text-red-400" /> {product.likes || 0}
              </span>
            </div>
          )}
        </div>

        {/* ── Like & Share Actions (Top-Right) ── */}
        <div className="absolute top-2.5 right-2.5 z-20 flex flex-col gap-1.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={handleLike}
            aria-label="Добавить в избранное"
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-all border ${
              liked
                ? "bg-red-500/20 border-red-500/40 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                : "bg-[#0f1117]/90 border-white/10 text-white/50 hover:text-white hover:border-white/30 backdrop-blur-sm"
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${liked ? "fill-current" : ""}`} />
          </button>

          <button
            onClick={handleShare}
            aria-label="Поделиться товаром"
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-all border ${
              copied
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                : "bg-[#0f1117]/90 border-white/10 text-white/50 hover:text-white hover:border-white/30 backdrop-blur-sm"
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick View Button on Desktop Hover */}
        <div className="absolute inset-x-0 bottom-3 flex justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-20 pointer-events-none hidden sm:flex">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#141722]/90 border border-white/20 text-white/80 text-[11px] font-medium backdrop-blur-md shadow-lg">
            <Eye className="w-3 h-3 text-[#ff5a00]" />
            Быстрый просмотр
          </span>
        </div>

        {/* Copied toast notification */}
        <AnimatePresence>
          {copied && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 bg-black/90
                text-emerald-400 text-[10px] font-mono px-2.5 py-1 rounded border border-emerald-500/30
                whitespace-nowrap shadow-lg pointer-events-none"
            >
              Ссылка скопирована
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Product Information Body ────────────────────────────────── */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        {/* Brand & Category Micro-bar */}
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-white/40">
          <span className="font-semibold text-white/60">{product.brand || "ALFACOMP"}</span>
          <span className="truncate max-w-[120px]">{product.category}</span>
        </div>

        {/* Semantic H3 Product Title */}
        <h3 className="text-[13px] font-semibold text-white/95 leading-snug line-clamp-2 group-hover:text-[#ff5a00] transition-colors duration-200 tracking-[-0.01em]">
          <Link
            to={productUrl}
            onClick={(e) => {
              if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                e.preventDefault();
                handleCardClick();
              }
            }}
            className="hover:underline focus:outline-none"
          >
            {product.name}
          </Link>
        </h3>

        {/* Technical Specs Pills */}
        {specBadges.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 my-0.5">
            {specBadges.map((badge, idx) => (
              <span
                key={idx}
                className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/65 border border-white/[0.06] tracking-tight"
              >
                {badge}
              </span>
            ))}
          </div>
        )}

        {/* ── Commercial Price & Action Strip ─────────────────────────────── */}
        <div className="flex items-end justify-between gap-2 pt-2.5 border-t border-white/[0.06] mt-auto">
          <div className="min-w-0">
            {oldPriceUZS && (
              <div className="font-mono text-[11px] text-white/30 line-through leading-none mb-1">
                {oldPriceUZS} <span className="text-white/20">сум</span>
              </div>
            )}

            {/* Admin inline price editor */}
            {isAdmin && editingPrice ? (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <span className="text-[11px] font-mono text-[#ff5a00]">$</span>
                <input
                  type="number"
                  value={priceValue}
                  onChange={(e) => setPriceValue(e.target.value)}
                  onKeyDown={handlePriceKeyDown}
                  autoFocus
                  className="w-16 bg-[#141722] border border-[#ff5a00] rounded px-1.5 py-0.5
                    text-xs font-mono text-white outline-none text-right"
                />
                <button
                  onClick={handlePriceSave}
                  disabled={savingPrice}
                  className="w-5 h-5 flex items-center justify-center bg-emerald-500/20 text-emerald-400 rounded"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  onClick={handlePriceCancel}
                  className="w-5 h-5 flex items-center justify-center bg-red-500/20 text-red-400 rounded"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div
                className={`flex items-baseline gap-1 ${isAdmin ? "cursor-pointer group/price" : ""}`}
                onClick={handlePriceClick}
                title={isAdmin ? "Нажмите для изменения цены (в USD)" : undefined}
              >
                <span className="font-mono text-[16px] font-bold text-white tracking-tight leading-none tabular-nums">
                  {priceUZS}
                </span>
                <span className="text-[10px] font-mono text-white/40">сум</span>
                {isAdmin && (
                  <Pencil className="w-2.5 h-2.5 text-[#ff5a00] opacity-0 group-hover/price:opacity-100 ml-1" />
                )}
              </div>
            )}

            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-[11px] text-white/40 leading-none">
                {priceUSDRef > 0 ? `≈ $${priceUSDRef}` : ""}
              </span>
            </div>
          </div>

          {/* Add to Cart Button */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleAdd}
            disabled={!product.in_stock}
            aria-label={`Добавить в корзину: ${product.name}`}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 shrink-0 border ${
              !product.in_stock
                ? "bg-white/[0.02] text-white/15 cursor-not-allowed border-white/[0.04]"
                : added
                ? "bg-emerald-500 text-white border-transparent shadow-[0_0_16px_rgba(16,185,129,0.45)]"
                : "bg-[#141722] text-white/90 hover:bg-[#ff5a00] hover:text-white hover:border-[#ff5a00] border-white/[0.12] hover:shadow-[0_0_16px_rgba(255,90,0,0.35)]"
            }`}
          >
            <AnimatePresence mode="wait">
              {added ? (
                <motion.span
                  key="check"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                </motion.span>
              ) : (
                <motion.span
                  key="plus"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
