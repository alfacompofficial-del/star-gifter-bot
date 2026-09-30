import { useState, useEffect } from "react";
import { ShoppingCart, Download } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

interface HeaderProps {
  cartCount: number;
  onCartClick: () => void;
}

const Header = ({ cartCount, onCartClick }: HeaderProps) => {
  const [scrolled, setScrolled] = useState(false);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const location = useLocation();
  const isHome = location.pathname === "/";

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handle);
    return () => window.removeEventListener("scroll", handle);
  }, []);

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
    { label: "О нас", id: "features" },
    { label: "FAQ", id: "faq" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? "py-3 bg-background/85 backdrop-blur-2xl border-b border-white/10 shadow-lg shadow-black/40"
          : "py-5 bg-transparent"
      }`}
    >
      <div className="container flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 group shrink-0"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#00f2ff] to-[#009dff] flex items-center justify-center shadow-lg shadow-[#00f2ff]/25 group-hover:shadow-[#00f2ff]/50 group-hover:scale-105 transition-all">
            <span className="text-lg sm:text-xl font-black text-black">A</span>
          </div>
          <span className="text-xl sm:text-2xl font-black tracking-tight flex items-center">
            Alfa<span className="text-[#00f2ff]">Comp</span>
          </span>
        </Link>

        {/* Desktop nav with floating indicator */}
        <nav 
          onMouseLeave={() => setHoveredNav(null)}
          className="hidden md:flex items-center gap-1 glass px-3 py-1.5 rounded-full border border-white/10 shadow-inner"
        >
          {navItems.map((item) => {
            const isHovered = hoveredNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                onMouseEnter={() => setHoveredNav(item.id)}
                className="relative text-sm font-bold text-white/70 hover:text-white px-4 py-2 rounded-full transition-colors z-10"
              >
                {isHovered && (
                  <motion.div
                    layoutId="header-nav-pill"
                    className="absolute inset-0 bg-white/10 rounded-full border border-white/15"
                    transition={{ type: "spring", stiffness: 450, damping: 30 }}
                  />
                )}
                <span className="relative z-20">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <Link
            to="/download"
            className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download className="w-4 h-4 text-[#00f2ff]" />
            Приложение
          </Link>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onCartClick}
            aria-label={`Корзина, товаров: ${cartCount}`}
            className="relative flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-sm font-semibold bg-[#00f2ff]/10 border border-[#00f2ff]/25 hover:bg-[#00f2ff]/20 hover:border-[#00f2ff]/50 text-[#00f2ff] transition-all btn-premium group shadow-sm hover:shadow-[0_0_20px_rgba(0,242,255,0.25)]"
          >
            <ShoppingCart className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Корзина</span>
            {cartCount > 0 && (
              <motion.span
                key={cartCount}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: [1.35, 1], opacity: 1 }}
                transition={{ duration: 0.3, type: "spring", stiffness: 400, damping: 15 }}
                className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-[#ff0080] to-[#ff3399] text-white text-[10px] font-black rounded-full min-w-5 h-5 px-1 flex items-center justify-center shadow-lg shadow-[#ff0080]/60 border border-black/20"
              >
                {cartCount}
              </motion.span>
            )}
          </motion.button>

          {/* Mobile: Download App button */}
          <Link
            to="/download"
            className="md:hidden flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-[#00f2ff]/10 border border-[#00f2ff]/20 hover:bg-[#00f2ff]/20 hover:border-[#00f2ff]/40 text-[#00f2ff] transition-all"
          >
            <Download className="w-4 h-4" />
            <span className="text-xs font-bold">Скачать</span>
          </Link>
        </div>
      </div>
    </header>
  );
};
export default Header;
