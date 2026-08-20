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

const tabVariants = {
  inactive: { opacity: 0.45, scale: 1 },
  active: { opacity: 1, scale: 1.05 },
};

const indicatorVariants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 },
};

const MobileBottomNav = ({ cartCount, onCartClick }: MobileBottomNavProps) => {
  const [active, setActive] = useState("home");

  useEffect(() => {
    const sectionIds = tabs.map((t) => t.id);
    const observers: IntersectionObserver[] = [];

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(id);
        },
        { threshold: 0.4 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const scrollTo = (id: string) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "rgba(10, 12, 20, 0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.5)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          height: "62px",
          position: "relative",
        }}
      >
        {/* Sliding active indicator */}
        <motion.div
          style={{
            position: "absolute",
            top: 0,
            height: "2px",
            width: "25%",
            background: "linear-gradient(90deg, #00f2ff, #009dff)",
            boxShadow: "0 0 8px rgba(0,242,255,0.6)",
            borderRadius: "0 0 4px 4px",
            left: 0,
          }}
          animate={{
            left: tabs.findIndex((t) => t.id === active) * 25 + "%",
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />

        {/* Nav tabs */}
        <AnimatePresence mode="wait">
          {tabs.map(({ label, icon: Icon, id }) => {
            const isActive = active === id;
            return (
              <motion.button
                key={id}
                onClick={() => scrollTo(id)}
                variants={tabVariants}
                initial="inactive"
                animate={isActive ? "active" : "inactive"}
                transition={{ duration: 0.2 }}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  padding: "6px 4px",
                  position: "relative",
                  color: isActive ? "#00f2ff" : "rgba(255,255,255,0.45)",
                }}
              >
                <motion.div
                  animate={{ y: isActive ? -1 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.2 : 1.7}
                    style={{
                      filter: isActive ? "drop-shadow(0 0 6px rgba(0,242,255,0.6))" : "none",
                      transition: "all 0.2s ease",
                    }}
                  />
                </motion.div>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: isActive ? 700 : 500,
                    letterSpacing: "0.02em",
                    transition: "all 0.2s ease",
                  }}
                >
                  {label}
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>

        {/* Cart button */}
        <button
          onClick={onCartClick}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            padding: "6px 4px",
            position: "relative",
            color: "rgba(255,255,255,0.45)",
          }}
        >
          <span style={{ position: "relative" }}>
            <ShoppingCart
              size={22}
              strokeWidth={1.7}
            />
            {cartCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "-6px",
                  right: "-7px",
                  background: "#ff0080",
                  color: "#fff",
                  fontSize: "9px",
                  fontWeight: 900,
                  borderRadius: "999px",
                  minWidth: "17px",
                  height: "17px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 8px rgba(255,0,128,0.6)",
                  animation: "bounce 1s infinite",
                }}
              >
                {cartCount}
              </span>
            )}
          </span>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.02em",
            }}
          >
            Корзина
          </span>
        </button>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
