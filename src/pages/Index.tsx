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
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { formatPrice, resolveProductPrices } from "@/lib/constants";
import {
  resolveProductFromSlug,
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

const INTRO_STORAGE_KEY = "alfacomp_intro_seen_v2";

function shouldShowIntro(pathname: string): boolean {
  try {
    if (typeof window === "undefined") return false;
    // 1. Показываем интро ТОЛЬКО при первом заходе на корень сайта ("/")
    // Никаких интро при прямом переходе на товары, категории, корзину или подстраницы
    const cleanPath = pathname.replace(/\/$/, "");
    if (cleanPath !== "" && cleanPath !== "/") {
      return false;
    }

    // 2. Проверяем persistent localStorage & sessionStorage
    const local = localStorage.getItem(INTRO_STORAGE_KEY);
    const session = sessionStorage.getItem(INTRO_STORAGE_KEY);
    const legacy = sessionStorage.getItem("alfacomp_intro_viewed");
    if (local === "1" || session === "1" || legacy === "1") {
      return false;
    }

    // 3. Сразу фиксируем просмотр, чтобы при переходах по каталогу или перезагрузке интро НИКОГДА не повторялось
    localStorage.setItem(INTRO_STORAGE_KEY, "1");
    sessionStorage.setItem(INTRO_STORAGE_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

const Index = () => {
  const cart = useCart();
  const { data: products = [], isLoading, error } = useProducts();
  const { exchangeRate } = useExchangeRate();
  const isAdmin = useAdminAccess();
  const { slug, categorySlug } = useParams<{ slug?: string; categorySlug?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductNotFound, setIsProductNotFound] = useState(false);
  const [showIntro, setShowIntro] = useState(() => shouldShowIntro(window.location.pathname));

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
      const resolved = resolveProductFromSlug(slug, products);
      if (resolved) {
        setIsProductNotFound(false);
        setSelectedProduct(resolved.product);
        // If incoming URL is non-canonical (e.g. old shifted ID or numeric ID),
        // transparently update browser URL to canonical path so search engines and users get canonical
        if (!resolved.isCanonical) {
          navigate(getProductUrl(resolved.product), { replace: true });
        }
      } else {
        setSelectedProduct(null);
        setIsProductNotFound(true);
      }
    } else if (!location.pathname.startsWith("/product/")) {
      setSelectedProduct(null);
      setIsProductNotFound(false);
    }
  }, [slug, products, location.pathname, navigate]);

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

  // Catalog ItemList schema for Google Shopping & rich snippets.
  // BUG FIX: previously always sliced from all products regardless of active category.
  // Now correctly filters to the category being displayed on this page.
  const catalogProducts = useMemo(() => {
    if (activeCategorySlug) {
      const catName = getCategoryNameBySlug(activeCategorySlug);
      return products.filter((p) => p.category === catName).slice(0, 24);
    }
    return products.slice(0, 24);
  }, [products, activeCategorySlug]);

  const catalogItemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: categorySeo ? `${categorySeo.name} в Ташкенте` : "Каталог ПК и электроники AlfaComp",
    numberOfItems: catalogProducts.length,
    itemListElement: catalogProducts.map((p, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: p.name,
      url: `https://alfacomp.uz${getProductUrl(p)}`,
      image: p.image,
    })),
  };

  const selectedPrices = selectedProduct
    ? resolveProductPrices(selectedProduct.price, exchangeRate || 14000)
    : null;

  const productJsonLd = selectedProduct && selectedPrices
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: selectedProduct.name,
        image: [selectedProduct.image],
        description: `Купить ${selectedProduct.name} в Ташкенте по цене ${formatPrice(
          selectedPrices.priceUZS
        )} сум с официальной гарантией и доставкой по Узбекистану в интернет-магазине AlfaComp.`,
        // sku: стабильный внутренний артикул AlfaComp.
        // mpn намеренно убран: артикул производителя отсутствует в данных БД.
        sku: `ALFA-${selectedProduct.id}`,
        brand: {
          "@type": "Brand",
          name: selectedProduct.brand || "AlfaComp",
        },
        category: selectedProduct.category,
        // aggregateRating намеренно убран: реальных отзывов на странице нет.
        // Указание фиктивных цифр нарушает политику Google Rich Results.
        offers: {
          "@type": "Offer",
          url: `https://alfacomp.uz${getProductUrl(selectedProduct)}`,
          priceCurrency: "UZS",
          price: selectedPrices.priceUZS,
          // priceValidUntil намеренно убран: нет механизма автообновления даты.
          availability: selectedProduct.in_stock
            ? "https://schema.org/InStock"
            : "https://schema.org/PreOrder",
          itemCondition: "https://schema.org/NewCondition",
          seller: {
            "@type": "Organization",
            name: "AlfaComp",
            url: "https://alfacomp.uz/",
          },
          hasMerchantReturnPolicy: {
            "@type": "MerchantReturnPolicy",
            applicableCountry: "UZ",
            returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
            merchantReturnDays: 14,
            returnMethod: "https://schema.org/ReturnInStore",
            // returnFees: FreeReturn убран — возврат является платным согласно
            // реальной политике AlfaComp.
          },
          shippingDetails: {
            "@type": "OfferShippingDetails",
            shippingRate: {
              "@type": "MonetaryAmount",
              // Минимальная стоимость доставки по Ташкенту (от 30 000 сум).
              value: "30000",
              currency: "UZS",
            },
            shippingDestination: {
              "@type": "DefinedRegion",
              addressCountry: "UZ",
            },
            deliveryTime: {
              "@type": "ShippingDeliveryTime",
              handlingTime: {
                "@type": "QuantitativeValue",
                minValue: 0,
                maxValue: 1,
                unitCode: "DAY",
              },
              transitTime: {
                "@type": "QuantitativeValue",
                minValue: 1,
                maxValue: 3,
                unitCode: "DAY",
              },
            },
          },
        },
      }
    : null;

  const productBreadcrumbsJsonLd = selectedProduct
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
            name: selectedProduct.category,
            item: `https://alfacomp.uz${getCategoryUrl(selectedProduct.category)}`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: selectedProduct.name,
            item: `https://alfacomp.uz${getProductUrl(selectedProduct)}`,
          },
        ],
      }
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground pb-[62px] md:pb-0">
      {/* ── 0. Product Not Found (Soft 404 Protection) ── */}
      {isProductNotFound && (
        <Helmet>
          <title>Товар не найден — 404 | AlfaComp</title>
          <meta name="robots" content="noindex, nofollow" />
          <meta
            name="description"
            content="Запрошенный товар не найден или был удален из каталога магазина AlfaComp. Вернитесь в каталог для подбора ПК, мониторов и комплектующих."
          />
        </Helmet>
      )}

      {/* ── 1. Specific Product SEO Helmet (when modal or direct product route is open) ── */}
      {selectedProduct && (
        <Helmet>
          <title>{`${selectedProduct.name} — купить в Ташкенте по цене ${formatPrice(
            selectedPrices ? selectedPrices.priceUZS : selectedProduct.price
          )} сум | AlfaComp`}</title>
          <meta
            name="description"
            content={`Купить ${selectedProduct.name} в Ташкенте с гарантией и быстрой доставкой по Узбекистану в AlfaComp. Цена: ${formatPrice(
              selectedPrices ? selectedPrices.priceUZS : selectedProduct.price
            )} сум${selectedPrices && selectedPrices.priceUSD > 0 ? ` (≈$${selectedPrices.priceUSD})` : ""}.`}
          />
          <link rel="canonical" href={`https://alfacomp.uz${getProductUrl(selectedProduct)}`} />
          <meta
            property="og:title"
            content={`${selectedProduct.name} — купить в Ташкенте | AlfaComp`}
          />
          <meta
            property="og:description"
            content={`Оригинальный ${selectedProduct.name} в наличии и под заказ с гарантией. Доставка по Ташкенту и всему Узбекистану.`}
          />
          <meta property="og:image" content={selectedProduct.image} />
          <meta property="og:url" content={`https://alfacomp.uz${getProductUrl(selectedProduct)}`} />
          <meta property="og:type" content="product" />
          <meta
            property="product:price:amount"
            content={String(selectedPrices ? selectedPrices.priceUZS : selectedProduct.price)}
          />
          <meta property="product:price:currency" content="UZS" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={`${selectedProduct.name} — AlfaComp`} />
          <meta
            name="twitter:description"
            content={`Купить ${selectedProduct.name} в Ташкенте по цене ${formatPrice(
              selectedPrices ? selectedPrices.priceUZS : selectedProduct.price
            )} сум с доставкой по Узбекистану.`}
          />
          <meta name="twitter:image" content={selectedProduct.image} />
          <script type="application/ld+json">{JSON.stringify(productJsonLd)}</script>
          <script type="application/ld+json">{JSON.stringify(productBreadcrumbsJsonLd)}</script>
        </Helmet>
      )}

      {/* ── 2. Category SEO Helmet ── */}
      {!selectedProduct && !isProductNotFound && categorySeo && (
        <Helmet>
          <title>{categorySeo.metaTitle}</title>
          <meta name="description" content={categorySeo.metaDescription} />
          <link rel="canonical" href={`https://alfacomp.uz${getCategoryUrl(categorySeo.slug)}`} />
          <meta property="og:title" content={categorySeo.metaTitle} />
          <meta property="og:description" content={categorySeo.metaDescription} />
          <meta property="og:image" content="https://alfacomp.uz/banner.jpg" />
          <meta property="og:url" content={`https://alfacomp.uz${getCategoryUrl(categorySeo.slug)}`} />
          <meta property="og:type" content="website" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={categorySeo.metaTitle} />
          <meta name="twitter:description" content={categorySeo.metaDescription} />
          <meta name="twitter:image" content="https://alfacomp.uz/banner.jpg" />
          <script type="application/ld+json">{JSON.stringify(categoryBreadcrumbsJsonLd)}</script>
          <script type="application/ld+json">{JSON.stringify(catalogItemListJsonLd)}</script>
        </Helmet>
      )}

      {/* ── 3. Default Home Page SEO Helmet ── */}
      {!selectedProduct && !categorySeo && !isProductNotFound && (
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
          <meta property="og:image" content="https://alfacomp.uz/banner.jpg" />
          <meta property="og:url" content="https://alfacomp.uz/" />
          <meta property="og:type" content="website" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="Купить компьютер и монитор в Ташкенте — AlfaComp.uz" />
          <meta
            name="twitter:description"
            content="Игровые ПК, мониторы 2K/4K/OLED, комплектующие и ИБП в Ташкенте. Официальная гарантия и быстрая доставка по Узбекистану."
          />
          <meta name="twitter:image" content="https://alfacomp.uz/banner.jpg" />
          <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
          <script type="application/ld+json">{JSON.stringify(catalogItemListJsonLd)}</script>
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

      {/* 404 message if a direct product URL was requested but not found */}
      {isProductNotFound && (
        <div className="pt-28 pb-6 px-4 max-w-xl mx-auto text-center">
          <div className="bg-[#12141a] border border-white/10 rounded-2xl p-8 sm:p-10 shadow-2xl">
            <span className="font-mono text-xs uppercase tracking-widest text-[#ff5a00] bg-[#ff5a00]/10 px-3 py-1.5 rounded-full inline-block mb-4 font-bold">
              Ошибка 404
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
              Товар не найден
            </h1>
            <p className="text-white/60 text-sm leading-relaxed mb-6">
              Товар по этому адресу был снят с продажи, переименован или никогда не существовал. Ознакомьтесь с актуальным ассортиментом в каталоге ниже.
            </p>
            <Link
              to="/"
              onClick={() => setIsProductNotFound(false)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#ff5a00] text-white font-semibold text-sm hover:bg-[#ff6a15] transition-all shadow-lg shadow-[#ff5a00]/20"
            >
              Перейти к каталогу
            </Link>
          </div>
        </div>
      )}

      <HeroSection asSubheading={!!selectedProduct || isProductNotFound} />

      <CatalogSection
        products={products}
        isLoading={isLoading}
        error={error}
        onAddToCart={(p) => {
          const { priceUZS } = resolveProductPrices(p.price, exchangeRate || 14000);
          cart.addItem({
            id: p.id,
            name: p.name,
            price: priceUZS,
            image: p.image,
          });
        }}
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
              onAddToCart={(p) => {
                const { priceUZS } = resolveProductPrices(p.price, exchangeRate || 14000);
                cart.addItem({
                  id: p.id,
                  name: p.name,
                  price: priceUZS,
                  image: p.image,
                });
              }}
              isAdmin={isAdmin ?? false}
            />
          </ErrorBoundary>
        )}
      </AnimatePresence>

      <AIChatWidget
        products={products}
        onSelectProduct={handleProductClick}
        onAddToCart={(p) => {
          const { priceUZS } = resolveProductPrices(p.price, exchangeRate || 14000);
          cart.addItem({
            id: p.id,
            name: p.name,
            price: priceUZS,
            image: p.image,
          });
        }}
      />

      {/* Mobile bottom navigation */}
      <MobileBottomNav cartCount={cart.count} onCartClick={() => cart.setIsOpen(true)} />
    </div>
  );
};

export default Index;
