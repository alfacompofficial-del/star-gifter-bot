import { X, Minus, Plus, Trash2, ShoppingCart, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice, CONTACTS } from "@/lib/constants";
import { useExchangeRate } from "@/hooks/useExchangeRate";
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

const CartModal = ({
  isOpen,
  onClose,
  items,
  total,
  onUpdateQuantity,
  onRemove,
  onClear,
}: CartModalProps) => {
  const { exchangeRate } = useExchangeRate();

  const checkoutMessage = items
    .map((i) => `${i.name} x${i.quantity} — ${formatPrice(Math.round(i.price * i.quantity * exchangeRate))} сум`)
    .join("\n");

  const totalUZS = Math.round(total * exchangeRate);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[250] flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320, mass: 0.8 }}
            className="relative w-full sm:max-w-[400px] h-full bg-[#0e1016]
              border-l border-white/[0.08] flex flex-col z-10
              shadow-[-24px_0_60px_rgba(0,0,0,0.60)]
              select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top hairline */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.14] to-transparent pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/[0.07] bg-[#0f1117]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#181B22] border border-white/[0.09] flex items-center justify-center text-[#FF5A00]">
                  <ShoppingCart className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h2 className="text-[14px] font-bold text-white leading-none tracking-tight">
                    Корзина
                  </h2>
                  <span className="text-data text-[10px] text-white/35 mt-0.5 block">
                    {items.length} позиц{items.length === 1 ? 'ия' : items.length >= 2 && items.length <= 4 ? 'ии' : 'ий'} в заказе
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Закрыть корзину"
                className="w-8 h-8 rounded-lg bg-[#181B22] border border-white/[0.09] hover:border-white/20
                  flex items-center justify-center text-white/55 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-16 px-4">
                  <div className="w-14 h-14 rounded-xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-center mb-4">
                    <ShoppingCart className="w-6 h-6 text-white/20" />
                  </div>
                  <h3 className="text-[14px] font-bold text-white mb-1.5">Корзина пуста</h3>
                  <p className="text-[12px] text-white/38 max-w-xs leading-relaxed">
                    Выберите нужное оборудование в каталоге и добавьте в корзину.
                  </p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {items.map((item) => {
                    const itemTotalUZS = Math.round(item.price * item.quantity * exchangeRate);
                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="p-3 bg-[#111319] rounded-xl border border-white/[0.06]
                          hover:border-white/[0.10] transition-colors flex gap-3 items-start"
                      >
                        {/* Thumbnail */}
                        <div className="w-14 h-14 bg-[#08090c] rounded-lg border border-white/[0.06]
                          p-1.5 flex items-center justify-center shrink-0">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[12.5px] font-semibold text-white truncate leading-snug tracking-tight mb-1">
                            {item.name}
                          </h4>
                          <div className="flex items-baseline gap-1 mb-2">
                            <span className="text-data text-[12px] font-bold text-white">
                              {formatPrice(itemTotalUZS)}
                            </span>
                            <span className="text-data text-[10px] text-white/35">UZS</span>
                            <span className="text-data text-[10px] text-white/25 ml-1">
                              (${item.price * item.quantity})
                            </span>
                          </div>

                          {/* Quantity controls */}
                          <div className="flex items-center gap-2">
                            <div className="flex items-center bg-[#181B22] border border-white/[0.07] rounded-md overflow-hidden">
                              <button
                                onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                                aria-label="Уменьшить"
                                className="w-7 h-7 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.06] transition-all"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-7 text-center text-[12px] text-data font-bold text-white">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                aria-label="Увеличить"
                                className="w-7 h-7 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.06] transition-all"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <button
                              onClick={() => onRemove(item.id)}
                              aria-label="Удалить позицию"
                              className="w-7 h-7 rounded-md flex items-center justify-center text-white/30
                                hover:text-red-400 hover:bg-red-500/10 transition-all ml-auto"
                              title="Удалить"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <motion.div
                layout
                className="p-4 sm:p-5 border-t border-white/[0.07] bg-[#0f1117] space-y-3.5"
              >
                {/* Totals */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[11px] text-data text-white/40">
                    <span>Курс USD/UZS</span>
                    <span className="text-white/60">1$ = {exchangeRate.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-2 border-t border-white/[0.05]">
                    <span className="text-[13px] font-semibold text-white">Итого:</span>
                    <div className="text-right">
                      <div className="text-data text-[1.35rem] font-bold text-white tracking-tight leading-none">
                        {formatPrice(totalUZS)}
                        <span className="text-data text-[11px] text-white/40 font-normal ml-1">UZS</span>
                      </div>
                      <div className="text-data text-[11px] text-[#FF5A00] mt-0.5">≈ ${total}</div>
                    </div>
                  </div>
                </div>

                {/* CTAs */}
                <div className="flex gap-2">
                  <button
                    onClick={onClear}
                    className="px-3 py-2.5 rounded-lg border border-white/[0.09] hover:border-red-500/35
                      text-[11.5px] font-medium text-white/45 hover:text-red-400 transition-all"
                    title="Очистить корзину"
                  >
                    Очистить
                  </button>
                  <a
                    href={`${CONTACTS.TELEGRAM}?text=${encodeURIComponent(
                      "Здравствуйте! Хочу оформить заказ в AlfaComp:\n\n" +
                      checkoutMessage +
                      "\n\nИтого: " + formatPrice(totalUZS) + " сум (~$" + total + ")"
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 btn-primary rounded-lg py-2.5 px-4 text-[12.5px] font-bold uppercase tracking-wider
                      flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(255,90,0,0.22)]"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Оформить в Telegram</span>
                  </a>
                </div>

                <p className="text-data text-[10px] text-center text-white/28 leading-relaxed">
                  Менеджер согласует доставку по Ташкенту и способ оплаты (Click, Payme, нал)
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CartModal;
