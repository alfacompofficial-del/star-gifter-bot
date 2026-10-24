import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { useAdminAccess } from "./hooks/useAdminAccess";
import { initGoogleAds } from "./utils/googleAds";

// Lazy loaded secondary pages to optimize initial bundle and Core Web Vitals
const Admin = lazy(() => import("./pages/Admin"));
const Download = lazy(() => import("./pages/Download"));
const InfoPage = lazy(() => import("./pages/InfoPage"));
const GuidesPage = lazy(() => import("./pages/GuidesPage"));
const OrderSuccess = lazy(() => import("./pages/OrderSuccess"));

const PageFallback = () => (
  <div className="min-h-screen bg-[#08090c] flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-[#1565C0] animate-spin" />
      <span className="font-mono text-xs text-white/40 uppercase tracking-widest">AlfaComp</span>
    </div>
  </div>
);

const queryClient = new QueryClient();

// /admin route: authenticated admins access the panel, others see the secure AdminLogin gateway
const AdminGate = () => {
  return (
    <Suspense fallback={<PageFallback />}>
      <Admin />
    </Suspense>
  );
};

const App = () => {
  useEffect(() => {
    initGoogleAds();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Main store routes */}
            <Route path="/" element={<Index />} />
            <Route path="/catalog" element={<Index />} />
            <Route path="/products" element={<Index />} />
            <Route path="/category" element={<Index />} />
            <Route path="/product/:slug" element={<Index />} />
            <Route path="/category/:categorySlug" element={<Index />} />

            {/* Cart & Checkout Routes for Google Ads */}
            <Route path="/cart" element={<Index initialCartOpen={true} />} />
            <Route path="/checkout" element={<Index initialCartOpen={true} />} />
            <Route path="/cart/success" element={<Suspense fallback={<PageFallback />}><OrderSuccess /></Suspense>} />
            <Route path="/order-success" element={<Suspense fallback={<PageFallback />}><OrderSuccess /></Suspense>} />
            <Route path="/thank-you" element={<Suspense fallback={<PageFallback />}><OrderSuccess /></Suspense>} />

            {/* Direct category shortcuts for high commercial visibility */}
            <Route path="/monitors" element={<Index />} />
            <Route path="/ups" element={<Index />} />
            <Route path="/components" element={<Index />} />
            <Route path="/networking" element={<Index />} />
            <Route path="/wifi-routers" element={<Index />} />
            <Route path="/all-in-one" element={<Index />} />
            <Route path="/accessories" element={<Index />} />
            <Route path="/mounts" element={<Index />} />
            <Route path="/deco" element={<Index />} />
            <Route path="/speakers" element={<Index />} />
            <Route path="/mice" element={<Index />} />
            <Route path="/videocards" element={<Index />} />
            <Route path="/gpu" element={<Index />} />
            <Route path="/computers" element={<Index />} />

            {/* Informational SEO pages */}
            <Route path="/about" element={<Suspense fallback={<PageFallback />}><InfoPage type="about" /></Suspense>} />
            <Route path="/delivery" element={<Suspense fallback={<PageFallback />}><InfoPage type="delivery" /></Suspense>} />
            <Route path="/warranty" element={<Suspense fallback={<PageFallback />}><InfoPage type="warranty" /></Suspense>} />
            <Route path="/contacts" element={<Suspense fallback={<PageFallback />}><InfoPage type="contacts" /></Suspense>} />

            {/* SEO Content & Guides */}
            <Route path="/guides" element={<Suspense fallback={<PageFallback />}><GuidesPage /></Suspense>} />
            <Route path="/blog" element={<Suspense fallback={<PageFallback />}><GuidesPage /></Suspense>} />
            <Route path="/articles" element={<Suspense fallback={<PageFallback />}><GuidesPage /></Suspense>} />

            {/* Legacy fallback route */}
            <Route path="/products/:category/:id" element={<Index />} />

            {/* Admin & Utility */}
            <Route path="/admin" element={<AdminGate />} />
            <Route path="/download" element={<Suspense fallback={<PageFallback />}><Download /></Suspense>} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
