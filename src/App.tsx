import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import Download from "./pages/Download";
import NotFound from "./pages/NotFound";
import InfoPage from "./pages/InfoPage";
import GuidesPage from "./pages/GuidesPage";
import { useAdminAccess } from "./hooks/useAdminAccess";

const queryClient = new QueryClient();

// Guards /admin: only visitors from allowed IP can view it.
const AdminGate = () => {
  const allowed = useAdminAccess();
  if (allowed === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white/50 text-sm">
        Проверка доступа…
      </div>
    );
  }
  if (!allowed) return <Navigate to="/" replace />;
  return <Admin />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Main store routes */}
          <Route path="/" element={<Index />} />
          <Route path="/product/:slug" element={<Index />} />
          <Route path="/category/:categorySlug" element={<Index />} />

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
          <Route path="/computers" element={<Index />} />

          {/* Informational SEO pages */}
          <Route path="/about" element={<InfoPage type="about" />} />
          <Route path="/delivery" element={<InfoPage type="delivery" />} />
          <Route path="/warranty" element={<InfoPage type="warranty" />} />
          <Route path="/contacts" element={<InfoPage type="contacts" />} />

          {/* SEO Content & Guides */}
          <Route path="/guides" element={<GuidesPage />} />
          <Route path="/blog" element={<GuidesPage />} />
          <Route path="/articles" element={<GuidesPage />} />

          {/* Legacy fallback route */}
          <Route path="/products/:category/:id" element={<Index />} />

          {/* Admin & Utility */}
          <Route path="/admin" element={<AdminGate />} />
          <Route path="/download" element={<Download />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
