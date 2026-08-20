import { X, Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import { formatPrice, convertToUSD, CONTACTS, EXCHANGE_RATE } from "@/lib/constants";
import type { CartItem } from "@/hooks/useCart";

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  total: number;
  onUpdateQuantity: (id: number, qty: number) => void;
  onRemove: (id: number) => void;
  onClear: () => void;
}

const CartModal = ({ isOpen, onClose, items, total, onUpdateQuantity, onRemove, onClear }: CartModalProps) => {
  if (!isOpen) return null;

  // Рассчитываем цены в сумах для Telegram сообщения
  const checkoutMessage = items
    .map((i) => `${i.name} x${i.quantity} — ${formatPrice(Math.round(i.price * i.quantity * EXCHANGE_RATE))} сум`)
    .join("\n");

  const totalUZS = Math.round(total * EXCHANGE_RATE);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div
        className="relative glass rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-bold">Корзина</h2>
          <button onClick={onClose} aria-label="Закрыть корзину" className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-semibold">Корзина пуста</p>
              <p className="text-sm text-muted-foreground mt-1">Добавьте товары из каталога</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4 p-3 rounded-xl bg-muted/30">
                  <img src={item.image} alt={item.name} className="w-16 h-16 object-contain rounded-lg bg-card" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{item.name}</p>
                    <p className="text-sm font-bold text-primary mt-1">
                      {formatPrice(Math.round(item.price * EXCHANGE_RATE))} сум
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        aria-label={`Уменьшить количество: ${item.name}`}
                        className="w-7 h-7 rounded-md glass flex items-center justify-center text-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        aria-label={`Увеличить количество: ${item.name}`}
                        className="w-7 h-7 rounded-md glass flex items-center justify-center text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onRemove(item.id)}
                        aria-label={`Удалить из корзины: ${item.name}`}
                        className="ml-auto w-7 h-7 rounded-md hover:bg-destructive/20 flex items-center justify-center text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="p-5 border-t border-border space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Итого:</span>
              <div className="text-right">
                <p className="font-bold text-lg">{formatPrice(totalUZS)} сум</p>
                <p className="text-xs text-muted-foreground">≈ ${total}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={onClear} className="glass rounded-xl px-4 py-2.5 text-sm font-medium hover:border-destructive hover:text-destructive transition-all">
                Очистить
              </button>
              <a
                href={`${CONTACTS.TELEGRAM}?text=${encodeURIComponent("Заказ:\n" + checkoutMessage + "\n\nИтого: " + formatPrice(totalUZS) + " сум")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-bold text-center hover:scale-[1.02] transition-transform"
              >
                Оформить в Telegram
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartModal;
