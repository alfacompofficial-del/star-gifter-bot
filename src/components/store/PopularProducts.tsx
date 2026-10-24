import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Heart, ShoppingCart, Check, ArrowRight, Eye } from "lucide-react";
import type { Product } from "@/hooks/useProducts";
import { resolveProductPrices } from "@/lib/constants";
import { useExchangeRate } from "@/hooks/useExchangeRate";

interface PopularProductsProps {
  products: Product[];
  onAddToCart: (product: any) => void;
  onProductClick?: (product: any) => void;
}

const formatSum = (val: number) => {
  return Math.round(val).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const PopularProducts = ({ products, onAddToCart, onProductClick }: PopularProductsProps) => {
  const { exchangeRate } = useExchangeRate();
  const [addedIds, setAddedIds] = useState<Record<number, boolean>>({});
  const [likedIds, setLikedIds] = useState<Record<number, boolean>>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("liked_products") || "[]");
      const map: Record<number, boolean> = {};
      if (Array.isArray(stored)) {
        stored.forEach((id: number) => { map[id] = true; });
      }
      return map;
    } catch {
      return {};
    }
  });

  // Pick top real products from the catalog (prioritize RTX, top CPUs, fast RAM, NVMe SSD, Gaming Monitor)
  const displayItems = useMemo(() => {
    if (!products || products.length === 0) return [];

    // Find key real flagship products in stock
    const findProduct = (pattern: RegExp) => products.find((p) => pattern.test(p.name) && p.in_stock);

    const picked: Product[] = [];
    const usedIds = new Set<number>();

    // 1. Flagship GPU (e.g. RTX 5090 / 5060)
    const gpu = findProduct(/rtx\s*5090|rtx\s*5060/i);
    if (gpu && !usedIds.has(gpu.id)) { picked.push(gpu); usedIds.add(gpu.id); }

    // 2. High-end Processor (e.g. ULTRA 9285K / 14700K)
    const cpu = findProduct(/ultra\s*9285k|14700k|13900k/i);
    if (cpu && !usedIds.has(cpu.id)) { picked.push(cpu); usedIds.add(cpu.id); }

    // 3. Gaming Monitor (e.g. MSI MAG 272QPF / REDMI G27Q)
    const monitor = findProduct(/mag\s*272qpf|redmi\s*g27q|27m2n3500/i);
    if (monitor && !usedIds.has(monitor.id)) { picked.push(monitor); usedIds.add(monitor.id); }

    // 4. Fast RAM (e.g. Lexar THOR)
    const ram = findProduct(/lexar\s*thor/i);
    if (ram && !usedIds.has(ram.id)) { picked.push(ram); usedIds.add(ram.id); }

    // 5. High-speed SSD (e.g. 990 pro / Usb ssd)
    const ssd = findProduct(/990\s*pro|usb\s*ssd/i);
    if (ssd && !usedIds.has(ssd.id)) { picked.push(ssd); usedIds.add(ssd.id); }

    // Fallback: fill up to 5 with top priority in-stock products
    if (picked.length < 5) {
      const remaining = products.filter((p) => !usedIds.has(p.id) && p.in_stock);
      for (const rem of remaining) {
        if (picked.length >= 5) break;
        picked.push(rem);
        usedIds.add(rem.id);
      }
    }

    return picked.slice(0, 5);
  }, [products]);

  const handleAddToCart = (e: React.MouseEvent, item: Product) => {
    e.stopPropagation();
    onAddToCart(item);
    setAddedIds((prev) => ({ ...prev, [item.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [item.id]: false }));
    }, 1500);
  };

  const handleToggleLike = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setLikedIds((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        const ids = Object.keys(next).filter((k) => next[Number(k)]).map(Number);
        localStorage.setItem("liked_products", JSON.stringify(ids));
      } catch {}
      return next;
    });
  };

  if (displayItems.length === 0) return null;

  return (
    <section className="w-full max-w-[1540px] mx-auto px-4 sm:px-8 xl:px-12 py-6">
      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[18px] sm:text-[20px] font-bold text-white tracking-tight">
          Популярные товары
        </h2>
        <a
          href="#catalog"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
          }}
          className="flex items-center gap-1.5 text-[13px] text-[#0066ff] hover:text-[#3b82f6] font-medium transition-colors cursor-pointer"
        >
          <span>Все товары</span>
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>

      {/* Grid of real 5 products */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {displayItems.map((item, idx) => {
          const isAdded = !!addedIds[item.id];
          const isLiked = !!likedIds[item.id];
          const { priceUZS, priceUSD } = resolveProductPrices(item.price, exchangeRate || 14000);
          const rating = item.rating ?? 5.0;
          const ratingCount = item.rating_count ?? 12;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: idx * 0.04 }}
              onClick={() => onProductClick?.(item)}
              className="group flex flex-col justify-between p-4 rounded-2xl bg-[#0c1424] border border-white/[0.08] hover:border-[#0066ff]/50 hover:bg-[#0f1a30] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,102,255,0.22)] cursor-pointer"
            >
              <div>
                {/* Top actions & brand */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-white/50 font-semibold truncate max-w-[120px]">
                    {item.brand || "AlfaComp"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onProductClick?.(item);
                      }}
                      className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white transition-colors cursor-pointer"
                      title="Быстрый просмотр"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleToggleLike(e, item.id)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors border cursor-pointer ${
                        isLiked
                          ? "bg-red-500/20 border-red-500/40 text-red-400"
                          : "bg-white/[0.04] hover:bg-white/[0.1] border-white/[0.08] text-white/50 hover:text-white"
                      }`}
                      title="В избранное"
                    >
                      <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-current" : ""}`} />
                    </button>
                  </div>
                </div>

                {/* Real hardware photo */}
                <div className="w-full h-[150px] sm:h-[160px] rounded-xl overflow-hidden bg-[#070e1c] flex items-center justify-center p-3 mb-3 relative border border-white/[0.03]">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/placeholder.svg";
                    }}
                  />
                </div>

                {/* Real Title */}
                <h3 className="text-[13.5px] font-semibold text-white group-hover:text-[#60a5fa] transition-colors line-clamp-2 leading-snug mb-2 min-h-[38px]">
                  {item.name}
                </h3>

                {/* Rating */}
                <div className="flex items-center gap-1.5 text-[12px] font-mono text-white/60 mb-3">
                  <div className="flex items-center gap-1 text-amber-400 font-bold">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{rating.toFixed(1)}</span>
                  </div>
                  <span className="text-white/35">({ratingCount})</span>
                </div>
              </div>

              <div>
                {/* Real Price */}
                <div className="flex items-baseline justify-between mb-3">
                  <div>
                    <span className="text-[17px] sm:text-[18px] font-bold text-white tracking-tight font-mono">
                      {formatSum(priceUZS)}
                    </span>
                    <span className="text-[12px] text-white/50 ml-1 font-mono">сум</span>
                  </div>
                  {priceUSD > 0 && (
                    <span className="text-[11px] font-mono text-white/40">
                      ≈ ${priceUSD}
                    </span>
                  )}
                </div>

                {/* Add to Cart button */}
                <button
                  onClick={(e) => handleAddToCart(e, item)}
                  className={`w-full py-2.5 rounded-xl font-medium text-[13px] flex items-center justify-center gap-2 transition-all duration-200 shadow-md cursor-pointer ${
                    isAdded
                      ? "bg-emerald-600 text-white shadow-emerald-600/30"
                      : "bg-[#0066ff] hover:bg-[#1a75ff] text-white shadow-[0_4px_16px_rgba(0,102,255,0.35)] hover:shadow-[0_6px_22px_rgba(0,102,255,0.5)] active:scale-[0.98]"
                  }`}
                >
                  <AnimatePresence mode="wait">
                    {isAdded ? (
                      <motion.span
                        key="added"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        <span>В корзине</span>
                      </motion.span>
                    ) : (
                      <motion.span
                        key="cart"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-1.5"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span>В корзину</span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default PopularProducts;
