import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { RotateCcw, Search, Plus, Trash2, X, AlertCircle, LayoutGrid, ChevronRight, ChevronDown } from "lucide-react";
import ProductCard from "./ProductCard";
import type { Product } from "@/hooks/useProducts";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { getCategoryUrl, getCategorySlug, CATEGORY_SEO_DATA } from "@/lib/slugify";
import { supabase } from "@/integrations/supabase/client";
import { clearProductsCache } from "@/lib/productsDb";

interface CatalogSectionProps {
  products: Product[];
  isLoading?: boolean;
  error?: Error | null;
  onAddToCart: (product: Product) => void;
  onProductClick?: (product: Product) => void;
  isAdmin?: boolean;
  activeCategory?: string;
  onCategoryChange?: (category: string) => void;
}

const CATEGORY_ORDER = [
  "ИБП",
  "Мониторы",
  "Сеть",
  "Комплектующие",
  "Моноблоки",
  "Аксессуары",
  "Колонки",
  "Кронштейны",
  "Deco",
  "Wi-Fi роутеры",
  "Видеокарты",
  "Мышки",
];

const CatalogSection = ({
  products,
  isLoading,
  error,
  onAddToCart,
  onProductClick,
  isAdmin,
  activeCategory,
  onCategoryChange,
}: CatalogSectionProps) => {
  const [filter, setFilter] = useState(activeCategory || "all");
  const [search, setSearch] = useState("");
  const [showAllExplicitly, setShowAllExplicitly] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeCategory !== undefined) {
      setFilter(activeCategory);
      if (activeCategory !== "all") {
        setShowAllExplicitly(true);
      }
    }
  }, [activeCategory]);

  const handleCategorySelect = (cat: string) => {
    setFilter(cat);
    if (cat !== "all") {
      setShowAllExplicitly(true);
    }
    onCategoryChange?.(cat);
  };

  // Admin: drag & drop state
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [reorderedProducts, setReorderedProducts] = useState<Product[] | null>(null);

  const sourceProducts = reorderedProducts ?? products;

  // Intersection observer for section reveal
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight + 150) {
      el.classList.add("in-view");
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("in-view");
          observer.disconnect();
        }
      },
      { threshold: 0, rootMargin: "100px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Listen for category jump events from Hero & Header
  useEffect(() => {
    const handleCategory = (e: any) => {
      if (e.detail) {
        setFilter(e.detail);
        setShowAllExplicitly(true);
      }
    };
    const handleSearch = (e: any) => {
      if (typeof e.detail === "string") {
        setSearch(e.detail);
        setShowAllExplicitly(true);
      }
    };
    window.addEventListener("select-category", handleCategory);
    window.addEventListener("store-search", handleSearch);
    return () => {
      window.removeEventListener("select-category", handleCategory);
      window.removeEventListener("store-search", handleSearch);
    };
  }, []);

  // Smart category matching helper to ensure subcategories like Мышки, Процессоры, Видеокарты, SSD, RAM filter real DB products accurately
  const matchesProductCategory = useCallback((p: Product, targetFilter: string): boolean => {
    if (targetFilter === "all") return true;
    if (p.category === targetFilter) return true;
    const name = p.name.toLowerCase();
    const cat = (p.category || "").toLowerCase();
    if (targetFilter === "Процессоры") {
      return cat === "комплектующие" && /(intel|core|i3|i5|i7|i9|ultra|ryzen|amd|cpu|14700|13900|9285k)/i.test(name);
    }
    if (targetFilter === "Видеокарты") {
      return cat === "комплектующие" && /(rtx|geforce|radeon|gtx|rx\s*\d|видеокарт|gpu)/i.test(name);
    }
    if (targetFilter === "Оперативная память") {
      return cat === "комплектующие" && /(ram|ddr4|ddr5|памят|thor|fury|kingston.*(?:gb|ddr)|lexar.*(?:gb|ddr))/i.test(name);
    }
    if (targetFilter === "SSD") {
      return cat === "комплектующие" && /(ssd|nvme|m\.2|990\s*pro|kingston.*tb|hdd|накопител|passport)/i.test(name);
    }
    if (targetFilter === "Мышки") {
      return cat === "мышки" || cat === "периферия" || /(мышь|мышк|mouse|sc380|v8ma|v7m71|r90|r72|r73|a9\s*air|v9\s*ultra)/i.test(name);
    }
    return false;
  }, []);

  const categories = useMemo(() => {
    const cats = [...new Set(sourceProducts.map((p) => p.category))];
    if (filter !== "all" && !cats.includes(filter)) {
      cats.push(filter);
    }
    cats.sort((a, b) => {
      const indexA = CATEGORY_ORDER.indexOf(a);
      const indexB = CATEGORY_ORDER.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b, "ru");
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
    return ["all", ...cats];
  }, [sourceProducts, filter]);

  const activeCatSlug = filter !== "all" ? getCategorySlug(filter) : null;
  const categorySeo = activeCatSlug ? CATEGORY_SEO_DATA[activeCatSlug] : null;

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: sourceProducts.length };
    sourceProducts.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    const subcats = ["Процессоры", "Видеокарты", "Оперативная память", "SSD", "Мышки"];
    subcats.forEach((sc) => {
      counts[sc] = sourceProducts.filter((p) => matchesProductCategory(p, sc)).length;
    });
    return counts;
  }, [sourceProducts, matchesProductCategory]);

  const filtered = useMemo(() => {
    let result = filter === "all" ? sourceProducts : sourceProducts.filter((p) => matchesProductCategory(p, filter));

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const terms = q.split(/\s+/);
      result = result.filter((p) => {
        const name = p.name.toLowerCase();
        const cat = (p.category || "").toLowerCase();
        const brand = (p.brand || "").toLowerCase();
        return terms.every(term => name.includes(term) || cat.includes(term) || brand.includes(term));
      });
    }

    if (!reorderedProducts) {
      return [...result].sort((a, b) => {
        const catA = a.category || "";
        const catB = b.category || "";
        const indexA = CATEGORY_ORDER.indexOf(catA);
        const indexB = CATEGORY_ORDER.indexOf(catB);
        const sortA = indexA === -1 ? 999 : indexA;
        const sortB = indexB === -1 ? 999 : indexB;
        if (sortA !== sortB) return sortA - sortB;
        const priorityA = a.priority || 9999;
        const priorityB = b.priority || 9999;
        if (priorityA !== priorityB) return priorityA - priorityB;
        return a.id - b.id;
      });
    }

    return result;
  }, [sourceProducts, filter, search, reorderedProducts, matchesProductCategory]);

  const handleReset = () => {
    setFilter("all");
    setSearch("");
  };

  // ── Admin drag & drop handlers ────────────────────────────────
  const handleDragStart = useCallback((e: React.DragEvent, id: number) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, id: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id !== draggedId) setDragOverId(id);
  }, [draggedId]);

  const handleDrop = useCallback(async (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const currentList = [...filtered];
    const fromIndex = currentList.findIndex((p) => p.id === draggedId);
    const toIndex = currentList.findIndex((p) => p.id === targetId);

    if (fromIndex === -1 || toIndex === -1) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const [moved] = currentList.splice(fromIndex, 1);
    currentList.splice(toIndex, 0, moved);

    const withNewPriorities = currentList.map((p, idx) => ({ ...p, priority: idx + 1 }));
    const priorityMap = new Map(withNewPriorities.map((p) => [p.id, p.priority]));
    const updated = sourceProducts.map((p) => {
      const newP = priorityMap.get(p.id);
      return newP !== undefined ? { ...p, priority: newP } : p;
    });

    const reorderedAll = [...updated].sort((a, b) => (a.priority ?? 9999) - (b.priority ?? 9999));
    setReorderedProducts(reorderedAll);
    setDraggedId(null);
    setDragOverId(null);

    try {
      await Promise.all(
        withNewPriorities.map(({ id, priority }) =>
          supabase.from("products").update({ priority }).eq("id", id)
        )
      );
      toast.success("Порядок сохранён!");
      await clearProductsCache();
    } catch {
      toast.error("Ошибка сохранения порядка");
    }
  }, [draggedId, filtered, sourceProducts]);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDragOverId(null);
  }, []);

  const handleAddProduct = async () => {
    if (!isAdmin) return;
    try {
      const { data, error } = await supabase.from("products").insert({
        name: "Новый товар",
        brand: "Бренд",
        price: 100,
        image: "/placeholder.svg",
        category: filter === "all" ? "Новая категория" : filter,
        in_stock: true
      }).select().single();

      if (!error && data) {
        toast.success("Товар создан!");
        await clearProductsCache();
        onProductClick?.(data as Product);
      } else {
        toast.error("Ошибка при создании: " + (error?.message || "неизвестно"));
      }
    } catch (err: any) {
      toast.error("Ошибка соединения: " + err.message);
    }
  };

  const handleAddCategory = async () => {
    if (!isAdmin) return;
    const catName = window.prompt("Введите название новой вкладки:");
    if (!catName || !catName.trim()) return;

    try {
      const { data, error } = await supabase.from("products").insert({
        name: "Пример товара",
        brand: "Бренд",
        price: 0,
        image: "/placeholder.svg",
        category: catName.trim(),
        in_stock: false
      }).select().single();

      if (!error && data) {
        toast.success(`Вкладка "${catName}" создана!`);
        await clearProductsCache();
        setFilter(catName.trim());
      } else {
        toast.error("Ошибка при создании вкладки: " + (error?.message || "неизвестно"));
      }
    } catch (err: any) {
      toast.error("Ошибка соединения: " + err.message);
    }
  };

  const handleDeleteCategory = async (categoryName: string) => {
    if (!isAdmin || categoryName === "all") return;
    if (!window.confirm(`Удалить вкладку "${categoryName}" и ВСЕ товары в ней безвозвратно?`)) return;

    try {
      const { error } = await supabase.from("products").delete().eq("category", categoryName);
      if (error) throw error;
      toast.success(`Вкладка "${categoryName}" удалена!`);
      setFilter("all");
      await clearProductsCache();
    } catch (err: any) {
      toast.error("Ошибка при удалении: " + err.message);
    }
  };

  // Ctrl+V Paste handler
  useEffect(() => {
    if (!isAdmin) return;
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyV' || e.key.toLowerCase() === 'v')) {
        const copiedStr = localStorage.getItem("copied_product");
        if (!copiedStr) return;
        try {
          const copiedProd = JSON.parse(copiedStr);
          if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
          e.preventDefault();
          const targetCategory = filter === "all" ? copiedProd.category : filter;
          if (!window.confirm(`Вставить скопированный товар "${copiedProd.name}" во вкладку "${targetCategory}"?`)) return;
          const { id, created_at, likes, views, ...productData } = copiedProd;
          const { error } = await supabase.from("products").insert({
            ...productData,
            category: targetCategory,
            name: `${productData.name} (Копия)`
          });
          if (error) throw error;
          toast.success("Товар успешно вставлен!");
          await clearProductsCache();
        } catch (err: any) {
          toast.error("Ошибка при вставке: " + err.message);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAdmin, filter]);

  const handlePasteProduct = async () => {
    if (!isAdmin) return;
    const copiedStr = localStorage.getItem("copied_product");
    if (!copiedStr) return;
    try {
      const copiedProd = JSON.parse(copiedStr);
      const targetCategory = filter === "all" ? copiedProd.category : filter;
      if (!window.confirm(`Вставить скопированный товар "${copiedProd.name}" во вкладку "${targetCategory}"?`)) return;
      const { id, created_at, likes, views, ...productData } = copiedProd;
      const { error } = await supabase.from("products").insert({
        ...productData,
        category: targetCategory,
        name: `${productData.name} (Копия)`
      });
      if (error) throw error;
      toast.success("Товар успешно вставлен!");
      await clearProductsCache();
    } catch (err: any) {
      toast.error("Ошибка при вставке: " + err.message);
    }
  };

  const hasCopiedProduct = isAdmin && typeof localStorage !== "undefined" && !!localStorage.getItem("copied_product");

  // Staggered product grid animation — only on initial page reveal, not on every search keystroke
  const hasAnimatedRef = useRef(false);
  useEffect(() => {
    hasAnimatedRef.current = true;
  }, []);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const gridVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: hasAnimatedRef.current || isMobile ? 0 : 0.03,
        delayChildren: hasAnimatedRef.current || isMobile ? 0 : 0.04,
      },
    },
  };
  const cardVariants = {
    hidden: hasAnimatedRef.current || isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const } },
  };

  return (
    <section
      id="catalog"
      ref={sectionRef}
      className="py-12 sm:py-20 relative reveal-section"
    >
      <div className="container px-4 sm:px-6 lg:px-8">

        {/* ── Section Header ──────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-6 border-b border-white/[0.07]">
          <div>
            <div className="flex items-center gap-2 text-label text-[#1565C0] mb-2">
              <LayoutGrid className="w-3 h-3" />
              КАТАЛОГ ОБОРУДОВАНИЯ
            </div>
            <h2 className="text-[1.75rem] sm:text-[2.1rem] font-bold tracking-tight text-white leading-tight mb-1">
              {categorySeo ? categorySeo.h1 : "Каталог товаров"}
            </h2>
            <p className="text-[13px] text-white/45 font-normal leading-relaxed max-w-2xl">
              {categorySeo ? categorySeo.seoDescription : "Прямые поставки с гарантией и сервисом в Ташкенте. Цены в UZS и USD."}
            </p>
          </div>

          <div className="flex items-center gap-2.5 text-[12px] font-mono text-white/40 shrink-0">
            <span>Всего: <strong className="text-white font-bold">{sourceProducts.length}</strong></span>
            <span className="text-white/20">·</span>
            <span>В наличии: <strong className="text-[#22c55e] font-bold">{sourceProducts.filter(p => p.in_stock).length}</strong></span>
          </div>
        </div>

        {/* Admin hint */}
        {isAdmin && (
          <div className="mb-5 flex items-center gap-2 text-xs font-mono text-[#1565C0]
            bg-[#1565C0]/[0.08] border border-[#1565C0]/20 px-3 py-2 rounded-lg">
            <span>⠿</span>
            <span>Режим администратора: перетаскивайте карточки для изменения порядка на витрине.</span>
          </div>
        )}

        {/* ── Controls panel (Category tabs only, search handled in header) ──────────────────────────── */}
        <div className="bg-[#0c1424] rounded-2xl p-3.5 sm:p-4 border border-white/[0.08] mb-8
          shadow-[0_8px_40px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">

            {/* Category tabs */}
            <div className="flex-1 flex flex-wrap items-center gap-2 overflow-x-auto pb-1 sm:pb-0 min-w-0">
              {categories.map((cat) => {
                const isActive = filter === cat;
                const count = categoryCounts[cat] || 0;
                const categoryUrl = cat === "all" ? "/" : getCategoryUrl(cat);
                return (
                  <Link
                    key={cat}
                    to={categoryUrl}
                    onClick={(e) => {
                      if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                        e.preventDefault();
                        handleCategorySelect(cat);
                      }
                    }}
                    className={`cat-pill ${isActive ? "cat-pill-active" : "cat-pill-inactive"}`}
                  >
                    <span>{cat === "all" ? "Все категории" : cat}</span>
                    <span className={`text-data text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                      isActive
                        ? "bg-black/30 text-white"
                        : "bg-white/10 text-white/50"
                    }`}>
                      {count}
                    </span>

                    {/* Admin delete */}
                    {isAdmin && cat === filter && cat !== "all" && (
                      <span
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteCategory(cat); }}
                        className="ml-0.5 w-4 h-4 flex items-center justify-center rounded text-white/60
                          hover:bg-black/40 hover:text-red-400 transition-colors"
                        title="Удалить категорию"
                      >
                        <Trash2 className="w-3 h-3" />
                      </span>
                    )}
                  </Link>
                );
              })}

              {/* Admin actions */}
              {isAdmin && (
                <div className="flex items-center gap-1.5 ml-auto shrink-0">
                  <button
                    onClick={handleAddCategory}
                    className="px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1
                      bg-white/8 text-white hover:bg-white/15 border border-white/12 transition-all"
                    title="Создать вкладку"
                  >
                    <Plus className="w-3 h-3 text-[#1565C0]" /> Вкладка
                  </button>
                  {hasCopiedProduct && (
                    <button
                      onClick={handlePasteProduct}
                      className="px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1
                        bg-[#22c55e]/15 text-[#22c55e] hover:bg-[#22c55e]/25 border border-[#22c55e]/30 transition-all"
                      title="Вставить скопированный товар"
                    >
                      Вставить
                    </button>
                  )}
                  <button
                    onClick={handleAddProduct}
                    className="px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1
                      bg-[#0066ff] text-white hover:bg-[#1a75ff] transition-colors"
                    title="Создать товар"
                  >
                    <Plus className="w-3 h-3" /> Товар
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Filter active sub-bar */}
          {(filter !== "all" || search.trim()) && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.05] text-[12px]">
              <span className="text-white/60 flex items-center gap-2">
                {search.trim() ? (
                  <>
                    <span>Поиск: <strong className="text-white font-mono">«{search}»</strong></span>
                    <span className="text-white/30">·</span>
                  </>
                ) : null}
                <span>
                  Найдено:&nbsp;<span className="font-bold text-[#38bdf8]">{filtered.length}</span>&nbsp;товар{filtered.length === 1 ? '' : filtered.length >= 2 && filtered.length <= 4 ? 'а' : 'ов'}
                </span>
              </span>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-[11px] bg-white/[0.05] hover:bg-white/10 px-2.5 py-1 rounded-lg"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Сбросить фильтр</span>
              </button>
            </div>
          )}
        </div>

        {/* Category Heading & SEO Breadcrumbs */}
        {filter !== "all" && (
          <div className="mb-6 p-4 rounded-xl bg-[#0f1117]/80 border border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <nav aria-label="Хлебные крошки" className="flex items-center gap-1.5 text-xs text-white/50 mb-1">
                <Link to="/" onClick={() => handleCategorySelect("all")} className="hover:text-white transition-colors">
                  Главная
                </Link>
                <ChevronRight className="w-3 h-3 text-white/25" />
                <span className="text-[#1565C0] font-medium">{filter}</span>
              </nav>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {categorySeo?.h1 || `${filter} в Ташкенте`}
              </h2>
            </div>
            <button
              onClick={() => handleCategorySelect("all")}
              className="text-xs text-white/45 hover:text-white flex items-center gap-1 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" /> Показать все товары
            </button>
          </div>
        )}

        {/* ── Product Grid States ─────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-[#0f1117] rounded-xl border border-white/[0.05] overflow-hidden">
                <div className="skeleton aspect-square" />
                <div className="p-4 space-y-2.5">
                  <div className="skeleton h-2.5 w-16 rounded" />
                  <div className="skeleton h-4 w-5/6 rounded" />
                  <div className="skeleton h-3.5 w-2/3 rounded" />
                  <div className="h-px bg-white/[0.04] my-1" />
                  <div className="flex justify-between items-center">
                    <div className="skeleton h-5 w-24 rounded" />
                    <div className="skeleton w-9 h-9 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-[15px] font-bold text-white mb-1">Ошибка загрузки каталога</h3>
            <p className="text-[12px] text-white/45 mb-5 leading-relaxed">{error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-ghost text-xs h-9 px-4"
            >
              Перезагрузить страницу
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mb-4">
              <Search className="w-5 h-5 text-white/25" />
            </div>
            <h3 className="text-[15px] font-bold text-white mb-1.5">Товары не найдены</h3>
            <p className="text-[12px] text-white/40 mb-5 leading-relaxed">
              По запросу «{search}» в категории «{filter === "all" ? "Все" : filter}» ничего не найдено.
            </p>
            <button
              onClick={handleReset}
              className="btn-ghost text-xs h-9 px-4"
            >
              Показать все товары
            </button>
          </div>
        ) : !showAllExplicitly && filter === "all" && !search.trim() ? (
          /* Modern interactive category teaser instead of dumping 160 products on load */
          <div className="py-12 px-6 sm:px-10 rounded-3xl bg-[#091122]/90 border border-[#0066ff]/25 text-center max-w-4xl mx-auto shadow-2xl backdrop-blur-xl">
            <div className="w-14 h-14 rounded-2xl bg-[#0066ff]/15 border border-[#0066ff]/35 flex items-center justify-center mx-auto mb-4 text-[#38bdf8] shadow-[0_0_20px_rgba(0,102,255,0.25)]">
              <LayoutGrid className="w-7 h-7" />
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white mb-2 tracking-tight">
              Каталог товаров AlfaComp
            </h3>
            <p className="text-[13px] sm:text-[14px] text-white/50 max-w-lg mx-auto mb-6 leading-relaxed">
              Выберите категорию оборудования, чтобы просмотреть только нужные комплектующие и технику
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 mb-8">
              {categories.filter((c) => c !== "all").map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategorySelect(cat)}
                  className="px-4 py-2.5 rounded-xl bg-[#0e1935] hover:bg-[#0066ff] border border-white/10 hover:border-[#0066ff] text-[13px] font-semibold text-white/80 hover:text-white transition-all shadow-md hover:shadow-[0_4px_18px_rgba(0,102,255,0.4)] hover:-translate-y-0.5 active:scale-95"
                >
                  {cat}{" "}
                  <span className="text-[11px] text-white/40 ml-1 font-mono">
                    ({categoryCounts[cat] || 0})
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAllExplicitly(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/70 hover:text-white text-[13px] font-semibold transition-all hover:border-white/20 active:scale-95"
            >
              <span>Показать весь ассортимент ({sourceProducts.length} товаров)</span>
              <ChevronDown className="w-4 h-4 text-[#38bdf8]" />
            </button>
          </div>
        ) : (
          <motion.div
            key="catalog-product-grid"
            variants={gridVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5"
          >
            {filtered.map((product) => (
              <motion.div key={product.id} variants={cardVariants}>
                <ProductCard
                  product={product}
                  onAddToCart={onAddToCart}
                  onProductClick={onProductClick}
                  isAdmin={isAdmin}
                  isDragging={draggedId === product.id}
                  isDragOver={dragOverId === product.id}
                  onDragStart={(e) => handleDragStart(e, product.id)}
                  onDragOver={(e) => handleDragOver(e, product.id)}
                  onDrop={(e) => handleDrop(e, product.id)}
                  onDragEnd={handleDragEnd}
                />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* SEO Category Guide Block */}
        {filter !== "all" && categorySeo && (
          <div className="mt-12 p-6 rounded-2xl bg-[#0f1117] border border-white/[0.06] text-white/70 text-xs sm:text-sm leading-relaxed space-y-3">
            <h3 className="text-sm sm:text-base font-bold text-white">
              Купить {filter.toLowerCase()} в Ташкенте — интернет-магазин AlfaComp
            </h3>
            <p className="text-white/60 leading-relaxed">
              {categorySeo.seoDescription}
            </p>
            <div className="flex flex-wrap gap-4 pt-2 text-[11px] text-white/45 border-t border-white/[0.05]">
              <span>✓ Экспресс-доставка по Ташкенту за 24 часа</span>
              <span>✓ Официальная гарантия сервисного центра</span>
              <span>✓ Оплата Click / Payme / Наличные / Перечисление</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default CatalogSection;
