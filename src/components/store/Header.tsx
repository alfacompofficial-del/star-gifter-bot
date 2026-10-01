import { useState, useEffect } from "react";
import { ShoppingCart, Download } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useExchangeRate } from "@/hooks/useExchangeRate";

interface HeaderProps {
  cartCount: number;
  onCartClick: () => void;
}

const Header = ({ cartCount, onCartClick }: HeaderProps) => {
  const [scrolled, setScrolled] = useState(false);
  const [prevCount, setPrevCount] = useState(cartCount);
  const [cartAnimating, setCartAnimating] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";
  const { exchangeRate } = useExchangeRate();

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 20);
    handle();
    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, []);

  // Animate cart badge on count change
  useEffect(() => {
    if (cartCount !== prevCount) {
      setCartAnimating(true);
      setPrevCount(cartCount);
      const t = setTimeout(() => setCartAnimating(false), 500);
      return () => clearTimeout(t);
    }
  }, [cartCount, prevCount]);

  const scrollTo = (id: string) => {
    if (!isHome) {
      window.location.hash = "#/";
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const navItems = [
    { label: "Главная", id: "home" },
    { label: "Каталог", id: "catalog" },
    { label: "О компании", id: "features" },
    { label: "FAQ", id: "faq" },
  ];

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? "py-2 panel-glass shadow-[0_1px_0_0_rgba(255,255,255,0.06)]"
          : "py-3.5 bg-transparent border-b border-transparent"
      }`}
    >
      <div className="container px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* ── Brand Logotype ───────────────────────────── */}
        <Link
          to="/"
          className="flex items-center gap-2.5 group shrink-0 select-none"
          aria-label="AlfaComp — на главную"
        >
          {/* Logo mark */}
          <div className="relative w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden
            bg-[#14171E] border border-white/10
            group-hover:border-[#FF5A00]/60 transition-colors duration-200">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: "radial-gradient(circle at 50% 120%, rgba(255,90,0,0.2), transparent 70%)" }}
            />
            <span className="text-[#FF5A00] font-black font-mono text-sm relative z-10">α</span>
          </div>

          {/* Wordmark */}
          <div className="flex flex-col leading-none">
            <span className="text-[15px] font-bold tracking-tight text-white">
              Alfa<span className="text-[#FF5A00]">Comp</span>
            </span>
            <span className="text-data text-[9px] text-white/30 tracking-[0.12em] uppercase mt-0.5 hidden sm:block">
              Hardware Lab · Tashkent
            </span>
          </div>
        </Link>

        {/* ── Desktop Navigation ────────────────────── */}
        <nav className="hidden md:flex items-center gap-0.5 bg-[#0f1117]/80 backdrop-blur-sm px-1.5 py-1 rounded-lg border border-white/[0.06]">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className="text-[12.5px] font-medium text-white/55 hover:text-white px-3 py-1.5 rounded-md hover:bg-white/[0.05] transition-all duration-150 tracking-[-0.01em]"
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* ── Right Action Console ──────────────────── */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Live currency rate */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0f1117] border border-white/[0.06] text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] status-dot-pulse" />
            <span className="text-data text-white/35">USD/UZS</span>
            <span className="text-data font-medium text-white/80">{exchangeRate.toLocaleString()}</span>
          </div>

          {/* Download app */}
          <Link
            to="/download"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-white/60
              bg-[#14171E] border border-white/[0.07]
              hover:border-white/[0.18] hover:text-white transition-all duration-200"
            aria-label="Скачать приложение"
          >
            <Download className="w-3.5 h-3.5 text-white/40" />
            <span className="hidden sm:inline text-[11.5px]">Приложение</span>
          </Link>

          {/* Cart button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onCartClick}
            aria-label={`Корзина, ${cartCount} товар${cartCount === 1 ? '' : cartCount >= 2 && cartCount <= 4 ? 'а' : 'ов'}`}
            className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12.5px] font-medium
              bg-[#14171E] border border-white/[0.1]
              hover:border-[#FF5A00]/50 hover:bg-[#1a1d26]
              text-white transition-all duration-200 shadow-[0_1px_6px_rgba(0,0,0,0.4)]"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-[#FF5A00] shrink-0" />
            <span className="hidden sm:inline">Корзина</span>

            <AnimatePresence mode="wait">
              {cartCount > 0 ? (
                <motion.span
                  key={cartCount}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{
                    scale: cartAnimating ? [1, 1.25, 1] : 1,
                    opacity: 1,
                  }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="bg-[#FF5A00] text-white text-data text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none min-w-[18px] text-center"
                >
                  {cartCount}
                </motion.span>
              ) : (
                <motion.span
                  key="zero"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-white/25 text-data text-[10px]"
                >
                  0
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
