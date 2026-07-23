import { useState, useMemo } from "react";
import { RotateCcw, Search, Bot, Filter, Sparkles } from "lucide-react";
import ProductCard from "./ProductCard";
import type { Product } from "@/hooks/useProducts";
import { motion } from "framer-motion";

interface CatalogSectionProps {
  products: Product[];
  isLoading?: boolean;
  onAddToCart: (product: Product) => void;
  onProductClick?: (product: Product) => void;
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

const CatalogSection = ({ products, isLoading, onAddToCart, onProductClick }: CatalogSectionProps) => {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [isAILoading, setIsAILoading] = useState(false);

  const categories = useMemo(() => {
    const cats = [...new Set(products.map((p) => p.category))];
    cats.sort((a, b) => {
      const indexA = CATEGORY_ORDER.indexOf(a);
      const indexB = CATEGORY_ORDER.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b, "ru");
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
    return ["all", ...cats];
  }, [products]);

  const filtered = useMemo(() => {
    let result = filter === "all" ? products : products.filter((p) => p.category === filter);
    
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
  }, [products, filter, search]);

  const handleAISearch = () => {
    if (!search.trim()) return;
    setIsAILoading(true);
    setTimeout(() => setIsAILoading(false), 1500);
  };

  const handleReset = () => {
    setFilter("all");
    setSearch("");
  };

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
                {isAILoading ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <><Bot className="w-4 h-4"/> AI поиск</>}
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
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    filter === cat 
                      ? "bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/40 shadow-[0_0_15px_rgba(0,242,255,0.15)]" 
                      : "bg-white/5 text-white/60 border border-transparent hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {cat === "all" ? "Все категории" : cat}
                </button>
              ))}
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
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} onProductClick={onProductClick} />
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default CatalogSection;
