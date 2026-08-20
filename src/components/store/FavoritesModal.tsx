import { X, Trash2, Heart, ShoppingCart } from "lucide-react";
import { formatPrice, EXCHANGE_RATE } from "@/lib/constants";
import type { Product } from "@/hooks/useProducts";

interface FavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: number[];
  products: Product[];
  onRemove: (id: number) => void;
  onClear: () => void;
  onAddToCart: (product: Product) => void;
}

const FavoritesModal = ({ isOpen, onClose, items, products, onRemove, onClear, onAddToCart }: FavoritesModalProps) => {
  if (!isOpen) return null;

  const favoriteProducts = items
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => p !== undefined);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div
        className="relative glass rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Heart className="w-5 h-5 text-[#ff0080]" />
            Избранное
          </h2>
          <button onClick={onClose} aria-label="Закрыть избранное" className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {favoriteProducts.length === 0 ? (
            <div className="text-center py-12">
              <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-semibold">Список пуст</p>
              <p className="text-sm text-muted-foreground mt-1">Здесь будут храниться понравившиеся товары</p>
            </div>
          ) : (
            <div className="space-y-4">
              {favoriteProducts.map((product) => (
                <div key={product.id} className="flex gap-4 p-3 rounded-xl bg-muted/30">
                  <img src={product.image} alt={product.name} className="w-16 h-16 object-contain rounded-lg bg-card" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{product.name}</p>
                    <p className="text-sm font-bold text-primary mt-1">
                      {formatPrice(Math.round(product.price * EXCHANGE_RATE))} сум
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => {
                          onAddToCart(product);
                        }}
                        disabled={!product.in_stock}
                        className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                          !product.in_stock
                            ? "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                            : "bg-[#00f2ff]/10 text-[#00f2ff] hover:bg-[#00f2ff]/20"
                        }`}
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        {product.in_stock ? "В корзину" : "Нет в наличии"}
                      </button>
                      <button
                        onClick={() => onRemove(product.id)}
                        aria-label={`Удалить из избранного: ${product.name}`}
                        className="ml-auto w-8 h-8 rounded-lg hover:bg-destructive/20 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {favoriteProducts.length > 0 && (
          <div className="p-5 border-t border-border">
            <button 
              onClick={onClear} 
              className="w-full glass rounded-xl px-4 py-2.5 text-sm font-medium hover:border-destructive hover:text-destructive transition-all"
            >
              Очистить список
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesModal;
