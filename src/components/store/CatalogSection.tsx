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
    setTimeout(() => {
      setIsAILoading(false);
    }, 1500);
  };

  const handleReset = () => {
    setFilter("all");
    setSearch("");
  };

  return (
    <section id="catalog" className="py-20">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-xs font-semibold uppercase tracking-[2px] text-primary">Каталог</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold mt-2 text-gradient uppercase tracking-tighter">Наш Ассортимент</h2>
          <p className="text-muted-foreground mt-2 font-medium">Актуальные цены в сумах и долларах</p>
        </motion.div>

        {/* AI Search Bar Restored */}
        <div className="relative max-w-lg mx-auto mb-10">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="AI поиск товаров..."
            className={`w-full glass rounded-2xl pl-6 pr-24 py-5 text-sm outline-none transition-all duration-500 bg-transparent ${
              isAILoading ? "border-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]" : "border-border/60 focus:border-primary/80"
            } placeholder:text-muted-foreground font-medium`}
          />
          
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {search && !isAILoading && (
              <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground transition-colors p-1">
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
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Bot className="w-4 h-4" />
                  <span>AI</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  filter === cat ? "bg-primary text-black shadow-lg" : "glass glass-hover opacity-70"
                }`}
              >
                {cat === "all" ? "Все" : cat}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="w-10 h-10 rounded-xl glass flex items-center justify-center text-muted-foreground hover:text-primary transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Всего: <span className="text-primary">{filtered.length}</span>
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-bold uppercase tracking-widest">Загрузка товаров...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default CatalogSection;
