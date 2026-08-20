import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import Download from "./pages/Download";
import NotFound from "./pages/NotFound";
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
      <HashRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/products/:category/:id" element={<Index />} />
          <Route path="/admin" element={<AdminGate />} />
          <Route path="/download" element={<Download />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
