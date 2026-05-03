import { Plus, Check } from "lucide-react";
import { useState } from "react";
import { formatPrice, EXCHANGE_RATE } from "@/lib/constants";
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
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 group">
      <div className="relative h-48 bg-muted/30 flex items-center justify-center p-6">
        <img
          src={product.image}
          alt={product.name}
          className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
        />
        {product.in_stock && (
          <span className="absolute top-2 left-2 bg-[#00f2ff] text-black text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
            В наличии
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">{product.brand}</p>
        <h3 className="text-sm font-medium line-clamp-2 min-h-[40px] mb-3">{product.name}</h3>
        <div className="flex items-end justify-between gap-2">
          <div className="flex-1">
            {product.old_price && (
              <p className="text-[10px] text-red-500 line-through font-bold">
                {formatPrice(Math.round(product.old_price * EXCHANGE_RATE))} сум
              </p>
            )}
            <p className="text-base font-bold text-foreground">
              {formatPrice(Math.round(product.price * EXCHANGE_RATE))} сум
            </p>
            <p className="text-[10px] text-muted-foreground">≈ ${product.price}</p>
          </div>
          <button
            onClick={handleAdd}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
              added ? "bg-green-500 text-white" : "bg-primary text-primary-foreground hover:brightness-110"
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
