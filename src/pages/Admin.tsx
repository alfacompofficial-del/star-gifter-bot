import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Trash2, Search, Upload, Check, X, Pencil,
  BarChart3, Package, Plus, Eye, Heart, Download,
  ToggleLeft, ToggleRight, RefreshCw, TrendingUp, Users,
  Globe, AlertTriangle, Copy, SlidersHorizontal, LogOut,
  Layers, ArrowUpDown, ChevronDown, Sparkles, Star, Send, Bot, MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
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

const BOT_TOKEN_SHORT = "8508090986:AAFdA3...";

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
      return (
        sessionStorage.getItem("alfacomp_admin_auth") === "1" ||
        localStorage.getItem("alfacomp_admin_auth") === "1"
      );
    } catch {
      return false;
    }
  });

  // ── Core Navigation Tabs ──────────────────────────────────
  const [tab, setTab] = useState<"products" | "analytics" | "stats" | "telegram">("products");

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
      // Never drop bot-sent messages
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
      // Auto-refresh every 30 seconds
      const interval = setInterval(syncTgMessages, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, tab, syncTgMessages]);

  // ── Scroll chat to bottom on messages change ───────────────
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [allTgMessages, selectedUserId]);

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
      "ID",
      "Название",
      "Бренд",
      "Категория",
      "Цена (сум)",
      "Старая цена (сум)",
      "Цена (≈$USD)",
      "В наличии",
      "Приоритет",
      "Просмотры",
      "Лайки",
      "Ссылка на фото",
      "Характеристики",
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
    toast.success(`Скачано ${products.length} товаров в виде CSV!`);
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

  // ── Traffic Sources Widget (Accurate, Real Telemetry) ────────
  const renderTrafficSourcesWidget = () => {
    if (visitorsLoading) {
      return (
        <div className="bg-[#0c1424] border border-white/[0.08] rounded-2xl p-8 text-center text-white/50 font-mono">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0066ff]" />
          Загрузка реальной телеметрии визитов из Supabase...
        </div>
      );
    }

    if (visitors.length === 0) {
      return (
        <div className="bg-[#0c1424] border border-white/[0.08] rounded-2xl p-8 text-center text-white/50 font-mono">
          Визиты пока не зафиксированы в базе данных.
        </div>
      );
    }

    const refMap: Record<string, number> = {};
    for (const v of visitors) {
      let src = "";
      const ref = (v.referrer || "").toLowerCase();
      const ua = (v.user_agent || "").toLowerCase();

      if (ref.includes("google.")) {
        src = "Google Поиск";
      } else if (ref.includes("yandex.") || ref.includes("ya.ru")) {
        src = "Яндекс Поиск";
      } else if (ref.includes("bing.")) {
        src = "Bing Поиск";
      } else if (ref.includes("duckduckgo.")) {
        src = "DuckDuckGo";
      } else if (ref.includes("t.me") || ref.includes("telegram")) {
        src = "Telegram (Ссылки/Канал)";
      } else if (ref.includes("instagram.")) {
        src = "Instagram";
      } else if (ref.includes("facebook.") || ref.includes("fb.com")) {
        src = "Facebook";
      } else if (ref && !ref.includes("alfacomp.uz") && !ref.includes("localhost")) {
        try {
          src = new URL(v.referrer!).hostname.replace(/^www\./, "");
        } catch {
          src = "Внешний переход";
        }
      } else {
        // Referrer is null or direct. Distinguish via actual User-Agent
        if (ua.includes("telegram") || ua.includes("tg-")) {
          src = "Telegram WebApp / Бот";
        } else if (ua.includes("; wv)") || (ua.includes("version/4.0") && ua.includes("chrome") && ua.includes("mobile"))) {
          src = "In-App браузер (Telegram / Соцсети)";
        } else if (ua.includes("bot") || ua.includes("crawl") || ua.includes("spider") || ua.includes("ahrefs") || ua.includes("exasearch")) {
          src = "SEO-роботы / Краулеры";
        } else if (ua.includes("android") || ua.includes("iphone") || ua.includes("mobile")) {
          src = "Прямой заход (Смартфоны)";
        } else if (ua.includes("windows") || ua.includes("macintosh") || ua.includes("linux")) {
          src = "Прямой заход (ПК / Ноутбуки)";
        } else {
          src = "Прямой переход";
        }
      }
      refMap[src] = (refMap[src] || 0) + 1;
    }

    const refData = Object.entries(refMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));

    const total = visitors.length;
    const REF_COLORS = ["#0066ff", "#38bdf8", "#22c55e", "#f59e0b", "#f43f5e", "#a855f7", "#14b8a6", "#6366f1"];

    const topChannel = refData[0];
    const topPct = topChannel ? Math.round((topChannel.value / total) * 100) : 0;
    const secondChannel = refData[1];
    const secondPct = secondChannel ? Math.round((secondChannel.value / total) * 100) : 0;

    return (
      <div className="bg-[#0c1424] border border-white/[0.08] rounded-2xl p-6 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#0066ff]" />
              <h3 className="font-mono uppercase tracking-wider text-sm sm:text-base text-white font-extrabold">
                Откуда идут пользователи (Реальные источники трафика)
              </h3>
            </div>
            <p className="text-xs text-white/50 mt-1 leading-relaxed">
              Точная аналитика на основе <strong>{total}</strong> реальных зафиксированных визитов в базе данных:{" "}
              {topChannel && `${topChannel.name} — ${topChannel.value} (${topPct}%)`}
              {secondChannel && `, ${secondChannel.name} — ${secondChannel.value} (${secondPct}%)`}
            </p>
          </div>
          <span className="text-[11px] font-mono font-bold text-[#60a5fa] bg-[#0066ff]/10 border border-[#0066ff]/30 px-3 py-1.5 rounded-lg w-fit shrink-0">
            {total} подтвержденных визитов
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Текстовая сводка и прогресс-бары */}
          <div className="lg:col-span-6 space-y-2.5">
            <div className="text-[11px] font-mono uppercase text-white/40 tracking-wider mb-2 font-semibold">
              Каналы трафика в виде текста и процентов:
            </div>
            {refData.map(({ name, value }, i) => {
              const pct = Math.round((value / total) * 100);
              return (
                <div key={name} className="space-y-1.5 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="text-white/90 font-medium flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: REF_COLORS[i % REF_COLORS.length] }}
                      />
                      {name}
                    </span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-white font-bold">{value} переходов</span>
                      <span className="text-[#60a5fa] text-[11px] font-bold">({pct}%)</span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/[0.04]">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: REF_COLORS[i % REF_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Диаграмма переходов */}
          <div className="lg:col-span-6 bg-[#070e1a] rounded-xl p-4 border border-white/[0.06]">
            <div className="text-xs font-mono uppercase text-white/40 tracking-wider mb-3 flex items-center justify-between font-semibold">
              <span>Диаграмма источников трафика</span>
              <span className="text-[10px] text-[#0066ff]">Визиты</span>
            </div>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart
                data={refData}
                margin={{ top: 10, right: 10, left: -20, bottom: 45 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10, fontFamily: "monospace" }}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10, fontFamily: "monospace" }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0b1220", border: "1px solid rgba(0,102,255,0.3)", borderRadius: 10, fontSize: 12, fontFamily: "monospace" }}
                  labelStyle={{ color: "#ffffff", fontWeight: "bold" }}
                  itemStyle={{ color: "#60a5fa" }}
                  cursor={{ fill: "rgba(0,102,255,0.08)" }}
                />
                <Bar dataKey="value" name="Визиты" radius={[6, 6, 0, 0]}>
                  {refData.map((_, i) => (
                    <Cell key={i} fill={REF_COLORS[i % REF_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
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
            <h1
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="font-extrabold tracking-tight text-xs uppercase flex items-center gap-2 cursor-pointer select-none"
              title="Наверх"
            >
              <span className="text-white">ALFACOMP</span>
              <span className="text-[#0066ff] font-mono text-[11px]">// CONTROL CENTER</span>
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
              <div className="flex items-center gap-1.5 bg-[#141720] px-2 py-1 rounded-lg border border-[#0066ff]/50">
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
                  className="w-20 bg-transparent text-xs font-mono font-bold text-[#0066ff] outline-none text-right"
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
                <div className="text-xs font-mono font-bold text-[#0066ff]">
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
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#0066ff]" : ""}`} />
          </button>

          {/* CSV Export */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-[#141720] border border-white/10 hover:border-[#0066ff]/40 rounded-lg text-xs font-mono uppercase tracking-wider transition-all text-white/80 hover:text-white"
            title="Скачать все товары из сайта в виде CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#0066ff]" />
            <span className="hidden sm:inline">Скачать CSV</span>
            <span className="sm:hidden">CSV</span>
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
              { id: "stats", label: "Откуда идут пользователи & Трафик", icon: Globe },
              { id: "telegram", label: "Telegram Заказы", icon: Send },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-xs tracking-wider uppercase transition-all border whitespace-nowrap ${
                  tab === id
                    ? "bg-[#0066ff] text-white border-[#0066ff] shadow-md shadow-[#0066ff]/20"
                    : "bg-[#11141c] text-white/60 border-white/[0.07] hover:text-white hover:border-white/15"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Product Actions */}
          {tab === "products" && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-lg bg-[#141722] hover:bg-[#1b1f2e] border border-white/10 hover:border-[#0066ff]/40 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95"
                title="Скачать все товары из сайта в виде CSV файла"
              >
                <Download className="w-4 h-4 text-[#0066ff]" />
                <span className="hidden sm:inline">Скачать товары</span>
                <span>(CSV)</span>
              </button>

              <button
                onClick={() => {
                  setDrawerProduct(null);
                  setDrawerOpen(true);
                }}
                className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg bg-[#0066ff] hover:bg-[#1a75ff] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-[#0066ff]/20"
              >
                <Plus className="w-4 h-4" />
                <span>Добавить товар</span>
              </button>
            </div>
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
                <div className="text-2xl sm:text-3xl font-mono font-extrabold text-[#0066ff] mt-1">
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
                    className="w-full bg-[#141722] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-[#0066ff] text-xs sm:text-sm text-white transition-all font-sans"
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
                    className="bg-[#141722] border border-white/10 rounded-lg px-3 py-2 text-xs font-medium text-white outline-none focus:border-[#0066ff] cursor-pointer"
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
                          ? "bg-[#0066ff]/20 text-[#0066ff] border-[#0066ff]/50"
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
                    <th className="p-4 sm:p-5 text-right">Цена ($ USD ➔ UZS)</th>
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
                        draggedId === p.id ? "opacity-35 scale-[0.99]" : dragOverId === p.id ? "bg-[#0066ff]/10 border-l-2 border-[#0066ff]" : ""
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
                                <div className="w-4 h-4 border-2 border-[#0066ff] border-t-transparent rounded-full animate-spin" />
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
                                  className="w-48 bg-white/10 border border-[#0066ff]/70 rounded px-2 py-1 text-xs font-bold text-white outline-none"
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
                                className="font-bold text-white text-xs sm:text-sm truncate max-w-[220px] sm:max-w-[320px] cursor-pointer hover:text-[#0066ff] transition-colors flex items-center gap-1.5 group/title"
                                title="Нажмите для быстрого изменения названия"
                              >
                                <span>{p.name}</span>
                                <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/title:opacity-60 transition-opacity text-white/50" />
                              </div>
                            )}

                            <div className="text-[10px] font-mono text-white/40 mt-0.5 flex items-center gap-2">
                              <span>ID #{p.id}</span>
                              <span>·</span>
                              <span className="text-[#0066ff]/80 uppercase">{p.brand || "AlfaComp"}</span>
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

                      {/* Price USD Primary with Auto UZS */}
                      <td className="p-4 sm:p-5 text-right font-mono">
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
                                className="w-20 bg-white/10 border border-[#0066ff]/70 rounded px-2 py-1 text-sm font-mono font-bold text-white text-right outline-none"
                              />
                              <button
                                onClick={() => saveEditPrice(p.id)}
                                className="p-1 rounded bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white transition-colors"
                                title="Сохранить"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={cancelEditPrice}
                                className="p-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                                title="Отмена"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {editingPriceValue && !isNaN(parseFloat(editingPriceValue)) && (
                              <div className="text-[10px] font-mono text-emerald-400">
                                = {formatPrice(Math.round(parseFloat(editingPriceValue) * (exchangeRate || 14000)))} сум
                              </div>
                            )}
                          </div>
                        ) : (() => {
                          const { priceUSD, priceUZS } = resolveProductPrices(p.price, exchangeRate || 14000);
                          return (
                            <div>
                              <button
                                onClick={() => startEditPrice(p)}
                                className="font-bold text-sm text-[#0066ff] hover:text-white transition-colors flex items-center gap-1 ml-auto group/price"
                                title="Нажмите чтобы изменить цену в USD ($)"
                              >
                                <span className="text-white/50 text-xs">$</span>
                                <span className="text-base font-extrabold text-white group-hover/price:text-[#0066ff]">{priceUSD}</span>
                                <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/price:opacity-60 text-white/50" />
                              </button>
                              <div className="text-[11px] text-white/45 mt-0.5 font-mono">
                                ≈ {formatPrice(priceUZS)} сум
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Telemetry (Rating / Views / Likes) */}
                      <td className="p-4 sm:p-5 text-center hidden lg:table-cell">
                        <div className="flex items-center justify-center gap-3 text-[11px] font-mono text-white/40">
                          <span className="flex items-center gap-1 text-amber-400 font-semibold" title="Рейтинг покупателей">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {(p.rating ?? 5.0).toFixed(1)}
                            <span className="text-white/30 text-[10px]">({p.rating_count ?? 0})</span>
                          </span>
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
          const CHART_COLORS = ["#0066ff", "#FF8C42", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16", "#F97316"];

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
                { label: "Просмотры (всего)", value: metrics.totalViews.toLocaleString(), color: "text-[#0066ff]", bg: "border-[#0066ff]/20" },
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
                  <BarChart3 className="w-4 h-4 text-[#0066ff]" />
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
                        itemStyle={{ color: "#0066ff" }}
                        cursor={{ fill: "rgba(21,101,192,0.08)" }}
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
                <TrendingUp className="w-4 h-4 text-[#0066ff]" />
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
                    <Bar dataKey="views" name="Просмотры" fill="#0066ff" radius={[3, 3, 0, 0]} />
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

            {/* ── TRAFFIC SOURCES ANALYTICS (TEXT & CHART) ── */}
            {renderTrafficSourcesWidget()}
          </div>
          );
        })()}

        {/* ── TAB 3: IP TELEMETRY & VISITORS ────────────────── */}
        {tab === "stats" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#0f1219] border border-white/[0.08] rounded-xl p-5">
                <div className="text-[10px] font-mono uppercase text-white/40 tracking-wider mb-1 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#0066ff]" /> Всего визитов
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
                      {name} · <span className="text-[#0066ff]">{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* ── REFERRER / SOURCES ANALYTICS (TEXT & CHART) ── */}
            {renderTrafficSourcesWidget()}

            {/* Visitors Search & Table */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                placeholder="Поиск по IP, стране, городу..."
                value={visitorSearch}
                onChange={(e) => setVisitorSearch(e.target.value)}
                className="w-full bg-[#0f1219] border border-white/[0.08] rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-[#0066ff] text-xs sm:text-sm text-white transition-all font-mono"
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
                      <td className="p-4 sm:p-5 font-mono text-xs font-bold text-[#0066ff]">{v.ip}</td>
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

        {/* ── TAB 4: TELEGRAM CRM ──────────────────────────── */}
        {tab === "telegram" && (
          <div className="space-y-4">

            {/* ── CRM TOP BAR ── */}
            <div className="bg-[#0b0e1a] border border-[#0066ff]/25 rounded-xl p-4 flex flex-wrap items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0066ff] to-[#0D47A1]
                flex items-center justify-center shrink-0 shadow-[0_6px_20px_rgba(21,101,192,0.35)]">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-white text-[14px]">
                    {botInfo ? `@${botInfo.username}` : "AlfaComp Bot"}
                  </span>
                  {botInfo && (
                    <span className="text-[11px] text-white/40 font-mono">{botInfo.first_name}</span>
                  )}
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    ONLINE · AUTO-SYNC 30s
                  </span>
                </div>
                <div className="text-[11px] text-white/30 font-mono mt-0.5">
                  {tgUsers.length} пользователей · {allTgMessages.length} сообщений сохранено локально
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Admin chat IDs */}
                <div className="flex items-center gap-1.5">
                  {botAdminChats.length === 0 ? (
                    <span className="text-[10px] text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-1 rounded-lg font-mono">
                      ⚠️ Чаты не настроены
                    </span>
                  ) : (
                    botAdminChats.map((c) => (
                      <div key={c} className="flex items-center gap-1 bg-[#141722] border border-white/10 rounded-lg px-2 py-1">
                        <span className="font-mono text-[10px] text-[#42A5F5]">{c}</span>
                        <button
                          onClick={() => {
                            const updated = botAdminChats.filter(x => x !== c);
                            setBotAdminChats(updated);
                            setAdminChatIds(updated);
                            toast.success("Чат удалён");
                          }}
                          className="text-red-400/60 hover:text-red-400 transition-colors ml-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newChatId}
                      onChange={(e) => setNewChatId(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const id = newChatId.trim();
                          if (!id) return;
                          const updated = [...new Set([...botAdminChats, id])];
                          setBotAdminChats(updated);
                          setAdminChatIds(updated);
                          setNewChatId("");
                          toast.success(`Чат ${id} добавлен`);
                        }
                      }}
                      placeholder="+ chat_id"
                      className="h-7 w-28 px-2 bg-[#141722] border border-white/[0.09] rounded-lg
                        text-white text-[11px] font-mono outline-none focus:border-[#0066ff]/60"
                    />
                    <button
                      onClick={() => {
                        const id = newChatId.trim();
                        if (!id) return;
                        const updated = [...new Set([...botAdminChats, id])];
                        setBotAdminChats(updated);
                        setAdminChatIds(updated);
                        setNewChatId("");
                        toast.success(`Чат ${id} добавлен`);
                      }}
                      className="h-7 px-2 bg-[#0066ff]/80 hover:bg-[#0066ff] text-white text-[10px] font-bold rounded-lg transition-colors"
                    >
                      Добавить
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => { syncTgMessages(); getBotInfo().then(setBotInfo); }}
                  disabled={tgSyncing}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#141722] border border-white/10
                    hover:border-[#0066ff]/40 rounded-lg text-xs font-mono text-white/70 hover:text-white transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${tgSyncing ? "animate-spin" : ""}`} />
                  {tgSyncing ? "Синхронизация..." : "Обновить"}
                </button>
              </div>
            </div>

            {/* ── CRM MAIN PANEL ── */}
            <div className="bg-[#0b0e15] border border-white/[0.07] rounded-xl overflow-hidden flex"
              style={{ height: "70vh", minHeight: 500 }}>

              {/* LEFT: Users list */}
              <div className="w-72 shrink-0 border-r border-white/[0.07] flex flex-col bg-[#0c0f1a]">
                {/* Search */}
                <div className="p-3 border-b border-white/[0.06]">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                    <input
                      type="text"
                      value={tgUserSearch}
                      onChange={(e) => setTgUserSearch(e.target.value)}
                      placeholder="Поиск пользователей..."
                      className="w-full h-8 pl-8 pr-3 bg-[#141722] border border-white/[0.07]
                        rounded-lg text-[12px] text-white placeholder:text-white/30 outline-none
                        focus:border-[#0066ff]/50 transition-all font-mono"
                    />
                  </div>
                </div>

                {/* User list */}
                <div className="flex-1 overflow-y-auto">
                  {tgUsers.length === 0 ? (
                    <div className="p-6 text-center text-white/30 text-xs font-mono">
                      <Bot className="w-8 h-8 mx-auto mb-3 opacity-30" />
                      Нет пользователей.<br />
                      Нажмите «Обновить» для синхронизации.
                    </div>
                  ) : (
                    tgUsers
                      .filter(u => {
                        const q = tgUserSearch.toLowerCase();
                        return !q || u.first_name.toLowerCase().includes(q) ||
                          (u.username || "").toLowerCase().includes(q) ||
                          u.chat_id.includes(q);
                      })
                      .map((user) => {
                        const isSelected = selectedUserId === user.chat_id;
                        const userMsgs = allTgMessages.filter(m => m.chat_id === user.chat_id);
                        const unreadCount = userMsgs.filter(m => m.from_user).length;
                        return (
                          <button
                            key={user.chat_id}
                            onClick={() => setSelectedUserId(user.chat_id)}
                            className={`w-full text-left px-3 py-3 border-b border-white/[0.04] flex items-start gap-2.5
                              transition-all hover:bg-[#0066ff]/10 ${isSelected ? "bg-[#0066ff]/15 border-l-2 border-l-[#0066ff]" : ""}`}
                          >
                            {/* Avatar */}
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-extrabold shrink-0
                              ${isSelected ? "bg-[#0066ff]" : "bg-[#1a2035]"} text-white`}>
                              {user.first_name?.[0]?.toUpperCase() || "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className={`text-[12px] font-semibold truncate ${isSelected ? "text-white" : "text-white/80"}`}>
                                  {user.first_name}
                                </span>
                                <span className="text-[10px] text-white/30 font-mono shrink-0">
                                  {new Date(user.last_active * 1000).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}
                                </span>
                              </div>
                              {user.username && (
                                <div className="text-[10px] text-[#42A5F5] font-mono">@{user.username}</div>
                              )}
                              <div className="text-[10px] text-white/25 font-mono">ID: {user.chat_id}</div>
                              <div className="text-[11px] text-white/40 truncate mt-0.5">
                                {user.last_message || "—"}
                              </div>
                            </div>
                          </button>
                        );
                      })
                  )}
                </div>
              </div>

              {/* RIGHT: Chat window */}
              <div className="flex-1 flex flex-col min-w-0">
                {!selectedUserId ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-white/20 gap-3">
                    <MessageSquare className="w-12 h-12 opacity-20" />
                    <span className="text-sm font-mono">Выберите пользователя слева</span>
                  </div>
                ) : (() => {
                  const selUser = tgUsers.find(u => u.chat_id === selectedUserId);
                  const chatMsgs = allTgMessages.filter(m => m.chat_id === selectedUserId);
                  return (
                    <>
                      {/* Chat header */}
                      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-3 bg-[#0c0f1a]">
                        <div className="w-9 h-9 rounded-full bg-[#0066ff] flex items-center justify-center text-[13px] font-extrabold text-white shrink-0">
                          {selUser?.first_name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-bold text-white flex items-center gap-2">
                            {selUser?.first_name}
                            {selUser?.username && (
                              <span className="text-[11px] text-[#42A5F5] font-mono">@{selUser.username}</span>
                            )}
                          </div>
                          <div className="text-[11px] text-white/40 font-mono flex items-center gap-2">
                            <span>Telegram ID: <strong className="text-[#42A5F5]">{selectedUserId}</strong></span>
                            <button
                              onClick={() => { navigator.clipboard.writeText(selectedUserId); toast.success("ID скопирован!"); }}
                              className="text-white/30 hover:text-white/60 transition-colors"
                              title="Скопировать ID"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <span>· {chatMsgs.length} сообщений</span>
                          </div>
                        </div>
                        <a
                          href={selUser?.username ? `https://t.me/${selUser.username}` : `tg://user?id=${selectedUserId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0066ff]/20 border border-[#0066ff]/30
                            hover:bg-[#0066ff]/30 rounded-lg text-[11px] font-mono text-[#42A5F5] transition-all"
                        >
                          <Send className="w-3 h-3" />
                          Открыть в TG
                        </a>
                      </div>

                      {/* Messages */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {chatMsgs.length === 0 ? (
                          <div className="text-center text-white/20 text-xs font-mono py-8">Нет сообщений</div>
                        ) : (
                          chatMsgs.map((msg) => {
                            const isBot = !msg.from_user;
                            return (
                              <div key={`${msg.chat_id}_${msg.message_id}`}
                                className={`flex ${isBot ? "justify-end" : "justify-start"}`}>
                                <div className={`group relative max-w-[75%] rounded-2xl px-3.5 py-2.5
                                  ${isBot
                                    ? "bg-gradient-to-br from-[#0066ff] to-[#0D47A1] text-white rounded-br-sm"
                                    : "bg-[#1a2035] text-white/90 border border-white/[0.06] rounded-bl-sm"
                                  }`}>
                                  {/* Sender name */}
                                  <div className={`text-[10px] font-bold mb-1 ${isBot ? "text-white/60" : "text-[#42A5F5]"}`}>
                                    {isBot ? "🤖 AlfaComp Bot" : msg.sender_name}
                                    {msg.sender_username && !isBot && (
                                      <span className="text-white/30 font-mono ml-1">@{msg.sender_username}</span>
                                    )}
                                  </div>
                                  {/* Message text */}
                                  <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                                  {/* Footer */}
                                  <div className={`flex items-center justify-between gap-2 mt-1 text-[10px] ${isBot ? "text-white/40" : "text-white/30"}`}>
                                    <span className="font-mono">
                                      {new Date(msg.date * 1000).toLocaleString("ru-RU", {
                                        day: "2-digit", month: "2-digit",
                                        hour: "2-digit", minute: "2-digit"
                                      })}
                                      {msg.is_edited && " · изм."}
                                    </span>
                                    {/* Actions for bot messages */}
                                    {isBot && (
                                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          onClick={() => { setTgEditingMsg(msg); setTgEditText(msg.text); }}
                                          className="text-white/50 hover:text-[#42A5F5] transition-colors"
                                          title="Редактировать"
                                        >
                                          <Pencil className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={async () => {
                                            if (!window.confirm("Удалить это сообщение из Telegram?")) return;
                                            const res = await deleteTelegramMessage(msg.chat_id, msg.message_id);
                                            if (res.success) {
                                              const updated = allTgMessages.filter(
                                                m => !(m.chat_id === msg.chat_id && m.message_id === msg.message_id)
                                              );
                                              setAllTgMessages(updated);
                                              setTgUsers(extractTelegramUsers(updated));
                                              toast.success("Сообщение удалено");
                                            } else {
                                              toast.error(res.error || "Ошибка удаления");
                                            }
                                          }}
                                          className="text-white/50 hover:text-red-400 transition-colors"
                                          title="Удалить"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                        <div ref={chatBottomRef} />
                      </div>

                      {/* Edit modal overlay */}
                      {tgEditingMsg && (
                        <div className="absolute inset-0 z-30 bg-black/70 flex items-center justify-center p-4"
                          style={{ position: "absolute" }}>
                          <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
                            <div className="text-sm font-bold text-white flex items-center gap-2">
                              <Pencil className="w-4 h-4 text-[#0066ff]" />
                              Редактировать сообщение
                            </div>
                            <div className="text-[11px] text-white/30 font-mono">
                              message_id: {tgEditingMsg.message_id} · chat: {tgEditingMsg.chat_id}
                            </div>
                            <textarea
                              value={tgEditText}
                              onChange={(e) => setTgEditText(e.target.value)}
                              rows={5}
                              className="w-full px-3 py-2.5 bg-[#0f1219] border border-white/[0.09] rounded-lg
                                text-white text-[13px] outline-none focus:border-[#0066ff]/60 resize-none"
                              autoFocus
                            />
                            <div className="flex gap-3">
                              <button
                                onClick={async () => {
                                  if (!tgEditText.trim()) return;
                                  setTgEditSaving(true);
                                  const res = await editTelegramMessage(tgEditingMsg.chat_id, tgEditingMsg.message_id, tgEditText.trim());
                                  setTgEditSaving(false);
                                  if (res.success) {
                                    const updated = allTgMessages.map(m =>
                                      m.chat_id === tgEditingMsg.chat_id && m.message_id === tgEditingMsg.message_id
                                        ? { ...m, text: tgEditText.trim(), is_edited: true }
                                        : m
                                    );
                                    setAllTgMessages(updated);
                                    setTgEditingMsg(null);
                                    toast.success("Сообщение отредактировано!");
                                  } else {
                                    toast.error(res.error || "Ошибка редактирования");
                                  }
                                }}
                                disabled={tgEditSaving}
                                className="flex-1 h-10 rounded-xl bg-[#0066ff] hover:bg-[#1a75ff] text-white text-[13px] font-bold transition-colors disabled:opacity-60"
                              >
                                {tgEditSaving ? "Сохранение..." : "Сохранить"}
                              </button>
                              <button
                                onClick={() => setTgEditingMsg(null)}
                                className="flex-1 h-10 rounded-xl bg-[#1a2035] hover:bg-[#232b45] text-white/70 text-[13px] font-bold transition-colors"
                              >
                                Отмена
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Chat input */}
                      <div className="p-3 border-t border-white/[0.06] bg-[#0c0f1a] flex gap-2">
                        <textarea
                          value={tgChatInput}
                          onChange={(e) => setTgChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              if (!tgChatInput.trim() || !selectedUserId || tgSending) return;
                              setTgSending(true);
                              sendTelegramMessageWithDetails(selectedUserId, tgChatInput.trim())
                                .then(res => {
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
                                });
                            }
                          }}
                          placeholder="Напишите сообщение... (Enter — отправить, Shift+Enter — перенос)"
                          rows={2}
                          className="flex-1 px-3 py-2 bg-[#141722] border border-white/[0.09] rounded-xl
                            text-white text-[13px] outline-none focus:border-[#0066ff]/50 resize-none
                            placeholder:text-white/25 transition-all"
                        />
                        <button
                          onClick={async () => {
                            if (!tgChatInput.trim() || !selectedUserId || tgSending) return;
                            setTgSending(true);
                            const res = await sendTelegramMessageWithDetails(selectedUserId, tgChatInput.trim());
                            if (res.success && res.message) {
                              const updated = [...allTgMessages, res.message];
                              setAllTgMessages(updated);
                              setTgUsers(extractTelegramUsers(updated));
                              setTgChatInput("");
                              toast.success("Отправлено!");
                            } else {
                              toast.error(res.error || "Ошибка. Проверьте chat_id.");
                            }
                            setTgSending(false);
                          }}
                          disabled={tgSending || !tgChatInput.trim()}
                          className="w-11 h-full rounded-xl bg-gradient-to-b from-[#0066ff] to-[#0D47A1]
                            hover:from-[#1a75ff] hover:to-[#1565c0] text-white flex items-center justify-center
                            transition-all disabled:opacity-40 shrink-0 shadow-lg"
                        >
                          {tgSending ? (
                            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
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
