import { useState, useEffect } from "react";
import { Home, LayoutGrid, Info, HelpCircle, ShoppingCart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MobileBottomNavProps {
  cartCount: number;
  onCartClick: () => void;
}

const tabs = [
  { label: "Главная", icon: Home, id: "home" },
  { label: "Каталог", icon: LayoutGrid, id: "catalog" },
  { label: "О нас", icon: Info, id: "features" },
  { label: "FAQ", icon: HelpCircle, id: "faq" },
];

const MobileBottomNav = ({ cartCount, onCartClick }: MobileBottomNavProps) => {
  const [active, setActive] = useState("home");
  const [prevCount, setPrevCount] = useState(cartCount);
  const [cartPulse, setCartPulse] = useState(false);

  useEffect(() => {
    const sectionIds = tabs.map((t) => t.id);
    const observers: IntersectionObserver[] = [];
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActive(id); },
        { threshold: 0.3 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  useEffect(() => {
    if (cartCount !== prevCount && cartCount > prevCount) {
      setCartPulse(true);
      setPrevCount(cartCount);
      const t = setTimeout(() => setCartPulse(false), 600);
      return () => clearTimeout(t);
    }
    setPrevCount(cartCount);
  }, [cartCount, prevCount]);

  const scrollTo = (id: string) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const activeIndex = tabs.findIndex((t) => t.id === active);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {/* Glass surface */}
      <div className="bg-[#0c0e14]/95 backdrop-blur-xl border-t border-white/[0.07]
        shadow-[0_-8px_32px_rgba(0,0,0,0.50)]">
        <div className="flex items-stretch h-14 relative">
          {/* Sliding accent indicator (top edge) */}
          <motion.div
            className="absolute top-0 h-[2px] rounded-b bg-[#FF5A00]"
            style={{ width: `${100 / (tabs.length + 1)}%` }}
            animate={{ left: `${activeIndex * (100 / (tabs.length + 1))}%` }}
            transition={{ type: "spring", stiffness: 420, damping: 38, mass: 0.7 }}
          />

          {/* Section tabs */}
          {tabs.map(({ label, icon: Icon, id }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2
                  cursor-pointer transition-colors duration-150 ${
                  isActive ? "text-white" : "text-white/35 hover:text-white/60"
                }`}
              >
                <Icon
                  size={18}
                  strokeWidth={isActive ? 2.2 : 1.6}
                  className={isActive ? "text-[#FF5A00]" : ""}
                />
                <span className={`text-[10px] leading-none ${isActive ? "font-bold text-white" : "font-medium"}`}>
                  {label}
                </span>
              </button>
            );
          })}

          {/* Cart tab */}
          <button
            onClick={onCartClick}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2
              cursor-pointer transition-colors duration-150 relative ${
              cartCount > 0 ? "text-white" : "text-white/35 hover:text-white/60"
            }`}
          >
            <div className="relative">
              <ShoppingCart
                size={18}
                strokeWidth={cartCount > 0 ? 2.2 : 1.6}
                className={cartCount > 0 ? "text-[#FF5A00]" : ""}
              />
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span
                    key={cartCount}
                    initial={{ scale: 0 }}
                    animate={{
                      scale: cartPulse ? [1, 1.3, 1] : 1,
                    }}
                    exit={{ scale: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="absolute -top-1.5 -right-2.5 bg-[#FF5A00] text-white
                      text-data text-[9px] font-bold rounded-full w-4 h-4
                      flex items-center justify-center leading-none"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <span className={`text-[10px] leading-none ${cartCount > 0 ? "font-bold" : "font-medium"}`}>
              Корзина
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
