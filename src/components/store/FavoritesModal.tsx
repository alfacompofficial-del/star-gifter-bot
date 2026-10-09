import { X, Trash2, Heart, ShoppingCart } from "lucide-react";
import { formatPrice } from "@/lib/constants";
import { useExchangeRate } from "@/hooks/useExchangeRate";
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
  const { exchangeRate } = useExchangeRate();
  if (!isOpen) return null;

  const favoriteProducts = items
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => p !== undefined);

  return (
    <div className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative bg-[#0E1015] border border-white/[0.09] rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl shadow-black z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/[0.08] bg-[#121419]">
          <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-400 fill-current" />
            Избранные товары
          </h2>
          <button onClick={onClose} aria-label="Закрыть избранное" className="w-7 h-7 rounded-lg bg-[#181B22] border border-white/10 hover:border-white/20 flex items-center justify-center text-white/60 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {favoriteProducts.length === 0 ? (
            <div className="text-center py-12">
              <Heart className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <p className="font-bold text-white text-sm">Список избранного пуст</p>
              <p className="text-xs text-white/40 mt-1">Отмечайте понравившуюся технику в каталоге</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {favoriteProducts.map((product) => (
                <div key={product.id} className="flex gap-3 p-3 rounded-lg bg-[#121419] border border-white/[0.06] items-center">
                  <div className="w-14 h-14 bg-[#0A0B0E] rounded-md border border-white/[0.06] p-1 flex items-center justify-center shrink-0">
                    <img src={product.image} alt={product.name} className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{product.name}</p>
                    <p className="text-xs font-mono font-bold text-white mt-0.5">
                      {formatPrice(Math.round(product.price * exchangeRate))} сум
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => onAddToCart(product)}
                        disabled={!product.in_stock}
                        className={`text-xs px-2.5 py-1 rounded-md flex items-center gap-1 font-semibold transition-all ${
                          !product.in_stock
                            ? "bg-white/[0.04] text-white/20 cursor-not-allowed"
                            : "bg-[#FF5A00] text-white hover:bg-[#FF6A15]"
                        }`}
                      >
                        <ShoppingCart className="w-3 h-3" />
                        {product.in_stock ? "В корзину" : "Под заказ"}
                      </button>
                      <button
                        onClick={() => onRemove(product.id)}
                        aria-label={`Удалить из избранного: ${product.name}`}
                        className="ml-auto w-6 h-6 rounded flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {favoriteProducts.length > 0 && (
          <div className="p-4 border-t border-white/[0.08] bg-[#111317]">
            <button 
              onClick={onClear} 
              className="w-full rounded-lg px-4 py-2 text-xs font-mono text-white/50 hover:text-red-400 border border-white/10 hover:border-red-500/30 transition-all"
            >
              Очистить список избранного
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesModal;
