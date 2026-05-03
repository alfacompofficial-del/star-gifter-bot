import { useState, useMemo } from "react";
import { RotateCcw, Search, X, Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ProductCard from "./ProductCard";
import type { Product } from "@/hooks/useProducts";

interface CatalogSectionProps {
  products: Product[];
  isLoading?: boolean;
  onAddToCart: (product: Product) => void;
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

const CatalogSection = ({ products, isLoading, onAddToCart }: CatalogSectionProps) => {
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
    
    // AI / Smart Search Logic
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const terms = q.split(/\s+/);
      
      result = result.filter((p) => {
        const name = p.name.toLowerCase();
        const cat = (p.category || "").toLowerCase();
        // Простое умное совпадение: все слова из запроса должны быть где-то в названии или категории
        return terms.every(term => name.includes(term) || cat.includes(term));
      });
    }
    
    // Сортируем товары строго по заданному порядку категорий
    const sortedResult = [...result].reverse().sort((a, b) => {
      const catA = a.category || "";
      const catB = b.category || "";
      const indexA = CATEGORY_ORDER.indexOf(catA);
      const indexB = CATEGORY_ORDER.indexOf(catB);
      
      const sortA = indexA === -1 ? 999 : indexA;
      const sortB = indexB === -1 ? 999 : indexB;

      if (sortA !== sortB) return sortA - sortB;
      
      // Внутри одной категории сортируем по цене (от меньшей к большей)
      const priceA = Number(a.price) || 0;
      const priceB = Number(b.price) || 0;
      return priceA - priceB;
    });
    
    // Спец. требование: Ion 600t-33 должен быть вторым
    const finalResult = [...sortedResult];
    const targetIndex = finalResult.findIndex(p => p.name === "Ion 600t-33");
    if (targetIndex !== -1) {
      const item = finalResult.splice(targetIndex, 1)[0];
      // Вставляем на второе место (индекс 1)
      finalResult.splice(1, 0, item);
    }
    
    return finalResult;
  }, [products, filter, search]);

  const displayed = filtered;

  const handleReset = () => {
    setFilter("all");
    setSearch("");
  };

  const handleAISearch = () => {
    if (!search.trim()) return;
    setIsAILoading(true);
    // Эмуляция "AI" подбора (задержка + визуальный эффект)
    setTimeout(() => {
      setIsAILoading(false);
    }, 1500);
  };

  return (
    <section id="catalog" className="py-20">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-xs font-semibold uppercase tracking-[2px] text-primary">Каталог</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold mt-2 text-gradient">Все товары</h2>
          <p className="text-muted-foreground mt-2">Актуальные цены в сумах и долларах</p>
        </motion.div>

        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative max-w-lg mx-auto mb-8"
        >
          {/* Logo inside search */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full overflow-hidden bg-black/50 border border-primary/20 pointer-events-none flex items-center justify-center p-1 z-10">
            <img src="/android-chrome-512x512.png" alt="AlfaComp" className="w-full h-full object-contain" />
          </div>
          
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); }}
            placeholder="AI поиск товаров..."
            className={`w-full glass rounded-xl pl-12 pr-20 py-4 text-sm outline-none transition-all duration-500 bg-transparent ${
              isAILoading ? "border-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]" : "border-border/60 hover:border-primary/40 focus:border-primary/80"
            } placeholder:text-muted-foreground font-medium`}
          />
          
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {search && !isAILoading && (
              <button
                onClick={() => setSearch("")}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            
            <button
              onClick={handleAISearch}
              disabled={isAILoading || !search.trim()}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isAILoading || search.trim() ? "bg-primary text-primary-foreground glow-primary" : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
              }`}
            >
              {isAILoading ? (
                <>
                  <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Думаю...</span>
                </>
              ) : (
                <>
                  <Bot className="w-3.5 h-3.5" />
                  <span>AI</span>
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => { setFilter(cat); }}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                  filter === cat
                    ? "bg-primary text-primary-foreground glow-primary"
                    : "glass glass-hover"
                }`}
              >
                {cat === "all" ? "Все" : cat}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              title="Сбросить фильтры"
              className="w-9 h-9 rounded-full glass flex items-center justify-center text-muted-foreground hover:text-primary hover:rotate-90 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <span className="text-sm text-muted-foreground">
              Найдено: <span className="text-primary font-bold">{filtered.length}</span>
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm">Загрузка товаров из базы...</p>
          </div>
        ) : (
          <>
            {/* Empty state */}
            <AnimatePresence>
              {filtered.length === 0 && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-20 text-muted-foreground"
                >
                  <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">Ничего не найдено</p>
                  <p className="text-sm mt-1">Попробуйте другой запрос или сбросьте фильтры</p>
                  <button
                    onClick={handleReset}
                    className="mt-4 glass glass-hover rounded-full px-6 py-2 text-sm font-medium hover:border-primary transition-all"
                  >
                    Сбросить
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {displayed.map((product) => (
                <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default CatalogSection;
