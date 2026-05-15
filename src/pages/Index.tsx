import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { FAQ_DATA } from "@/lib/constants";
import Header from "@/components/store/Header";
import HeroSection from "@/components/store/HeroSection";
import CatalogSection from "@/components/store/CatalogSection";
import FeaturesSection from "@/components/store/FeaturesSection";
import FAQSection from "@/components/store/FAQSection";
import Footer from "@/components/store/Footer";
import CartModal from "@/components/store/CartModal";
import AIChatWidget from "@/components/store/AIChatWidget";
import { useCart } from "@/hooks/useCart";
import { useVisitorTracking } from "@/hooks/useVisitorTracking";
import { useProducts } from "@/hooks/useProducts";

// ПОДКЛЮЧАЕМ FIREBASE
import { database } from "../firebaseConfig"; 
import { ref, onValue, increment, update } from "firebase/database";

const Index = () => {
  const cart = useCart();
  const { data: products = [], isLoading } = useProducts();

  // 2. Реальная статистика для вашей админки
  useEffect(() => {
    // При каждом заходе на сайт увеличиваем счетчик "Всего зашло" в админке
    const statsRef = ref(database, 'stats');
    update(statsRef, {
      total_devices: increment(1)
    });

    // Считаем "Кто в сети" (упрощенно)
    update(statsRef, {
      online_now: increment(1)
    });

    return () => {
      update(statsRef, {
        online_now: increment(-1)
      });
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
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

      <AIChatWidget />
    </div>
  );
};

export default Index;
