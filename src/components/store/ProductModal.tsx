import { useState, useEffect, useCallback, useRef } from "react";
import { X, Heart, Share2, ShoppingCart, Zap, ZoomIn, CheckCircle, Copy, Check } from "lucide-react";
import { formatPrice, EXCHANGE_RATE } from "@/lib/constants";
import { getProductUrl } from "@/lib/slugify";
import type { Product } from "@/hooks/useProducts";

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
}

const ProductModal = ({ product, onClose, onAddToCart }: ProductModalProps) => {
  const [liked, setLiked] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [isZooming, setIsZooming] = useState(false);
  const imgContainerRef = useRef<HTMLDivElement>(null);

  // Load liked state
  useEffect(() => {
    if (!product) return;
    const likes = JSON.parse(localStorage.getItem("liked_products") || "[]");
    setLiked(likes.includes(product.id));
  }, [product]);

  // SEO URL when product opens: /#/products/{category}/{id}
  useEffect(() => {
    if (!product) return;
    const productHash = getProductUrl(product.id, product.category).replace("/#", "");
    const prev = window.location.hash;
    window.location.hash = productHash;
    return () => {
      if (prev === "" || prev === "#/") {
        window.location.hash = "/";
      } else {
        window.location.hash = prev.replace(/^#/, "");
      }
    };
  }, [product]);

  // Close on ESC
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
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleLike = useCallback(() => {
    if (!product) return;
    const likes: number[] = JSON.parse(localStorage.getItem("liked_products") || "[]");
    const newLikes = likes.includes(product.id)
      ? likes.filter((id) => id !== product.id)
      : [...likes, product.id];
    localStorage.setItem("liked_products", JSON.stringify(newLikes));
    setLiked(newLikes.includes(product.id));
  }, [product]);

  const handleShare = useCallback(async () => {
    if (!product) return;
    const url = window.location.origin + window.location.pathname + getProductUrl(product.id, product.category).replace("/#", "#");
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
      } catch {
        // fallback silent
      }
    }
  }, [product]);

  const handleAddToCart = () => {
    if (!product) return;
    onAddToCart(product);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleBuyNow = () => {
    if (!product) return;
    const text = encodeURIComponent(
      `Хочу купить: ${product.name}\nЦена: ${formatPrice(Math.round(product.price * EXCHANGE_RATE))} сум (~$${product.price})`
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

  if (!product) return null;

  const priceUZS = formatPrice(Math.round(product.price * EXCHANGE_RATE));
  const oldPriceUZS = product.old_price ? formatPrice(Math.round(product.old_price * EXCHANGE_RATE)) : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[201] flex items-center justify-center p-2 sm:p-4 pointer-events-none">
        <div
          className="relative w-full max-w-4xl max-h-[95vh] overflow-y-auto bg-[#0d0d0d] rounded-2xl sm:rounded-3xl border border-white/10 shadow-2xl pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top gradient border */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#ff0080]/60 to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {/* LEFT: Image */}
            <div className="relative bg-[#080808] rounded-t-2xl sm:rounded-tl-3xl md:rounded-l-3xl md:rounded-tr-none overflow-hidden">
              {/* Image container with zoom */}
              <div
                ref={imgContainerRef}
                className="relative aspect-square flex items-center justify-center p-6 sm:p-10 cursor-zoom-in overflow-hidden group"
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setIsZooming(true)}
                onMouseLeave={() => setIsZooming(false)}
                onClick={() => setLightboxOpen(true)}
              >
                {/* Background glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#ff0080]/5 via-transparent to-[#00f2ff]/5" />

                {/* Main image */}
                <img
                  src={product.image}
                  alt={product.name}
                  className="max-w-full max-h-full object-contain relative z-10 transition-transform duration-200"
                  style={
                    isZooming
                      ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`, transform: "scale(1.8)" }
                      : {}
                  }
                  onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                />

                {/* Zoom icon overlay */}
                <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-black/60 backdrop-blur-sm rounded-2xl px-4 py-2 flex items-center gap-2 text-white border border-white/20">
                    <ZoomIn className="w-4 h-4" />
                    <span className="text-xs font-bold">Нажмите для просмотра</span>
                  </div>
                </div>
              </div>

              {/* Stock badge */}
              <div className="absolute top-3 left-3">
                {product.in_stock ? (
                  <span className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest backdrop-blur-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    В наличии
                  </span>
                ) : (
                  <span className="bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest backdrop-blur-md">
                    Нет в наличии
                  </span>
                )}
              </div>
            </div>

            {/* RIGHT: Info */}
            <div className="p-5 sm:p-8 flex flex-col justify-between gap-4 sm:gap-6">
              {/* Brand + Name */}
              <div>
                <p className="text-[10px] font-black text-[#ff0080] uppercase tracking-[0.2em] mb-2">
                  {product.brand}
                </p>
                <h2 className="text-xl sm:text-2xl font-black leading-tight text-white mb-1">
                  {product.name}
                </h2>
                <p className="text-xs text-white/40 font-medium">{product.category}</p>
              </div>

              {/* Price + Like/Share */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  {oldPriceUZS && (
                    <p className="text-sm text-red-400/70 line-through font-bold mb-0.5">
                      {oldPriceUZS} сум
                    </p>
                  )}
                  <p className="text-2xl sm:text-3xl font-black text-white leading-none">
                    {priceUZS}
                    <span className="text-sm text-white/40 ml-1 font-medium">сум</span>
                  </p>
                  <p className="text-sm font-bold text-[#00f2ff]/80 mt-1">≈ ${product.price}</p>
                </div>

                {/* Like + Share */}
                <div className="flex flex-col gap-2 mt-1">
                  <button
                    onClick={handleLike}
                    title={liked ? "Убрать из избранного" : "В избранное"}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${
                      liked
                        ? "bg-[#ff0080]/20 border-[#ff0080]/50 text-[#ff0080] shadow-[0_0_15px_rgba(255,0,128,0.3)]"
                        : "bg-white/5 border-white/10 text-white/40 hover:text-[#ff0080] hover:border-[#ff0080]/40 hover:bg-[#ff0080]/10"
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
                  </button>
                  <button
                    onClick={handleShare}
                    title="Поделиться"
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all border bg-white/5 border-white/10 text-white/40 hover:text-[#00f2ff] hover:border-[#00f2ff]/40 hover:bg-[#00f2ff]/10"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Copy link notification */}
              {copied && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 -mt-2">
                  <Copy className="w-3 h-3" />
                  Ссылка скопирована!
                </div>
              )}

              {/* Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleBuyNow}
                  className="w-full py-3.5 rounded-xl border border-white/20 text-white font-bold text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4 text-[#ff0080]" />
                  Купить в один клик
                </button>
                <button
                  onClick={handleAddToCart}
                  disabled={!product.in_stock}
                  className={`w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    !product.in_stock
                      ? "bg-white/5 text-white/20 cursor-not-allowed"
                      : addedToCart
                      ? "bg-emerald-500 text-white shadow-[0_0_25px_rgba(16,185,129,0.4)]"
                      : "bg-gradient-to-r from-[#ff0080] to-[#ff3399] text-white hover:shadow-[0_0_30px_rgba(255,0,128,0.5)] hover:brightness-110"
                  }`}
                >
                  {addedToCart ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Добавлено!
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" />
                      В Корзину
                    </>
                  )}
                </button>
              </div>

              {/* Specs */}
              <div className="border-t border-white/5 pt-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Характеристики</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                    <span className="text-xs text-white/40 font-medium">Производитель</span>
                    <span className="text-xs text-white font-bold">{product.brand}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                    <span className="text-xs text-white/40 font-medium">Категория</span>
                    <span className="text-xs text-white font-bold">{product.category}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-xs text-white/40 font-medium">Наличие</span>
                    <span className={`text-xs font-bold ${product.in_stock ? "text-emerald-400" : "text-red-400"}`}>
                      {product.in_stock ? "Есть в наличии" : "Нет в наличии"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center cursor-zoom-out p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-10"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={product.image}
            alt={product.name}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
            onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
          />
        </div>
      )}
    </>
  );
};

export default ProductModal;
