import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Trash2, Search, Upload, Check, X, Pencil,
  BarChart3, Package, Plus, Eye, Heart, Download,
  ToggleLeft, ToggleRight, RefreshCw, TrendingUp, Users,
  Globe, AlertTriangle, Copy, SlidersHorizontal, LogOut,
  Layers, ArrowUpDown, ChevronDown, Sparkles, Star, Send, Bot, MessageSquare,
  LayoutDashboard, Compass, Settings, Bell, ChevronLeft, ChevronRight, Menu,
  CheckSquare, Square, Smartphone, Monitor, ShieldCheck, CheckCircle2,
  ExternalLink, Filter
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, resolveProductPrices } from "@/lib/constants";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { broadcastProductsUpdate, clearProductsCache } from "@/lib/productsDb";
import type { Product } from "@/hooks/useProducts";
import ProductDrawerEditor from "@/components/admin/ProductDrawerEditor";
import AdminLogin from "@/components/admin/AdminLogin";
import {
  sendMessageAsAdmin, getRecentBotMessages, getBotInfo, getAdminChatIds, setAdminChatIds,
  syncTelegramUpdates, extractTelegramUsers, deleteTelegramMessage, editTelegramMessage,
  loadStoredTelegramMessages, sendTelegramMessageWithDetails,
  type StoredTelegramMessage, type TelegramUser
} from "@/services/telegramBot";

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

type AdminTab = "products" | "analytics" | "stats" | "telegram" | "overview" | "users" | "settings";

export const Admin = () => {
  const navigate = useNavigate();

  // ── Admin PWA Manifest (dynamically injected) ─────────────
  useEffect(() => {
    const prev = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    const prevHref = prev?.href || "";
    const el = document.createElement("link");
    el.rel = "manifest";
    el.href = "/ac-ext.json";
    document.head.appendChild(el);
    if (prev) prev.remove();
    return () => {
      el.remove();
      if (prev) {
        prev.href = prevHref;
        document.head.appendChild(prev);
      }
    };
  }, []);

  // ── Authentication State ──────────────────────────────────
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return (
        sessionStorage.getItem("alfacomp_admin_auth") === "1" ||
        localStorage.getItem("alfacomp_admin_auth") === "1"
      );
    } catch {
      return false;
    }
  });

  // ── Core Navigation Tabs ──────────────────────────────────
  const [tab, setTab] = useState<AdminTab>("products");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // ── Product States ────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<"all" | "in_stock" | "out_of_stock">("all");
  const [sortBy, setSortBy] = useState<"priority" | "price_asc" | "price_desc" | "views" | "likes" | "name">("priority");

  // Selection for bulk actions
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);

  // Pagination for products table
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

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

  // ── Telegram Bot CRM State ────────────────────────────────
  const [allTgMessages, setAllTgMessages] = useState<StoredTelegramMessage[]>(() => loadStoredTelegramMessages());
  const [tgUsers, setTgUsers] = useState<TelegramUser[]>(() => extractTelegramUsers(loadStoredTelegramMessages()));
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [tgSyncing, setTgSyncing] = useState(false);
  const [tgChatInput, setTgChatInput] = useState("");
  const [tgSending, setTgSending] = useState(false);
  const [tgEditingMsg, setTgEditingMsg] = useState<StoredTelegramMessage | null>(null);
  const [tgEditText, setTgEditText] = useState("");
  const [tgEditSaving, setTgEditSaving] = useState(false);
  const [botAdminChats, setBotAdminChats] = useState<string[]>(getAdminChatIds());
  const [newChatId, setNewChatId] = useState("");
  const [botInfo, setBotInfo] = useState<{ username: string; first_name: string } | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [tgUserSearch, setTgUserSearch] = useState("");

  // Bot commands switch states
  const [botCommands, setBotCommands] = useState<{ [key: string]: boolean }>({
    "/start": true,
    "/catalog": true,
    "/info": true,
    "/support": true,
    "/order": true,
  });

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

  // ── Sync Telegram Updates ──────────────────────────────────
  const syncTgMessages = useCallback(async () => {
    setTgSyncing(true);
    const merged = await syncTelegramUpdates();
    setAllTgMessages((prev) => {
      const map = new Map<string, StoredTelegramMessage>();
      merged.forEach((m) => map.set(`${m.chat_id}_${m.message_id}`, m));
      prev.filter((m) => !m.from_user).forEach((m) => {
        if (!map.has(`${m.chat_id}_${m.message_id}`)) {
          map.set(`${m.chat_id}_${m.message_id}`, m);
        }
      });
      const combined = Array.from(map.values()).sort((a, b) => a.date - b.date);
      setTgUsers(extractTelegramUsers(combined));
      return combined;
    });
    setTgSyncing(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchVisitors();
    }
  }, [isAuthenticated, fetchVisitors]);

  useEffect(() => {
    if (isAuthenticated && tab === "telegram") {
      syncTgMessages();
      getBotInfo().then(setBotInfo);
      const interval = setInterval(syncTgMessages, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, tab, syncTgMessages]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [allTgMessages, selectedUserId]);

  // ── Categories List ───────────────────────────────────────
  const allCategories = useMemo(() => {
    const defaultCats = [
      "ИБП", "Мониторы", "Сеть", "Комплектующие", "Моноблоки",
      "Аксессуары", "Колонки", "Кронштейны", "Deco", "Wi-Fi роутеры", "Видеокарты"
    ];
    const found = [...new Set(products.map((p) => p.category).filter(Boolean))];
    return [...new Set([...defaultCats, ...found])];
  }, [products]);

  // ── Filtered & Sorted Products ────────────────────────────
  const filteredProducts = useMemo(() => {
    let list = [...products];

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

    if (selectedCategory !== "all") {
      list = list.filter((p) => p.category === selectedCategory);
    }

    if (stockFilter === "in_stock") {
      list = list.filter((p) => p.in_stock);
    } else if (stockFilter === "out_of_stock") {
      list = list.filter((p) => !p.in_stock);
    }

    list.sort((a, b) => {
      if (sortBy === "priority") return (a.priority ?? 999) - (b.priority ?? 999);
      if (sortBy === "price_asc") return a.price - b.price;
      if (sortBy === "price_desc") return b.price - a.price;
      if (sortBy === "views") return (b.views || 0) - (a.views || 0);
      if (sortBy === "likes") return (b.likes || 0) - (a.likes || 0);
      if (sortBy === "name") return a.name.localeCompare(b.name, "ru");
      return 0;
    });

    return list;
  }, [products, searchQuery, selectedCategory, stockFilter, sortBy]);

  // Paginated list
  const paginatedProducts = useMemo(() => {
    if (pageSize === -1) return filteredProducts;
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  const totalPages = useMemo(() => {
    if (pageSize === -1 || filteredProducts.length === 0) return 1;
    return Math.ceil(filteredProducts.length / pageSize);
  }, [filteredProducts, pageSize]);

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
      await clearProductsCache();
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
      await clearProductsCache();
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
      await clearProductsCache();
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
      await clearProductsCache();
      broadcastProductsUpdate();
    } catch {
      toast.error("Ошибка переключения статуса наличия");
    }
  };

  // ── Inline Price & Name Editing (USD Primary) ────────────
  const startEditPrice = (p: Product) => {
    setEditingPriceId(p.id);
    const { priceUSD } = resolveProductPrices(p.price, exchangeRate || 14000);
    setEditingPriceValue(String(priceUSD));
  };
  const cancelEditPrice = () => {
    setEditingPriceId(null);
    setEditingPriceValue("");
  };
  const saveEditPrice = async (id: number) => {
    const usdVal = parseFloat(editingPriceValue);
    if (isNaN(usdVal) || usdVal <= 0) {
      toast.error("Введите корректную цену в USD ($)");
      return;
    }
    const currentRate = exchangeRate > 0 ? exchangeRate : 11858;
    const finalUZS = Math.round(usdVal * currentRate);

    const { error } = await supabase.from("products").update({ price: finalUZS }).eq("id", id);
    if (!error) {
      toast.success(`Цена обновлена: $${usdVal} (${formatPrice(finalUZS)} сум)`);
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, price: finalUZS } : p)));
      cancelEditPrice();
      await clearProductsCache();
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
      await clearProductsCache();
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
          await clearProductsCache();
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
      await clearProductsCache();
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
    if (!products || products.length === 0) {
      toast.error("Товары для экспорта не найдены");
      return;
    }
    const headers = [
      "ID", "Название", "Бренд", "Категория", "Цена (сум)",
      "Старая цена (сум)", "Цена (≈$USD)", "В наличии", "Приоритет",
      "Просмотры", "Лайки", "Ссылка на фото", "Характеристики"
    ];
    const escapeCsv = (val: any) => `"${String(val ?? "").replace(/"/g, '""')}"`;
    const rows = products.map((p) => [
      p.id,
      escapeCsv(p.name),
      escapeCsv(p.brand || ""),
      escapeCsv(p.category || ""),
      p.price,
      p.old_price ?? "",
      exchangeRate > 0 ? Math.round(p.price / exchangeRate) : "",
      p.in_stock ? "Да" : "Нет",
      p.priority ?? "",
      p.views || 0,
      p.likes || 0,
      escapeCsv(p.image || ""),
      escapeCsv(
        p.specs
          ? Object.entries(p.specs)
              .map(([k, v]) => `${k}: ${v}`)
              .join("; ")
          : ""
      ),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `alfacomp_products_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Скачано ${products.length} товаров в формате CSV!`);
  };

  // ── Logout ────────────────────────────────────────────────
  const handleLogout = () => {
    try {
      sessionStorage.removeItem("alfacomp_admin_auth");
      sessionStorage.removeItem("alfacomp_admin_auth_time");
      sessionStorage.removeItem("alfacomp_admin_email");
      localStorage.removeItem("alfacomp_admin_auth");
      localStorage.removeItem("alfacomp_admin_auth_time");
      window.dispatchEvent(new CustomEvent("admin-auth-changed"));
    } catch {}
    setIsAuthenticated(false);
    toast.success("Сессия оператора завершена");
  };

  // ── Navigation Menu Definition ────────────────────────────
  const NAV_ITEMS = [
    { id: "overview" as AdminTab, label: "Главная", icon: LayoutDashboard },
    { id: "products" as AdminTab, label: "Товары и каталог", icon: Package },
    { id: "analytics" as AdminTab, label: "Аналитика витрины", icon: BarChart3 },
    { id: "stats" as AdminTab, label: "Откуда идут пользователи", icon: Compass },
    { id: "telegram" as AdminTab, label: "Telegram / Бот", icon: Send },
    { id: "users" as AdminTab, label: "Пользователи", icon: Users },
    { id: "settings" as AdminTab, label: "Настройки", icon: Settings },
  ];

  // ── Traffic Sources Analytics Data ────────────────────────
  const trafficData = useMemo(() => {
    const refMap: Record<string, number> = {};
    for (const v of visitors) {
      let src = "";
      const ref = (v.referrer || "").toLowerCase();
      const ua = (v.user_agent || "").toLowerCase();

      if (ref.includes("google.")) src = "Google Поиск";
      else if (ref.includes("yandex.") || ref.includes("ya.ru")) src = "Яндекс Поиск";
      else if (ref.includes("bing.")) src = "Bing Поиск";
      else if (ref.includes("duckduckgo.")) src = "DuckDuckGo";
      else if (ref.includes("t.me") || ref.includes("telegram")) src = "Telegram (Канал/Ссылки)";
      else if (ref.includes("instagram.")) src = "Instagram";
      else if (ref.includes("facebook.") || ref.includes("fb.com")) src = "Facebook";
      else if (ref && !ref.includes("alfacomp.uz") && !ref.includes("localhost")) {
        try {
          src = new URL(v.referrer!).hostname.replace(/^www\./, "");
        } catch {
          src = "Внешний переход";
        }
      } else {
        if (ua.includes("telegram") || ua.includes("tg-")) src = "Telegram WebApp / Бот";
        else if (ua.includes("; wv)") || (ua.includes("version/4.0") && ua.includes("chrome") && ua.includes("mobile"))) src = "In-App браузер";
        else if (ua.includes("android") || ua.includes("iphone") || ua.includes("mobile")) src = "Прямой переход (Смартфоны)";
        else if (ua.includes("windows") || ua.includes("macintosh") || ua.includes("linux")) src = "Прямой переход (ПК)";
        else src = "Прямой переход";
      }
      refMap[src] = (refMap[src] || 0) + 1;
    }

    const items = Object.entries(refMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    const total = visitors.length || 1;
    return { items, total };
  }, [visitors]);

  // Devices calculation
  const devicesData = useMemo(() => {
    let desktop = 0;
    let mobile = 0;
    let tablet = 0;
    visitors.forEach((v) => {
      const ua = (v.user_agent || "").toLowerCase();
      if (ua.includes("ipad") || ua.includes("tablet")) tablet++;
      else if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) mobile++;
      else desktop++;
    });
    const total = visitors.length || 1;
    return [
      { name: "ПК", value: desktop, pct: Math.round((desktop / total) * 100), color: "#0066ff" },
      { name: "Мобильные", value: mobile, pct: Math.round((mobile / total) * 100), color: "#00c853" },
      { name: "Планшеты", value: tablet, pct: Math.round((tablet / total) * 100), color: "#a855f7" },
    ];
  }, [visitors]);

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
    <div className="flex h-screen w-screen overflow-hidden bg-[#060b14] text-white font-sans antialiased select-none">
      {/* Hidden file input for quick product image update */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ══════════════════════════════════════════════════════ */}
      {/* ── 1. LEFT SIDEBAR (DESKTOP & MOBILE DRAWER) ───────── */}
      {/* ══════════════════════════════════════════════════════ */}
      {/* Mobile Backdrop */}
      {mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity"
        />
      )}

      <aside
        className={`fixed md:static top-0 bottom-0 left-0 z-50 w-64 bg-[#080f1e] border-r border-[#142340] flex flex-col justify-between p-4 transition-transform duration-300 md:translate-x-0 ${
          mobileNavOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Logo / Brand Header */}
          <div className="flex items-center justify-between px-2 py-3 mb-6 border-b border-[#142340]/60">
            <div
              onClick={() => { setTab("products"); setMobileNavOpen(false); }}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0052cc] to-[#0088ff] flex items-center justify-center shadow-[0_0_15px_rgba(0,102,255,0.4)] group-hover:scale-105 transition-transform">
                <span className="font-black text-white text-base tracking-tighter">▲</span>
              </div>
              <div>
                <span className="font-extrabold tracking-tight text-base text-white block">ALFACOMP</span>
                <span className="text-[10px] font-mono text-[#0066ff] tracking-widest block -mt-1 font-semibold">
                  CONTROL PANEL
                </span>
              </div>
            </div>
            <button
              onClick={() => setMobileNavOpen(false)}
              className="md:hidden p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => {
                    setTab(id);
                    setMobileNavOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                    active
                      ? "bg-[#0066ff] text-white shadow-[0_4px_16px_rgba(0,102,255,0.35)]"
                      : "text-[#7a8fa6] hover:text-white hover:bg-[#0d1830]"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? "text-white" : "text-[#7a8fa6]"}`} />
                  <span className="truncate">{label}</span>
                  {id === "products" && (
                    <span className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      active ? "bg-white/20 text-white" : "bg-[#142340] text-white/60"
                    }`}>
                      {products.length}
                    </span>
                  )}
                  {id === "telegram" && allTgMessages.length > 0 && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer System Health */}
        <div className="pt-4 border-t border-[#142340]/60 space-y-3">
          <div className="bg-[#0b162c] rounded-xl p-3 border border-[#16274a]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-white/90">Система работает</span>
            </div>
            <div className="text-[10px] font-mono text-[#5a6f8a] mt-1 flex items-center justify-between">
              <span>v1.0.0</span>
              <span className="text-emerald-400 font-bold">ONLINE</span>
            </div>
          </div>

          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-[#7a8fa6] hover:text-white text-xs font-medium transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Вернуться на сайт</span>
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════ */}
      {/* ── 2. MAIN APP CONTENT CONTAINER ──────────────────── */}
      {/* ══════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-[#060b14]">
        {/* ── Top Header Bar ───────────────────────────────── */}
        <header className="h-16 bg-[#080f1e] border-b border-[#142340] px-4 md:px-8 flex items-center justify-between shrink-0 z-40">
          {/* Mobile Hamburger + Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden p-2 rounded-xl bg-[#0d1830] border border-[#16274a] text-white/80 hover:text-white"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Desktop Global Search Bar */}
            <div className="relative hidden md:block w-80 lg:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a6f8a]" />
              <input
                type="text"
                placeholder="Поиск по товарам, бренду, категории или ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0b162c] border border-[#16274a] rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-[#5a6f8a] outline-none focus:border-[#0066ff] transition-all font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* USD Currency Rate Capsule */}
            <div className="hidden sm:flex items-center">
              {editingRate ? (
                <div className="flex items-center gap-1.5 bg-[#0b162c] px-2.5 py-1.5 rounded-xl border border-[#0066ff]">
                  <span className="text-[11px] font-mono text-white/60">1$ =</span>
                  <input
                    type="number"
                    value={rateInputValue}
                    onChange={(e) => setRateInputValue(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter") {
                        const val = parseInt(rateInputValue);
                        if (!isNaN(val) && val > 0) {
                          const ok = await updateExchangeRate(val);
                          if (ok) toast.success(`Курс: 1$ = ${val.toLocaleString()} UZS`);
                        }
                        setEditingRate(false);
                      } else if (e.key === "Escape") setEditingRate(false);
                    }}
                    autoFocus
                    className="w-20 bg-transparent text-xs font-mono font-bold text-[#0066ff] outline-none text-right"
                  />
                  <button
                    onClick={async () => {
                      const val = parseInt(rateInputValue);
                      if (!isNaN(val) && val > 0) {
                        const ok = await updateExchangeRate(val);
                        if (ok) toast.success(`Курс: 1$ = ${val.toLocaleString()} UZS`);
                      }
                      setEditingRate(false);
                    }}
                    className="text-emerald-400"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setEditingRate(false)} className="text-red-400">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setRateInputValue(String(exchangeRate));
                    setEditingRate(true);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#0b162c] border border-[#16274a] hover:border-[#0066ff]/50 rounded-xl text-xs font-mono transition-all group"
                  title="Нажмите чтобы изменить курс USD/UZS"
                >
                  <span className="text-[#5a6f8a]">1$ =</span>
                  <span className="font-bold text-[#0066ff]">{exchangeRate.toLocaleString()} UZS</span>
                  <Pencil className="w-2.5 h-2.5 text-[#5a6f8a] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>

            {/* Quick Refresh Database */}
            <button
              onClick={() => fetchProducts(true)}
              className="w-9 h-9 rounded-xl bg-[#0b162c] border border-[#16274a] hover:border-[#0066ff]/60 flex items-center justify-center text-white/70 hover:text-white transition-all"
              title="Синхронизировать с Supabase"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#0066ff]" : ""}`} />
            </button>

            {/* Notifications Icon */}
            <button
              onClick={() => toast.info("Все системы работают в штатном режиме")}
              className="relative w-9 h-9 rounded-xl bg-[#0b162c] border border-[#16274a] hover:border-[#0066ff]/60 flex items-center justify-center text-white/70 hover:text-white transition-all"
              title="Уведомления"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#0066ff] rounded-full" />
            </button>

            {/* Admin Profile Capsule */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-[#142340]">
              <div className="w-8 h-8 rounded-full bg-[#0066ff] flex items-center justify-center text-white text-xs font-bold shadow-md shadow-[#0066ff]/30">
                A
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-white leading-tight">admin</div>
                <div className="text-[10px] text-[#7a8fa6]">Администратор</div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors ml-1"
                title="Выйти из админки"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* ── Scrollable Body Content ──────────────────────── */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 pb-24 md:pb-8">

          {/* ══════════════════════════════════════════════════ */}
          {/* ── TAB: OVERVIEW (ГЛАВНАЯ) ─────────────────────── */}
          {/* ══════════════════════════════════════════════════ */}
          {tab === "overview" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    <LayoutDashboard className="w-6 h-6 text-[#0066ff]" />
                    <span>Сводная панель управления</span>
                  </h1>
                  <p className="text-xs text-[#7a8fa6] mt-1">
                    Общий обзор каталога, посещаемости сайта и Telegram-бота
                  </p>
                </div>
                <button
                  onClick={() => setTab("products")}
                  className="px-4 py-2 bg-[#0066ff] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#0066ff]/20 flex items-center gap-2"
                >
                  <Package className="w-4 h-4" />
                  <span>Перейти в каталог</span>
                </button>
              </div>

              {/* 4 Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-4 md:p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#7a8fa6]">Всего товаров</span>
                    <div className="p-2 rounded-xl bg-[#0066ff]/15 text-[#3b82f6]">
                      <Package className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl md:text-3xl font-bold font-mono text-white mt-2">
                    {metrics.totalCount}
                  </div>
                  <div className="text-[11px] font-mono text-[#3b82f6] mt-1">+12 за неделю</div>
                </div>

                <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-4 md:p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#7a8fa6]">В наличии</span>
                    <div className="p-2 rounded-xl bg-[#00c853]/15 text-[#00c853]">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl md:text-3xl font-bold font-mono text-[#00c853] mt-2">
                    {metrics.inStockCount}
                  </div>
                  <div className="text-[11px] font-mono text-[#00c853] mt-1">
                    {Math.round((metrics.inStockCount / (metrics.totalCount || 1)) * 100)}%
                  </div>
                </div>

                <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-4 md:p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#7a8fa6]">Визитов сайта</span>
                    <div className="p-2 rounded-xl bg-[#a855f7]/15 text-[#a855f7]">
                      <Globe className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl md:text-3xl font-bold font-mono text-[#a855f7] mt-2">
                    {visitors.length}
                  </div>
                  <div className="text-[11px] font-mono text-[#a855f7] mt-1">{visitorStats.uniqueIps} уникальных IP</div>
                </div>

                <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-4 md:p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#7a8fa6]">Telegram бот</span>
                    <div className="p-2 rounded-xl bg-[#0066ff]/15 text-[#60a5fa]">
                      <Bot className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl md:text-3xl font-bold font-mono text-white mt-2">
                    {tgUsers.length}
                  </div>
                  <div className="text-[11px] font-mono text-emerald-400 mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Активен
                  </div>
                </div>
              </div>

              {/* Quick Jump Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  onClick={() => setTab("products")}
                  className="bg-[#0b1528] border border-[#16274a] hover:border-[#0066ff] rounded-2xl p-5 cursor-pointer transition-all group"
                >
                  <Package className="w-6 h-6 text-[#0066ff] mb-2 group-hover:scale-110 transition-transform" />
                  <h3 className="text-base font-bold text-white">Управление товарами</h3>
                  <p className="text-xs text-[#7a8fa6] mt-1">Редактирование цен, категорий, изображений и наличия</p>
                </div>

                <div
                  onClick={() => setTab("analytics")}
                  className="bg-[#0b1528] border border-[#16274a] hover:border-[#0066ff] rounded-2xl p-5 cursor-pointer transition-all group"
                >
                  <BarChart3 className="w-6 h-6 text-[#00c853] mb-2 group-hover:scale-110 transition-transform" />
                  <h3 className="text-base font-bold text-white">Аналитика витрины</h3>
                  <p className="text-xs text-[#7a8fa6] mt-1">Популярность товаров, просмотры, лайки и распределение</p>
                </div>

                <div
                  onClick={() => setTab("telegram")}
                  className="bg-[#0b1528] border border-[#16274a] hover:border-[#0066ff] rounded-2xl p-5 cursor-pointer transition-all group"
                >
                  <Send className="w-6 h-6 text-[#a855f7] mb-2 group-hover:scale-110 transition-transform" />
                  <h3 className="text-base font-bold text-white">Telegram CRM & Бот</h3>
                  <p className="text-xs text-[#7a8fa6] mt-1">Ответы клиентам, история сообщений, настройки вебхука</p>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════ */}
          {/* ── TAB 1: ТОВАРЫ И КАТАЛОГ ──────────────────────── */}
          {/* ══════════════════════════════════════════════════ */}
          {tab === "products" && (
            <div className="space-y-5">
              {/* Header Title + Action Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0066ff]/20 text-[#0066ff] flex items-center justify-center shadow-lg shadow-[#0066ff]/15">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      Товары и каталог
                    </h1>
                    <div className="text-[11px] font-mono text-[#7a8fa6]">
                      Управление базой данных AlfaComp · {products.length} позиций
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setDrawerProduct(null);
                    setDrawerOpen(true);
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0066ff] hover:bg-[#1a75ff] text-white text-xs sm:text-sm font-bold uppercase tracking-wider transition-all shadow-lg shadow-[#0066ff]/30 active:scale-95 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Добавить товар</span>
                </button>
              </div>

              {/* 4 KPI Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {/* Всего товаров */}
                <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-4 md:p-5 relative overflow-hidden group hover:border-[#0066ff]/50 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#7a8fa6]">Всего товаров</span>
                    <div className="p-2 rounded-xl bg-[#0066ff]/15 text-[#3b82f6]">
                      <Package className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl md:text-3xl font-bold font-mono text-white mt-2">
                    {metrics.totalCount}
                  </div>
                  <div className="text-[11px] font-mono text-[#3b82f6] mt-1">+12 за неделю</div>
                </div>

                {/* В наличии */}
                <div
                  onClick={() => setStockFilter(stockFilter === "in_stock" ? "all" : "in_stock")}
                  className={`bg-[#0b1528] border rounded-2xl p-4 md:p-5 relative overflow-hidden cursor-pointer transition-all ${
                    stockFilter === "in_stock"
                      ? "border-emerald-500 bg-emerald-500/[0.06]"
                      : "border-[#16274a] hover:border-emerald-500/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#7a8fa6]">В наличии</span>
                    <div className="p-2 rounded-xl bg-[#00c853]/15 text-[#00c853]">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl md:text-3xl font-bold font-mono text-[#00c853] mt-2">
                    {metrics.inStockCount}
                  </div>
                  <div className="text-[11px] font-mono text-[#00c853] mt-1">
                    {Math.round((metrics.inStockCount / (metrics.totalCount || 1)) * 100)}%
                  </div>
                </div>

                {/* Не в наличии */}
                <div
                  onClick={() => setStockFilter(stockFilter === "out_of_stock" ? "all" : "out_of_stock")}
                  className={`bg-[#0b1528] border rounded-2xl p-4 md:p-5 relative overflow-hidden cursor-pointer transition-all ${
                    stockFilter === "out_of_stock"
                      ? "border-amber-500 bg-amber-500/[0.06]"
                      : "border-[#16274a] hover:border-amber-500/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#7a8fa6]">Не в наличии</span>
                    <div className="p-2 rounded-xl bg-[#ff9100]/15 text-[#ff9100]">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl md:text-3xl font-bold font-mono text-[#ff9100] mt-2">
                    {metrics.outOfStockCount}
                  </div>
                  <div className="text-[11px] font-mono text-[#ff9100] mt-1">
                    {Math.round((metrics.outOfStockCount / (metrics.totalCount || 1)) * 100)}%
                  </div>
                </div>

                {/* Категорий */}
                <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-4 md:p-5 relative overflow-hidden group hover:border-[#a855f7]/50 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#7a8fa6]">Категорий</span>
                    <div className="p-2 rounded-xl bg-[#7c4dff]/15 text-[#a855f7]">
                      <Layers className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl md:text-3xl font-bold font-mono text-[#a855f7] mt-2">
                    {metrics.categoriesCount}
                  </div>
                  <div className="text-[11px] font-mono text-[#a855f7] mt-1">+2 за неделю</div>
                </div>
              </div>

              {/* Filter and Control Bar Box */}
              <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-4 space-y-3.5 shadow-xl">
                {/* Search & Select Controls Row */}
                <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a6f8a]" />
                    <input
                      placeholder="Поиск по названию, бренду, категории или ID..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full bg-[#070e1b] border border-[#16274a] rounded-xl pl-10 pr-8 py-2.5 outline-none focus:border-[#0066ff] text-xs sm:text-sm text-white transition-all font-sans"
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

                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                    {/* Category Select */}
                    <select
                      value={selectedCategory}
                      onChange={(e) => {
                        setSelectedCategory(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="bg-[#070e1b] border border-[#16274a] rounded-xl px-3 py-2 text-xs font-medium text-white outline-none focus:border-[#0066ff] cursor-pointer"
                    >
                      <option value="all">Все категории</option>
                      {allCategories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    {/* Stock Status Select */}
                    <select
                      value={stockFilter}
                      onChange={(e) => {
                        setStockFilter(e.target.value as any);
                        setCurrentPage(1);
                      }}
                      className="bg-[#070e1b] border border-[#16274a] rounded-xl px-3 py-2 text-xs font-medium text-white outline-none focus:border-[#0066ff] cursor-pointer"
                    >
                      <option value="all">Все статусы</option>
                      <option value="in_stock">В наличии</option>
                      <option value="out_of_stock">Не в наличии</option>
                    </select>

                    {/* Sorting Select */}
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="bg-[#070e1b] border border-[#16274a] rounded-xl px-3 py-2 text-xs font-medium text-white outline-none focus:border-[#0066ff] cursor-pointer"
                    >
                      <option value="priority">По приоритету</option>
                      <option value="price_asc">Цена (дешевле)</option>
                      <option value="price_desc">Цена (дороже)</option>
                      <option value="views">По просмотрам</option>
                      <option value="likes">По лайкам</option>
                      <option value="name">По алфавиту</option>
                    </select>

                    {/* CSV Download Button */}
                    <button
                      onClick={handleExportCSV}
                      className="p-2.5 bg-[#070e1b] border border-[#16274a] hover:border-[#0066ff] text-white/70 hover:text-white rounded-xl transition-all"
                      title="Скачать все товары в CSV"
                    >
                      <Download className="w-4 h-4 text-[#0066ff]" />
                    </button>
                  </div>
                </div>

                {/* Horizontal Category Pills Row */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                  <button
                    onClick={() => {
                      setSelectedCategory("all");
                      setCurrentPage(1);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 ${
                      selectedCategory === "all"
                        ? "bg-[#0066ff] text-white shadow-md shadow-[#0066ff]/25 font-bold"
                        : "bg-[#070e1b] text-[#7a8fa6] border border-[#16274a] hover:text-white"
                    }`}
                  >
                    Все ({products.length})
                  </button>
                  {allCategories.map((c) => {
                    const count = metrics.categoryCounts[c] || 0;
                    const isSel = selectedCategory === c;
                    return (
                      <button
                        key={c}
                        onClick={() => {
                          setSelectedCategory(c);
                          setCurrentPage(1);
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 whitespace-nowrap ${
                          isSel
                            ? "bg-[#0066ff] text-white shadow-md shadow-[#0066ff]/25 font-bold"
                            : "bg-[#070e1b] text-[#7a8fa6] border border-[#16274a] hover:text-white"
                        }`}
                      >
                        {c} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── MOBILE PRODUCT CARDS (Shown on screens < md) ── */}
              <div className="md:hidden space-y-3">
                {loading && (
                  <div className="text-center py-12 text-[#7a8fa6] font-mono text-xs">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0066ff]" />
                    Загрузка каталога из Supabase...
                  </div>
                )}
                {!loading && filteredProducts.length === 0 && (
                  <div className="text-center py-12 text-[#7a8fa6] font-mono text-xs">
                    Товары по вашему запросу не найдены
                  </div>
                )}
                {paginatedProducts.map((p) => {
                  const { priceUSD, priceUZS } = resolveProductPrices(p.price, exchangeRate || 14000);
                  return (
                    <div
                      key={p.id}
                      className="bg-[#0b1528] rounded-2xl border border-[#16274a] p-3.5 flex gap-3 active:bg-[#0e1c35] transition-colors"
                    >
                      {/* Photo Thumbnail */}
                      <div
                        onClick={() => handleImageClick(p.id)}
                        className="relative w-18 h-18 rounded-xl overflow-hidden border border-[#16274a] bg-[#070e1b] cursor-pointer shrink-0"
                      >
                        {uploadingImageId === p.id ? (
                          <div className="w-full h-full flex items-center justify-center bg-black/80">
                            <div className="w-4 h-4 border-2 border-[#0066ff] border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/72?text=HW"; }}
                          />
                        )}
                      </div>

                      {/* Product Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-bold text-white text-sm truncate">{p.name}</div>
                            <div className="text-[10px] font-mono text-[#7a8fa6] mt-0.5">
                              ID #{p.id} · <span className="text-[#3b82f6] uppercase">{p.brand || "AlfaComp"}</span>
                            </div>
                          </div>
                          {/* Stock Pill Badge */}
                          <button
                            onClick={() => handleToggleStock(p.id, p.in_stock)}
                            className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                              p.in_stock
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                            }`}
                          >
                            {p.in_stock ? "● В наличии" : "○ Снят"}
                          </button>
                        </div>

                        {/* Price Row */}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#142340]">
                          <button
                            onClick={() => startEditPrice(p)}
                            className="text-left font-mono"
                          >
                            <span className="text-white font-extrabold text-sm">$ {priceUSD}</span>
                            <div className="text-[10px] text-[#7a8fa6]">
                              ≈ {formatPrice(priceUZS)} сум
                            </div>
                          </button>

                          {/* Quick Actions */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { setDrawerProduct(p); setDrawerOpen(true); }}
                              className="p-1.5 rounded-lg bg-[#070e1b] border border-[#16274a] text-white/70 hover:text-white"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDuplicateProduct(p)}
                              className="p-1.5 rounded-lg bg-[#070e1b] border border-[#16274a] text-white/70 hover:text-white"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id, p.name)}
                              className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── DESKTOP PRODUCTS TABLE (Hidden on mobile) ──── */}
              <div className="hidden md:block bg-[#0b1528] rounded-2xl border border-[#16274a] overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#080f1e] text-[10px] uppercase font-mono tracking-wider text-[#7a8fa6] border-b border-[#16274a]">
                      <th className="p-4 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            paginatedProducts.length > 0 &&
                            paginatedProducts.every((p) => selectedProductIds.includes(p.id))
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              const ids = paginatedProducts.map((p) => p.id);
                              setSelectedProductIds((prev) => [...new Set([...prev, ...ids])]);
                            } else {
                              const ids = new Set(paginatedProducts.map((p) => p.id));
                              setSelectedProductIds((prev) => prev.filter((id) => !ids.has(id)));
                            }
                          }}
                          className="rounded border-[#16274a] text-[#0066ff] focus:ring-0 cursor-pointer"
                        />
                      </th>
                      <th className="p-4 w-12 text-center">#</th>
                      <th className="p-4 w-16">Фото</th>
                      <th className="p-4">Товар</th>
                      <th className="p-4">Категория</th>
                      <th className="p-4">Наличие</th>
                      <th className="p-4 text-right">Цена (USD)</th>
                      <th className="p-4 text-center">Рейтинг</th>
                      <th className="p-4 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#142340]">
                    {loading && (
                      <tr>
                        <td colSpan={9} className="p-12 text-center text-[#7a8fa6] font-mono text-xs">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0066ff]" />
                          Синхронизация с базой данных Supabase...
                        </td>
                      </tr>
                    )}
                    {!loading && filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan={9} className="p-12 text-center text-[#7a8fa6] font-mono text-xs">
                          По вашему запросу ничего не найдено
                        </td>
                      </tr>
                    )}
                    {paginatedProducts.map((p) => {
                      const isSelected = selectedProductIds.includes(p.id);
                      const { priceUSD, priceUZS } = resolveProductPrices(p.price, exchangeRate || 14000);
                      return (
                        <tr
                          key={p.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, p.id)}
                          onDragOver={(e) => handleDragOver(e, p.id)}
                          onDrop={(e) => handleDrop(e, p.id)}
                          onDragEnd={handleDragEnd}
                          className={`transition-colors group hover:bg-[#0d1a33] ${
                            isSelected ? "bg-[#0066ff]/10" : ""
                          } ${draggedId === p.id ? "opacity-30" : ""} ${
                            dragOverId === p.id ? "border-l-4 border-[#0066ff] bg-[#0066ff]/15" : ""
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedProductIds((prev) => [...prev, p.id]);
                                else setSelectedProductIds((prev) => prev.filter((id) => id !== p.id));
                              }}
                              className="rounded border-[#16274a] text-[#0066ff] focus:ring-0 cursor-pointer"
                            />
                          </td>

                          {/* Priority index */}
                          <td className="p-4 text-center font-mono text-xs text-[#5a6f8a] group-hover:text-white/80 cursor-grab">
                            {p.priority ?? "—"}
                          </td>

                          {/* Photo Thumbnail */}
                          <td className="p-4">
                            <div
                              onClick={() => handleImageClick(p.id)}
                              className="relative w-12 h-12 rounded-xl overflow-hidden border border-[#16274a] bg-[#070e1b] cursor-pointer group/img shrink-0"
                              title="Нажмите чтобы заменить фото"
                            >
                              {uploadingImageId === p.id ? (
                                <div className="w-full h-full flex items-center justify-center bg-black/80">
                                  <div className="w-4 h-4 border-2 border-[#0066ff] border-t-transparent rounded-full animate-spin" />
                                </div>
                              ) : (
                                <>
                                  <img
                                    src={p.image}
                                    alt={p.name}
                                    className="w-full h-full object-cover group-hover/img:brightness-50 transition-all"
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
                          </td>

                          {/* Name & ID */}
                          <td className="p-4">
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
                                    className="w-56 bg-[#070e1b] border border-[#0066ff] rounded px-2 py-1 text-xs font-bold text-white outline-none"
                                  />
                                  <button
                                    onClick={() => saveEditName(p.id)}
                                    className="p-1 rounded bg-emerald-500/20 text-emerald-400"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={cancelEditName}
                                    className="p-1 rounded bg-red-500/20 text-red-400"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div
                                  onClick={() => startEditName(p)}
                                  className="font-bold text-white text-xs sm:text-sm truncate max-w-[260px] cursor-pointer hover:text-[#3b82f6] transition-colors flex items-center gap-1.5 group/title"
                                  title="Нажмите чтобы изменить название"
                                >
                                  <span>{p.name}</span>
                                  <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/title:opacity-100 text-[#5a6f8a]" />
                                </div>
                              )}
                              <div className="text-[10px] font-mono text-[#7a8fa6] mt-0.5 flex items-center gap-2">
                                <span>ID #{p.id}</span>
                                <span>·</span>
                                <span>Бренд: <strong className="text-white/80">{p.brand || "AlfaComp"}</strong></span>
                              </div>
                            </div>
                          </td>

                          {/* Category Pill */}
                          <td className="p-4">
                            <span className="px-3 py-1 rounded-full bg-[#0a1733] border border-[#1b3668] text-[#4ea1ff] text-xs font-medium whitespace-nowrap">
                              {p.category}
                            </span>
                          </td>

                          {/* Stock Status Pill Toggle */}
                          <td className="p-4">
                            <button
                              onClick={() => handleToggleStock(p.id, p.in_stock)}
                              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                                p.in_stock
                                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/30"
                                  : "bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-emerald-500/15 hover:text-emerald-400 hover:border-emerald-500/30"
                              }`}
                              title={p.in_stock ? "Нажмите чтобы снять с продажи" : "Нажмите чтобы перевести в наличие"}
                            >
                              <span>{p.in_stock ? "● В наличии" : "○ Не в наличии"}</span>
                            </button>
                          </td>

                          {/* Price USD Primary + UZS Subtitle */}
                          <td className="p-4 text-right font-mono">
                            {editingPriceId === p.id ? (
                              <div className="flex flex-col items-end gap-1" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="text-[#0066ff] font-bold text-sm">$</span>
                                  <input
                                    type="number"
                                    step="any"
                                    value={editingPriceValue}
                                    onChange={(e) => setEditingPriceValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") saveEditPrice(p.id);
                                      if (e.key === "Escape") cancelEditPrice();
                                    }}
                                    autoFocus
                                    className="w-24 bg-[#070e1b] border border-[#0066ff] rounded px-2 py-1 text-sm font-mono font-bold text-white text-right outline-none"
                                  />
                                  <button
                                    onClick={() => saveEditPrice(p.id)}
                                    className="p-1 rounded bg-emerald-500/20 text-emerald-400"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={cancelEditPrice}
                                    className="p-1 rounded bg-red-500/20 text-red-400"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <button
                                  onClick={() => startEditPrice(p)}
                                  className="font-bold text-sm text-white hover:text-[#3b82f6] transition-colors flex items-center justify-end gap-1 ml-auto group/price"
                                  title="Нажмите чтобы изменить цену"
                                >
                                  <span>$ {priceUSD}</span>
                                  <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/price:opacity-100 text-[#5a6f8a]" />
                                </button>
                                <div className="text-[11px] text-[#7a8fa6] mt-0.5 font-mono">
                                  ~ {formatPrice(priceUZS)} сум
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Telemetry (Rating / Views / Likes) */}
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2.5 text-xs font-mono text-[#7a8fa6]">
                              <span className="flex items-center gap-1 text-amber-400 font-semibold">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                {(p.rating ?? 5.0).toFixed(1)}
                                <span className="text-[#5a6f8a] text-[10px]">({p.rating_count ?? 0})</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3 text-[#5a6f8a]" /> {p.views || 0}
                              </span>
                              <span className="flex items-center gap-1 text-rose-400/80">
                                <Heart className="w-3 h-3" /> {p.likes || 0}
                              </span>
                            </div>
                          </td>

                          {/* Row Actions */}
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setDrawerProduct(p);
                                  setDrawerOpen(true);
                                }}
                                className="p-2 rounded-xl bg-[#070e1b] border border-[#16274a] hover:border-[#0066ff] text-white/70 hover:text-white transition-all"
                                title="Редактировать товар"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDuplicateProduct(p)}
                                className="p-2 rounded-xl bg-[#070e1b] border border-[#16274a] hover:border-[#0066ff] text-white/70 hover:text-white transition-all"
                                title="Дублировать товар"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.id, p.name)}
                                className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                                title="Удалить товар"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Table Footer with Pagination */}
                <div className="bg-[#080f1e] px-5 py-3.5 border-t border-[#16274a] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-[#7a8fa6]">
                  <div>
                    Показано{" "}
                    <strong className="text-white">
                      {filteredProducts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}-
                      {Math.min(currentPage * pageSize, filteredProducts.length)}
                    </strong>{" "}
                    из <strong className="text-white">{filteredProducts.length}</strong>
                  </div>

                  {/* Pagination Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="p-1.5 rounded-lg bg-[#0b1528] border border-[#16274a] hover:border-[#0066ff] disabled:opacity-30 disabled:hover:border-[#16274a] text-white"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum = i + 1;
                      if (totalPages > 5 && currentPage > 3) {
                        pageNum = currentPage - 2 + i;
                        if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                      }
                      const isActive = currentPage === pageNum;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-7 h-7 rounded-lg font-bold text-xs transition-all ${
                            isActive
                              ? "bg-[#0066ff] text-white shadow-md shadow-[#0066ff]/30"
                              : "bg-[#0b1528] border border-[#16274a] hover:border-[#0066ff] text-white/70 hover:text-white"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <span className="px-1 text-[#5a6f8a]">...</span>
                    )}
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className="p-1.5 rounded-lg bg-[#0b1528] border border-[#16274a] hover:border-[#0066ff] disabled:opacity-30 disabled:hover:border-[#16274a] text-white"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════ */}
          {/* ── TAB 2: АНАЛИТИКА ВИТРИНЫ ─────────────────────── */}
          {/* ══════════════════════════════════════════════════ */}
          {tab === "analytics" && (() => {
            const CHART_COLORS = ["#0066ff", "#ff8c42", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];
            const categoryChartData = Object.entries(metrics.categoryCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([name, value]) => ({ name, value }));

            const stockPieData = [
              { name: "В наличии", value: metrics.inStockCount, color: "#10b981" },
              { name: "Нет в наличии", value: metrics.outOfStockCount, color: "#f59e0b" },
            ].filter((d) => d.value > 0);

            return (
              <div className="space-y-6">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-[#0066ff]" />
                    <span>Аналитика витрины</span>
                  </h1>
                  <p className="text-xs text-[#7a8fa6] mt-1">Графики, статистика, популярность товаров</p>
                </div>

                {/* KPI Cards Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-5">
                    <div className="text-2xl sm:text-3xl font-mono font-bold text-white">
                      {metrics.totalViews.toLocaleString()}
                    </div>
                    <div className="text-[10px] font-mono uppercase text-[#7a8fa6] tracking-wider mt-1">
                      Просмотры витрины
                    </div>
                  </div>

                  <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-5">
                    <div className="text-2xl sm:text-3xl font-mono font-bold text-[#0066ff]">
                      {visitorStats.uniqueIps}
                    </div>
                    <div className="text-[10px] font-mono uppercase text-[#7a8fa6] tracking-wider mt-1">
                      Уникальные IP
                    </div>
                  </div>

                  <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-5">
                    <div className="text-2xl sm:text-3xl font-mono font-bold text-emerald-400">
                      {visitorStats.todayCount}
                    </div>
                    <div className="text-[10px] font-mono uppercase text-[#7a8fa6] tracking-wider mt-1">
                      Сегодня визитов
                    </div>
                  </div>

                  <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-5">
                    <div className="text-2xl sm:text-3xl font-mono font-bold text-rose-400">
                      {metrics.totalLikes}
                    </div>
                    <div className="text-[10px] font-mono uppercase text-[#7a8fa6] tracking-wider mt-1">
                      Лайков покупателей
                    </div>
                  </div>
                </div>

                {/* Category Distribution Bar Chart */}
                <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-[#0066ff]" />
                      <h3 className="font-mono uppercase tracking-wider text-xs text-white font-bold">
                        Товары по категориям
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono text-[#7a8fa6]">Всего {metrics.categoriesCount} категорий</span>
                  </div>

                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "#7a8fa6", fontSize: 10, fontFamily: "monospace" }}
                        angle={-30}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis tick={{ fill: "#7a8fa6", fontSize: 10, fontFamily: "monospace" }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#070e1b",
                          border: "1px solid #16274a",
                          borderRadius: 12,
                          color: "#fff",
                        }}
                      />
                      <Bar dataKey="value" name="Товаров" radius={[6, 6, 0, 0]}>
                        {categoryChartData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Top Products & Traffic Sources Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Top-6 Products by Views */}
                  <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-4 h-4 text-[#0066ff]" />
                      <h3 className="font-mono uppercase tracking-wider text-xs text-white font-bold">
                        Топ-6 товаров по просмотрам
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {metrics.topByViews.slice(0, 6).map((p, idx) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-3 p-2.5 rounded-xl bg-[#070e1b] border border-[#16274a]"
                        >
                          <div className="w-6 text-center font-mono font-bold text-xs text-[#0066ff]">
                            #{idx + 1}
                          </div>
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-10 h-10 rounded-lg object-cover bg-black"
                            onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/40"; }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-white text-xs truncate">{p.name}</div>
                            <div className="text-[10px] text-[#7a8fa6] font-mono mt-0.5">{p.category}</div>
                          </div>
                          <div className="text-right font-mono text-xs">
                            <span className="text-[#0066ff] font-bold">{p.views || 0}</span>
                            <div className="text-[10px] text-[#7a8fa6]">просмотров</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Traffic Sources Donut Chart */}
                  <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-emerald-400" />
                        <h3 className="font-mono uppercase tracking-wider text-xs text-white font-bold">
                          Источники трафика
                        </h3>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-400">{visitors.length} визитов</span>
                    </div>

                    <div className="space-y-2.5">
                      {trafficData.items.slice(0, 5).map(({ name, value }, i) => {
                        const pct = Math.round((value / trafficData.total) * 100);
                        const color = CHART_COLORS[i % CHART_COLORS.length];
                        return (
                          <div key={name} className="p-2.5 rounded-xl bg-[#070e1b] border border-[#16274a]">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-white font-medium flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                                {name}
                              </span>
                              <span className="font-mono text-[#7a8fa6]">
                                <strong className="text-white">{value}</strong> ({pct}%)
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-[#142340] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${pct}%`, background: color }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ══════════════════════════════════════════════════ */}
          {/* ── TAB 3: ОТКУДА ИДУТ ПОЛЬЗОВАТЕЛИ (ТРАФИК & IP) ─ */}
          {/* ══════════════════════════════════════════════════ */}
          {tab === "stats" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <Compass className="w-6 h-6 text-[#0066ff]" />
                  <span>Откуда идут пользователи и трафик</span>
                </h1>
                <p className="text-xs text-[#7a8fa6] mt-1">Страны, регионы, города, провайдеры и устройства</p>
              </div>

              {/* KPI Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-5">
                  <div className="text-[10px] font-mono uppercase text-[#7a8fa6] tracking-wider">Всего визитов</div>
                  <div className="text-2xl font-mono font-bold text-white mt-1">{visitors.length}</div>
                </div>

                <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-5">
                  <div className="text-[10px] font-mono uppercase text-[#7a8fa6] tracking-wider">Уникальных IP</div>
                  <div className="text-2xl font-mono font-bold text-[#0066ff] mt-1">{visitorStats.uniqueIps}</div>
                </div>

                <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-5">
                  <div className="text-[10px] font-mono uppercase text-[#7a8fa6] tracking-wider">Сегодня</div>
                  <div className="text-2xl font-mono font-bold text-emerald-400 mt-1">{visitorStats.todayCount}</div>
                </div>

                <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-5">
                  <div className="text-[10px] font-mono uppercase text-[#7a8fa6] tracking-wider">Стран мира</div>
                  <div className="text-2xl font-mono font-bold text-[#a855f7] mt-1">{visitorStats.topCountries.length}</div>
                </div>
              </div>

              {/* Geography and Devices Row */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Geography Breakdown */}
                <div className="lg:col-span-8 bg-[#0b1528] border border-[#16274a] rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-mono uppercase tracking-wider text-xs text-white font-bold flex items-center gap-2">
                      <Globe className="w-4 h-4 text-[#0066ff]" />
                      <span>География пользователей</span>
                    </h3>
                    <span className="text-[11px] font-mono text-[#7a8fa6]">Топ регионы</span>
                  </div>

                  <div className="space-y-3">
                    {visitorStats.topCountries.length === 0 ? (
                      <div className="text-center py-8 text-[#7a8fa6] text-xs font-mono">
                        Телеметрия визитов загружается...
                      </div>
                    ) : (
                      visitorStats.topCountries.map(([name, count]) => {
                        const pct = Math.round((count / (visitors.length || 1)) * 100);
                        return (
                          <div key={name} className="space-y-1.5 p-3 rounded-xl bg-[#070e1b] border border-[#16274a]">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-white flex items-center gap-2">
                                <span>🌐</span>
                                <span>{name}</span>
                              </span>
                              <span className="font-mono text-[#7a8fa6]">
                                <strong className="text-white">{count}</strong> ({pct}%)
                              </span>
                            </div>
                            <div className="h-2 w-full bg-[#142340] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#0066ff] to-[#00b0ff] rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Devices Breakdown */}
                <div className="lg:col-span-4 bg-[#0b1528] border border-[#16274a] rounded-2xl p-6">
                  <h3 className="font-mono uppercase tracking-wider text-xs text-white font-bold mb-4 flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-[#00c853]" />
                    <span>Устройства</span>
                  </h3>

                  <div className="space-y-3">
                    {devicesData.map((d) => (
                      <div key={d.name} className="p-3.5 rounded-xl bg-[#070e1b] border border-[#16274a]">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-semibold text-white flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                            {d.name}
                          </span>
                          <span className="font-mono font-bold" style={{ color: d.color }}>
                            {d.pct}%
                          </span>
                        </div>
                        <div className="h-2 w-full bg-[#142340] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${d.pct}%`, background: d.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* IP Addresses and Telemetry Table */}
              <div className="bg-[#0b1528] rounded-2xl border border-[#16274a] overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-[#16274a] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>IP-адреса и регионы</span>
                    </h3>
                    <span className="text-[11px] font-mono text-[#7a8fa6]">
                      Все IP, страны, города, провайдеры
                    </span>
                  </div>

                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5a6f8a]" />
                    <input
                      placeholder="Поиск по IP, стране, городу..."
                      value={visitorSearch}
                      onChange={(e) => setVisitorSearch(e.target.value)}
                      className="w-full bg-[#070e1b] border border-[#16274a] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#5a6f8a] outline-none focus:border-[#0066ff] font-mono"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-[#080f1e] text-[10px] uppercase font-mono tracking-wider text-[#7a8fa6] border-b border-[#16274a]">
                        <th className="p-4">IP Адрес</th>
                        <th className="p-4">Страна</th>
                        <th className="p-4">Регион / Город</th>
                        <th className="p-4 hidden sm:table-cell">Страница</th>
                        <th className="p-4 text-right">Время</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#142340]">
                      {visitorsLoading && (
                        <tr>
                          <td colSpan={5} className="p-10 text-center text-[#7a8fa6] font-mono text-xs">
                            Загрузка телеметрии...
                          </td>
                        </tr>
                      )}
                      {!visitorsLoading && visitorStats.filtered.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-10 text-center text-[#7a8fa6] font-mono text-xs">
                            Нет зарегистрированных посещений
                          </td>
                        </tr>
                      )}
                      {visitorStats.filtered.slice(0, 15).map((v) => (
                        <tr key={v.id} className="hover:bg-[#0d1a33] transition-colors">
                          <td className="p-4 font-mono text-xs font-bold text-[#0066ff]">{v.ip}</td>
                          <td className="p-4 text-xs font-semibold text-white">
                            {flagEmoji(v.country_code)} {v.country || "Неизвестно"}
                          </td>
                          <td className="p-4 text-xs text-[#7a8fa6] font-mono">
                            {[v.city, v.region].filter(Boolean).join(", ") || "—"}
                          </td>
                          <td className="p-4 text-xs text-[#7a8fa6] font-mono hidden sm:table-cell">
                            {v.path || "/"}
                          </td>
                          <td className="p-4 text-right text-xs font-mono text-[#7a8fa6] whitespace-nowrap">
                            {new Date(v.created_at).toLocaleString("ru-RU")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════ */}
          {/* ── TAB 4: TELEGRAM БОТ & CRM ────────────────────── */}
          {/* ══════════════════════════════════════════════════ */}
          {tab === "telegram" && (
            <div className="space-y-6">
              {/* Telegram Bot Top Status Card */}
              <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0066ff] to-[#00b0ff] flex items-center justify-center text-white shadow-lg shadow-[#0066ff]/30">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-extrabold text-white">
                        {botInfo ? `@${botInfo.username}` : "Telegram Bot"}
                      </h2>
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Активен
                      </span>
                    </div>
                    <div className="text-xs text-[#7a8fa6] font-mono mt-0.5">
                      Управление, настройки, статистика · Auto-sync 30s
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      syncTgMessages();
                      getBotInfo().then(setBotInfo);
                    }}
                    disabled={tgSyncing}
                    className="flex items-center gap-2 px-4 py-2 bg-[#070e1b] border border-[#16274a] hover:border-[#0066ff] text-white text-xs font-bold rounded-xl transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${tgSyncing ? "animate-spin text-[#0066ff]" : ""}`} />
                    <span>Обновить данные</span>
                  </button>
                  <a
                    href={botInfo ? `https://t.me/${botInfo.username}` : "https://t.me"}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-[#0066ff] hover:bg-[#1a75ff] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#0066ff]/20 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Открыть бота</span>
                  </a>
                </div>
              </div>

              {/* Bot KPI Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-5">
                  <div className="text-xs font-medium text-[#7a8fa6]">Пользователей</div>
                  <div className="text-2xl sm:text-3xl font-mono font-bold text-white mt-1">
                    {tgUsers.length}
                  </div>
                  <div className="text-[11px] font-mono text-[#0066ff] mt-0.5">Клиенты в базе</div>
                </div>

                <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-5">
                  <div className="text-xs font-medium text-[#7a8fa6]">Сообщений</div>
                  <div className="text-2xl sm:text-3xl font-mono font-bold text-white mt-1">
                    {allTgMessages.length}
                  </div>
                  <div className="text-[11px] font-mono text-emerald-400 mt-0.5">Сохранено в журнале</div>
                </div>

                <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-5">
                  <div className="text-xs font-medium text-[#7a8fa6]">Команд бота</div>
                  <div className="text-2xl sm:text-3xl font-mono font-bold text-white mt-1">
                    18
                  </div>
                  <div className="text-[11px] font-mono text-[#a855f7] mt-0.5">+5% активности</div>
                </div>
              </div>

              {/* Bot Commands & Webhook Status Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Bot Commands Switches Panel */}
                <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-6">
                  <h3 className="font-mono uppercase tracking-wider text-xs text-white font-bold mb-4">
                    Команды бота
                  </h3>
                  <div className="space-y-3">
                    {[
                      { cmd: "/start", desc: "Запуск бота и приветствие" },
                      { cmd: "/catalog", desc: "Каталог товаров и витрина" },
                      { cmd: "/info", desc: "Информация и гарантия" },
                      { cmd: "/support", desc: "Связь с оператором" },
                      { cmd: "/order", desc: "Оформить быстрый заказ" },
                    ].map(({ cmd, desc }) => {
                      const enabled = botCommands[cmd] ?? true;
                      return (
                        <div
                          key={cmd}
                          className="flex items-center justify-between p-3 rounded-xl bg-[#070e1b] border border-[#16274a]"
                        >
                          <div>
                            <span className="font-mono font-bold text-xs text-[#0066ff]">{cmd}</span>
                            <div className="text-[11px] text-[#7a8fa6]">{desc}</div>
                          </div>
                          <button
                            onClick={() => {
                              setBotCommands((prev) => ({ ...prev, [cmd]: !enabled }));
                              toast.success(`Команда ${cmd} ${!enabled ? "включена" : "отключена"}`);
                            }}
                            className={`p-1 rounded-lg transition-colors ${
                              enabled ? "text-[#0066ff]" : "text-white/30"
                            }`}
                          >
                            {enabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Webhook Status Card & Admin Chat IDs */}
                <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-6 space-y-4">
                  <h3 className="font-mono uppercase tracking-wider text-xs text-white font-bold">
                    Webhook & Уведомления
                  </h3>

                  <div className="p-4 rounded-xl bg-[#070e1b] border border-[#16274a] space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#7a8fa6]">Статус:</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Подключен
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#7a8fa6]">URL:</span>
                      <span className="text-white/80 truncate max-w-[220px]">
                        https://api.alfacomp.uz/webhook
                      </span>
                    </div>
                  </div>

                  {/* Admin Chat IDs */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-white">ID чатов администраторов:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {botAdminChats.map((c) => (
                        <div key={c} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#070e1b] border border-[#16274a] text-xs font-mono">
                          <span className="text-[#0066ff]">{c}</span>
                          <button
                            onClick={() => {
                              const updated = botAdminChats.filter((x) => x !== c);
                              setBotAdminChats(updated);
                              setAdminChatIds(updated);
                              toast.success("Чат удален");
                            }}
                            className="text-red-400 hover:text-red-300 ml-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="text"
                        placeholder="+ Добавить Chat ID"
                        value={newChatId}
                        onChange={(e) => setNewChatId(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newChatId.trim()) {
                            const updated = [...new Set([...botAdminChats, newChatId.trim()])];
                            setBotAdminChats(updated);
                            setAdminChatIds(updated);
                            setNewChatId("");
                            toast.success("Чат добавлен");
                          }
                        }}
                        className="bg-[#070e1b] border border-[#16274a] rounded-xl px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-[#0066ff] flex-1"
                      />
                      <button
                        onClick={() => {
                          if (newChatId.trim()) {
                            const updated = [...new Set([...botAdminChats, newChatId.trim()])];
                            setBotAdminChats(updated);
                            setAdminChatIds(updated);
                            setNewChatId("");
                            toast.success("Чат добавлен");
                          }
                        }}
                        className="px-3 py-1.5 bg-[#0066ff] text-white text-xs font-bold rounded-xl"
                      >
                        Добавить
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Telegram CRM Interactive Live Chat */}
              <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row" style={{ minHeight: 520, height: "65vh" }}>
                {/* Users List (Left Column) */}
                <div className="w-full md:w-80 border-r border-[#16274a] flex flex-col bg-[#070e1b]">
                  <div className="p-3 border-b border-[#16274a]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5a6f8a]" />
                      <input
                        type="text"
                        placeholder="Поиск клиентов..."
                        value={tgUserSearch}
                        onChange={(e) => setTgUserSearch(e.target.value)}
                        className="w-full bg-[#0b1528] border border-[#16274a] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#5a6f8a] outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {tgUsers.length === 0 ? (
                      <div className="p-8 text-center text-[#7a8fa6] text-xs font-mono">
                        Нет сообщений.<br />Нажмите «Обновить данные».
                      </div>
                    ) : (
                      tgUsers
                        .filter((u) => {
                          const q = tgUserSearch.toLowerCase();
                          return (
                            !q ||
                            u.first_name.toLowerCase().includes(q) ||
                            (u.username || "").toLowerCase().includes(q) ||
                            u.chat_id.includes(q)
                          );
                        })
                        .map((u) => {
                          const isSelected = selectedUserId === u.chat_id;
                          return (
                            <button
                              key={u.chat_id}
                              onClick={() => setSelectedUserId(u.chat_id)}
                              className={`w-full text-left p-3 border-b border-[#142340] flex items-start gap-3 transition-colors ${
                                isSelected ? "bg-[#0066ff]/20 border-l-4 border-l-[#0066ff]" : "hover:bg-[#0d1a33]"
                              }`}
                            >
                              <div className="w-9 h-9 rounded-full bg-[#0066ff] flex items-center justify-center font-bold text-xs text-white shrink-0">
                                {u.first_name?.[0]?.toUpperCase() || "U"}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-white text-xs truncate">{u.first_name}</span>
                                  <span className="text-[10px] text-[#7a8fa6] font-mono">
                                    {new Date(u.last_active * 1000).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}
                                  </span>
                                </div>
                                {u.username && (
                                  <div className="text-[10px] text-[#0066ff] font-mono">@{u.username}</div>
                                )}
                                <div className="text-[11px] text-[#7a8fa6] truncate mt-0.5">{u.last_message || "—"}</div>
                              </div>
                            </button>
                          );
                        })
                    )}
                  </div>
                </div>

                {/* Chat Messages Panel (Right Column) */}
                <div className="flex-1 flex flex-col bg-[#0b1528]">
                  {!selectedUserId ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-[#7a8fa6] gap-3">
                      <MessageSquare className="w-10 h-10 opacity-30" />
                      <span className="text-xs font-mono">Выберите чат слева для переписки</span>
                    </div>
                  ) : (() => {
                    const selUser = tgUsers.find((u) => u.chat_id === selectedUserId);
                    const chatMsgs = allTgMessages.filter((m) => m.chat_id === selectedUserId);
                    return (
                      <>
                        <div className="px-5 py-3 border-b border-[#16274a] bg-[#070e1b] flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#0066ff] flex items-center justify-center text-xs font-bold text-white">
                              {selUser?.first_name?.[0]?.toUpperCase() || "U"}
                            </div>
                            <div>
                              <div className="font-bold text-xs text-white flex items-center gap-2">
                                {selUser?.first_name}
                                {selUser?.username && <span className="text-[#0066ff] font-mono">@{selUser.username}</span>}
                              </div>
                              <div className="text-[10px] text-[#7a8fa6] font-mono">Chat ID: {selectedUserId}</div>
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                          {chatMsgs.map((msg) => {
                            const isBot = !msg.from_user;
                            return (
                              <div key={`${msg.chat_id}_${msg.message_id}`} className={`flex ${isBot ? "justify-end" : "justify-start"}`}>
                                <div
                                  className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 ${
                                    isBot
                                      ? "bg-[#0066ff] text-white rounded-br-sm"
                                      : "bg-[#070e1b] border border-[#16274a] text-white/90 rounded-bl-sm"
                                  }`}
                                >
                                  <div className="text-[10px] font-bold mb-1 opacity-70">
                                    {isBot ? "🤖 AlfaComp" : msg.sender_name}
                                  </div>
                                  <p className="text-xs whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                  <div className="text-[9px] opacity-50 text-right mt-1 font-mono">
                                    {new Date(msg.date * 1000).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          <div ref={chatBottomRef} />
                        </div>

                        <div className="p-3 border-t border-[#16274a] bg-[#070e1b] flex gap-2">
                          <input
                            type="text"
                            placeholder="Ответить клиенту от имени бота..."
                            value={tgChatInput}
                            onChange={(e) => setTgChatInput(e.target.value)}
                            onKeyDown={async (e) => {
                              if (e.key === "Enter" && tgChatInput.trim() && !tgSending) {
                                setTgSending(true);
                                const res = await sendTelegramMessageWithDetails(selectedUserId, tgChatInput.trim());
                                if (res.success && res.message) {
                                  const updated = [...allTgMessages, res.message];
                                  setAllTgMessages(updated);
                                  setTgUsers(extractTelegramUsers(updated));
                                  setTgChatInput("");
                                  toast.success("Отправлено!");
                                } else {
                                  toast.error(res.error || "Ошибка отправки");
                                }
                                setTgSending(false);
                              }
                            }}
                            className="flex-1 bg-[#0b1528] border border-[#16274a] rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#0066ff]"
                          />
                          <button
                            onClick={async () => {
                              if (!tgChatInput.trim() || tgSending) return;
                              setTgSending(true);
                              const res = await sendTelegramMessageWithDetails(selectedUserId, tgChatInput.trim());
                              if (res.success && res.message) {
                                const updated = [...allTgMessages, res.message];
                                setAllTgMessages(updated);
                                setTgUsers(extractTelegramUsers(updated));
                                setTgChatInput("");
                                toast.success("Отправлено!");
                              } else {
                                toast.error(res.error || "Ошибка отправки");
                              }
                              setTgSending(false);
                            }}
                            disabled={tgSending || !tgChatInput.trim()}
                            className="px-4 py-2 bg-[#0066ff] hover:bg-[#1a75ff] disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════ */}
          {/* ── TAB 5: ПОЛЬЗОВАТЕЛИ ──────────────────────────── */}
          {/* ══════════════════════════════════════════════════ */}
          {tab === "users" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <Users className="w-6 h-6 text-[#0066ff]" />
                  <span>Пользователи и операторы</span>
                </h1>
                <p className="text-xs text-[#7a8fa6] mt-1">Клиенты бота и права доступа администратора</p>
              </div>

              <div className="bg-[#0b1528] rounded-2xl border border-[#16274a] p-6 space-y-4">
                <h3 className="text-sm font-bold text-white">Список покупателей из Telegram ({tgUsers.length})</h3>
                <div className="divide-y divide-[#16274a]">
                  {tgUsers.map((u) => (
                    <div key={u.chat_id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#0066ff] flex items-center justify-center font-bold text-xs text-white">
                          {u.first_name?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-white">{u.first_name}</div>
                          <div className="text-[10px] text-[#7a8fa6] font-mono">
                            {u.username ? `@${u.username}` : `ID: ${u.chat_id}`}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedUserId(u.chat_id);
                          setTab("telegram");
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#070e1b] border border-[#16274a] hover:border-[#0066ff] text-xs font-mono text-[#0066ff]"
                      >
                        Открыть чат
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════ */}
          {/* ── TAB 6: НАСТРОЙКИ ─────────────────────────────── */}
          {/* ══════════════════════════════════════════════════ */}
          {tab === "settings" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <Settings className="w-6 h-6 text-[#0066ff]" />
                  <span>Настройки системы</span>
                </h1>
                <p className="text-xs text-[#7a8fa6] mt-1">Конфигурация курса валют, кэша и экспорта</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Currency Exchange Rate Setting */}
                <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="text-[#0066ff] font-mono">$</span>
                    <span>Курс доллара (USD ➔ UZS)</span>
                  </h3>
                  <p className="text-xs text-[#7a8fa6]">
                    Текущий базовый курс: <strong className="text-white font-mono">1$ = {exchangeRate.toLocaleString()} UZS</strong>.
                    Все товары в каталоге автоматически пересчитываются по этому курсу.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Например: 12800"
                      value={rateInputValue}
                      onChange={(e) => setRateInputValue(e.target.value)}
                      className="bg-[#070e1b] border border-[#16274a] rounded-xl px-3.5 py-2 text-xs font-mono text-white outline-none focus:border-[#0066ff] w-48"
                    />
                    <button
                      onClick={async () => {
                        const val = parseInt(rateInputValue);
                        if (!isNaN(val) && val > 0) {
                          const ok = await updateExchangeRate(val);
                          if (ok) toast.success(`Курс успешно обновлен: 1$ = ${val.toLocaleString()} UZS`);
                        }
                      }}
                      className="px-4 py-2 bg-[#0066ff] hover:bg-[#1a75ff] text-white text-xs font-bold rounded-xl"
                    >
                      Сохранить
                    </button>
                  </div>
                </div>

                {/* Cache Management */}
                <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-red-400" />
                    <span>Сброс кэша и синхронизация</span>
                  </h3>
                  <p className="text-xs text-[#7a8fa6]">
                    Очистка локального IndexedDB кэша витрины и принудительное обновление всех карточек.
                  </p>
                  <button
                    onClick={async () => {
                      await clearProductsCache();
                      toast.success("Локальный кэш IndexedDB очищен!");
                      fetchProducts(true);
                    }}
                    className="px-4 py-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-xl transition-all"
                  >
                    Очистить кэш каталога
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>

        {/* ══════════════════════════════════════════════════════ */}
        {/* ── 3. MOBILE BOTTOM NAVIGATION BAR ───────────────── */}
        {/* ══════════════════════════════════════════════════════ */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080f1e]/95 backdrop-blur-xl border-t border-[#142340] safe-area-inset-bottom">
          <div className="flex items-stretch h-16">
            {[
              { id: "overview" as AdminTab, label: "Главная", icon: LayoutDashboard },
              { id: "products" as AdminTab, label: "Каталог", icon: Package },
              { id: "analytics" as AdminTab, label: "Аналитика", icon: BarChart3 },
              { id: "telegram" as AdminTab, label: "Бот", icon: Send },
              { id: "settings" as AdminTab, label: "Ещё", icon: Settings },
            ].map(({ id, label, icon: Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors relative ${
                    active ? "text-[#0066ff]" : "text-[#7a8fa6]"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium tracking-tight">{label}</span>
                  {active && (
                    <span className="absolute bottom-0 w-8 h-0.5 bg-[#0066ff] rounded-t-full shadow-[0_0_8px_#0066ff]" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* ── 4. PRODUCT DRAWER EDITOR (FULL PROPS PRESERVED) ── */}
      {/* ══════════════════════════════════════════════════════ */}
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
