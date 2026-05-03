import { useState, useMemo } from "react";
import { RotateCcw, Search, Bot } from "lucide-react";
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
    setTimeout(() => setIsAILoading(false), 1500);
  };

  const handleReset = () => {
    setFilter("all");
    setSearch("");
  };

  return (
    <section id="catalog" className="py-12">
      <div className="container px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight">Каталог товаров</h2>
          <p className="text-muted-foreground mt-2 font-medium">Актуальные цены в сумах и долларах</p>
        </div>

        <div className="relative max-w-md mx-auto mb-8">
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="AI поиск товаров..."
              className="w-full bg-[#1A1F2C] border border-border rounded-xl pl-11 pr-20 py-4 text-sm outline-none focus:ring-1 focus:ring-[#00f2ff]/30 transition-all"
            />
            <button
              onClick={handleAISearch}
              disabled={isAILoading || !search.trim()}
              className="absolute right-2 px-3 py-2 bg-[#00f2ff] text-black rounded-lg text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 flex items-center gap-1.5"
            >
              {isAILoading ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <><Bot className="w-3 h-3"/> AI</>}
            </button>
          </div>
        </div>

        {/* Вкладки как на скриншоте (без теней и лишних PX) */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                filter === cat 
                  ? "bg-[#00f2ff] text-black" 
                  : "bg-[#1A1F2C] text-[#8E9196] hover:bg-[#2A2F3C]"
              }`}
            >
              {cat === "all" ? "Все" : cat}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-start gap-2.5 mb-10">
          <button
            onClick={handleReset}
            className="w-8 h-8 rounded-full bg-[#1A1F2C] flex items-center justify-center text-muted-foreground hover:text-[#00f2ff] transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            Найдено: <span className="text-[#00f2ff] font-bold">{filtered.length}</span>
          </span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-xs font-bold uppercase tracking-widest opacity-50">Загрузка товаров...</p>
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
