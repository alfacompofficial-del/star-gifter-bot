import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Trash2, Search, Upload, Check, X, Pencil,
  BarChart3, Package, Plus, Eye, Heart, Download,
  ToggleLeft, ToggleRight, RefreshCw, TrendingUp, Users,
  Globe, AlertTriangle, Copy, SlidersHorizontal, LogOut,
  Layers, ArrowUpDown, ChevronDown, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/constants";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { broadcastProductsUpdate, clearProductsCache } from "@/lib/productsDb";
import type { Product } from "@/hooks/useProducts";
import ProductDrawerEditor from "@/components/admin/ProductDrawerEditor";
import AdminLogin from "@/components/admin/AdminLogin";

type VisitorRow = {
  id: number;
  ip: string;
  country: string | null;
  country_code: string | null;
  city: string | null;
  region: string | null;
  user_agent: string | null;
  path: string | null;
  referrer: string | null;
  created_at: string;
};

const flagEmoji = (code?: string | null) => {
  if (!code || code.length !== 2) return "🌐";
  const cc = code.toUpperCase();
  return String.fromCodePoint(...[...cc].map((c) => 127397 + c.charCodeAt(0)));
};

export const Admin = () => {
  const navigate = useNavigate();

  // ── Authentication State ──────────────────────────────────
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem("alfacomp_admin_auth") === "1";
    } catch {
      return false;
    }
  });

  // ── Core Navigation Tabs ──────────────────────────────────
  const [tab, setTab] = useState<"products" | "analytics" | "stats">("products");

  // ── Product States ────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<"all" | "in_stock" | "out_of_stock">("all");
  const [sortBy, setSortBy] = useState<"priority" | "price_asc" | "price_desc" | "views" | "likes" | "name">("priority");

  // ── Inline Editing States ─────────────────────────────────
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState<string>("");
  const [editingNameId, setEditingNameId] = useState<number | null>(null);
  const [editingNameValue, setEditingNameValue] = useState<string>("");

  // ── Image Upload Ref ──────────────────────────────────────
  const [uploadingImageId, setUploadingImageId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUploadProductId = useRef<number | null>(null);

  // ── Drag & Drop Reorder ───────────────────────────────────
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);

  // ── Drawer Editor State ───────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerProduct, setDrawerProduct] = useState<Product | null>(null);

  // ── Exchange Rate State ───────────────────────────────────
  const { exchangeRate, isUpdating: rateUpdating, updateExchangeRate } = useExchangeRate();
  const [editingRate, setEditingRate] = useState(false);
  const [rateInputValue, setRateInputValue] = useState("");

  // ── Visitor Telemetry ─────────────────────────────────────
  const [visitors, setVisitors] = useState<VisitorRow[]>([]);
  const [visitorsLoading, setVisitorsLoading] = useState(false);
  const [visitorSearch, setVisitorSearch] = useState("");

  // ── Fetch Products from Supabase ──────────────────────────
  const fetchProducts = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("priority", { ascending: true })
      .order("id", { ascending: true });

    if (!error) {
      setProducts((data as Product[]) || []);
    } else {
      toast.error("Ошибка загрузки данных из Supabase");
    }

    if (showRefresh) setIsRefreshing(false);
    else setLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProducts();
    }
  }, [isAuthenticated, fetchProducts]);

  // ── Fetch Visitors for Telemetry Tab ──────────────────────
  const fetchVisitors = useCallback(async () => {
    setVisitorsLoading(true);
    const { data, error } = await supabase
      .from("visitors" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(2000);

    if (!error) {
      setVisitors(((data as unknown) as VisitorRow[]) || []);
    }
    setVisitorsLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated && tab === "stats") {
      fetchVisitors();
    }
  }, [isAuthenticated, tab, fetchVisitors]);

  // ── Categories List ───────────────────────────────────────
  const allCategories = useMemo(() => {
    const defaultCats = ["ИБП", "Мониторы", "Сеть", "Комплектующие", "Моноблоки", "Аксессуары", "Колонки", "Кронштейны", "Deco", "Wi-Fi роутеры"];
    const found = [...new Set(products.map((p) => p.category).filter(Boolean))];
    return [...new Set([...defaultCats, ...found])];
  }, [products]);

  // ── Filtered & Sorted Products ────────────────────────────
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.brand || "").toLowerCase().includes(q) ||
          (p.category || "").toLowerCase().includes(q) ||
          String(p.id).includes(q)
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      list = list.filter((p) => p.category === selectedCategory);
    }

    // Stock availability filter
    if (stockFilter === "in_stock") {
      list = list.filter((p) => p.in_stock);
    } else if (stockFilter === "out_of_stock") {
      list = list.filter((p) => !p.in_stock);
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === "priority") {
        return (a.priority ?? 999) - (b.priority ?? 999);
      }
      if (sortBy === "price_asc") {
        return a.price - b.price;
      }
      if (sortBy === "price_desc") {
        return b.price - a.price;
      }
      if (sortBy === "views") {
        return (b.views || 0) - (a.views || 0);
      }
      if (sortBy === "likes") {
        return (b.likes || 0) - (a.likes || 0);
      }
      if (sortBy === "name") {
        return a.name.localeCompare(b.name, "ru");
      }
      return 0;
    });

    return list;
  }, [products, searchQuery, selectedCategory, stockFilter, sortBy]);

  // ── Metrics & Analytics ───────────────────────────────────
  const metrics = useMemo(() => {
    const totalCount = products.length;
    const inStockCount = products.filter((p) => p.in_stock).length;
    const outOfStockCount = totalCount - inStockCount;
    const categoryCounts: Record<string, number> = {};
    products.forEach((p) => {
      categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
    });
    const totalViews = products.reduce((acc, p) => acc + (p.views || 0), 0);
    const totalLikes = products.reduce((acc, p) => acc + (p.likes || 0), 0);

    const topByViews = [...products].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 8);
    const topByLikes = [...products].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 8);

    return {
      totalCount,
      inStockCount,
      outOfStockCount,
      categoryCounts,
      categoriesCount: Object.keys(categoryCounts).length,
      totalViews,
      totalLikes,
      topByViews,
      topByLikes,
    };
  }, [products]);

  // ── Visitor Statistics ────────────────────────────────────
  const visitorStats = useMemo(() => {
    const q = visitorSearch.trim().toLowerCase();
    const filtered = q
      ? visitors.filter(
          (v) =>
            v.ip.toLowerCase().includes(q) ||
            (v.country || "").toLowerCase().includes(q) ||
            (v.city || "").toLowerCase().includes(q)
        )
      : visitors;

    const uniqueIps = new Set(visitors.map((v) => v.ip)).size;
    const countryCounts: Record<string, number> = {};
    for (const v of visitors) {
      const k = v.country || "Неизвестно";
      countryCounts[k] = (countryCounts[k] || 0) + 1;
    }
    const topCountries = Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = visitors.filter((v) => v.created_at.startsWith(today)).length;

    return { filtered, uniqueIps, topCountries, todayCount };
  }, [visitors, visitorSearch]);

  // ── Product CRUD Handlers ─────────────────────────────────
  const handleSaveDrawerProduct = async (productData: Partial<Product>, isNew: boolean): Promise<boolean> => {
    try {
      if (isNew) {
        const { error } = await supabase.from("products").insert([productData as any]);
        if (error) throw error;
        toast.success("Товар успешно создан!");
      } else if (drawerProduct) {
        const { error } = await supabase.from("products").update(productData as any).eq("id", drawerProduct.id);
        if (error) throw error;
        toast.success("Товар успешно обновлен!");
      }
      fetchProducts();
      broadcastProductsUpdate();
      return true;
    } catch (err: any) {
      toast.error(`Ошибка: ${err.message || "Не удалось сохранить"}`);
      return false;
    }
  };

  const handleDeleteProduct = async (id: number, name: string) => {
    if (!window.confirm(`Удалить товар «${name}» (#${id})?`)) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      toast.success("Товар удален");
      setProducts((prev) => prev.filter((p) => p.id !== id));
      broadcastProductsUpdate();
    } catch {
      toast.error("Ошибка при удалении товара");
    }
  };

  const handleDuplicateProduct = async (p: Product) => {
    try {
      const duplicateData = {
        name: `${p.name} (Копия)`,
        category: p.category,
        brand: p.brand || "AlfaComp",
        price: p.price,
        old_price: p.old_price,
        image: p.image,
        in_stock: p.in_stock,
        priority: (p.priority ?? 999) + 1,
        specs: p.specs,
      };
      const { error } = await supabase.from("products").insert([duplicateData as any]);
      if (error) throw error;
      toast.success(`Товар продублирован: ${duplicateData.name}`);
      fetchProducts();
      broadcastProductsUpdate();
    } catch {
      toast.error("Не удалось продублировать товар");
    }
  };

  const handleToggleStock = async (id: number, current: boolean) => {
    try {
      const { error } = await supabase.from("products").update({ in_stock: !current }).eq("id", id);
      if (error) throw error;
      toast.success(!current ? "Товар переведен в наличие!" : "Товар снят с продажи");
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, in_stock: !current } : p)));
      broadcastProductsUpdate();
    } catch {
      toast.error("Ошибка переключения статуса наличия");
    }
  };

  // ── Inline Price & Name Editing ───────────────────────────
  const startEditPrice = (p: Product) => {
    setEditingPriceId(p.id);
    setEditingPriceValue(String(p.price));
  };
  const cancelEditPrice = () => {
    setEditingPriceId(null);
    setEditingPriceValue("");
  };
  const saveEditPrice = async (id: number) => {
    const val = parseFloat(editingPriceValue);
    if (isNaN(val) || val <= 0) {
      toast.error("Введите корректную цену");
      return;
    }
    const { error } = await supabase.from("products").update({ price: val }).eq("id", id);
    if (!error) {
      toast.success("Цена обновлена!");
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, price: val } : p)));
      cancelEditPrice();
      broadcastProductsUpdate();
    } else {
      toast.error("Ошибка сохранения цены");
    }
  };

  const startEditName = (p: Product) => {
    setEditingNameId(p.id);
    setEditingNameValue(p.name);
  };
  const cancelEditName = () => {
    setEditingNameId(null);
    setEditingNameValue("");
  };
  const saveEditName = async (id: number) => {
    const val = editingNameValue.trim();
    if (!val) {
      toast.error("Название не может быть пустым");
      return;
    }
    const { error } = await supabase.from("products").update({ name: val }).eq("id", id);
    if (!error) {
      toast.success("Название обновлено!");
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, name: val } : p)));
      cancelEditName();
      broadcastProductsUpdate();
    } else {
      toast.error("Ошибка сохранения названия");
    }
  };

  // ── Image Upload Handling ─────────────────────────────────
  const handleImageClick = (productId: number) => {
    currentUploadProductId.current = productId;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const productId = currentUploadProductId.current;
    if (!file || !productId) return;
    e.target.value = "";

    if (!file.type.startsWith("image/")) {
      toast.error("Выберите файл изображения");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Файл слишком большой (макс. 5MB)");
      return;
    }

    setUploadingImageId(productId);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string;
        const { error } = await supabase.from("products").update({ image: dataUrl }).eq("id", productId);
        if (!error) {
          toast.success("Фото обновлено!");
          setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, image: dataUrl } : p)));
          broadcastProductsUpdate();
        } else {
          toast.error("Ошибка загрузки фото в базу");
        }
        setUploadingImageId(null);
        currentUploadProductId.current = null;
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Ошибка при обработке файла");
      setUploadingImageId(null);
    }
  };

  // ── Drag & Drop Priority Sorting ──────────────────────────
  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id !== draggedId) setDragOverId(id);
  };
  const handleDrop = async (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    const list = [...products];
    const fromIdx = list.findIndex((p) => p.id === draggedId);
    const toIdx = list.findIndex((p) => p.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const reordered = [...list];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    const updates = reordered.map((p, idx) => ({ id: p.id, priority: idx + 1 }));
    setProducts(reordered.map((p, idx) => ({ ...p, priority: idx + 1 })));
    setDraggedId(null);
    setDragOverId(null);

    try {
      await Promise.all(
        updates.map(({ id, priority }) => supabase.from("products").update({ priority }).eq("id", id))
      );
      toast.success("Порядок товаров сохранен!");
      broadcastProductsUpdate();
    } catch {
      toast.error("Ошибка при сохранении порядка");
      fetchProducts();
    }
  };
  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  // ── CSV Export ────────────────────────────────────────────
  const handleExportCSV = () => {
    const headers = [
      "ID", "Название", "Бренд", "Категория", "Цена ($)", "Цена (сум)", "В наличии", "Приоритет", "Просмотры", "Лайки"
    ];
    const rows = products.map((p) => [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${(p.brand || "").replace(/"/g, '""')}"`,
      `"${p.category}"`,
      p.price,
      Math.round(p.price * exchangeRate),
      p.in_stock ? "Да" : "Нет",
      p.priority || "",
      p.views || 0,
      p.likes || 0,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `alfacomp_inventory_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV экспортирован!");
  };

  // ── Logout ────────────────────────────────────────────────
  const handleLogout = () => {
    try {
      sessionStorage.removeItem("alfacomp_admin_auth");
    } catch {}
    setIsAuthenticated(false);
    toast.success("Сессия оператора завершена");
  };

  // ── If Not Authenticated: Render Sleek Admin Login ────────
  if (!isAuthenticated) {
    return (
      <AdminLogin
        onSuccess={() => setIsAuthenticated(true)}
        onExit={() => navigate("/")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#08090d] text-white font-sans select-none antialiased">
      {/* Hidden file input for quick image change */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {/* ── TOP TELEMETRY BAR ──────────────────────────────── */}
      <header className="border-b border-white/[0.08] h-16 flex items-center px-4 sm:px-8 justify-between sticky top-0 bg-[#0c0e14]/92 backdrop-blur-xl z-50">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => navigate("/")}
            className="w-8 h-8 bg-[#141720] rounded-lg flex items-center justify-center border border-white/10 hover:border-white/20 transition-all text-white/70 hover:text-white group"
            title="Вернуться на главную витрину"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div>
            <h1 className="font-extrabold tracking-tight text-xs uppercase flex items-center gap-2">
              <span className="text-white">ALFACOMP</span>
              <span className="text-[#FF5A00] font-mono text-[11px]">// CONTROL CENTER</span>
            </h1>
            <div className="flex items-center gap-2 text-[10px] font-mono text-white/40 mt-0.5">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ONLINE
              </span>
              <span>·</span>
              <span>SUPABASE SYNCED</span>
            </div>
          </div>
        </div>

        {/* Right Tools & Telemetry */}
        <div className="flex items-center gap-3 sm:gap-6">
          {/* USD Rate Widget */}
          <div className="hidden sm:block">
            {editingRate ? (
              <div className="flex items-center gap-1.5 bg-[#141720] px-2 py-1 rounded-lg border border-[#FF5A00]/50">
                <span className="text-[10px] font-mono text-white/50">1$ =</span>
                <input
                  type="number"
                  value={rateInputValue}
                  onChange={(e) => setRateInputValue(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter") {
                      const val = parseInt(rateInputValue);
                      if (!isNaN(val) && val > 0) {
                        const ok = await updateExchangeRate(val);
                        if (ok) toast.success(`Курс обновлен: 1$ = ${val.toLocaleString()} UZS`);
                        else toast.error("Ошибка сохранения курса");
                      }
                      setEditingRate(false);
                    } else if (e.key === "Escape") {
                      setEditingRate(false);
                    }
                  }}
                  autoFocus
                  className="w-20 bg-transparent text-xs font-mono font-bold text-[#FF5A00] outline-none text-right"
                />
                <button
                  onClick={async () => {
                    const val = parseInt(rateInputValue);
                    if (!isNaN(val) && val > 0) {
                      const ok = await updateExchangeRate(val);
                      if (ok) toast.success(`Курс обновлен: 1$ = ${val.toLocaleString()} UZS`);
                    }
                    setEditingRate(false);
                  }}
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setEditingRate(false)} className="text-red-400 hover:text-red-300">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setRateInputValue(String(exchangeRate));
                  setEditingRate(true);
                }}
                className="text-right group hover:opacity-85 transition-opacity px-2.5 py-1 rounded-lg hover:bg-white/[0.03] border border-transparent hover:border-white/5"
                title="Нажмите чтобы изменить базовый курс USD/UZS"
              >
                <div className="text-[9.5px] font-mono text-white/40 uppercase tracking-wider flex items-center justify-end gap-1">
                  КУРС USD <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                </div>
                <div className="text-xs font-mono font-bold text-[#FF5A00]">
                  1$ = {exchangeRate.toLocaleString()} UZS
                </div>
              </button>
            )}
          </div>

          {/* Quick Refresh */}
          <button
            onClick={() => fetchProducts(true)}
            className="w-8 h-8 bg-[#141720] rounded-lg flex items-center justify-center border border-white/10 hover:border-white/20 transition-all text-white/70 hover:text-white"
            title="Обновить базу данных"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#FF5A00]" : ""}`} />
          </button>

          {/* CSV Export */}
          <button
            onClick={handleExportCSV}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-[#141720] border border-white/10 rounded-lg text-xs font-mono uppercase tracking-wider hover:border-white/25 transition-all text-white/80 hover:text-white"
          >
            <Download className="w-3.5 h-3.5 text-[#FF5A00]" /> CSV
          </button>

          {/* Cache Flush */}
          <button
            onClick={async () => {
              await clearProductsCache();
              toast.success("Локальный кэш IndexedDB очищен!");
              fetchProducts(true);
            }}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-[#141720] border border-white/10 rounded-lg text-xs font-mono uppercase tracking-wider hover:border-red-500/30 hover:text-red-400 transition-all text-white/50"
            title="Очистить локальный кэш витрины"
          >
            <Trash2 className="w-3.5 h-3.5" /> Кэш
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-mono uppercase tracking-wider transition-all"
            title="Завершить сессию оператора"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Выход</span>
          </button>
        </div>
      </header>

      {/* ── MAIN DASHBOARD VIEW ────────────────────────────── */}
      <main className="max-w-[1540px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Navigation Sub-Tabs */}
        <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] pb-3 overflow-x-auto">
          <div className="flex items-center gap-2">
            {[
              { id: "products", label: "Товары & Каталог", icon: Package },
              { id: "analytics", label: "Аналитика Витрины", icon: BarChart3 },
              { id: "stats", label: "IP-Телеметрия & Посетители", icon: Users },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-xs tracking-wider uppercase transition-all border whitespace-nowrap ${
                  tab === id
                    ? "bg-[#FF5A00] text-white border-[#FF5A00] shadow-md shadow-[#FF5A00]/20"
                    : "bg-[#11141c] text-white/60 border-white/[0.07] hover:text-white hover:border-white/15"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Quick Add Product Button */}
          {tab === "products" && (
            <button
              onClick={() => {
                setDrawerProduct(null);
                setDrawerOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FF5A00] hover:bg-[#FF6A15] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-[#FF5A00]/20 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить товар</span>
            </button>
          )}
        </div>

        {/* ── TAB 1: PRODUCTS INVENTORY ──────────────────────── */}
        {tab === "products" && (
          <div className="space-y-5">
            {/* Summary Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-[#0f1219] border border-white/[0.08] rounded-xl p-4 sm:p-5">
                <div className="text-[10px] font-mono uppercase text-white/40 tracking-wider">Всего в базе</div>
                <div className="text-2xl sm:text-3xl font-mono font-extrabold text-white mt-1">
                  {metrics.totalCount}
                </div>
              </div>

              <div
                onClick={() => setStockFilter(stockFilter === "in_stock" ? "all" : "in_stock")}
                className={`bg-[#0f1219] border rounded-xl p-4 sm:p-5 cursor-pointer transition-all ${
                  stockFilter === "in_stock" ? "border-emerald-500/60 bg-emerald-500/[0.04]" : "border-white/[0.08] hover:border-white/20"
                }`}
              >
                <div className="text-[10px] font-mono uppercase text-emerald-400/80 tracking-wider flex items-center justify-between">
                  <span>В наличии</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-mono font-extrabold text-emerald-400 mt-1">
                  {metrics.inStockCount}
                </div>
              </div>

              <div
                onClick={() => setStockFilter(stockFilter === "out_of_stock" ? "all" : "out_of_stock")}
                className={`bg-[#0f1219] border rounded-xl p-4 sm:p-5 cursor-pointer transition-all ${
                  stockFilter === "out_of_stock" ? "border-yellow-500/60 bg-yellow-500/[0.04]" : "border-white/[0.08] hover:border-white/20"
                }`}
              >
                <div className="text-[10px] font-mono uppercase text-yellow-400/80 tracking-wider flex items-center justify-between">
                  <span>Снято с продажи</span>
                  {metrics.outOfStockCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />}
                </div>
                <div className="text-2xl sm:text-3xl font-mono font-extrabold text-yellow-400 mt-1">
                  {metrics.outOfStockCount}
                </div>
              </div>

              <div className="bg-[#0f1219] border border-white/[0.08] rounded-xl p-4 sm:p-5">
                <div className="text-[10px] font-mono uppercase text-white/40 tracking-wider">Категорий</div>
                <div className="text-2xl sm:text-3xl font-mono font-extrabold text-[#FF5A00] mt-1">
                  {metrics.categoriesCount}
                </div>
              </div>
            </div>

            {/* Filter & Search Control Panel */}
            <div className="bg-[#0f1219] rounded-xl border border-white/[0.08] p-4 space-y-3.5">
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    placeholder="Поиск по названию, бренду, категории или ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#141722] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-[#FF5A00] text-xs sm:text-sm text-white transition-all font-sans"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Sorting Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-white/40 uppercase whitespace-nowrap">Сортировка:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-[#141722] border border-white/10 rounded-lg px-3 py-2 text-xs font-medium text-white outline-none focus:border-[#FF5A00] cursor-pointer"
                  >
                    <option value="priority">По приоритету каталога</option>
                    <option value="price_asc">Цена (сначала дешевле)</option>
                    <option value="price_desc">Цена (сначала дороже)</option>
                    <option value="views">По просмотрам</option>
                    <option value="likes">По лайкам</option>
                    <option value="name">По алфавиту</option>
                  </select>
                </div>
              </div>

              {/* Category Pills Bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all border ${
                    selectedCategory === "all"
                      ? "bg-white/10 text-white border-white/30"
                      : "bg-[#141722] text-white/50 border-white/5 hover:text-white"
                  }`}
                >
                  Все ({products.length})
                </button>
                {allCategories.map((c) => {
                  const count = metrics.categoryCounts[c] || 0;
                  return (
                    <button
                      key={c}
                      onClick={() => setSelectedCategory(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all border whitespace-nowrap ${
                        selectedCategory === c
                          ? "bg-[#FF5A00]/20 text-[#FF5A00] border-[#FF5A00]/50"
                          : "bg-[#141722] text-white/50 border-white/5 hover:text-white"
                      }`}
                    >
                      {c} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Products Table */}
            <div className="bg-[#0f1219] rounded-xl border border-white/[0.08] overflow-hidden shadow-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.02] text-[10px] uppercase font-mono tracking-[0.16em] text-white/40 border-b border-white/[0.06]">
                    <th className="p-4 sm:p-5 w-10 text-center">#</th>
                    <th className="p-4 sm:p-5">Товар</th>
                    <th className="p-4 sm:p-5 hidden md:table-cell">Категория</th>
                    <th className="p-4 sm:p-5">Наличие</th>
                    <th className="p-4 sm:p-5 text-right">Цена ($ / UZS)</th>
                    <th className="p-4 sm:p-5 text-center hidden lg:table-cell">Метрики</th>
                    <th className="p-4 sm:p-5 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {loading && (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-white/40 font-mono text-xs">
                        Синхронизация с Supabase...
                      </td>
                    </tr>
                  )}
                  {!loading && filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-white/40 font-mono text-xs">
                        По вашему запросу ничего не найдено
                      </td>
                    </tr>
                  )}
                  {filteredProducts.map((p) => (
                    <tr
                      key={p.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, p.id)}
                      onDragOver={(e) => handleDragOver(e, p.id)}
                      onDrop={(e) => handleDrop(e, p.id)}
                      onDragEnd={handleDragEnd}
                      className={`transition-all group cursor-grab active:cursor-grabbing hover:bg-white/[0.02] ${
                        draggedId === p.id ? "opacity-35 scale-[0.99]" : dragOverId === p.id ? "bg-[#FF5A00]/10 border-l-2 border-[#FF5A00]" : ""
                      }`}
                    >
                      {/* Priority drag index */}
                      <td className="p-4 sm:p-5 text-center font-mono text-xs text-white/30 group-hover:text-white/70">
                        {p.priority ?? "—"}
                      </td>

                      {/* Product Thumbnail & Name */}
                      <td className="p-4 sm:p-5">
                        <div className="flex items-center gap-3.5">
                          {/* Image Box */}
                          <div
                            onClick={() => handleImageClick(p.id)}
                            className="relative w-12 h-12 rounded-lg overflow-hidden border border-white/10 bg-[#090b10] cursor-pointer group/img shrink-0"
                            title="Нажмите чтобы заменить фото"
                          >
                            {uploadingImageId === p.id ? (
                              <div className="w-full h-full flex items-center justify-center bg-black/80">
                                <div className="w-4 h-4 border-2 border-[#FF5A00] border-t-transparent rounded-full animate-spin" />
                              </div>
                            ) : (
                              <>
                                <img
                                  src={p.image}
                                  alt={p.name}
                                  className="w-full h-full object-cover transition-all group-hover/img:brightness-50"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = "https://via.placeholder.com/48?text=HW";
                                  }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                                  <Upload className="w-4 h-4 text-white" />
                                </div>
                              </>
                            )}
                          </div>

                          {/* Name & ID */}
                          <div className="min-w-0">
                            {editingNameId === p.id ? (
                              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="text"
                                  value={editingNameValue}
                                  onChange={(e) => setEditingNameValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveEditName(p.id);
                                    if (e.key === "Escape") cancelEditName();
                                  }}
                                  autoFocus
                                  className="w-48 bg-white/10 border border-[#FF5A00]/70 rounded px-2 py-1 text-xs font-bold text-white outline-none"
                                />
                                <button
                                  onClick={() => saveEditName(p.id)}
                                  className="p-1 rounded bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={cancelEditName}
                                  className="p-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div
                                onClick={() => startEditName(p)}
                                className="font-bold text-white text-xs sm:text-sm truncate max-w-[220px] sm:max-w-[320px] cursor-pointer hover:text-[#FF5A00] transition-colors flex items-center gap-1.5 group/title"
                                title="Нажмите для быстрого изменения названия"
                              >
                                <span>{p.name}</span>
                                <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/title:opacity-60 transition-opacity text-white/50" />
                              </div>
                            )}

                            <div className="text-[10px] font-mono text-white/40 mt-0.5 flex items-center gap-2">
                              <span>ID #{p.id}</span>
                              <span>·</span>
                              <span className="text-[#FF5A00]/80 uppercase">{p.brand || "AlfaComp"}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="p-4 sm:p-5 hidden md:table-cell">
                        <span className="px-2.5 py-1 rounded bg-white/[0.04] border border-white/5 text-[11px] font-mono text-white/70">
                          {p.category}
                        </span>
                      </td>

                      {/* Stock Switch */}
                      <td className="p-4 sm:p-5">
                        <button
                          onClick={() => handleToggleStock(p.id, p.in_stock)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border transition-all ${
                            p.in_stock
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20"
                          }`}
                          title={p.in_stock ? "Нажмите чтобы снять с продажи" : "Нажмите чтобы включить в наличие"}
                        >
                          {p.in_stock ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                          <span>{p.in_stock ? "В наличии" : "Снят"}</span>
                        </button>
                      </td>

                      {/* Price USD & UZS */}
                      <td className="p-4 sm:p-5 text-right font-mono">
                        {editingPriceId === p.id ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-white/40">$</span>
                            <input
                              type="number"
                              value={editingPriceValue}
                              onChange={(e) => setEditingPriceValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEditPrice(p.id);
                                if (e.key === "Escape") cancelEditPrice();
                              }}
                              autoFocus
                              className="w-20 bg-white/10 border border-[#FF5A00]/70 rounded px-2 py-1 text-xs font-mono font-bold text-white text-right outline-none"
                            />
                            <button
                              onClick={() => saveEditPrice(p.id)}
                              className="p-1 rounded bg-green-500/20 text-green-400"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button onClick={cancelEditPrice} className="p-1 rounded bg-red-500/20 text-red-400">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div>
                            <button
                              onClick={() => startEditPrice(p)}
                              className="font-bold text-sm text-white hover:text-[#FF5A00] transition-colors flex items-center gap-1 ml-auto group/price"
                              title="Нажмите чтобы изменить цену"
                            >
                              <span>${p.price}</span>
                              <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/price:opacity-50 text-white/50" />
                            </button>
                            <div className="text-[10px] text-white/40 mt-0.5">
                              {formatPrice(Math.round(p.price * exchangeRate))} сум
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Telemetry (Views / Likes) */}
                      <td className="p-4 sm:p-5 text-center hidden lg:table-cell">
                        <div className="flex items-center justify-center gap-3 text-[11px] font-mono text-white/40">
                          <span className="flex items-center gap-1" title="Просмотры">
                            <Eye className="w-3 h-3 text-white/40" /> {p.views || 0}
                          </span>
                          <span className="flex items-center gap-1" title="Лайки">
                            <Heart className="w-3 h-3 text-rose-400/70" /> {p.likes || 0}
                          </span>
                        </div>
                      </td>

                      {/* Row Actions */}
                      <td className="p-4 sm:p-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setDrawerProduct(p);
                              setDrawerOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-white/[0.04] border border-white/5 hover:border-white/20 text-white/70 hover:text-white transition-all"
                            title="Открыть редактор товара"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDuplicateProduct(p)}
                            className="p-1.5 rounded-lg bg-white/[0.04] border border-white/5 hover:border-white/20 text-white/70 hover:text-white transition-all"
                            title="Дублировать товар"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                            title="Удалить товар"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 2: ANALYTICS ──────────────────────────────── */}
        {tab === "analytics" && (() => {
          // Chart color palette
          const CHART_COLORS = ["#FF5A00", "#FF8C42", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16", "#F97316"];

          // Category bar chart data
          const categoryChartData = Object.entries(metrics.categoryCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([name, value]) => ({ name, value }));

          // Pie chart data (stock status)
          const stockPieData = [
            { name: "В наличии", value: metrics.inStockCount },
            { name: "Нет в наличии", value: metrics.outOfStockCount },
          ].filter(d => d.value > 0);

          // Top views bar chart
          const viewsChartData = metrics.topByViews.slice(0, 6).map(p => ({
            name: p.name.length > 16 ? p.name.slice(0, 14) + "…" : p.name,
            views: p.views || 0,
            likes: p.likes || 0,
          }));

          const CustomTooltipStyle = { backgroundColor: "#0f1219", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11, fontFamily: "monospace" };

          return (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Всего товаров", value: metrics.totalCount, color: "text-white", bg: "border-white/10" },
                { label: "В наличии", value: metrics.inStockCount, color: "text-emerald-400", bg: "border-emerald-500/20" },
                { label: "Просмотры (всего)", value: metrics.totalViews.toLocaleString(), color: "text-[#FF5A00]", bg: "border-[#FF5A00]/20" },
                { label: "Лайки (всего)", value: metrics.totalLikes.toLocaleString(), color: "text-rose-400", bg: "border-rose-500/20" },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`bg-[#0f1219] border ${bg} rounded-xl p-5 relative overflow-hidden`}>
                  <div className="absolute inset-0 opacity-[0.03] bg-gradient-to-br from-white to-transparent" />
                  <div className={`text-2xl sm:text-3xl font-mono font-bold ${color}`}>{value}</div>
                  <div className="text-[10px] font-mono uppercase text-white/40 tracking-wider mt-1">{label}</div>
                </div>
              ))}
            </div>

            {metrics.outOfStockCount > 0 && (
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4 flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
                <p className="text-xs font-medium text-yellow-400">
                  {metrics.outOfStockCount} товаров сейчас отмечены как «Снято с продажи».
                </p>
              </div>
            )}

            {/* Main Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              {/* Category Bar Chart */}
              <div className="bg-[#0f1219] border border-white/[0.08] rounded-xl p-6 lg:col-span-3">
                <div className="flex items-center gap-2 mb-5">
                  <BarChart3 className="w-4 h-4 text-[#FF5A00]" />
                  <h3 className="font-mono uppercase tracking-wider text-xs text-white/80 font-bold">Товары по категориям</h3>
                </div>
                {categoryChartData.length === 0 ? (
                  <p className="text-xs font-mono text-white/30 py-10 text-center">Нет данных</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={categoryChartData} margin={{ top: 0, right: 0, left: -20, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 10, fontFamily: "monospace" }}
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10, fontFamily: "monospace" }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={CustomTooltipStyle}
                        labelStyle={{ color: "rgba(255,255,255,0.7)" }}
                        itemStyle={{ color: "#FF5A00" }}
                        cursor={{ fill: "rgba(255,90,0,0.06)" }}
                      />
                      <Bar dataKey="value" name="Товаров" radius={[4, 4, 0, 0]}>
                        {categoryChartData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Stock Pie Chart */}
              <div className="bg-[#0f1219] border border-white/[0.08] rounded-xl p-6 lg:col-span-2">
                <div className="flex items-center gap-2 mb-5">
                  <Package className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-mono uppercase tracking-wider text-xs text-white/80 font-bold">Наличие товаров</h3>
                </div>
                {stockPieData.length === 0 ? (
                  <p className="text-xs font-mono text-white/30 py-10 text-center">Нет данных</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={stockPieData}
                        cx="50%"
                        cy="45%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        <Cell fill="#10B981" />
                        <Cell fill="#F59E0B" />
                      </Pie>
                      <Tooltip contentStyle={CustomTooltipStyle} itemStyle={{ color: "rgba(255,255,255,0.8)" }} />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.5)", paddingTop: 8 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Views & Likes Bar Chart */}
            <div className="bg-[#0f1219] border border-white/[0.08] rounded-xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp className="w-4 h-4 text-[#FF5A00]" />
                <h3 className="font-mono uppercase tracking-wider text-xs text-white/80 font-bold">Топ-6 товаров: просмотры & лайки</h3>
              </div>
              {viewsChartData.length === 0 ? (
                <p className="text-xs font-mono text-white/30 py-10 text-center">Нет данных</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={viewsChartData} margin={{ top: 0, right: 10, left: -20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 9, fontFamily: "monospace" }}
                      angle={-30}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10, fontFamily: "monospace" }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={CustomTooltipStyle}
                      labelStyle={{ color: "rgba(255,255,255,0.7)" }}
                      cursor={{ fill: "rgba(255,255,255,0.03)" }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.5)", paddingTop: 8 }}
                    />
                    <Bar dataKey="views" name="Просмотры" fill="#FF5A00" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="likes" name="Лайки" fill="#F43F5E" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Category Cards Grid */}
            <div className="bg-[#0f1219] border border-white/[0.08] rounded-xl p-6">
              <h3 className="font-mono uppercase tracking-wider text-xs text-white/80 font-bold mb-4">
                Распределение оборудования по категориям
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {Object.entries(metrics.categoryCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, count], i) => (
                    <div
                      key={cat}
                      className="bg-[#141722] border border-white/[0.06] rounded-lg p-3"
                      style={{ borderTopColor: CHART_COLORS[i % CHART_COLORS.length], borderTopWidth: 2 }}
                    >
                      <div className="text-xl font-mono font-extrabold" style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}>{count}</div>
                      <div className="text-xs text-white/50 mt-0.5 truncate">{cat}</div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
          );
        })()}

        {/* ── TAB 3: IP TELEMETRY & VISITORS ────────────────── */}
        {tab === "stats" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#0f1219] border border-white/[0.08] rounded-xl p-5">
                <div className="text-[10px] font-mono uppercase text-white/40 tracking-wider mb-1 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#FF5A00]" /> Всего визитов
                </div>
                <div className="text-2xl font-mono font-bold text-white">{visitors.length}</div>
              </div>

              <div className="bg-[#0f1219] border border-white/[0.08] rounded-xl p-5">
                <div className="text-[10px] font-mono uppercase text-white/40 tracking-wider mb-1">Уникальных IP</div>
                <div className="text-2xl font-mono font-bold text-white">{visitorStats.uniqueIps}</div>
              </div>

              <div className="bg-[#0f1219] border border-white/[0.08] rounded-xl p-5">
                <div className="text-[10px] font-mono uppercase text-white/40 tracking-wider mb-1">Сегодня</div>
                <div className="text-2xl font-mono font-bold text-emerald-400">{visitorStats.todayCount}</div>
              </div>

              <div className="bg-[#0f1219] border border-white/[0.08] rounded-xl p-5">
                <div className="text-[10px] font-mono uppercase text-white/40 tracking-wider mb-1">Топ локаций</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {visitorStats.topCountries.length === 0 && <span className="text-white/40 text-xs">—</span>}
                  {visitorStats.topCountries.map(([name, count]) => (
                    <span key={name} className="text-[11px] font-mono bg-white/5 border border-white/10 rounded px-1.5 py-0.5">
                      {name} · <span className="text-[#FF5A00]">{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Visitors Search & Table */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                placeholder="Поиск по IP, стране, городу..."
                value={visitorSearch}
                onChange={(e) => setVisitorSearch(e.target.value)}
                className="w-full bg-[#0f1219] border border-white/[0.08] rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-[#FF5A00] text-xs sm:text-sm text-white transition-all font-mono"
              />
            </div>

            <div className="bg-[#0f1219] rounded-xl border border-white/[0.08] overflow-hidden shadow-xl">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/[0.02] text-[10px] uppercase font-mono tracking-wider text-white/40 border-b border-white/[0.06]">
                    <th className="p-4 sm:p-5">IP Адрес</th>
                    <th className="p-4 sm:p-5">Страна / Регион</th>
                    <th className="p-4 sm:p-5 hidden sm:table-cell">Путь</th>
                    <th className="p-4 sm:p-5 hidden md:table-cell">User Agent</th>
                    <th className="p-4 sm:p-5 text-right">Время</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {visitorsLoading && (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-white/40 font-mono text-xs">
                        Загрузка телеметрии...
                      </td>
                    </tr>
                  )}
                  {!visitorsLoading && visitorStats.filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-white/40 font-mono text-xs">
                        Нет зарегистрированных посещений
                      </td>
                    </tr>
                  )}
                  {visitorStats.filtered.map((v) => (
                    <tr key={v.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 sm:p-5 font-mono text-xs font-bold text-[#FF5A00]">{v.ip}</td>
                      <td className="p-4 sm:p-5 text-xs">
                        <div className="font-semibold text-white">
                          {flagEmoji(v.country_code)} {v.country || "Неизвестно"}
                        </div>
                        <div className="text-white/40 text-[11px] mt-0.5 font-mono">
                          {[v.city, v.region].filter(Boolean).join(", ") || "—"}
                        </div>
                      </td>
                      <td className="p-4 sm:p-5 text-xs text-white/60 font-mono hidden sm:table-cell">{v.path || "/"}</td>
                      <td className="p-4 sm:p-5 text-xs text-white/40 max-w-[240px] truncate hidden md:table-cell font-mono" title={v.user_agent || ""}>
                        {v.user_agent || "—"}
                      </td>
                      <td className="p-4 sm:p-5 text-right text-xs font-mono text-white/40 whitespace-nowrap">
                        {new Date(v.created_at).toLocaleString("ru-RU")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ── PRODUCT SIDE DRAWER INSPECTOR ──────────────────── */}
      <ProductDrawerEditor
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        product={drawerProduct}
        categories={allCategories}
        exchangeRate={exchangeRate}
        onSave={handleSaveDrawerProduct}
      />
    </div>
  );
};

export default Admin;
