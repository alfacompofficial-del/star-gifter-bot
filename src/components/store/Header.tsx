import { useState, useEffect, useRef } from "react";
import { ShoppingCart, Download } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useExchangeRate } from "@/hooks/useExchangeRate";

interface HeaderProps {
  cartCount: number;
  onCartClick: () => void;
}

const Header = ({ cartCount, onCartClick }: HeaderProps) => {
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [prevCount, setPrevCount] = useState(cartCount);
  const [cartAnimating, setCartAnimating] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";
  const { exchangeRate } = useExchangeRate();
  const ticking = useRef(false);

  useEffect(() => {
    const handle = () => {
      if (!ticking.current) {
        requestAnimationFrame(() => {
          const y = window.scrollY;
          setScrolled(y > 20);
          // progress 0→1 over first 200px of scroll
          setScrollProgress(Math.min(y / 200, 1));
          ticking.current = false;
        });
        ticking.current = true;
      }
    };
    handle();
    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, []);

  // Track active section via IntersectionObserver
  useEffect(() => {
    if (!isHome) return;
    const sections = ["home", "catalog", "features", "faq"];
    const observers: IntersectionObserver[] = [];
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [isHome]);

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
      navigate("/");
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
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? "py-1.5 panel-glass shadow-[0_1px_0_0_rgba(255,255,255,0.05)]"
          : "py-2.5 bg-transparent border-b border-transparent"
      }`}
    >
      {/* Scroll progress line */}
      <motion.div
        className="absolute bottom-0 left-0 h-[1.5px] bg-[#FF5A00] origin-left pointer-events-none"
        style={{
          scaleX: scrollProgress,
          opacity: scrollProgress > 0.02 ? 0.7 : 0,
        }}
        transition={{ duration: 0 }}
      />

      <div className="w-full max-w-[1540px] mx-auto px-4 sm:px-8 xl:px-12 flex items-center justify-between gap-4">
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
            <img
              src="/logo.png"
              alt="AlfaComp"
              className="relative z-10 w-6 h-6 object-contain"
            />
          </div>

          {/* Wordmark */}
          <div className="flex flex-col leading-none">
            <span className="text-[14px] font-bold tracking-tight text-white">
              Alfa<span className="text-[#FF5A00]">Comp</span><span className="text-white/40 font-normal">.uz</span>
            </span>
            <span className="text-data text-[8.5px] text-white/25 tracking-[0.1em] uppercase mt-0.5 hidden sm:block">
              Tashkent · Hardware
            </span>
          </div>
        </Link>

        {/* ── Desktop Navigation ────────────────────── */}
        <nav className="hidden md:flex items-center gap-0 bg-[#0c0e15]/90 backdrop-blur-sm px-1 py-1 rounded-md border border-white/[0.05]">
          {navItems.map((item) => {
            const isActive = isHome && activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={`nav-item relative text-[12px] font-medium px-3 py-1.5 rounded-sm
                  transition-all duration-150 tracking-[-0.01em]
                  ${isActive
                    ? "text-white bg-white/[0.07]"
                    : "text-white/48 hover:text-white/90 hover:bg-white/[0.05]"
                  }`}
              >
                {item.label}
                {/* Active underline indicator */}
                {isActive && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-[2px] bg-[#FF5A00] rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* ── Right Action Console ──────────────────── */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Live currency rate */}
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#0c0e15] border border-white/[0.05] text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] status-dot-pulse" />
            <span className="text-data text-white/30">USD</span>
            <span className="text-data font-semibold text-white/70">{exchangeRate.toLocaleString()}</span>
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
            whileTap={{ scale: 0.93 }}
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
                    scale: cartAnimating ? [1, 1.3, 1] : 1,
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
