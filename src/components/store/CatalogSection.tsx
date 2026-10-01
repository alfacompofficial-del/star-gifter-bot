import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { RotateCcw, Search, Plus, Trash2, X, AlertCircle, LayoutGrid } from "lucide-react";
import ProductCard from "./ProductCard";
import type { Product } from "@/hooks/useProducts";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface CatalogSectionProps {
  products: Product[];
  isLoading?: boolean;
  error?: Error | null;
  onAddToCart: (product: Product) => void;
  onProductClick?: (product: Product) => void;
  isAdmin?: boolean;
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
  "Wi-Fi роутеры"
];

const CatalogSection = ({ products, isLoading, error, onAddToCart, onProductClick, isAdmin }: CatalogSectionProps) => {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

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
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add("in-view"); },
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Listen for category jump events from Hero
  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail) setFilter(e.detail);
    };
    window.addEventListener("select-category", handler);
    return () => window.removeEventListener("select-category", handler);
  }, []);

  const categories = useMemo(() => {
    const cats = [...new Set(sourceProducts.map((p) => p.category))];
    cats.sort((a, b) => {
      const indexA = CATEGORY_ORDER.indexOf(a);
      const indexB = CATEGORY_ORDER.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b, "ru");
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
    return ["all", ...cats];
  }, [sourceProducts]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: sourceProducts.length };
    sourceProducts.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [sourceProducts]);

  const filtered = useMemo(() => {
    let result = filter === "all" ? sourceProducts : sourceProducts.filter((p) => p.category === filter);

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
  }, [sourceProducts, filter, search, reorderedProducts]);

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
      const { supabase } = await import("@/integrations/supabase/client");
      await Promise.all(
        withNewPriorities.map(({ id, priority }) =>
          supabase.from("products").update({ priority }).eq("id", id)
        )
      );
      toast.success("Порядок сохранён!");
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
      const { supabase } = await import("@/integrations/supabase/client");
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
        window.dispatchEvent(new CustomEvent("products-updated"));
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
      const { supabase } = await import("@/integrations/supabase/client");
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
        window.dispatchEvent(new CustomEvent("products-updated"));
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
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.from("products").delete().eq("category", categoryName);
      if (error) throw error;
      toast.success(`Вкладка "${categoryName}" удалена!`);
      setFilter("all");
      window.dispatchEvent(new CustomEvent("products-updated"));
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
          const { supabase } = await import("@/integrations/supabase/client");
          const { id, created_at, likes, views, ...productData } = copiedProd;
          const { error } = await supabase.from("products").insert({
            ...productData,
            category: targetCategory,
            name: `${productData.name} (Копия)`
          });
          if (error) throw error;
          toast.success("Товар успешно вставлен!");
          window.dispatchEvent(new CustomEvent("products-updated"));
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
      const { supabase } = await import("@/integrations/supabase/client");
      const { id, created_at, likes, views, ...productData } = copiedProd;
      const { error } = await supabase.from("products").insert({
        ...productData,
        category: targetCategory,
        name: `${productData.name} (Копия)`
      });
      if (error) throw error;
      toast.success("Товар успешно вставлен!");
      window.dispatchEvent(new CustomEvent("products-updated"));
    } catch (err: any) {
      toast.error("Ошибка при вставке: " + err.message);
    }
  };

  const hasCopiedProduct = isAdmin && typeof localStorage !== "undefined" && !!localStorage.getItem("copied_product");

  // Staggered product grid animation
  const gridVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
  };
  const cardVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
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
            <div className="flex items-center gap-2 text-label text-[#FF5A00] mb-2">
              <LayoutGrid className="w-3 h-3" />
              КАТАЛОГ ОБОРУДОВАНИЯ
            </div>
            <h2 className="text-[1.75rem] sm:text-[2.1rem] font-bold tracking-tight text-white leading-tight mb-1">
              Каталог товаров
            </h2>
            <p className="text-[13px] text-white/45 font-normal leading-relaxed max-w-lg">
              Прямые поставки с гарантией и сервисом в Ташкенте. Цены в&nbsp;UZS и&nbsp;USD.
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
          <div className="mb-5 flex items-center gap-2 text-xs font-mono text-[#FF5A00]
            bg-[#FF5A00]/[0.08] border border-[#FF5A00]/20 px-3 py-2 rounded-lg">
            <span>⠿</span>
            <span>Режим администратора: перетаскивайте карточки для изменения порядка на витрине.</span>
          </div>
        )}

        {/* ── Controls panel ──────────────────────────── */}
        <div className="bg-[#0f1117] rounded-xl p-4 sm:p-5 border border-white/[0.07] mb-8
          shadow-[0_8px_40px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">

            {/* Search */}
            <div className="relative w-full lg:w-80 shrink-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по названию, бренду..."
                aria-label="Поиск по каталогу"
                className="search-input"
              />
              {search && (
                <button
                  onClick={() => { setSearch(""); searchRef.current?.focus(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 hover:text-white transition-colors"
                  aria-label="Очистить поиск"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category tabs */}
            <div className="flex-1 flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 min-w-0">
              {categories.map((cat) => {
                const isActive = filter === cat;
                const count = categoryCounts[cat] || 0;
                return (
                  <button
                    key={cat}
                    onClick={() => setFilter(cat)}
                    className={`cat-pill ${isActive ? "cat-pill-active" : "cat-pill-inactive"}`}
                  >
                    <span>{cat === "all" ? "Все" : cat}</span>
                    <span className={`text-data text-[10px] px-1 rounded ${
                      isActive
                        ? "bg-black/20 text-white/80"
                        : "bg-black/25 text-white/35"
                    }`}>
                      {count}
                    </span>

                    {/* Admin delete */}
                    {isAdmin && cat === filter && cat !== "all" && (
                      <span
                        onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat); }}
                        className="ml-0.5 w-4 h-4 flex items-center justify-center rounded text-white/60
                          hover:bg-black/40 hover:text-red-400 transition-colors"
                        title="Удалить категорию"
                      >
                        <Trash2 className="w-3 h-3" />
                      </span>
                    )}
                  </button>
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
                    <Plus className="w-3 h-3 text-[#FF5A00]" /> Вкладка
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
                      bg-[#FF5A00] text-white hover:bg-[#FF6A15] transition-colors"
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
            <div className="flex items-center justify-between mt-3.5 pt-3.5 border-t border-white/[0.05] text-[12px]">
              <span className="text-white/40">
                Найдено:&nbsp;<span className="text-data font-bold text-white">{filtered.length}</span>&nbsp;товар{filtered.length === 1 ? '' : filtered.length >= 2 && filtered.length <= 4 ? 'а' : 'ов'}
              </span>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-white/35 hover:text-white transition-colors text-[11px]"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Сбросить</span>
              </button>
            </div>
          )}
        </div>

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
        ) : (
          <motion.div
            key={`${filter}-${search}`}
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
      </div>
    </section>
  );
};

export default CatalogSection;
