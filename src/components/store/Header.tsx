import { useState, useEffect } from "react";
import { ShoppingCart, Menu, X, Download } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

interface HeaderProps {
  cartCount: number;
  onCartClick: () => void;
}

const Header = ({ cartCount, onCartClick }: HeaderProps) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 50);
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
    setMobileOpen(false);
  };

  const navItems = [
    { label: "Главная", id: "home" },
    { label: "Каталог", id: "catalog" },
    { label: "FAQ", id: "faq" },
    { label: "Контакты", id: "contact" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? "py-2.5 glass border-b border-border/50"
          : "py-4"
      }`}
    >
      <div className="container flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          to="/"
          className="text-2xl font-extrabold gradient-text tracking-tight shrink-0 hover:opacity-80 transition-opacity"
        >
          AlfaComp
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 flex-1 justify-center">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative group"
            >
              {item.label}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
            </button>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2.5">
          {/* Download button */}
          <Link
            to="/download"
            className={`hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all
              ${location.pathname === "/download"
                ? "bg-primary text-primary-foreground glow-primary"
                : "glass glass-hover text-primary hover:border-primary/60"
              }`}
          >
            <Download className="w-3.5 h-3.5" />
            Скачать
          </Link>

          {/* Cart */}
          <button
            onClick={onCartClick}
            className="glass glass-hover rounded-lg px-3 py-2.5 flex items-center gap-2 text-sm font-medium transition-all hover:border-primary relative"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Корзина</span>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                {cartCount}
              </span>
            )}
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden glass rounded-lg w-10 h-10 flex items-center justify-center"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden glass mt-2 mx-4 rounded-xl p-4 flex flex-col gap-2 animate-in slide-in-from-top-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className="text-left py-2.5 px-3 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
            >
              {item.label}
            </button>
          ))}
          <Link
            to="/download"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold text-primary hover:bg-muted transition-colors"
          >
            <Download className="w-4 h-4" />
            Скачать приложение
          </Link>
        </div>
      )}
    </header>
  );
};

export default Header;
