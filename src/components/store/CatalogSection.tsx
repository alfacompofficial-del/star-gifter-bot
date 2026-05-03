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
    
    // Сортируем товары: 
    // 1. По порядку категорий
    // 2. Внутри категории по ПРИОРИТЕТУ (от большего к меньшему)
    // 3. По ID (от меньшего к большему = от первых к последним)
    const finalResult = [...result].sort((a, b) => {
      const catA = a.category || "";
      const catB = b.category || "";
      const indexA = CATEGORY_ORDER.indexOf(catA);
      const indexB = CATEGORY_ORDER.indexOf(catB);
      
      const sortA = indexA === -1 ? 999 : indexA;
      const sortB = indexB === -1 ? 999 : indexB;

      if (sortA !== sortB) return sortA - sortB;
      
      // Внутри категории
      const priorityA = a.priority || 0;
      const priorityB = b.priority || 0;
      if (priorityA !== priorityB) return priorityB - priorityA; // Высокий приоритет в начало

      return a.id - b.id; // От первых к последним
    });
    
    return finalResult;
  }, [products, filter, search]);

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
          <p className="text-muted-foreground mt-2">Прямые поставки по лучшим ценам</p>
        </motion.div>

        {/* Простой поиск без ИИ */}
        <div className="relative max-w-lg mx-auto mb-10">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск товаров..."
            className="w-full glass rounded-2xl pl-6 pr-12 py-5 text-sm outline-none border-border/40 focus:border-primary/80 transition-all font-medium"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
            {search ? (
              <button onClick={() => setSearch("")}><X className="w-5 h-5"/></button>
            ) : (
              <Search className="w-5 h-5 opacity-40"/>
            )}
          </div>
        </div>

        {/* Filters */}
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
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          </div>
        ) : (
          <>
            <AnimatePresence mode="wait">
              {filtered.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20"
                >
                  <Package className="w-16 h-16 mx-auto mb-4 opacity-10" />
                  <p className="text-muted-foreground font-bold uppercase tracking-widest">Ничего не найдено</p>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
                >
                  {filtered.map((product) => (
                    <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </section>
  );
};

export default CatalogSection;
