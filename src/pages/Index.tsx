import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Shield } from "lucide-react";
import { FAQ_DATA } from "@/lib/constants";
import Header from "@/components/store/Header";
import HeroSection from "@/components/store/HeroSection";
import CatalogSection from "@/components/store/CatalogSection";
import FeaturesSection from "@/components/store/FeaturesSection";
import FAQSection from "@/components/store/FAQSection";
import Footer from "@/components/store/Footer";
import CartModal from "@/components/store/CartModal";
import AIChatWidget from "@/components/store/AIChatWidget";
import MobileBottomNav from "@/components/store/MobileBottomNav";
import ProductModal from "@/components/store/ProductModal";
import { useCart } from "@/hooks/useCart";
import { useProducts } from "@/hooks/useProducts";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { parseProductHash } from "@/lib/slugify";
import type { Product } from "@/hooks/useProducts";

// ПОДКЛЮЧАЕМ FIREBASE
import { database } from "../firebaseConfig";
import { ref, increment, update } from "firebase/database";


const Index = () => {
  const cart = useCart();
  const { data: products = [], isLoading } = useProducts();
  const isAdmin = useAdminAccess();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Реальная статистика (только если Firebase настроен)
  useEffect(() => {
    if (!database) return;
    const statsRef = ref(database, 'stats');
    update(statsRef, { total_devices: increment(1) });
    update(statsRef, { online_now: increment(1) });
    return () => {
      update(statsRef, { online_now: increment(-1) });
    };
  }, []);

  // Handle deep-link: open product modal if URL contains /products/{category}/{id}
  useEffect(() => {
    if (!products.length) return;
    const hash = window.location.hash;
    const parsed = parseProductHash(hash);
    if (parsed) {
      const found = products.find((p) => p.id === parsed.id);
      if (found) setSelectedProduct(found);
    }
  }, [products]);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_DATA.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
    // Restore base URL
    window.location.hash = "/";
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-[62px] md:pb-0">
      <Helmet>
        <title>Премиальная электроника в Ташкенте — AlfaComp | ИБП, Мониторы, Роутеры</title>
        <meta name="description" content="AlfaComp — премиальная электроника в Ташкенте: ИБП Ion, мониторы 144–320 Гц, Wi-Fi 6/7 роутеры, SSD NVMe и видеокарты. Официальная гарантия, доставка по Узбекистану." />
        <link rel="canonical" href="https://alfacomp.uz/" />
        <meta property="og:title" content="Премиальная электроника в Ташкенте — AlfaComp" />
        <meta property="og:description" content="Премиальная электроника: ИБП Ion, мониторы 144–320 Гц, Wi-Fi 6/7 роутеры с официальной гарантией. Доставка по Узбекистану." />
        <meta property="og:url" content="https://alfacomp.uz/" />
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>
      {isAdmin && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-primary text-black text-sm font-bold px-4 py-3 rounded-full flex items-center gap-4 shadow-2xl shadow-primary/50 border-[3px] border-black/10">
          <span className="hidden sm:flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Управление сайтом
          </span>
          <Link
            to="/admin"
            className="px-6 py-2 bg-black text-primary rounded-full uppercase text-xs tracking-widest hover:brightness-125 transition"
          >
            Открыть админ-панель →
          </Link>
        </div>
      )}
      <Header cartCount={cart.count} onCartClick={() => cart.setIsOpen(true)} />
      <HeroSection />

      <CatalogSection
        products={products}
        isLoading={isLoading}
        onAddToCart={(p) => cart.addItem({
          id: p.id,
          name: p.name,
          price: p.price,
          image: p.image
        })}
        onProductClick={(p) => setSelectedProduct(p)}
      />

      <FeaturesSection />
      <FAQSection />
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
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={handleCloseModal}
          onAddToCart={(p) => cart.addItem({
            id: p.id,
            name: p.name,
            price: p.price,
            image: p.image
          })}
        />
      )}

      <AIChatWidget />

      {/* Mobile bottom navigation */}
      <MobileBottomNav cartCount={cart.count} onCartClick={() => cart.setIsOpen(true)} />
    </div>
  );
};

export default Index;
