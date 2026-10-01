import { Plus, Check, Star, Heart, Share2, Pencil, Eye } from "lucide-react";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice } from "@/lib/constants";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { getProductUrl } from "@/lib/slugify";
import type { Product } from "@/hooks/useProducts";
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
    const likes = JSON.parse(localStorage.getItem("liked_products") || "[]");
    return likes.includes(product.id);
  });
  const [copied, setCopied] = useState(false);

  // Admin: inline price editing
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceValue, setPriceValue] = useState(String(product.price));
  const [savingPrice, setSavingPrice] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  const handleLike = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const likes: number[] = JSON.parse(localStorage.getItem("liked_products") || "[]");
    const newLikes = likes.includes(product.id)
      ? likes.filter((id) => id !== product.id)
      : [...likes, product.id];
    localStorage.setItem("liked_products", JSON.stringify(newLikes));
    setLiked(newLikes.includes(product.id));
  }, [product.id]);

  const handleShare = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}${getProductUrl(product.id, product.category).replace("/#", "#")}`;
    const shareData = {
      title: product.name,
      text: `${product.name} — ${formatPrice(Math.round(product.price * exchangeRate))} сум`,
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
      } catch { /* silent */ }
    }
  }, [product, exchangeRate]);

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
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.from("products").update({ price: val }).eq("id", product.id);
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

  const priceUZS = formatPrice(Math.round(product.price * exchangeRate));
  const oldPriceUZS = product.old_price
    ? formatPrice(Math.round(product.old_price * exchangeRate))
    : null;
  const discount = product.old_price && product.price < product.old_price
    ? Math.round((1 - product.price / product.old_price) * 100)
    : null;

  return (
    <div
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleCardClick()}
      aria-label={`Открыть товар: ${product.name}`}
      onDragOver={isAdmin ? onDragOverProp : undefined}
      onDrop={isAdmin ? onDrop : undefined}
      className={`group relative flex flex-col h-full
        bg-[#0f1117] rounded-xl border
        transition-all duration-250 cursor-pointer overflow-hidden
        ${isDragging ? "opacity-30 scale-[0.98]" : ""}
        ${isDragOver
          ? "border-[#FF5A00] shadow-[0_0_0_1px_rgba(255,90,0,0.3)]"
          : "border-white/[0.07] hover:border-white/[0.15] hover:shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,90,0,0.12)] hover:-translate-y-[3px]"
        }`}
      style={{ willChange: "transform" }}
    >
      {/* Top hairline reflection */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.13] to-transparent pointer-events-none z-10" />

      {/* Admin drag handle */}
      {isAdmin && (
        <div
          className="absolute top-0 inset-x-0 z-30 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-[#181B22] border border-white/20 text-[#FF5A00] text-[9px] font-mono px-3 py-0.5 rounded-b uppercase tracking-wider backdrop-blur-sm shadow-md">
            ⠿ Порядок
          </div>
        </div>
      )}

      {/* ── Image Stage ─────────────────────────────── */}
      <div className="relative bg-[#08090c] flex items-center justify-center p-5 sm:p-6 overflow-hidden border-b border-white/[0.05]"
        style={{ aspectRatio: "1/1" }}>
        {/* Ambient spotlight behind product */}
        <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: "radial-gradient(ellipse 70% 60% at 50% 60%, rgba(255,90,0,0.05), transparent 70%)" }}
        />

        <img
          src={product.image}
          alt={product.name}
          className="max-w-full max-h-full object-contain relative z-10
            transition-transform duration-400 group-hover:scale-[1.04]"
          style={{ willChange: "transform" }}
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
        />

        {/* ── Badges (top-left) ── */}
        <div className="absolute top-2.5 left-2.5 z-20 flex flex-col gap-1.5 pointer-events-none">
          {product.in_stock ? (
            <span className="badge-stock-in">
              <span className="status-dot status-dot-green status-dot-pulse" />
              В наличии
            </span>
          ) : (
            <span className="badge-stock-out">
              Под заказ
            </span>
          )}

          {product.priority && product.priority < 10 && (
            <span className="badge-top">
              <Star className="w-2.5 h-2.5 fill-current" />
              ТОП
            </span>
          )}

          {discount && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold font-mono
              bg-[#FF5A00]/18 border border-[#FF5A00]/30 text-[#FF5A00]">
              −{discount}%
            </span>
          )}

          {/* Admin analytics */}
          {isAdmin && (
            <div className="flex gap-1 mt-0.5 pointer-events-auto">
              <span className="bg-black/75 border border-white/10 text-white/70 text-[10px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1">
                <Eye className="w-2.5 h-2.5 text-[#FF5A00]" /> {product.views || 0}
              </span>
              <span className="bg-black/75 border border-white/10 text-white/70 text-[10px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1">
                <Heart className="w-2.5 h-2.5 text-red-400" /> {product.likes || 0}
              </span>
            </div>
          )}
        </div>

        {/* ── Like & Share (top-right, appear on hover) ── */}
        <div className="absolute top-2.5 right-2.5 z-20 flex flex-col gap-1.5 opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={handleLike}
            aria-label="Добавить в избранное"
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-all border ${
              liked
                ? "bg-red-500/15 border-red-500/35 text-red-400"
                : "bg-[#0f1117]/90 border-white/10 text-white/45 hover:text-white hover:border-white/25"
            }`}
          >
            <Heart className={`w-3 h-3 ${liked ? "fill-current" : ""}`} />
          </button>

          <button
            onClick={handleShare}
            aria-label="Поделиться товаром"
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-all border ${
              copied
                ? "bg-[#22c55e]/15 border-[#22c55e]/35 text-[#22c55e]"
                : "bg-[#0f1117]/90 border-white/10 text-white/45 hover:text-white hover:border-white/25"
            }`}
          >
            <Share2 className="w-3 h-3" />
          </button>
        </div>

        {/* Copied toast */}
        <AnimatePresence>
          {copied && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 bg-black/90
                text-[#22c55e] text-[10px] font-mono px-2.5 py-1 rounded border border-[#22c55e]/25
                whitespace-nowrap shadow-lg pointer-events-none"
            >
              Ссылка скопирована
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Info Panel ────────────────────────────────── */}
      <div className="p-4 flex flex-col flex-1 gap-2.5">
        <div>
          {/* Brand label */}
          <div className="text-label mb-1.5 truncate">
            {product.brand || "ALFACOMP"}
          </div>

          {/* Product name */}
          <h3 className="text-[13px] font-semibold text-white leading-snug line-clamp-2
            group-hover:text-[#FF5A00] transition-colors duration-200 tracking-[-0.01em]">
            {product.name}
          </h3>
        </div>

        {/* ── Price & CTA ─────────────────────────────── */}
        <div className="flex items-end justify-between gap-2 pt-2.5 border-t border-white/[0.05] mt-auto">
          <div className="min-w-0">
            {oldPriceUZS && (
              <div className="text-data text-[10px] text-white/30 line-through leading-none mb-1">
                {oldPriceUZS} <span className="text-white/20">сум</span>
              </div>
            )}

            {/* Admin inline price editor */}
            {isAdmin && editingPrice ? (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <span className="text-[11px] font-mono text-[#FF5A00]">$</span>
                <input
                  type="number"
                  value={priceValue}
                  onChange={(e) => setPriceValue(e.target.value)}
                  onKeyDown={handlePriceKeyDown}
                  autoFocus
                  className="w-16 bg-[#181B22] border border-[#FF5A00] rounded px-1.5 py-0.5
                    text-xs font-mono text-white outline-none text-right"
                />
                <button
                  onClick={handlePriceSave}
                  disabled={savingPrice}
                  className="w-5 h-5 flex items-center justify-center bg-[#22c55e]/20 text-[#22c55e] rounded"
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
                <span className="text-data text-[15px] font-bold text-white tracking-tight leading-none">
                  {priceUZS}
                </span>
                <span className="text-[10px] font-mono text-white/40">UZS</span>
                {isAdmin && <Pencil className="w-2.5 h-2.5 text-[#FF5A00] opacity-0 group-hover/price:opacity-100 ml-1" />}
              </div>
            )}

            <div className="text-data text-[10px] text-white/30 mt-0.5 leading-none">
              ≈ ${product.price}
            </div>
          </div>

          {/* Add to cart */}
          <motion.button
            whileTap={{ scale: 0.90 }}
            onClick={handleAdd}
            disabled={!product.in_stock}
            aria-label={`Добавить в корзину: ${product.name}`}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 shrink-0 border ${
              !product.in_stock
                ? "bg-white/[0.03] text-white/15 cursor-not-allowed border-white/[0.04]"
                : added
                  ? "bg-[#22c55e] text-white border-transparent shadow-[0_0_12px_rgba(34,197,94,0.3)]"
                  : "bg-[#14171E] text-white hover:bg-[#FF5A00] hover:text-white hover:border-[#FF5A00] border-white/[0.10] hover:shadow-[0_0_12px_rgba(255,90,0,0.25)]"
            }`}
          >
            <AnimatePresence mode="wait">
              {added ? (
                <motion.span
                  key="check"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Check className="w-4 h-4" />
                </motion.span>
              ) : (
                <motion.span
                  key="plus"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Plus className="w-4 h-4" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
