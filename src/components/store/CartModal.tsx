import { X, Minus, Plus, Trash2, ShoppingCart, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  // Рассчитываем цены в сумах для Telegram сообщения
  const checkoutMessage = items
    .map((i) => `${i.name} x${i.quantity} — ${formatPrice(Math.round(i.price * i.quantity * EXCHANGE_RATE))} сум`)
    .join("\n");

  const totalUZS = Math.round(total * EXCHANGE_RATE);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 25 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 25 }}
            transition={{ type: "spring", damping: 26, stiffness: 350 }}
            className="relative glass rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col border border-white/10 shadow-2xl shadow-black/80 z-10 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top decorative glow */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00f2ff]/60 to-transparent" />

            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#00f2ff]/10 text-[#00f2ff] flex items-center justify-center border border-[#00f2ff]/20">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white">Корзина товаров</h2>
              </div>
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={onClose}
                aria-label="Закрыть корзину"
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              {items.length === 0 ? (
                <div className="text-center py-12 sm:py-16">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/10">
                    <ShoppingCart className="w-8 h-8 text-white/30" />
                  </div>
                  <p className="font-bold text-base sm:text-lg text-white">Ваша корзина пуста</p>
                  <p className="text-sm text-white/50 mt-1 max-w-xs mx-auto">Выберите понравившиеся товары в каталоге и добавьте их</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {items.map((item) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      key={item.id}
                      className="flex gap-4 p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors items-center"
                    >
                      <img src={item.image} alt={item.name} className="w-16 h-16 object-contain rounded-xl bg-black/40 p-1 border border-white/5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{item.name}</p>
                        <p className="text-sm font-black text-[#00f2ff] mt-0.5">
                          {formatPrice(Math.round(item.price * EXCHANGE_RATE))} <span className="text-xs text-white/50 font-normal">сум</span>
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <motion.button
                            whileTap={{ scale: 0.85 }}
                            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                            aria-label={`Уменьшить количество: ${item.name}`}
                            className="w-7 h-7 rounded-lg glass flex items-center justify-center text-xs border border-white/10 hover:border-[#00f2ff]/40 text-white"
                          >
                            <Minus className="w-3 h-3" />
                          </motion.button>
                          <span className="text-sm font-bold w-6 text-center text-white">{item.quantity}</span>
                          <motion.button
                            whileTap={{ scale: 0.85 }}
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                            aria-label={`Увеличить количество: ${item.name}`}
                            className="w-7 h-7 rounded-lg glass flex items-center justify-center text-xs border border-white/10 hover:border-[#00f2ff]/40 text-white"
                          >
                            <Plus className="w-3 h-3" />
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.85 }}
                            onClick={() => onRemove(item.id)}
                            aria-label={`Удалить из корзины: ${item.name}`}
                            className="ml-auto w-7 h-7 rounded-lg hover:bg-destructive/20 flex items-center justify-center text-white/40 hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="p-5 sm:p-6 border-t border-white/10 bg-black/40 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/60 font-medium">Общая стоимость:</span>
                  <div className="text-right">
                    <p className="font-black text-xl text-white tracking-tight">{formatPrice(totalUZS)} сум</p>
                    <p className="text-xs font-semibold text-[#00f2ff]/70">≈ ${total}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={onClear}
                    className="glass rounded-xl px-4 py-3 text-xs sm:text-sm font-bold text-white/60 hover:border-destructive/40 hover:text-destructive transition-all"
                  >
                    Очистить
                  </motion.button>
                  <motion.a
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    href={`${CONTACTS.TELEGRAM}?text=${encodeURIComponent("Заказ:\n" + checkoutMessage + "\n\nИтого: " + formatPrice(totalUZS) + " сум")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-gradient-to-r from-[#00f2ff] to-[#009dff] text-black rounded-xl py-3 text-xs sm:text-sm font-black text-center flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,242,255,0.35)] hover:shadow-[0_0_35px_rgba(0,242,255,0.5)] transition-all"
                  >
                    <Send className="w-4 h-4" />
                    Оформить в Telegram
                  </motion.a>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CartModal;
