import { useState, useEffect } from "react";
import { Home, LayoutGrid, Info, HelpCircle, ShoppingCart } from "lucide-react";

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

  // Highlight active tab based on scroll position
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
        }}
      >
        {/* Nav tabs */}
        {tabs.map(({ label, icon: Icon, id }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => scrollTo(id)}
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
                transition: "all 0.2s ease",
                position: "relative",
                color: isActive ? "#00f2ff" : "rgba(255,255,255,0.45)",
              }}
            >
              {/* Active indicator line on top */}
              {isActive && (
                <span
                  style={{
                    position: "absolute",
                    top: 0,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "32px",
                    height: "2px",
                    borderRadius: "0 0 4px 4px",
                    background: "linear-gradient(90deg, #00f2ff, #009dff)",
                    boxShadow: "0 0 8px rgba(0,242,255,0.6)",
                  }}
                />
              )}
              <Icon
                size={22}
                strokeWidth={isActive ? 2.2 : 1.7}
                style={{
                  filter: isActive ? "drop-shadow(0 0 6px rgba(0,242,255,0.6))" : "none",
                  transform: isActive ? "translateY(-1px)" : "none",
                  transition: "all 0.2s ease",
                }}
              />
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
            </button>
          );
        })}

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
          <span style={{ position: "relative", display: "inline-block", overflow: "visible" }}>
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
                  zIndex: 10,
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
