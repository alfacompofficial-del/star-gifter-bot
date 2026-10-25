import { useState, useEffect, useRef, useMemo } from "react";
import { ShoppingCart, Heart, User, ChevronDown, Search, X, Check, ArrowRight, Layers } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import AndroidAppBanner from "@/components/store/AndroidAppBanner";
import type { Product } from "@/hooks/useProducts";
import { formatPrice, resolveProductPrices } from "@/lib/constants";
import { getCategoryUrl } from "@/lib/slugify";

interface HeaderProps {
  cartCount: number;
  onCartClick: () => void;
  favCount?: number;
  onFavClick?: () => void;
  onProfileClick?: () => void;
  products?: Product[];
  onProductClick?: (product: Product) => void;
  onSearchSubmit?: (query: string) => void;
  onSelectCategory?: (category: string) => void;
}

const CATEGORIES = [
  { label: "Комплектующие", slug: "Комплектующие" },
  { label: "Мониторы", slug: "Мониторы" },
  { label: "Процессоры", slug: "Процессоры" },
  { label: "Видеокарты", slug: "Видеокарты" },
  { label: "Оперативная память", slug: "Оперативная память" },
  { label: "SSD", slug: "SSD" },
  { label: "ИБП", slug: "ИБП" },
  { label: "Сеть & Роутеры", slug: "Сеть" },
  { label: "Моноблоки", slug: "Моноблоки" },
  { label: "Мышки", slug: "Мышки" },
  { label: "Аксессуары", slug: "Аксессуары" },
];

const Header = ({
  cartCount,
  onCartClick,
  favCount = 0,
  onFavClick,
  onProfileClick,
  products = [],
  onProductClick,
  onSearchSubmit,
  onSelectCategory,
}: HeaderProps) => {
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [prevCount, setPrevCount] = useState(cartCount);
  const [cartAnimating, setCartAnimating] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [showCatalogMenu, setShowCatalogMenu] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";
  const { exchangeRate } = useExchangeRate();
  const ticking = useRef(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const catalogMenuRef = useRef<HTMLDivElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const handle = () => {
      if (!ticking.current) {
        requestAnimationFrame(() => {
          const y = window.scrollY;
          setScrolled(y > 20);
          setScrollProgress(Math.min(y / 200, 1));
          ticking.current = false;
        });
        ticking.current = true;
      }
    };
    handle();
    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
      if (catalogMenuRef.current && !catalogMenuRef.current.contains(e.target as Node)) {
        setShowCatalogMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset keyboard highlight whenever search value, focus, or mobile modal state changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchValue, isSearchFocused, mobileSearchOpen]);

  // Keep highlighted item in view during arrow navigation
  useEffect(() => {
    if (highlightedIndex >= 0 && itemRefs.current[highlightedIndex]) {
      itemRefs.current[highlightedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [highlightedIndex]);

  // Lock body scroll and autofocus input when mobile search is open
  useEffect(() => {
    if (mobileSearchOpen) {
      document.body.style.overflow = "hidden";
      const t = setTimeout(() => {
        mobileInputRef.current?.focus();
      }, 80);
      return () => {
        clearTimeout(t);
        document.body.style.overflow = "";
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [mobileSearchOpen]);

  // Animate cart badge on count change
  useEffect(() => {
    if (cartCount !== prevCount) {
      setCartAnimating(true);
      setPrevCount(cartCount);
      const t = setTimeout(() => setCartAnimating(false), 500);
      return () => clearTimeout(t);
    }
  }, [cartCount, prevCount]);

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isHome) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  };

  // Instant live search matches
  const searchMatches = useMemo(() => {
    if (!searchValue.trim() || !products.length) return [];
    const q = searchValue.trim().toLowerCase();
    const terms = q.split(/\s+/);
    return products
      .filter((p) => {
        const name = (p.name || "").toLowerCase();
        const brand = (p.brand || "").toLowerCase();
        const cat = (p.category || "").toLowerCase();
        return terms.every((t) => name.includes(t) || brand.includes(t) || cat.includes(t));
      })
      .slice(0, 6);
  }, [searchValue, products]);

  const handleProductSelect = (product: Product) => {
    setIsSearchFocused(false);
    setMobileSearchOpen(false);
    setHighlightedIndex(-1);
    if (onProductClick) {
      onProductClick(product);
    } else {
      navigate(`/product/${product.id}`);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!searchMatches || searchMatches.length === 0) {
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < searchMatches.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : searchMatches.length - 1));
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && highlightedIndex < searchMatches.length) {
        e.preventDefault();
        handleProductSelect(searchMatches[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsSearchFocused(false);
      setMobileSearchOpen(false);
      setHighlightedIndex(-1);
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (highlightedIndex >= 0 && highlightedIndex < searchMatches.length) {
      handleProductSelect(searchMatches[highlightedIndex]);
      return;
    }
    if (!searchValue.trim()) return;
    setIsSearchFocused(false);
    setMobileSearchOpen(false);
    setHighlightedIndex(-1);
    if (onSearchSubmit) {
      onSearchSubmit(searchValue.trim());
    } else {
      window.dispatchEvent(new CustomEvent("store-search", { detail: searchValue.trim() }));
    }
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleCategoryClick = (categorySlug: string) => {
    setShowCatalogMenu(false);
    if (onSelectCategory) {
      onSelectCategory(categorySlug);
    } else {
      window.dispatchEvent(new CustomEvent("select-category", { detail: categorySlug }));
    }
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* Android App Download Banner */}
      <div className="fixed top-0 left-0 w-full z-[60]">
        <AndroidAppBanner />
      </div>

      {/* ── TOP HEADER BAR ── */}
      <header
        className={`fixed left-0 w-full z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#050914]/95 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.7)] border-b border-[#0066ff]/20"
            : "bg-[#050914]/90 backdrop-blur-md border-b border-white/[0.05]"
        }`}
        style={{ top: 0 }}
      >
        {/* Scroll progress line — royal blue to cyan */}
        <motion.div
          className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-[#0066ff] to-[#38bdf8] origin-left pointer-events-none"
          style={{
            scaleX: scrollProgress,
            opacity: scrollProgress > 0.02 ? 0.9 : 0,
          }}
          transition={{ duration: 0 }}
        />

        <div
          className={`w-full max-w-[1540px] mx-auto px-4 sm:px-8 xl:px-12 flex items-center gap-4 transition-all duration-300 ${
            scrolled ? "py-2.5" : "py-3"
          }`}
        >
          {/* ── Logo matching Screenshot 3 ── */}
          <Link
            to="/"
            onClick={handleLogoClick}
            className="flex items-center gap-3 group shrink-0 select-none cursor-pointer"
            aria-label="AlfaComp — на главную"
          >
            {/* Geometric stylized Delta 'A' logo */}
            <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
              <svg
                className="w-9 h-9 drop-shadow-[0_0_12px_rgba(0,102,255,0.6)] group-hover:scale-105 transition-transform duration-300"
                viewBox="0 0 36 36"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="deltaLeftGrad" x1="4" y1="32" x2="18" y2="4" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#0052cc" />
                    <stop offset="1" stopColor="#0080ff" />
                  </linearGradient>
                  <linearGradient id="deltaRightGrad" x1="18" y1="4" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#0070f3" />
                    <stop offset="1" stopColor="#38bdf8" />
                  </linearGradient>
                  <linearGradient id="deltaSwooshGrad" x1="6" y1="23" x2="30" y2="28" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#0052cc" />
                    <stop offset="0.5" stopColor="#0080ff" />
                    <stop offset="1" stopColor="#38bdf8" />
                  </linearGradient>
                </defs>
                {/* Left diagonal leg */}
                <path d="M 18 4 L 4 32 L 11 32 L 18 17.5 L 25 32 L 32 32 Z" fill="url(#deltaLeftGrad)" />
                {/* Right wing facet */}
                <path d="M 18 4 L 32 32 L 25 32 L 18 17.5 Z" fill="url(#deltaRightGrad)" />
                {/* Dynamic curved crossbar ribbon */}
                <path
                  d="M 6 25.5 C 13 21.5, 23 21.5, 30 27 C 28.5 29.5, 24 28, 18 24 C 12 26.5, 8 28.5, 6 25.5 Z"
                  fill="url(#deltaSwooshGrad)"
                />
              </svg>
            </div>

            <div className="flex flex-col leading-none">
              <span className="text-[19px] sm:text-[21px] font-extrabold tracking-tight text-white font-sans">
                AlfaComp
              </span>
              <span className="text-[8.5px] sm:text-[9px] font-semibold text-white/45 tracking-[0.14em] uppercase mt-0.5">
                Техника для твоих побед
              </span>
            </div>
          </Link>

          {/* ── Search Bar matching Screenshot 3 ── */}
          <div ref={searchContainerRef} className="flex-1 max-w-[580px] mx-2 relative hidden md:block">
            <form
              onSubmit={handleSearchSubmit}
              className="relative flex items-center w-full"
            >
              <input
                type="text"
                value={searchValue}
                onChange={(e) => {
                  setSearchValue(e.target.value);
                  setIsSearchFocused(true);
                }}
                onFocus={() => setIsSearchFocused(true)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Поиск товаров, брендов, категорий..."
                className="w-full h-10 bg-[#0a1224] border border-white/[0.12] rounded-full pl-5 pr-12
                  text-[13px] text-white placeholder:text-white/40 outline-none
                  focus:border-[#0066ff]/80 focus:bg-[#0c162e] focus:shadow-[0_0_20px_rgba(0,102,255,0.25)] transition-all"
              />

              {searchValue && (
                <button
                  type="button"
                  onClick={() => setSearchValue("")}
                  className="absolute right-12 text-white/40 hover:text-white p-1 transition-colors"
                  aria-label="Очистить"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Blue circular search button on the right */}
              <button
                type="submit"
                aria-label="Искать"
                className="absolute right-1 w-8 h-8 rounded-full bg-[#0066ff] hover:bg-[#1a75ff]
                  text-white flex items-center justify-center transition-all duration-200 shadow-[0_2px_10px_rgba(0,102,255,0.45)] hover:scale-105 active:scale-95"
              >
                <Search className="w-4 h-4 text-white stroke-[2.5]" />
              </button>
            </form>

            {/* Instant live search results dropdown */}
            <AnimatePresence>
              {isSearchFocused && searchValue.trim() && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.18 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-[#091122] border border-[#0066ff]/30 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.8)] overflow-hidden z-50 backdrop-blur-xl"
                >
                  <div className="p-2 border-b border-white/[0.06] flex items-center justify-between text-[11px] text-white/50 px-3">
                    <span>Найдено совпадений: {searchMatches.length}</span>
                    <span className="text-[#38bdf8] flex items-center gap-1.5 font-mono text-[10.5px]">
                      {highlightedIndex >= 0 ? (
                        <>
                          <span className="px-1.5 py-0.5 rounded bg-[#0066ff]/40 text-white border border-[#0066ff]/60 font-semibold">↵ Enter</span>
                          <span>открыть товар</span>
                        </>
                      ) : (
                        <>
                          <span className="px-1.5 py-0.5 rounded bg-white/10 text-white font-semibold">↑↓</span>
                          <span>выбор стрелками • Enter</span>
                        </>
                      )}
                    </span>
                  </div>

                  {searchMatches.length > 0 ? (
                    <div className="max-h-[360px] overflow-y-auto divide-y divide-white/[0.04]">
                      {searchMatches.map((product, idx) => {
                        const { priceUZS } = resolveProductPrices(product.price, exchangeRate || 14000);
                        const isHighlighted = highlightedIndex === idx;
                        return (
                          <div
                            key={product.id}
                            ref={(el) => {
                              itemRefs.current[idx] = el;
                            }}
                            onMouseEnter={() => setHighlightedIndex(idx)}
                            onClick={() => handleProductSelect(product)}
                            className={`flex items-center gap-3 p-2.5 cursor-pointer transition-all duration-150 group border-l-4 ${
                              isHighlighted
                                ? "bg-[#0066ff]/25 border-[#0066ff] shadow-[inset_0_0_20px_rgba(0,102,255,0.25)] pl-2"
                                : "hover:bg-[#0e1a34] border-transparent"
                            }`}
                          >
                            <img
                              src={product.image}
                              alt={product.name}
                              className={`w-10 h-10 object-contain rounded-lg bg-[#060a14] p-1 border shrink-0 transition-transform ${
                                isHighlighted ? "border-[#0066ff]/60 scale-105" : "border-white/5"
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4
                                  className={`text-[12.5px] font-medium truncate transition-colors ${
                                    isHighlighted ? "text-[#38bdf8] font-semibold" : "text-white group-hover:text-[#38bdf8]"
                                  }`}
                                >
                                  {product.name}
                                </h4>
                                {isHighlighted && (
                                  <span className="shrink-0 text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-[#0066ff] text-white tracking-wider uppercase">
                                    ↵ Enter
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-white/40 block truncate">
                                {product.category} {product.brand ? `• ${product.brand}` : ""}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[12.5px] font-bold text-white font-mono">
                                {formatPrice(priceUZS)} сум
                              </span>
                              {product.in_stock ? (
                                <span className="block text-[10px] text-emerald-400 font-medium">В наличии</span>
                              ) : (
                                <span className="block text-[10px] text-rose-400 font-medium">Под заказ</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-[13px] text-white/50">
                      По запросу &quot;{searchValue}&quot; ничего не найдено
                    </div>
                  )}

                  {searchMatches.length > 0 && (
                    <div
                      onClick={handleSearchSubmit}
                      className="p-2.5 bg-[#070e1c] text-center text-[12px] font-semibold text-[#0066ff] hover:text-[#38bdf8] cursor-pointer border-t border-white/[0.06] transition-colors"
                    >
                      Показать все результаты каталога →
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Right Navigation Console matching Screenshot 3 ── */}
          <div className="flex items-center gap-3 sm:gap-6 ml-auto">
            {/* Mobile search trigger button matching Image 2 */}
            <button
              type="button"
              onClick={() => {
                setMobileSearchOpen(true);
                setIsSearchFocused(true);
              }}
              aria-label="Поиск товаров"
              className="md:hidden w-8 h-8 rounded-full bg-[#0066ff] hover:bg-[#1a75ff] active:scale-90
                text-white flex items-center justify-center transition-all duration-200 shadow-[0_2px_10px_rgba(0,102,255,0.45)] shrink-0"
            >
              <Search className="w-4 h-4 text-white stroke-[2.5]" />
            </button>
            {/* Live USD rate */}
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0a1224] border border-white/[0.06] text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
              <span className="text-white/40 font-mono">USD</span>
              <span className="font-semibold text-white/80 font-mono">{exchangeRate.toLocaleString()}</span>
            </div>

            {/* Избранное (Screenshot 3 style) */}
            <button
              onClick={onFavClick}
              className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors group select-none text-[13px] font-medium"
              aria-label="Избранное"
            >
              <Heart className="w-5 h-5 text-white/80 group-hover:text-rose-400 group-hover:scale-105 transition-all" />
              <span className="hidden sm:inline">Избранное</span>
              {favCount > 0 && (
                <span className="bg-[#0066ff] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {favCount}
                </span>
              )}
            </button>

            {/* Корзина with circular blue badge on top (Screenshot 3 style) */}
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={onCartClick}
              aria-label={`Корзина, ${cartCount} товаров`}
              className="relative flex items-center gap-1.5 text-white/80 hover:text-white transition-colors group select-none text-[13px] font-medium"
            >
              <div className="relative">
                <ShoppingCart className="w-5 h-5 text-white/80 group-hover:text-[#38bdf8] group-hover:scale-105 transition-all" />
                {cartCount > 0 && (
                  <motion.span
                    key={cartCount}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{
                      scale: cartAnimating ? [1, 1.35, 1] : 1,
                      opacity: 1,
                    }}
                    transition={{ duration: 0.3 }}
                    className="absolute -top-2 -right-2.5 w-4 h-4 rounded-full bg-[#0066ff] text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-[0_0_8px_rgba(0,102,255,0.8)]"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </div>
              <span className="hidden sm:inline">Корзина</span>
            </motion.button>

            {/* Профиль (Screenshot 3 style) */}
            <button
              onClick={onProfileClick}
              className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors group select-none text-[13px] font-medium"
              aria-label="Профиль"
            >
              <User className="w-5 h-5 text-white/80 group-hover:text-[#38bdf8] group-hover:scale-105 transition-all" />
              <span className="hidden sm:inline">Профиль</span>
            </button>
          </div>
        </div>

        {/* ── CATEGORY NAV BAR & FUNCTIONAL CATALOG DROPDOWN ── */}
        <div ref={catalogMenuRef} className="border-t border-white/[0.04] bg-[#040812]/95 relative">
          <div className="w-full max-w-[1540px] mx-auto px-4 sm:px-8 xl:px-12 flex items-center gap-1 overflow-x-auto hide-scrollbar py-1">
            {/* Catalog Dropdown Trigger Button */}
            <button
              onClick={() => setShowCatalogMenu(!showCatalogMenu)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all select-none shrink-0 ${
                showCatalogMenu
                  ? "bg-[#0052cc] text-white shadow-[0_0_15px_rgba(0,102,255,0.5)]"
                  : "bg-[#0066ff] hover:bg-[#1a75ff] text-white shadow-[0_2px_10px_rgba(0,102,255,0.35)]"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Каталог товаров</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  showCatalogMenu ? "rotate-180" : ""
                }`}
              />
            </button>

            <div className="h-4 w-px bg-white/[0.08] shrink-0 mx-2" />

            {/* Category pills strip */}
            {CATEGORIES.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => handleCategoryClick(cat.slug)}
                className="px-3 py-1.5 text-[12.5px] text-white/60 hover:text-white whitespace-nowrap
                  hover:bg-white/[0.05] rounded-lg transition-colors shrink-0"
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Mega-menu dropdown for Catalog (outside overflow-x-auto to prevent clipping) */}
          <AnimatePresence>
            {showCatalogMenu && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.16 }}
                className="absolute top-full left-4 sm:left-8 xl:left-12 mt-1.5 w-72 sm:w-80 bg-[#091122]/98 border border-[#0066ff]/40 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] p-2 z-[70] backdrop-blur-2xl"
              >
                <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
                  <span className="text-[12px] font-bold text-white uppercase tracking-wider">
                    Категории каталога
                  </span>
                  <span className="text-[11px] text-[#38bdf8] font-mono">AlfaComp</span>
                </div>

                <div className="py-1 max-h-[380px] overflow-y-auto">
                  <button
                    onClick={() => handleCategoryClick("all")}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] text-white/80 hover:text-white hover:bg-[#0066ff]/15 transition-colors text-left"
                  >
                    <span className="font-semibold text-[#60a5fa]">Все товары каталога</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#0066ff]" />
                  </button>

                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.slug}
                      onClick={() => handleCategoryClick(cat.slug)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[12.5px] text-white/70 hover:text-white hover:bg-[#0e1a34] transition-colors text-left group"
                    >
                      <span className="group-hover:translate-x-1 transition-transform">
                        {cat.label}
                      </span>
                      <span className="text-[11px] text-white/30 group-hover:text-[#38bdf8] font-mono">
                        →
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* ── MOBILE FULL-SCREEN SEARCH MODAL / OVERLAY ── */}
      <AnimatePresence>
        {mobileSearchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[100] bg-[#050914]/98 backdrop-blur-2xl flex flex-col md:hidden"
          >
            {/* Top search bar in mobile overlay */}
            <div className="p-3 border-b border-white/[0.08] bg-[#070e1c]/90 flex items-center gap-2.5">
              <form
                onSubmit={handleSearchSubmit}
                className="relative flex-1 flex items-center"
              >
                <Search className="absolute left-3.5 w-4 h-4 text-white/40 pointer-events-none stroke-[2]" />
                <input
                  ref={mobileInputRef}
                  type="text"
                  value={searchValue}
                  onChange={(e) => {
                    setSearchValue(e.target.value);
                    setIsSearchFocused(true);
                  }}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Поиск товаров, брендов..."
                  className="w-full h-10 bg-[#0a1428] border border-white/[0.12] rounded-full pl-10 pr-20
                    text-[14px] text-white placeholder:text-white/40 outline-none
                    focus:border-[#0066ff] focus:bg-[#0c1a36] focus:shadow-[0_0_15px_rgba(0,102,255,0.3)] transition-all"
                />

                {searchValue && (
                  <button
                    type="button"
                    onClick={() => setSearchValue("")}
                    className="absolute right-11 text-white/40 hover:text-white p-1"
                    aria-label="Очистить"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                {/* Blue circular search button on right matching Screenshot 2 */}
                <button
                  type="submit"
                  aria-label="Искать"
                  className="absolute right-1 w-8 h-8 rounded-full bg-[#0066ff] hover:bg-[#1a75ff] active:scale-95
                    text-white flex items-center justify-center shadow-[0_2px_8px_rgba(0,102,255,0.5)] transition-transform"
                >
                  <Search className="w-4 h-4 text-white stroke-[2.5]" />
                </button>
              </form>

              <button
                type="button"
                onClick={() => {
                  setMobileSearchOpen(false);
                  setHighlightedIndex(-1);
                }}
                className="px-2 py-1.5 text-[13px] font-medium text-white/70 hover:text-white active:scale-95 transition-all shrink-0"
              >
                Закрыть
              </button>
            </div>

            {/* Content area: Live results or quick category pills */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-3">
              {searchValue.trim() ? (
                <div>
                  <div className="flex items-center justify-between text-[11.5px] text-white/50 px-2 pb-2 mb-2 border-b border-white/[0.05]">
                    <span>Найдено совпадений: {searchMatches.length}</span>
                    <span className="text-[#38bdf8]">
                      {highlightedIndex >= 0 ? "Нажмите Enter для выбора" : "Нажмите на товар"}
                    </span>
                  </div>

                  {searchMatches.length > 0 ? (
                    <div className="divide-y divide-white/[0.04] bg-[#081020] rounded-2xl border border-white/[0.08] overflow-hidden shadow-xl">
                      {searchMatches.map((product, idx) => {
                        const { priceUZS } = resolveProductPrices(product.price, exchangeRate || 14000);
                        const isHighlighted = highlightedIndex === idx;
                        return (
                          <div
                            key={product.id}
                            onClick={() => handleProductSelect(product)}
                            className={`flex items-center gap-3 p-3 active:bg-[#0066ff]/25 cursor-pointer transition-colors ${
                              isHighlighted ? "bg-[#0066ff]/25" : ""
                            }`}
                          >
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-12 h-12 object-contain rounded-xl bg-[#050811] p-1 border border-white/5 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-[13px] font-medium text-white truncate">
                                {product.name}
                              </h4>
                              <span className="text-[11px] text-white/40 block truncate">
                                {product.category} {product.brand ? `• ${product.brand}` : ""}
                              </span>
                              <div className="mt-1 flex items-center gap-2">
                                <span className="text-[12.5px] font-bold text-white font-mono">
                                  {formatPrice(priceUZS)} сум
                                </span>
                                {product.in_stock ? (
                                  <span className="text-[10px] text-emerald-400 font-medium">В наличии</span>
                                ) : (
                                  <span className="text-[10px] text-rose-400 font-medium">Под заказ</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      <div
                        onClick={(e) => {
                          handleSearchSubmit(e);
                        }}
                        className="p-3 bg-[#060c18] text-center text-[13px] font-semibold text-[#0066ff] active:text-[#38bdf8] cursor-pointer border-t border-white/[0.06] transition-colors"
                      >
                        Показать все результаты каталога →
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-[13px] text-white/50">
                      По запросу &quot;{searchValue}&quot; ничего не найдено
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-white/40 font-semibold px-2 mb-2.5">
                    Популярные категории
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.slug}
                        onClick={() => {
                          handleCategoryClick(cat.slug);
                          setMobileSearchOpen(false);
                        }}
                        className="flex items-center gap-2.5 p-3 rounded-xl bg-[#081020] border border-white/[0.06] text-left text-[13px] text-white/80 active:bg-[#0066ff]/20 active:text-white transition-colors"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0066ff]" />
                        <span className="truncate">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
