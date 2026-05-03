import { useState, useMemo } from "react";
import { RotateCcw, Search, X } from "lucide-react";
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
      result = result.filter((p) => 
        p.name.toLowerCase().includes(q) || 
        (p.brand || "").toLowerCase().includes(q)
      );
    }
    
    // Сортировка: Приоритет -> ID
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

  const handleReset = () => {
    setFilter("all");
    setSearch("");
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

        {/* Старый поиск */}
        <div className="relative max-w-lg mx-auto mb-8">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск товаров..."
            className="w-full glass rounded-xl pl-12 pr-10 py-4 text-sm outline-none border-border/60 focus:border-primary/80 placeholder:text-muted-foreground font-medium"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Старые фильтры */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                  filter === cat ? "bg-primary text-primary-foreground glow-primary" : "glass glass-hover"
                }`}
              >
                {cat === "all" ? "Все" : cat}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="w-9 h-9 rounded-full glass flex items-center justify-center text-muted-foreground hover:text-primary transition-all"
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
            <p className="text-sm">Загрузка товаров...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
