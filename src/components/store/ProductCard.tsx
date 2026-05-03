import { Plus, Check } from "lucide-react";
import { useState } from "react";
import { formatPrice, convertToUSD } from "@/lib/constants";
import type { Product } from "@/hooks/useProducts";

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

const ProductCard = ({ product, onAddToCart }: ProductCardProps) => {
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    onAddToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="glass glass-hover rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_hsl(185_100%_50%/0.12)] group">
      <div className="relative h-48 sm:h-52 bg-gradient-to-br from-muted to-card flex items-center justify-center overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="max-w-[80%] max-h-[80%] object-contain transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
        />
        {product.in_stock && (
          <span className="absolute top-3 left-3 bg-accent text-accent-foreground text-[11px] font-semibold px-2.5 py-1 rounded-full">
            В наличии
          </span>
        )}
      </div>
      <div className="p-5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-primary">{product.brand}</span>
        <h3 className="text-sm font-semibold mt-1 mb-3 line-clamp-2 leading-snug">{product.name}</h3>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-lg font-extrabold">{formatPrice(product.price)} сум</p>
            <p className="text-xs text-muted-foreground">≈ ${convertToUSD(product.price)}</p>
          </div>
          <button
            onClick={handleAdd}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              added
                ? "bg-primary text-primary-foreground"
                : "glass hover:bg-primary hover:text-primary-foreground hover:scale-110"
            }`}
          >
            {added ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
