import { useState, useMemo, useCallback, useEffect } from "react";
import { RotateCcw, Search, Bot, Filter, Sparkles, Plus, Trash2 } from "lucide-react";
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
  const [isAILoading, setIsAILoading] = useState(false);

  // Admin: drag & drop state
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  // Admin: local reordered products (overrides server order until page reload)
  const [reorderedProducts, setReorderedProducts] = useState<Product[] | null>(null);

  const sourceProducts = reorderedProducts ?? products;

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
    
    // Only sort by category+priority if admin hasn't manually reordered
    if (!reorderedProducts) {
      const finalResult = [...result].sort((a, b) => {
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
      return finalResult;
    }

    return result;
  }, [sourceProducts, filter, search, reorderedProducts]);

  const handleAISearch = () => {
    if (!search.trim()) return;
    setIsAILoading(true);
    setTimeout(() => setIsAILoading(false), 1500);
  };

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

    // Reorder in local list
    const list = [...filtered];
    const fromIdx = list.findIndex(p => p.id === draggedId);
    const toIdx = list.findIndex(p => p.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const reordered = [...list];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    // Update local priority values
    const withNewPriorities = reordered.map((p, idx) => ({ ...p, priority: idx + 1 }));
    
    // Merge into sourceProducts
    const updated = sourceProducts.map(p => {
      const found = withNewPriorities.find(r => r.id === p.id);
      return found ?? p;
    });
    // Re-sort by new priorities to maintain order
    const reorderedAll = [...updated].sort((a, b) => (a.priority ?? 9999) - (b.priority ?? 9999));

    setReorderedProducts(reorderedAll);
    setDraggedId(null);
    setDragOverId(null);

    // Save to Supabase
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
        console.error("Insert error:", error);
        toast.error("Ошибка при создании: " + (error?.message || "неизвестно"));
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Ошибка соединения: " + err.message);
    }
  };

  const handleAddCategory = async () => {
    if (!isAdmin) return;
    const catName = window.prompt("Введите название новой вкладки:");
    if (!catName || !catName.trim()) return;
    
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      // Create a dummy product to establish the category in the DB
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
        setFilter(catName.trim()); // Switch to the new tab
      } else {
        console.error("Insert error:", error);
        toast.error("Ошибка при создании вкладки: " + (error?.message || "неизвестно"));
      }
    } catch (err: any) {
      console.error(err);
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
      
      toast.success(`Вкладка "${categoryName}" и все её товары удалены!`);
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
      // Check for Ctrl+V (or Cmd+V on Mac). Use e.code to ignore keyboard layout (e.g. Russian 'м')
      if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyV' || e.key.toLowerCase() === 'v')) {
        const copiedStr = localStorage.getItem("copied_product");
        if (!copiedStr) return;
        
        try {
          const copiedProd = JSON.parse(copiedStr);
          // Don't paste if they are typing in an input!
          if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
            return; 
          }
          
          e.preventDefault();
          const targetCategory = filter === "all" ? copiedProd.category : filter;
          
          if (!window.confirm(`Вставить скопированный товар "${copiedProd.name}" во вкладку "${targetCategory}"?`)) return;
          
          const { supabase } = await import("@/integrations/supabase/client");
          const { id, created_at, likes, views, ...productData } = copiedProd; // remove ids and missing columns
          
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

  return (
    <section id="catalog" className="py-16 sm:py-24 relative">
      <div className="container px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-16 relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 mb-4">
            <Sparkles className="w-4 h-4 text-[#ff0080]" />
            <span className="text-xs font-bold text-white/80 uppercase tracking-widest">Ассортимент</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4 text-white">Каталог товаров</h2>
          <p className="text-white/50 text-base sm:text-lg max-w-2xl mx-auto font-medium px-2">Актуальные цены в сумах и долларах. Напрямую от производителя.</p>
        </div>

        {/* Admin hint */}
        {isAdmin && (
          <div className="mb-6 flex items-center justify-center gap-3 text-xs font-bold text-[#00f2ff]/50">
            <span className="flex items-center gap-1.5 bg-[#00f2ff]/5 border border-[#00f2ff]/10 px-4 py-2 rounded-full">
              ⠿ Режим администратора — перетащите карточки чтобы изменить порядок
            </span>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 mb-8 sm:mb-12 shadow-2xl relative z-10">
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-center">
            
            {/* Search */}
            <div className="w-full lg:w-1/3 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по названию или бренду..."
                className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-24 py-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#00f2ff]/50 focus:ring-1 focus:ring-[#00f2ff]/50 transition-all shadow-inner"
              />
              <button
                onClick={handleAISearch}
                disabled={isAILoading || !search.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-gradient-to-r from-[#00f2ff] to-[#009dff] text-black rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-50 flex items-center gap-2 hover:shadow-[0_0_15px_rgba(0,242,255,0.4)] transition-all"
              >
                {isAILoading ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <><Bot className="w-4 h-4"/>AI поиск</>}
              </button>
            </div>

            {/* Categories */}
            <div className="w-full lg:w-2/3 flex flex-wrap items-center gap-2">
              <div className="w-full flex items-center justify-between lg:hidden mb-2">
                <span className="text-sm font-bold text-white/50 flex items-center gap-2"><Filter className="w-4 h-4"/> Категории</span>
                <span className="text-sm font-bold text-[#00f2ff]">{filtered.length} товаров</span>
              </div>
              
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`relative group/tab px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    filter === cat 
                      ? "bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/40 shadow-[0_0_15px_rgba(0,242,255,0.15)]" 
                      : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-transparent"
                  }`}
                >
                  {cat === "all" ? "Все товары" : cat}
                  {isAdmin && cat === filter && cat !== "all" && (
                    <span 
                      onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat); }}
                      className="ml-2 w-5 h-5 flex items-center justify-center bg-red-500/10 text-red-500 rounded-md hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover/tab:opacity-100"
                      title="Удалить вкладку и все товары"
                    >
                      <Trash2 className="w-3 h-3" />
                    </span>
                  )}
                </button>
              ))}
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddCategory}
                    className="px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 bg-[#00f2ff] text-black hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                    title="Создать новую категорию"
                  >
                    <Plus className="w-4 h-4" /> Вкладка
                  </button>
                  {hasCopiedProduct && (
                    <button
                      onClick={handlePasteProduct}
                      className="px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white border border-green-500/30"
                      title="Вставить скопированный товар"
                    >
                      <Bot className="w-4 h-4 hidden sm:block" /> Вставить
                    </button>
                  )}
                  <button
                    onClick={handleAddProduct}
                    className="px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 bg-white/10 text-white hover:bg-white/20 border border-white/20"
                    title="Создать новый товар в текущей вкладке"
                  >
                    <Plus className="w-4 h-4" /> Товар
                  </button>
                </div>
              )}
            </div>
            
          </div>
          
          <div className="hidden lg:flex items-center justify-between mt-6 pt-6 border-t border-white/10">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 text-sm font-bold text-white/40 hover:text-white transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Сбросить фильтры
            </button>
            <span className="text-sm font-bold text-white/50">
              Показано товаров: <span className="text-[#00f2ff] text-base">{filtered.length}</span>
            </span>
          </div>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-12 h-12 border-4 border-[#00f2ff]/20 border-t-[#00f2ff] rounded-full animate-spin mb-6" />
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#00f2ff]/50 animate-pulse">Загрузка каталога...</p>
          </div>
        ) : error ? (
          <div className="glass rounded-3xl py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">⚠️</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Не удалось загрузить каталог</h3>
            <p className="text-white/50 mb-8 max-w-md mx-auto">Проверьте подключение к интернету и попробуйте снова</p>
            <button onClick={() => window.location.reload()} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all">
              Обновить страницу
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-3xl py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-white/20" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Товары не найдены</h3>
            <p className="text-white/50 mb-8 max-w-md mx-auto">Попробуйте изменить параметры поиска или выбрать другую категорию</p>
            <button onClick={handleReset} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all">
              Сбросить все фильтры
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={filter}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {filtered.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={onAddToCart}
                  onProductClick={onProductClick}
                  isAdmin={isAdmin}
                  isDragging={isAdmin ? draggedId === product.id : false}
                  isDragOver={isAdmin ? dragOverId === product.id : false}
                  onDragStart={isAdmin ? (e) => handleDragStart(e, product.id) : undefined}
                  onDragOver={isAdmin ? (e) => handleDragOver(e, product.id) : undefined}
                  onDrop={isAdmin ? (e) => handleDrop(e, product.id) : undefined}
                  onDragEnd={isAdmin ? handleDragEnd : undefined}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </section>
  );
};

export default CatalogSection;
