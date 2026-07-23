import { Plus, Check, Star, Heart, Share2 } from "lucide-react";
import { useState, useCallback } from "react";
import { formatPrice, EXCHANGE_RATE } from "@/lib/constants";
import { getProductUrl } from "@/lib/slugify";
import type { Product } from "@/hooks/useProducts";

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onProductClick?: (product: Product) => void;
}

const ProductCard = ({ product, onAddToCart, onProductClick }: ProductCardProps) => {
  const [added, setAdded] = useState(false);
  const [liked, setLiked] = useState(() => {
    const likes = JSON.parse(localStorage.getItem("liked_products") || "[]");
    return likes.includes(product.id);
  });
  const [copied, setCopied] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
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
      text: `${product.name} — ${formatPrice(Math.round(product.price * EXCHANGE_RATE))} сум`,
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
  }, [product]);

  const handleCardClick = () => {
    onProductClick?.(product);
  };

  return (
    <div
      className="card-premium rounded-2xl overflow-hidden group relative flex flex-col h-full bg-card cursor-pointer"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleCardClick()}
      aria-label={`Открыть ${product.name}`}
    >
      {/* Glossy top border */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00f2ff]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative aspect-square bg-[#0a0a0a] flex items-center justify-center p-4 sm:p-8 overflow-hidden">
        {/* Subtle background glow behind product */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#00f2ff]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        <img
          src={product.image}
          alt={product.name}
          className="max-w-full max-h-full object-contain transition-all duration-500 group-hover:scale-110 group-hover:rotate-1 z-10"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
        />

        {/* Badges */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-20 flex flex-col gap-1.5 sm:gap-2">
          {product.in_stock ? (
            <span className="bg-[#00f2ff]/10 border border-[#00f2ff]/30 text-[#00f2ff] text-[9px] sm:text-[10px] font-black px-2 py-1 sm:px-2.5 rounded-full uppercase tracking-widest backdrop-blur-md">
              В наличии
            </span>
          ) : (
            <span className="bg-red-500/10 border border-red-500/30 text-red-400 text-[9px] sm:text-[10px] font-black px-2 py-1 sm:px-2.5 rounded-full uppercase tracking-widest backdrop-blur-md">
              Нет в наличии
            </span>
          )}
          {product.priority && product.priority < 10 && (
            <span className="bg-[#ff0080]/10 border border-[#ff0080]/30 text-[#ff0080] text-[9px] sm:text-[10px] font-black px-2 py-1 sm:px-2.5 rounded-full uppercase tracking-widest backdrop-blur-md w-fit flex items-center gap-1">
              <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" /> Топ
            </span>
          )}
        </div>

        {/* Like & Share buttons — visible on hover (desktop) or always (touch) */}
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20 flex flex-col gap-1.5 sm:gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200">
          <button
            onClick={handleLike}
            aria-label="Добавить в избранное"
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all border backdrop-blur-md ${
              liked
                ? "bg-[#ff0080]/20 border-[#ff0080]/50 text-[#ff0080] shadow-[0_0_12px_rgba(255,0,128,0.3)]"
                : "bg-black/50 border-white/10 text-white/60 hover:text-[#ff0080] hover:border-[#ff0080]/40"
            }`}
          >
            <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${liked ? "fill-current" : ""}`} />
          </button>
          <button
            onClick={handleShare}
            aria-label="Поделиться"
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all border backdrop-blur-md ${
              copied
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                : "bg-black/50 border-white/10 text-white/60 hover:text-[#00f2ff] hover:border-[#00f2ff]/40"
            }`}
          >
            <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Copied tooltip */}
        {copied && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 bg-black/90 text-emerald-400 text-[10px] font-bold px-3 py-1.5 rounded-full border border-emerald-500/30 whitespace-nowrap">
            Ссылка скопирована!
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5 flex flex-col flex-1 border-t border-white/5">
        <p className="text-[9px] sm:text-[10px] font-black text-[#8E9196] uppercase tracking-[0.2em] mb-1.5 sm:mb-2">{product.brand}</p>
        <h3 className="text-sm sm:text-base font-bold leading-snug mb-3 sm:mb-4 flex-1 group-hover:text-[#00f2ff] transition-colors line-clamp-2">{product.name}</h3>

        <div className="flex items-end justify-between gap-2 sm:gap-3 mt-auto">
          <div>
            {product.old_price && (
              <p className="text-[10px] sm:text-xs text-red-500/70 line-through font-bold mb-0.5">
                {formatPrice(Math.round(product.old_price * EXCHANGE_RATE))} сум
              </p>
            )}
            <p className="text-base sm:text-lg font-black text-white leading-tight">
              {formatPrice(Math.round(product.price * EXCHANGE_RATE))} <span className="text-[10px] sm:text-xs text-white/50">сум</span>
            </p>
            <p className="text-[10px] sm:text-[11px] font-bold text-[#00f2ff]/70 mt-0.5">≈ ${product.price}</p>
          </div>

          <button
            onClick={handleAdd}
            disabled={!product.in_stock}
            aria-label={`Добавить в корзину: ${product.name}`}
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all btn-premium shrink-0 ${
              !product.in_stock
                ? "bg-white/5 text-white/30 cursor-not-allowed"
                : added
                  ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                  : "bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 hover:bg-[#00f2ff] hover:text-black hover:shadow-[0_0_25px_rgba(0,242,255,0.4)]"
            }`}
          >
            {added ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : <Plus className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
