import React, { useEffect, useState, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { Shield } from "lucide-react";
import { FAQ_DATA } from "@/lib/constants";
import Header from "@/components/store/Header";
import HeroSection from "@/components/store/HeroSection";
import CatalogSection from "@/components/store/CatalogSection";
import FeaturesSection from "@/components/store/FeaturesSection";
import FAQSection from "@/components/store/FAQSection";
import SeoTextBlock from "@/components/store/SeoTextBlock";
import Footer from "@/components/store/Footer";
import CartModal from "@/components/store/CartModal";
import AIChatWidget from "@/components/store/AIChatWidget";
import MobileBottomNav from "@/components/store/MobileBottomNav";
import ProductModal from "@/components/store/ProductModal";
import HardwareIntro3D from "@/components/store/HardwareIntro3D";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useCart } from "@/hooks/useCart";
import { useProducts } from "@/hooks/useProducts";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import {
  findProductBySlug,
  getProductUrl,
  getCategoryUrl,
  getCategoryNameBySlug,
  getCategorySlug,
  CATEGORY_SEO_DATA,
  parseProductHash,
} from "@/lib/slugify";
import type { Product } from "@/hooks/useProducts";

// ПОДКЛЮЧАЕМ FIREBASE
import { database } from "../firebaseConfig";
import { ref, increment, update } from "firebase/database";

const Index = () => {
  const cart = useCart();
  const { data: products = [], isLoading, error } = useProducts();
  const isAdmin = useAdminAccess();
  const { slug, categorySlug } = useParams<{ slug?: string; categorySlug?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showIntro, setShowIntro] = useState(() => {
    try {
      return sessionStorage.getItem("alfacomp_intro_viewed") !== "1";
    } catch {
      return false;
    }
  });

  // Extract category slug from params or direct path (e.g. /category/monitors or direct /monitors)
  const activeCategorySlug = useMemo(() => {
    if (categorySlug) return categorySlug;
    if (location.pathname.startsWith("/category/")) {
      return location.pathname.replace("/category/", "").replace(/\/$/, "");
    }
    // Direct category aliases
    const directSlug = location.pathname.replace(/^\//, "").replace(/\/$/, "");
    if (CATEGORY_SEO_DATA[directSlug]) {
      return directSlug;
    }
    return null;
  }, [categorySlug, location.pathname]);

  const activeCategoryName = useMemo(() => {
    if (!activeCategorySlug) return undefined;
    return getCategoryNameBySlug(activeCategorySlug);
  }, [activeCategorySlug]);

  // Handle direct product URL /product/:slug (or route param)
  useEffect(() => {
    if (!products.length) return;
    if (slug) {
      const found = findProductBySlug(slug, products);
      if (found) {
        setSelectedProduct(found);
      }
    } else if (!location.pathname.startsWith("/product/")) {
      setSelectedProduct(null);
    }
  }, [slug, products, location.pathname]);

  // Backward-compatibility: redirect old hash URLs (/#/products/:category/:id) to clean SEO URLs
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    const parsed = parseProductHash(hash);
    if (parsed) {
      if (parsed.id && products.length) {
        const found = products.find((p) => p.id === parsed.id);
        if (found) {
          navigate(getProductUrl(found), { replace: true });
          return;
        }
      }
      if (parsed.slug) {
        navigate(`/product/${parsed.slug}`, { replace: true });
        return;
      }
    }

    if (hash.startsWith("#/")) {
      const cleanPath = hash.slice(1);
      navigate(cleanPath, { replace: true });
    }
  }, [products, navigate]);

  // Scroll to catalog section when navigated to /catalog, /products, or #catalog
  useEffect(() => {
    if (
      location.pathname === "/catalog" ||
      location.pathname === "/products" ||
      location.pathname === "/category" ||
      location.hash === "#catalog"
    ) {
      const timer = setTimeout(() => {
        document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, location.hash]);

  // Realtime statistics
  useEffect(() => {
    if (!database) return;
    const statsRef = ref(database, "stats");
    update(statsRef, { total_devices: increment(1) });
    update(statsRef, { online_now: increment(1) });
    return () => {
      update(statsRef, { online_now: increment(-1) });
    };
  }, []);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    navigate(getProductUrl(product));
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
    if (activeCategorySlug) {
      navigate(getCategoryUrl(activeCategorySlug));
    } else {
      navigate("/");
    }
  };

  const handleCategoryChange = (categoryName: string) => {
    if (categoryName === "all") {
      navigate("/");
    } else {
      navigate(getCategoryUrl(categoryName));
    }
  };

  // Structured Data Schemas
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_DATA.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  const categorySeo = activeCategorySlug ? CATEGORY_SEO_DATA[activeCategorySlug] : null;

  const categoryBreadcrumbsJsonLd = categorySeo
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Главная",
            item: "https://alfacomp.uz/",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: categorySeo.name,
            item: `https://alfacomp.uz${getCategoryUrl(categorySeo.slug)}`,
          },
        ],
      }
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground pb-[62px] md:pb-0">
      {/* Category SEO Helmet (when a category route is active and modal is not overriding) */}
      {!selectedProduct && categorySeo && (
        <Helmet>
          <title>{categorySeo.metaTitle}</title>
          <meta name="description" content={categorySeo.metaDescription} />
          <link rel="canonical" href={`https://alfacomp.uz${getCategoryUrl(categorySeo.slug)}`} />
          <meta property="og:title" content={categorySeo.metaTitle} />
          <meta property="og:description" content={categorySeo.metaDescription} />
          <meta property="og:url" content={`https://alfacomp.uz${getCategoryUrl(categorySeo.slug)}`} />
          <meta property="og:type" content="website" />
          <script type="application/ld+json">{JSON.stringify(categoryBreadcrumbsJsonLd)}</script>
        </Helmet>
      )}

      {/* Default Home Page SEO Helmet */}
      {!selectedProduct && !categorySeo && (
        <Helmet>
          <title>Купить компьютер и монитор в Ташкенте — Магазин ПК AlfaComp.uz</title>
          <meta
            name="description"
            content="Купить мощный игровой компьютер, мониторы MSI, ASUS, Dell, LG и комплектующие в Ташкенте. Сборка ПК на заказ, ИБП Ion, гарантия до 3 лет и доставка по Узбекистану — AlfaComp.uz"
          />
          <link rel="canonical" href="https://alfacomp.uz/" />
          <meta property="og:title" content="Купить компьютер и монитор в Ташкенте — AlfaComp.uz" />
          <meta
            property="og:description"
            content="Игровые ПК, мониторы 2K/4K/OLED, комплектующие и ИБП в Ташкенте. Официальная гарантия и быстрая доставка по Узбекистану."
          />
          <meta property="og:url" content="https://alfacomp.uz/" />
          <meta property="og:type" content="website" />
          <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
        </Helmet>
      )}

      {isAdmin && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-[#14171E] text-white text-xs font-mono px-4 py-2 rounded-lg flex items-center gap-3 shadow-2xl border border-[#FF5A00]/40">
          <span className="hidden sm:flex items-center gap-1.5 text-white/70">
            <Shield className="w-3.5 h-3.5 text-[#FF5A00]" />
            Режим администратора
          </span>
          <Link
            to="/admin"
            className="px-3 py-1 bg-[#FF5A00] text-white rounded font-sans text-xs font-semibold hover:bg-[#FF6A15] transition"
          >
            Панель управления →
          </Link>
        </div>
      )}

      {/* 3D Hardware Reveal Intro */}
      {showIntro && (
        <HardwareIntro3D onComplete={() => setShowIntro(false)} />
      )}

      <Header cartCount={cart.count} onCartClick={() => cart.setIsOpen(true)} />
      <HeroSection />

      <CatalogSection
        products={products}
        isLoading={isLoading}
        error={error}
        onAddToCart={(p) =>
          cart.addItem({
            id: p.id,
            name: p.name,
            price: p.price,
            image: p.image,
          })
        }
        onProductClick={handleProductClick}
        isAdmin={isAdmin ?? false}
        activeCategory={activeCategoryName}
        onCategoryChange={handleCategoryChange}
      />

      <FeaturesSection />
      <FAQSection />
      <SeoTextBlock />
      <Footer />

      <CartModal
        isOpen={cart.isOpen}
        onClose={() => cart.setIsOpen(false)}
        items={cart.items}
        total={cart.total}
        onUpdateQuantity={cart.updateQuantity}
        onRemove={cart.removeItem}
        onClear={cart.clearCart}
      />

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <ErrorBoundary>
            <ProductModal
              product={selectedProduct}
              onClose={handleCloseModal}
              onAddToCart={(p) =>
                cart.addItem({
                  id: p.id,
                  name: p.name,
                  price: p.price,
                  image: p.image,
                })
              }
              isAdmin={isAdmin ?? false}
            />
          </ErrorBoundary>
        )}
      </AnimatePresence>

      <AIChatWidget
        products={products}
        onSelectProduct={handleProductClick}
        onAddToCart={(p) =>
          cart.addItem({
            id: p.id,
            name: p.name,
            price: p.price,
            image: p.image,
          })
        }
      />

      {/* Mobile bottom navigation */}
      <MobileBottomNav cartCount={cart.count} onCartClick={() => cart.setIsOpen(true)} />
    </div>
  );
};

export default Index;
