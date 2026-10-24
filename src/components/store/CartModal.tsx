import { useEffect, useState } from "react";
import { X, Minus, Plus, Trash2, ShoppingCart, Send, User, Phone, ChevronRight, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { formatPrice, CONTACTS } from "@/lib/constants";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { trackGoogleAdsPageView } from "@/utils/googleAds";
import type { CartItem } from "@/hooks/useCart";
import { loadProfile, type ProfileData } from "./ProfileModal";
import { sendOrderToAdmin } from "@/services/telegramBot";

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  total: number;
  onUpdateQuantity: (id: number, qty: number) => void;
  onRemove: (id: number) => void;
  onClear: () => void;
}

type Step = "cart" | "checkout";

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
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("cart");

  // Customer info form
  const [customer, setCustomer] = useState<ProfileData>({
    firstName: "",
    lastName: "",
    phone: "",
    telegramUsername: "",
  });
  const [errors, setErrors] = useState<Partial<ProfileData>>({});
  const [sending, setSending] = useState(false);

  // Load profile from localStorage on open
  useEffect(() => {
    if (isOpen) {
      setStep("cart");
      const saved = loadProfile();
      if (saved) setCustomer(saved);
    }
  }, [isOpen]);

  // Track Google Ads page view
  useEffect(() => {
    if (isOpen) trackGoogleAdsPageView("/cart");
  }, [isOpen]);

  const totalUZS = total;
  const totalUSDRef = exchangeRate > 0 ? Math.round(totalUZS / exchangeRate) : null;

  const validate = () => {
    const errs: Partial<ProfileData> = {};
    if (!customer.firstName.trim()) errs.firstName = "Введите имя";
    if (!customer.lastName.trim()) errs.lastName = "Введите фамилию";
    if (!customer.phone.trim() || customer.phone.replace(/\D/g, "").length < 9)
      errs.phone = "Введите номер телефона";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCheckout = async () => {
    if (!validate()) return;
    setSending(true);

    // Save profile
    try {
      localStorage.setItem("alfacomp_profile_v1", JSON.stringify(customer));
    } catch {}

    // Build order message for Telegram
    const checkoutMessage = items
      .map((i) => `• ${i.name} x${i.quantity} — ${formatPrice(i.price * i.quantity)} сум`)
      .join("\n");

    // Send to admin bot
    await sendOrderToAdmin(
      customer,
      items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
      totalUZS,
      exchangeRate
    );

    // Also open Telegram for direct communication
    const telegramText = `Здравствуйте! Хочу оформить заказ в AlfaComp.\n\n` +
      `Имя: ${customer.firstName} ${customer.lastName}\n` +
      `Телефон: ${customer.phone}\n` +
      (customer.telegramUsername ? `Telegram: @${customer.telegramUsername.replace("@", "")}\n` : "") +
      `\nТовары:\n${checkoutMessage}\n\nИтого: ${formatPrice(totalUZS)} сум${totalUSDRef ? ` (≈$${totalUSDRef})` : ""}`;

    const telegramUrl = `${CONTACTS.TELEGRAM}?text=${encodeURIComponent(telegramText)}`;

    // Save order data for success page
    try {
      sessionStorage.setItem("alfacomp_last_order", JSON.stringify({
        items, total: totalUZS, date: new Date().toISOString(), customer,
      }));
    } catch {}

    setSending(false);
    window.open(telegramUrl, "_blank", "noopener,noreferrer");
    onClear();
    onClose();
    navigate("/cart/success");
  };

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
            className="relative w-full sm:max-w-[420px] h-full bg-[#08091a]
              border-l border-[#1565C0]/20 flex flex-col z-10
              shadow-[-24px_0_60px_rgba(0,0,0,0.60)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top blue hairline */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#1565C0]/60 to-transparent pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/[0.06] bg-[#0a0c20]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1565C0] to-[#0D47A1]
                  flex items-center justify-center shadow-[0_4px_14px_rgba(21,101,192,0.3)]">
                  <ShoppingCart className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-[14px] font-bold text-white leading-none tracking-tight">
                    {step === "cart" ? "Корзина" : "Оформление заказа"}
                  </h2>
                  <span className="text-data text-[10px] text-white/35 mt-0.5 block">
                    {step === "cart"
                      ? `${items.length} позиц${items.length === 1 ? "ия" : items.length >= 2 && items.length <= 4 ? "ии" : "ий"} в заказе`
                      : "Укажите данные для доставки"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {step === "checkout" && (
                  <button
                    onClick={() => setStep("cart")}
                    className="text-[11px] text-white/45 hover:text-white transition-colors px-2 py-1 rounded border border-white/[0.07]"
                  >
                    ← Назад
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:border-white/20
                    flex items-center justify-center text-white/55 hover:text-white transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Step progress */}
            <div className="flex border-b border-white/[0.04]">
              {["Корзина", "Данные"].map((label, i) => (
                <div
                  key={label}
                  className={`flex-1 py-2 text-center text-[11px] font-medium transition-colors ${
                    (i === 0 && step === "cart") || (i === 1 && step === "checkout")
                      ? "text-[#42A5F5] border-b-2 border-[#1565C0] bg-[#1565C0]/05"
                      : "text-white/30"
                  }`}
                >
                  {i + 1}. {label}
                </div>
              ))}
            </div>

            {/* ── STEP 1: Cart items ── */}
            <AnimatePresence mode="wait">
              {step === "cart" && (
                <motion.div
                  key="cart"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                    {items.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center py-16 px-4">
                        <div className="w-16 h-16 rounded-2xl bg-[#1565C0]/10 border border-[#1565C0]/20
                          flex items-center justify-center mb-4">
                          <ShoppingCart className="w-7 h-7 text-[#1565C0]/50" />
                        </div>
                        <h3 className="text-[14px] font-bold text-white mb-1.5">Корзина пуста</h3>
                        <p className="text-[12px] text-white/38 max-w-xs leading-relaxed">
                          Выберите оборудование в каталоге и добавьте в корзину.
                        </p>
                      </div>
                    ) : (
                      <AnimatePresence initial={false}>
                        {items.map((item) => {
                          const itemTotalUZS = item.price * item.quantity;
                          return (
                            <motion.div
                              key={item.id}
                              layout
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
                              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                              className="p-3 bg-[#0c0f22] rounded-xl border border-white/[0.06]
                                hover:border-[#1565C0]/25 transition-colors flex gap-3 items-start"
                            >
                              {/* Thumbnail */}
                              <div className="w-14 h-14 bg-[#060810] rounded-lg border border-white/[0.06]
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
                                  <span className="text-data text-[10px] text-white/35">сум</span>
                                  {exchangeRate > 0 && (
                                    <span className="text-data text-[10px] text-white/25 ml-1">
                                      (≈${Math.round(itemTotalUZS / exchangeRate)})
                                    </span>
                                  )}
                                </div>

                                {/* Quantity controls */}
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center bg-[#0f1222] border border-white/[0.07] rounded-md overflow-hidden">
                                    <button
                                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                                      className="w-7 h-7 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.06] transition-all"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="w-7 text-center text-[12px] text-data font-bold text-white">
                                      {item.quantity}
                                    </span>
                                    <button
                                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                      className="w-7 h-7 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.06] transition-all"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <button
                                    onClick={() => onRemove(item.id)}
                                    className="w-7 h-7 rounded-md flex items-center justify-center text-white/30
                                      hover:text-red-400 hover:bg-red-500/10 transition-all ml-auto"
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

                  {/* Cart footer */}
                  {items.length > 0 && (
                    <div className="p-4 sm:p-5 border-t border-white/[0.06] bg-[#0a0c20] space-y-3.5">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[11px] text-data text-white/40">
                          <span>Курс USD/UZS</span>
                          <span className="text-white/60">1$ = {exchangeRate.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-baseline pt-2 border-t border-white/[0.05]">
                          <span className="text-[13px] font-semibold text-white">Итого:</span>
                          <div className="text-right">
                            <div className="text-data text-[1.3rem] font-bold text-white tracking-tight leading-none">
                              {formatPrice(totalUZS)}
                              <span className="text-data text-[11px] text-white/40 font-normal ml-1">сум</span>
                            </div>
                            {totalUSDRef && (
                              <div className="text-data text-[11px] text-[#42A5F5] mt-0.5">≈ ${totalUSDRef}</div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={onClear}
                          className="px-3 py-2.5 rounded-lg border border-white/[0.09] hover:border-red-500/35
                            text-[11.5px] font-medium text-white/45 hover:text-red-400 transition-all"
                        >
                          Очистить
                        </button>
                        <button
                          onClick={() => setStep("checkout")}
                          className="flex-1 h-11 rounded-xl bg-gradient-to-r from-[#1565C0] to-[#1976D2]
                            text-white font-bold text-[13px] flex items-center justify-center gap-2
                            hover:from-[#1976D2] hover:to-[#1E88E5] transition-all
                            shadow-[0_4px_20px_rgba(21,101,192,0.28)] active:scale-[0.98]"
                        >
                          Оформить заказ
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── STEP 2: Customer details ── */}
              {step === "checkout" && (
                <motion.div
                  key="checkout"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {/* Info */}
                    <div className="p-3.5 rounded-xl bg-[#1565C0]/10 border border-[#1565C0]/20">
                      <p className="text-[12px] text-blue-300/80 leading-relaxed">
                        Укажите ваши данные. Регистрация не требуется — менеджер свяжется через Telegram.
                      </p>
                    </div>

                    {/* Order summary */}
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                      <p className="text-[11px] text-white/40 font-mono uppercase tracking-wider mb-2">
                        Ваш заказ ({items.length} товар{items.length === 1 ? "" : "а"})
                      </p>
                      {items.map((i) => (
                        <div key={i.id} className="flex justify-between items-start gap-2">
                          <span className="text-[12px] text-white/60 leading-snug line-clamp-1">{i.name} ×{i.quantity}</span>
                          <span className="text-[12px] text-white/80 font-mono shrink-0">{formatPrice(i.price * i.quantity)}</span>
                        </div>
                      ))}
                      <div className="pt-2 mt-1 border-t border-white/[0.06] flex justify-between">
                        <span className="text-[13px] font-semibold text-white">Итого</span>
                        <span className="text-[13px] font-bold text-[#42A5F5]">{formatPrice(totalUZS)} сум</span>
                      </div>
                    </div>

                    {/* Customer form */}
                    <div className="space-y-3">
                      {[
                        { key: "firstName", label: "Имя *", placeholder: "Иван", type: "text" },
                        { key: "lastName", label: "Фамилия *", placeholder: "Петров", type: "text" },
                        { key: "phone", label: "Телефон *", placeholder: "+998 90 123-45-67", type: "tel" },
                        { key: "telegramUsername", label: "Telegram (необязательно)", placeholder: "@username", type: "text" },
                      ].map(({ key, label, placeholder, type }) => (
                        <div key={key}>
                          <label className="text-[11px] text-white/40 uppercase tracking-wider font-mono block mb-1.5">
                            {label}
                          </label>
                          <input
                            type={type}
                            value={(customer as any)[key] || ""}
                            onChange={(e) => setCustomer({ ...customer, [key]: e.target.value })}
                            placeholder={placeholder}
                            className={`w-full h-11 px-4 rounded-xl bg-[#0c0f22] border text-white text-[13px]
                              outline-none transition-all placeholder:text-white/20
                              ${(errors as any)[key]
                                ? "border-red-500/60"
                                : "border-white/[0.09] focus:border-[#1565C0]/60 focus:bg-[#0f1228]"
                              }`}
                          />
                          {(errors as any)[key] && (
                            <p className="text-red-400 text-[11px] mt-1">{(errors as any)[key]}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Checkout footer */}
                  <div className="p-4 sm:p-5 border-t border-white/[0.06] bg-[#0a0c20] space-y-3">
                    <button
                      onClick={handleCheckout}
                      disabled={sending}
                      className="w-full h-12 rounded-xl bg-gradient-to-r from-[#1565C0] to-[#1976D2]
                        text-white font-bold text-[13.5px] flex items-center justify-center gap-2.5
                        hover:from-[#1976D2] hover:to-[#1E88E5] transition-all disabled:opacity-60
                        shadow-[0_4px_20px_rgba(21,101,192,0.30)] active:scale-[0.98]"
                    >
                      {sending ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Отправляем...
                        </span>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Оформить через Telegram
                        </>
                      )}
                    </button>
                    <p className="text-data text-[10px] text-center text-white/28 leading-relaxed">
                      Менеджер свяжется в Telegram и согласует доставку и оплату
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CartModal;
