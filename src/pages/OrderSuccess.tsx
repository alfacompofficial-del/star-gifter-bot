import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { CheckCircle2, ArrowRight, MessageSquare, ShoppingBag, ShieldCheck, Truck, Headphones } from "lucide-react";
import Header from "@/components/store/Header";
import Footer from "@/components/store/Footer";
import { formatPrice, CONTACTS } from "@/lib/constants";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { trackGoogleAdsConversion, trackGoogleAdsPageView } from "@/utils/googleAds";
import type { CartItem } from "@/hooks/useCart";

interface LastOrderData {
  items: CartItem[];
  total: number;
  date: string;
}

const OrderSuccess = () => {
  const { exchangeRate } = useExchangeRate();
  const [order, setOrder] = useState<LastOrderData | null>(null);

  useEffect(() => {
    // Read last order from sessionStorage
    try {
      const stored = sessionStorage.getItem("alfacomp_last_order");
      if (stored) {
        const parsed = JSON.parse(stored) as LastOrderData;
        setOrder(parsed);

        // Track conversion in Google Ads
        trackGoogleAdsConversion(parsed.total, "UZS");
      } else {
        // Fallback conversion event if opened directly
        trackGoogleAdsConversion(0, "UZS");
      }
    } catch {
      trackGoogleAdsConversion(0, "UZS");
    }

    trackGoogleAdsPageView("/cart/success");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const totalUZS = order?.total || 0;
  const totalUSDRef = exchangeRate > 0 && totalUZS > 0 ? Math.round(totalUZS / exchangeRate) : null;

  return (
    <div className="min-h-screen bg-[#08090c] text-white flex flex-col font-sans selection:bg-[#1565C0] selection:text-white">
      <Helmet>
        <title>Заказ успешно оформлен | AlfaComp.uz</title>
        <meta name="description" content="Ваш заказ успешно передан в обработку магазина компьютерной техники AlfaComp." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <Header cartCount={0} onCartClick={() => {}} />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-16">
        {/* Success Card */}
        <div className="bg-[#0e1016] border border-white/[0.08] rounded-2xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          {/* Subtle Top Glow */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-[#1565C0] to-emerald-500" />

          {/* Success Icon */}
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 mb-3">
              Google Ads Conversion Verified
            </span>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Заказ успешно оформлен!
            </h1>

            <p className="text-sm sm:text-base text-white/70 max-w-lg mt-3 leading-relaxed">
              Спасибо за ваш выбор в <strong className="text-white">AlfaComp</strong>. Детали заказа переданы менеджеру в Telegram. Мы свяжемся с вами в течение 10–15 минут для подтверждения адреса доставки по Ташкенту и способа оплаты.
            </p>
          </div>

          {/* Order Summary Breakdown if available */}
          {order && order.items && order.items.length > 0 && (
            <div className="mt-8 pt-8 border-t border-white/[0.08]">
              <div className="flex items-center gap-2 mb-4 text-xs font-mono uppercase tracking-wider text-white/50">
                <ShoppingBag className="w-4 h-4 text-[#1565C0]" />
                <span>Состав заказа ({order.items.length} поз.)</span>
              </div>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-10 h-10 rounded-lg object-contain bg-black/40 border border-white/5 shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.svg";
                        }}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate max-w-[200px] sm:max-w-xs">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-white/40 font-mono">
                          {item.quantity} шт. × {formatPrice(item.price)} сум
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-bold text-white">
                        {formatPrice(item.price * item.quantity)} сум
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Row */}
              <div className="flex justify-between items-baseline mt-4 pt-4 border-t border-white/[0.08]">
                <span className="text-sm font-semibold text-white/80">Итого к оплате:</span>
                <div className="text-right">
                  <span className="text-lg sm:text-xl font-mono font-bold text-[#1565C0]">
                    {formatPrice(totalUZS)} сум
                  </span>
                  {totalUSDRef && (
                    <span className="text-xs font-mono text-white/40 block">
                      ≈ ${totalUSDRef}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Guarantees / Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8 pt-8 border-t border-white/[0.08]">
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-3">
              <Truck className="w-5 h-5 text-[#1565C0] shrink-0" />
              <div>
                <div className="text-xs font-bold text-white">Быстрая доставка</div>
                <div className="text-[11px] text-white/50">По Ташкенту в день заказа</div>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-white">Гарантия до 3 лет</div>
                <div className="text-[11px] text-white/50">Официальный сервис</div>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-3">
              <Headphones className="w-5 h-5 text-sky-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-white">Поддержка 24/7</div>
                <div className="text-[11px] text-white/50">Telegram @ALIBABO777</div>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-8 pt-6 border-t border-white/[0.08]">
            <a
              href={CONTACTS.TELEGRAM}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:flex-1 py-3 px-5 rounded-xl bg-[#1565C0] hover:bg-[#1976D2] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#1565C0]/25 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Написать менеджеру в Telegram</span>
            </a>

            <Link
              to="/"
              className="w-full sm:w-auto py-3 px-6 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
            >
              <span>В каталог товаров</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default OrderSuccess;
