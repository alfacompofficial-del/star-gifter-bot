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
  ExternalLink, Filter, History as HistoryIcon, ShoppingCart
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
import { BulkEditModal } from "@/components/admin/BulkEditModal";
import { ExportModal } from "@/components/admin/ExportModal";
import { SeoAuditTab } from "@/components/admin/SeoAuditTab";
import { ChangeHistoryTab } from "@/components/admin/ChangeHistoryTab";
import { UserGeographyTab } from "@/components/admin/UserGeographyTab";
import { TelegramBotTab } from "@/components/admin/TelegramBotTab";
import { SettingsTab } from "@/components/admin/SettingsTab";
import { OrdersCrmTab } from "@/components/admin/OrdersCrmTab";
import { logAdminAction } from "@/services/auditLogger";
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
  if (!code || code.length !== 2) return "рџЊђ";
  const cc = code.toUpperCase();
  return String.fromCodePoint(...[...cc].map((c) => 127397 + c.charCodeAt(0)));
};

type AdminTab = "products" | "orders" | "seo" | "history" | "stats" | "telegram" | "analytics" | "settings" | "overview" | "users";

export const Admin = () => {
  const navigate = useNavigate();

  // в”Ђв”Ђ Admin PWA Manifest (dynamically injected) в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
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

  // в”Ђв”Ђ Authentication State в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
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

  // в”Ђв”Ђ Core Navigation Tabs в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  const [tab, setTab] = useState<AdminTab>("products");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // в”Ђв”Ђ Product States в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
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

  // в”Ђв”Ђ Inline Editing States в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  // ── Multi-Product Inline Editing System ──────────────────────────────
  const [activeEditingIds, setActiveEditingIds] = useState<Set<number>>(new Set());
  const [inlineEdits, setInlineEdits] = useState<Record<number, { name: string; priceUSD: string; originalName: string; originalPriceUSD: string }>>({});
  const [isSavingAllInline, setIsSavingAllInline] = useState(false);

  // в”Ђв”Ђ Image Upload Ref в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  const [uploadingImageId, setUploadingImageId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUploadProductId = useRef<number | null>(null);

  // в”Ђв”Ђ Drag & Drop Reorder в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);

  // в”Ђв”Ђ Drawer Editor State в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerProduct, setDrawerProduct] = useState<Product | null>(null);

  // в”Ђв”Ђ Bulk Edit & Export Modal States в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // в”Ђв”Ђ Exchange Rate State в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  const { exchangeRate, isUpdating: rateUpdating, updateExchangeRate } = useExchangeRate();
  const [editingRate, setEditingRate] = useState(false);
  const [rateInputValue, setRateInputValue] = useState("");

  // в”Ђв”Ђ Visitor Telemetry в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  const [visitors, setVisitors] = useState<VisitorRow[]>([]);
  const [visitorsLoading, setVisitorsLoading] = useState(false);
  const [visitorSearch, setVisitorSearch] = useState("");

  // в”Ђв”Ђ Telegram Bot CRM State в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
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

  // в”Ђв”Ђ Fetch Products from Supabase в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
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
      toast.error("РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё РґР°РЅРЅС‹С… РёР· Supabase");
    }

    if (showRefresh) setIsRefreshing(false);
    else setLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProducts();
    }
  }, [isAuthenticated, fetchProducts]);

  // в”Ђв”Ђ Fetch Visitors for Telemetry Tab в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
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

  // в”Ђв”Ђ Sync Telegram Updates в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
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

  // в”Ђв”Ђ Categories List в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  const allCategories = useMemo(() => {
    const defaultCats = [
      "РР‘Рџ", "РњРѕРЅРёС‚РѕСЂС‹", "РЎРµС‚СЊ", "РљРѕРјРїР»РµРєС‚СѓСЋС‰РёРµ", "РњРѕРЅРѕР±Р»РѕРєРё",
      "РђРєСЃРµСЃСЃСѓР°СЂС‹", "РљРѕР»РѕРЅРєРё", "РљСЂРѕРЅС€С‚РµР№РЅС‹", "Deco", "Wi-Fi СЂРѕСѓС‚РµСЂС‹", "Р’РёРґРµРѕРєР°СЂС‚С‹"
    ];
    const found = [...new Set(products.map((p) => p.category).filter(Boolean))];
    return [...new Set([...defaultCats, ...found])];
  }, [products]);

  // в”Ђв”Ђ Filtered & Sorted Products в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
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

  // в”Ђв”Ђ Metrics & Analytics в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
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

  // в”Ђв”Ђ Visitor Statistics в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
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
      const k = v.country || "РќРµРёР·РІРµСЃС‚РЅРѕ";
      countryCounts[k] = (countryCounts[k] || 0) + 1;
    }
    const topCountries = Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = visitors.filter((v) => v.created_at.startsWith(today)).length;

    return { filtered, uniqueIps, topCountries, todayCount };
  }, [visitors, visitorSearch]);

  // в”Ђв”Ђ Product CRUD Handlers в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  const handleSaveDrawerProduct = async (productData: Partial<Product>, isNew: boolean): Promise<boolean> => {
    try {
      if (isNew) {
        const { error } = await supabase.from("products").insert([productData as any]);
        if (error) throw error;
        toast.success("РўРѕРІР°СЂ СѓСЃРїРµС€РЅРѕ СЃРѕР·РґР°РЅ!");
      } else if (drawerProduct) {
        const { error } = await supabase.from("products").update(productData as any).eq("id", drawerProduct.id);
        if (error) throw error;
        toast.success("РўРѕРІР°СЂ СѓСЃРїРµС€РЅРѕ РѕР±РЅРѕРІР»РµРЅ!");
      }
      await clearProductsCache();
      fetchProducts();
      broadcastProductsUpdate();
      return true;
    } catch (err: any) {
      toast.error(`РћС€РёР±РєР°: ${err.message || "РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ"}`);
      return false;
    }
  };

  const handleDeleteProduct = async (id: number, name: string) => {
    if (!window.confirm(`РЈРґР°Р»РёС‚СЊ С‚РѕРІР°СЂ В«${name}В» (#${id})?`)) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      toast.success("РўРѕРІР°СЂ СѓРґР°Р»РµРЅ");
      setProducts((prev) => prev.filter((p) => p.id !== id));
      await clearProductsCache();
      broadcastProductsUpdate();
      logAdminAction({
        action: "РЈРґР°Р»РµРЅРёРµ С‚РѕРІР°СЂР°",
        actionType: "delete",
        targetId: id,
        targetName: name,
        details: `РўРѕРІР°СЂ В«${name}В» (#${id}) СѓРґР°Р»РµРЅ РёР· РєР°С‚Р°Р»РѕРіР°`,
      });
    } catch {
      toast.error("РћС€РёР±РєР° РїСЂРё СѓРґР°Р»РµРЅРёРё С‚РѕРІР°СЂР°");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProductIds.length === 0) return;
    if (!window.confirm(`Р’С‹ СѓРІРµСЂРµРЅС‹, С‡С‚Рѕ С…РѕС‚РёС‚Рµ СѓРґР°Р»РёС‚СЊ ${selectedProductIds.length} РІС‹Р±СЂР°РЅРЅС‹С… С‚РѕРІР°СЂРѕРІ?`)) return;
    try {
      const { error } = await supabase.from("products").delete().in("id", selectedProductIds);
      if (error) throw error;
      toast.success(`РЈРґР°Р»РµРЅРѕ ${selectedProductIds.length} С‚РѕРІР°СЂРѕРІ`);
      logAdminAction({
        action: "РњР°СЃСЃРѕРІРѕРµ СѓРґР°Р»РµРЅРёРµ",
        actionType: "delete",
        details: `РЈРґР°Р»РµРЅРѕ ${selectedProductIds.length} С‚РѕРІР°СЂРѕРІ СЃ ID: ${selectedProductIds.join(", ")}`,
      });
      setSelectedProductIds([]);
      await clearProductsCache();
      broadcastProductsUpdate();
      fetchProducts();
    } catch (err: any) {
      toast.error("РћС€РёР±РєР° РїСЂРё СѓРґР°Р»РµРЅРёРё С‚РѕРІР°СЂРѕРІ: " + (err.message || ""));
    }
  };

  const handleDuplicateProduct = async (p: Product) => {
    try {
      const duplicateData = {
        name: `${p.name} (РљРѕРїРёСЏ)`,
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
      toast.success(`РўРѕРІР°СЂ РїСЂРѕРґСѓР±Р»РёСЂРѕРІР°РЅ: ${duplicateData.name}`);
      await clearProductsCache();
      fetchProducts();
      broadcastProductsUpdate();
      logAdminAction({
        action: "Р”СѓР±Р»РёСЂРѕРІР°РЅРёРµ С‚РѕРІР°СЂР°",
        actionType: "create",
        targetName: duplicateData.name,
        details: `РЎРѕР·РґР°РЅР° РєРѕРїРёСЏ С‚РѕРІР°СЂР° В«${p.name}В» (#${p.id})`,
      });
    } catch {
      toast.error("РќРµ СѓРґР°Р»РѕСЃСЊ РїСЂРѕРґСѓР±Р»РёСЂРѕРІР°С‚СЊ С‚РѕРІР°СЂ");
    }
  };

  const handleToggleStock = async (id: number, current: boolean) => {
    try {
      const { error } = await supabase.from("products").update({ in_stock: !current }).eq("id", id);
      if (error) throw error;
      toast.success(!current ? "РўРѕРІР°СЂ РїРµСЂРµРІРµРґРµРЅ РІ РЅР°Р»РёС‡РёРµ!" : "РўРѕРІР°СЂ СЃРЅСЏС‚ СЃ РїСЂРѕРґР°Р¶Рё");
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, in_stock: !current } : p)));
      await clearProductsCache();
      broadcastProductsUpdate();
      logAdminAction({
        action: "РЎРјРµРЅР° СЃС‚Р°С‚СѓСЃР° РЅР°Р»РёС‡РёСЏ",
        actionType: "stock",
        targetId: id,
        details: `РўРѕРІР°СЂ #${id} РїРµСЂРµРІРµРґРµРЅ РІ СЃС‚Р°С‚СѓСЃ В«${!current ? "Р’ РЅР°Р»РёС‡РёРё" : "РќРµ РІ РЅР°Р»РёС‡РёРё"}В»`,
      });
    } catch {
      toast.error("РћС€РёР±РєР° РїРµСЂРµРєР»СЋС‡РµРЅРёСЏ СЃС‚Р°С‚СѓСЃР° РЅР°Р»РёС‡РёСЏ");
    }
  };

  // в”Ђв”Ђ Inline Price & Name Editing (USD Primary) в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  const startEditProduct = (p: Product, _fieldToFocus?: "name" | "price") => {
    const { priceUSD } = resolveProductPrices(p.price, exchangeRate || 14000);
    setActiveEditingIds((prev) => new Set([...prev, p.id]));
    setInlineEdits((prev) => ({
      ...prev,
      [p.id]: prev[p.id] || {
        name: p.name,
        priceUSD: String(priceUSD),
        originalName: p.name,
        originalPriceUSD: String(priceUSD),
      },
    }));
  };

  const updateInlineField = (id: number, field: "name" | "priceUSD", value: string) => {
    setInlineEdits((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || { name: "", priceUSD: "", originalName: "", originalPriceUSD: "" }),
        [field]: value,
      },
    }));
  };

  const cancelEditProduct = (id: number) => {
    setActiveEditingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setInlineEdits((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const cancelAllInlineEdits = () => {
    setActiveEditingIds(new Set());
    setInlineEdits({});
  };

  const saveSingleProductInline = async (id: number) => {
    const edit = inlineEdits[id];
    const targetProduct = products.find((p) => p.id === id);
    if (!edit || !targetProduct) return;

    const nameVal = edit.name.trim();
    if (!nameVal) {
      toast.error("Название не может быть пустым");
      return;
    }
    const usdVal = parseFloat(edit.priceUSD);
    if (isNaN(usdVal) || usdVal <= 0) {
      toast.error("Введите корректную цену в USD ($)");
      return;
    }

    const currentRate = exchangeRate > 0 ? exchangeRate : 14000;
    const finalUZS = Math.round(usdVal * currentRate);

    const { error } = await supabase
      .from("products")
      .update({ name: nameVal, price: finalUZS })
      .eq("id", id);

    if (!error) {
      toast.success(`Товар #${id} сохранен: ${nameVal} (${usdVal})`);
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, name: nameVal, price: finalUZS } : p))
      );
      cancelEditProduct(id);
      if (typeof clearProductsCache === "function") await clearProductsCache();
      if (typeof broadcastProductsUpdate === "function") broadcastProductsUpdate();
    } else {
      toast.error(`Ошибка сохранения товара #${id}`);
    }
  };

  const saveAllInlineEdits = async () => {
    const ids = Array.from(activeEditingIds);
    if (!ids.length) return;

    setIsSavingAllInline(true);
    let successCount = 0;
    const currentRate = exchangeRate > 0 ? exchangeRate : 14000;
    const updatedMap: Record<number, { name: string; price: number }> = {};

    for (const id of ids) {
      const edit = inlineEdits[id];
      const targetProduct = products.find((p) => p.id === id);
      if (!edit || !targetProduct) continue;

      const nameVal = edit.name.trim() || edit.originalName;
      const usdVal = parseFloat(edit.priceUSD);
      const finalUSD = !isNaN(usdVal) && usdVal > 0 ? usdVal : parseFloat(edit.originalPriceUSD);
      const finalUZS = Math.round(finalUSD * currentRate);

      const { error } = await supabase
        .from("products")
        .update({ name: nameVal, price: finalUZS })
        .eq("id", id);

      if (!error) {
        successCount++;
        updatedMap[id] = { name: nameVal, price: finalUZS };
      }
    }

    if (successCount > 0) {
      setProducts((prev) =>
        prev.map((p) => (updatedMap[p.id] ? { ...p, ...updatedMap[p.id] } : p))
      );
      toast.success(`Успешно сохранено товаров: ${successCount}!`);
      cancelAllInlineEdits();
      if (typeof clearProductsCache === "function") await clearProductsCache();
      if (typeof broadcastProductsUpdate === "function") broadcastProductsUpdate();
    } else {
      toast.error("Не удалось сохранить изменения");
    }
    setIsSavingAllInline(false);
  };

  // ── Image Upload Handling
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
      toast.error("Р’С‹Р±РµСЂРёС‚Рµ С„Р°Р№Р» РёР·РѕР±СЂР°Р¶РµРЅРёСЏ");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Р¤Р°Р№Р» СЃР»РёС€РєРѕРј Р±РѕР»СЊС€РѕР№ (РјР°РєСЃ. 5MB)");
      return;
    }

    setUploadingImageId(productId);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string;
        const { error } = await supabase.from("products").update({ image: dataUrl }).eq("id", productId);
        if (!error) {
          toast.success("Р¤РѕС‚Рѕ РѕР±РЅРѕРІР»РµРЅРѕ!");
          setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, image: dataUrl } : p)));
          await clearProductsCache();
          broadcastProductsUpdate();
        } else {
          toast.error("РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё С„РѕС‚Рѕ РІ Р±Р°Р·Сѓ");
        }
        setUploadingImageId(null);
        currentUploadProductId.current = null;
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("РћС€РёР±РєР° РїСЂРё РѕР±СЂР°Р±РѕС‚РєРµ С„Р°Р№Р»Р°");
      setUploadingImageId(null);
    }
  };

  // в”Ђв”Ђ Drag & Drop Priority Sorting в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
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
      toast.success("РџРѕСЂСЏРґРѕРє С‚РѕРІР°СЂРѕРІ СЃРѕС…СЂР°РЅРµРЅ!");
      await clearProductsCache();
      broadcastProductsUpdate();
    } catch {
      toast.error("РћС€РёР±РєР° РїСЂРё СЃРѕС…СЂР°РЅРµРЅРёРё РїРѕСЂСЏРґРєР°");
      fetchProducts();
    }
  };
  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  // в”Ђв”Ђ CSV Export в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  const handleExportCSV = () => {
    if (!products || products.length === 0) {
      toast.error("РўРѕРІР°СЂС‹ РґР»СЏ СЌРєСЃРїРѕСЂС‚Р° РЅРµ РЅР°Р№РґРµРЅС‹");
      return;
    }
    const headers = [
      "ID", "РќР°Р·РІР°РЅРёРµ", "Р‘СЂРµРЅРґ", "РљР°С‚РµРіРѕСЂРёСЏ", "Р¦РµРЅР° (СЃСѓРј)",
      "РЎС‚Р°СЂР°СЏ С†РµРЅР° (СЃСѓРј)", "Р¦РµРЅР° (в‰€$USD)", "Р’ РЅР°Р»РёС‡РёРё", "РџСЂРёРѕСЂРёС‚РµС‚",
      "РџСЂРѕСЃРјРѕС‚СЂС‹", "Р›Р°Р№РєРё", "РЎСЃС‹Р»РєР° РЅР° С„РѕС‚Рѕ", "РҐР°СЂР°РєС‚РµСЂРёСЃС‚РёРєРё"
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
      p.in_stock ? "Р”Р°" : "РќРµС‚",
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
    toast.success(`РЎРєР°С‡Р°РЅРѕ ${products.length} С‚РѕРІР°СЂРѕРІ РІ С„РѕСЂРјР°С‚Рµ CSV!`);
  };

  // в”Ђв”Ђ Logout в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
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
    toast.success("РЎРµСЃСЃРёСЏ РѕРїРµСЂР°С‚РѕСЂР° Р·Р°РІРµСЂС€РµРЅР°");
  };

  // в”Ђв”Ђ Navigation Menu Definition в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  const NAV_ITEMS = [
    { id: "products" as AdminTab, label: "РўРѕРІР°СЂС‹ Рё РєР°С‚Р°Р»РѕРі", icon: Package },
    { id: "orders" as AdminTab, label: "Р—Р°РєР°Р·С‹ & CRM", icon: ShoppingCart },
    { id: "seo" as AdminTab, label: "SEO Р¦РµРЅС‚СЂ", icon: Search },
    { id: "history" as AdminTab, label: "История изменений", icon: HistoryIcon },
    { id: "stats" as AdminTab, label: "РћС‚РєСѓРґР° РїРѕР»СЊР·РѕРІР°С‚РµР»Рё", icon: Compass },
    { id: "telegram" as AdminTab, label: "Telegram / Р‘РѕС‚", icon: Send },
    { id: "analytics" as AdminTab, label: "РђРЅР°Р»РёС‚РёРєР° РІРёС‚СЂРёРЅС‹", icon: BarChart3 },
    { id: "settings" as AdminTab, label: "РќР°СЃС‚СЂРѕР№РєРё & РљСѓСЂСЃ", icon: Settings },
  ];

  // в”Ђв”Ђ Traffic Sources Analytics Data в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  const trafficData = useMemo(() => {
    const refMap: Record<string, number> = {};
    for (const v of visitors) {
      let src = "";
      const ref = (v.referrer || "").toLowerCase();
      const ua = (v.user_agent || "").toLowerCase();

      if (ref.includes("google.")) src = "Google РџРѕРёСЃРє";
      else if (ref.includes("yandex.") || ref.includes("ya.ru")) src = "РЇРЅРґРµРєСЃ РџРѕРёСЃРє";
      else if (ref.includes("bing.")) src = "Bing РџРѕРёСЃРє";
      else if (ref.includes("duckduckgo.")) src = "DuckDuckGo";
      else if (ref.includes("t.me") || ref.includes("telegram")) src = "Telegram (РљР°РЅР°Р»/РЎСЃС‹Р»РєРё)";
      else if (ref.includes("instagram.")) src = "Instagram";
      else if (ref.includes("facebook.") || ref.includes("fb.com")) src = "Facebook";
      else if (ref && !ref.includes("alfacomp.uz") && !ref.includes("localhost")) {
        try {
          src = new URL(v.referrer!).hostname.replace(/^www\./, "");
        } catch {
          src = "Р’РЅРµС€РЅРёР№ РїРµСЂРµС…РѕРґ";
        }
      } else {
        if (ua.includes("telegram") || ua.includes("tg-")) src = "Telegram WebApp / Р‘РѕС‚";
        else if (ua.includes("; wv)") || (ua.includes("version/4.0") && ua.includes("chrome") && ua.includes("mobile"))) src = "In-App Р±СЂР°СѓР·РµСЂ";
        else if (ua.includes("android") || ua.includes("iphone") || ua.includes("mobile")) src = "РџСЂСЏРјРѕР№ РїРµСЂРµС…РѕРґ (РЎРјР°СЂС‚С„РѕРЅС‹)";
        else if (ua.includes("windows") || ua.includes("macintosh") || ua.includes("linux")) src = "РџСЂСЏРјРѕР№ РїРµСЂРµС…РѕРґ (РџРљ)";
        else src = "РџСЂСЏРјРѕР№ РїРµСЂРµС…РѕРґ";
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
      { name: "РџРљ", value: desktop, pct: Math.round((desktop / total) * 100), color: "#0066ff" },
      { name: "РњРѕР±РёР»СЊРЅС‹Рµ", value: mobile, pct: Math.round((mobile / total) * 100), color: "#00c853" },
      { name: "РџР»Р°РЅС€РµС‚С‹", value: tablet, pct: Math.round((tablet / total) * 100), color: "#a855f7" },
    ];
  }, [visitors]);

  // в”Ђв”Ђ If Not Authenticated: Render Sleek Admin Login в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
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

      {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
      {/* в”Ђв”Ђ 1. LEFT SIDEBAR (DESKTOP & MOBILE DRAWER) в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
      {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
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
                <span className="font-black text-white text-base tracking-tighter">в–І</span>
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
              <span className="text-xs font-semibold text-white/90">РЎРёСЃС‚РµРјР° СЂР°Р±РѕС‚Р°РµС‚</span>
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
            <span>Р’РµСЂРЅСѓС‚СЊСЃСЏ РЅР° СЃР°Р№С‚</span>
          </button>
        </div>
      </aside>

      {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
      {/* в”Ђв”Ђ 2. MAIN APP CONTENT CONTAINER в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
      {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-[#060b14]">
        {/* в”Ђв”Ђ Top Header Bar в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
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
                placeholder="РџРѕРёСЃРє РїРѕ С‚РѕРІР°СЂР°Рј, Р±СЂРµРЅРґСѓ, РєР°С‚РµРіРѕСЂРёРё РёР»Рё ID..."
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
                          if (ok) toast.success(`РљСѓСЂСЃ: 1$ = ${val.toLocaleString()} UZS`);
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
                        if (ok) toast.success(`РљСѓСЂСЃ: 1$ = ${val.toLocaleString()} UZS`);
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
                  title="РќР°Р¶РјРёС‚Рµ С‡С‚РѕР±С‹ РёР·РјРµРЅРёС‚СЊ РєСѓСЂСЃ USD/UZS"
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
              title="РЎРёРЅС…СЂРѕРЅРёР·РёСЂРѕРІР°С‚СЊ СЃ Supabase"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#0066ff]" : ""}`} />
            </button>

            {/* Notifications Icon */}
            <button
              onClick={() => toast.info("Р’СЃРµ СЃРёСЃС‚РµРјС‹ СЂР°Р±РѕС‚Р°СЋС‚ РІ С€С‚Р°С‚РЅРѕРј СЂРµР¶РёРјРµ")}
              className="relative w-9 h-9 rounded-xl bg-[#0b162c] border border-[#16274a] hover:border-[#0066ff]/60 flex items-center justify-center text-white/70 hover:text-white transition-all"
              title="РЈРІРµРґРѕРјР»РµРЅРёСЏ"
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
                <div className="text-[10px] text-[#7a8fa6]">РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ</div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors ml-1"
                title="Р’С‹Р№С‚Рё РёР· Р°РґРјРёРЅРєРё"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* в”Ђв”Ђ Scrollable Body Content в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 pb-24 md:pb-8">

          {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
          {/* в”Ђв”Ђ TAB: OVERVIEW (Р“Р›РђР’РќРђРЇ) в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
          {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
          {tab === "overview" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    <LayoutDashboard className="w-6 h-6 text-[#0066ff]" />
                    <span>РЎРІРѕРґРЅР°СЏ РїР°РЅРµР»СЊ СѓРїСЂР°РІР»РµРЅРёСЏ</span>
                  </h1>
                  <p className="text-xs text-[#7a8fa6] mt-1">
                    РћР±С‰РёР№ РѕР±Р·РѕСЂ РєР°С‚Р°Р»РѕРіР°, РїРѕСЃРµС‰Р°РµРјРѕСЃС‚Рё СЃР°Р№С‚Р° Рё Telegram-Р±РѕС‚Р°
                  </p>
                </div>
                <button
                  onClick={() => setTab("products")}
                  className="px-4 py-2 bg-[#0066ff] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#0066ff]/20 flex items-center gap-2"
                >
                  <Package className="w-4 h-4" />
                  <span>РџРµСЂРµР№С‚Рё РІ РєР°С‚Р°Р»РѕРі</span>
                </button>
              </div>

              {/* 4 Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-4 md:p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#7a8fa6]">Р’СЃРµРіРѕ С‚РѕРІР°СЂРѕРІ</span>
                    <div className="p-2 rounded-xl bg-[#0066ff]/15 text-[#3b82f6]">
                      <Package className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl md:text-3xl font-bold font-mono text-white mt-2">
                    {metrics.totalCount}
                  </div>
                  <div className="text-[11px] font-mono text-[#3b82f6] mt-1">+12 Р·Р° РЅРµРґРµР»СЋ</div>
                </div>

                <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-4 md:p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#7a8fa6]">Р’ РЅР°Р»РёС‡РёРё</span>
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
                    <span className="text-xs font-medium text-[#7a8fa6]">Р’РёР·РёС‚РѕРІ СЃР°Р№С‚Р°</span>
                    <div className="p-2 rounded-xl bg-[#a855f7]/15 text-[#a855f7]">
                      <Globe className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl md:text-3xl font-bold font-mono text-[#a855f7] mt-2">
                    {visitors.length}
                  </div>
                  <div className="text-[11px] font-mono text-[#a855f7] mt-1">{visitorStats.uniqueIps} СѓРЅРёРєР°Р»СЊРЅС‹С… IP</div>
                </div>

                <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-4 md:p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#7a8fa6]">Telegram Р±РѕС‚</span>
                    <div className="p-2 rounded-xl bg-[#0066ff]/15 text-[#60a5fa]">
                      <Bot className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl md:text-3xl font-bold font-mono text-white mt-2">
                    {tgUsers.length}
                  </div>
                  <div className="text-[11px] font-mono text-emerald-400 mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    РђРєС‚РёРІРµРЅ
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
                  <h3 className="text-base font-bold text-white">РЈРїСЂР°РІР»РµРЅРёРµ С‚РѕРІР°СЂР°РјРё</h3>
                  <p className="text-xs text-[#7a8fa6] mt-1">Р РµРґР°РєС‚РёСЂРѕРІР°РЅРёРµ С†РµРЅ, РєР°С‚РµРіРѕСЂРёР№, РёР·РѕР±СЂР°Р¶РµРЅРёР№ Рё РЅР°Р»РёС‡РёСЏ</p>
                </div>

                <div
                  onClick={() => setTab("analytics")}
                  className="bg-[#0b1528] border border-[#16274a] hover:border-[#0066ff] rounded-2xl p-5 cursor-pointer transition-all group"
                >
                  <BarChart3 className="w-6 h-6 text-[#00c853] mb-2 group-hover:scale-110 transition-transform" />
                  <h3 className="text-base font-bold text-white">РђРЅР°Р»РёС‚РёРєР° РІРёС‚СЂРёРЅС‹</h3>
                  <p className="text-xs text-[#7a8fa6] mt-1">РџРѕРїСѓР»СЏСЂРЅРѕСЃС‚СЊ С‚РѕРІР°СЂРѕРІ, РїСЂРѕСЃРјРѕС‚СЂС‹, Р»Р°Р№РєРё Рё СЂР°СЃРїСЂРµРґРµР»РµРЅРёРµ</p>
                </div>

                <div
                  onClick={() => setTab("telegram")}
                  className="bg-[#0b1528] border border-[#16274a] hover:border-[#0066ff] rounded-2xl p-5 cursor-pointer transition-all group"
                >
                  <Send className="w-6 h-6 text-[#a855f7] mb-2 group-hover:scale-110 transition-transform" />
                  <h3 className="text-base font-bold text-white">Telegram CRM & Р‘РѕС‚</h3>
                  <p className="text-xs text-[#7a8fa6] mt-1">РћС‚РІРµС‚С‹ РєР»РёРµРЅС‚Р°Рј, РёСЃС‚РѕСЂРёСЏ СЃРѕРѕР±С‰РµРЅРёР№, РЅР°СЃС‚СЂРѕР№РєРё РІРµР±С…СѓРєР°</p>
                </div>
              </div>
            </div>
          )}

          {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
          {/* в”Ђв”Ђ TAB 1: РўРћР’РђР Р« Р РљРђРўРђР›РћР“ в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
          {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
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
                      РўРѕРІР°СЂС‹ Рё РєР°С‚Р°Р»РѕРі
                    </h1>
                    <div className="text-[11px] font-mono text-[#7a8fa6]">
                      РЈРїСЂР°РІР»РµРЅРёРµ Р±Р°Р·РѕР№ РґР°РЅРЅС‹С… AlfaComp В· {products.length} РїРѕР·РёС†РёР№
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
                  <span>Р”РѕР±Р°РІРёС‚СЊ С‚РѕРІР°СЂ</span>
                </button>
              </div>

              {/* 4 KPI Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {/* Р’СЃРµРіРѕ С‚РѕРІР°СЂРѕРІ */}
                <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-4 md:p-5 relative overflow-hidden group hover:border-[#0066ff]/50 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#7a8fa6]">Р’СЃРµРіРѕ С‚РѕРІР°СЂРѕРІ</span>
                    <div className="p-2 rounded-xl bg-[#0066ff]/15 text-[#3b82f6]">
                      <Package className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl md:text-3xl font-bold font-mono text-white mt-2">
                    {metrics.totalCount}
                  </div>
                  <div className="text-[11px] font-mono text-[#3b82f6] mt-1">+12 Р·Р° РЅРµРґРµР»СЋ</div>
                </div>

                {/* Р’ РЅР°Р»РёС‡РёРё */}
                <div
                  onClick={() => setStockFilter(stockFilter === "in_stock" ? "all" : "in_stock")}
                  className={`bg-[#0b1528] border rounded-2xl p-4 md:p-5 relative overflow-hidden cursor-pointer transition-all ${
                    stockFilter === "in_stock"
                      ? "border-emerald-500 bg-emerald-500/[0.06]"
                      : "border-[#16274a] hover:border-emerald-500/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#7a8fa6]">Р’ РЅР°Р»РёС‡РёРё</span>
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

                {/* РќРµ РІ РЅР°Р»РёС‡РёРё */}
                <div
                  onClick={() => setStockFilter(stockFilter === "out_of_stock" ? "all" : "out_of_stock")}
                  className={`bg-[#0b1528] border rounded-2xl p-4 md:p-5 relative overflow-hidden cursor-pointer transition-all ${
                    stockFilter === "out_of_stock"
                      ? "border-amber-500 bg-amber-500/[0.06]"
                      : "border-[#16274a] hover:border-amber-500/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#7a8fa6]">РќРµ РІ РЅР°Р»РёС‡РёРё</span>
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

                {/* РљР°С‚РµРіРѕСЂРёР№ */}
                <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-4 md:p-5 relative overflow-hidden group hover:border-[#a855f7]/50 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#7a8fa6]">РљР°С‚РµРіРѕСЂРёР№</span>
                    <div className="p-2 rounded-xl bg-[#7c4dff]/15 text-[#a855f7]">
                      <Layers className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl md:text-3xl font-bold font-mono text-[#a855f7] mt-2">
                    {metrics.categoriesCount}
                  </div>
                  <div className="text-[11px] font-mono text-[#a855f7] mt-1">+2 Р·Р° РЅРµРґРµР»СЋ</div>
                </div>
              </div>

              {/* Filter and Control Bar Box */}
              <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-4 space-y-3.5 shadow-xl">
                {/* Search & Select Controls Row */}
                <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a6f8a]" />
                    <input
                      placeholder="РџРѕРёСЃРє РїРѕ РЅР°Р·РІР°РЅРёСЋ, Р±СЂРµРЅРґСѓ, РєР°С‚РµРіРѕСЂРёРё РёР»Рё ID..."
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
                      <option value="all">Р’СЃРµ РєР°С‚РµРіРѕСЂРёРё</option>
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
                      <option value="all">Р’СЃРµ СЃС‚Р°С‚СѓСЃС‹</option>
                      <option value="in_stock">Р’ РЅР°Р»РёС‡РёРё</option>
                      <option value="out_of_stock">РќРµ РІ РЅР°Р»РёС‡РёРё</option>
                    </select>

                    {/* Sorting Select */}
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="bg-[#070e1b] border border-[#16274a] rounded-xl px-3 py-2 text-xs font-medium text-white outline-none focus:border-[#0066ff] cursor-pointer"
                    >
                      <option value="priority">РџРѕ РїСЂРёРѕСЂРёС‚РµС‚Сѓ</option>
                      <option value="price_asc">Р¦РµРЅР° (РґРµС€РµРІР»Рµ)</option>
                      <option value="price_desc">Р¦РµРЅР° (РґРѕСЂРѕР¶Рµ)</option>
                      <option value="views">РџРѕ РїСЂРѕСЃРјРѕС‚СЂР°Рј</option>
                      <option value="likes">РџРѕ Р»Р°Р№РєР°Рј</option>
                      <option value="name">РџРѕ Р°Р»С„Р°РІРёС‚Сѓ</option>
                    </select>

                    {/* Export / Photos Modal Button */}
                    <button
                      onClick={() => setExportModalOpen(true)}
                      className="flex items-center gap-2 px-3.5 py-2 bg-[#070e1b] border border-[#16274a] hover:border-[#0066ff] text-white text-xs font-bold rounded-xl transition-all shadow-md"
                      title="РЎРєР°С‡Р°С‚СЊ Excel РёР»Рё РІСЃРµ С„РѕС‚Рѕ РІ ZIP"
                    >
                      <Download className="w-4 h-4 text-[#0066ff]" />
                      <span>Р­РєСЃРїРѕСЂС‚ / Р¤РѕС‚Рѕ</span>
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
                    Р’СЃРµ ({products.length})
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

              {/* в”Ђв”Ђ MOBILE PRODUCT CARDS (Shown on screens < md) в”Ђв”Ђ */}
              <div className="md:hidden space-y-3">
                {loading && (
                  <div className="text-center py-12 text-[#7a8fa6] font-mono text-xs">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0066ff]" />
                    Р—Р°РіСЂСѓР·РєР° РєР°С‚Р°Р»РѕРіР° РёР· Supabase...
                  </div>
                )}
                {!loading && filteredProducts.length === 0 && (
                  <div className="text-center py-12 text-[#7a8fa6] font-mono text-xs">
                    РўРѕРІР°СЂС‹ РїРѕ РІР°С€РµРјСѓ Р·Р°РїСЂРѕСЃСѓ РЅРµ РЅР°Р№РґРµРЅС‹
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
                              ID #{p.id} В· <span className="text-[#3b82f6] uppercase">{p.brand || "AlfaComp"}</span>
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
                            {p.in_stock ? "в—Џ Р’ РЅР°Р»РёС‡РёРё" : "в—‹ РЎРЅСЏС‚"}
                          </button>
                        </div>

                        {/* Price Row */}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#142340]">
                          <button
                            onClick={() => startEditProduct(p, "price")}
                            className="text-left font-mono"
                          >
                            <span className="text-white font-extrabold text-sm">$ {priceUSD}</span>
                            <div className="text-[10px] text-[#7a8fa6]">
                              в‰€ {formatPrice(priceUZS)} СЃСѓРј
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

              {/* Bulk Selection Actions Bar */}
              {selectedProductIds.length > 0 && (
                <div className="bg-[#0b1528] border-2 border-[#0066ff] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-[0_0_25px_rgba(0,102,255,0.25)] animate-in fade-in duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#0066ff] flex items-center justify-center font-black text-white text-sm shadow-md shadow-[#0066ff]/40">
                      {selectedProductIds.length}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>Р’С‹РґРµР»РµРЅРѕ С‚РѕРІР°СЂРѕРІ: {selectedProductIds.length}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0066ff]/20 text-[#4ea1ff]">
                          РџР°РєРµС‚РЅРѕРµ РґРµР№СЃС‚РІРёРµ
                        </span>
                      </div>
                      <div className="text-[11px] text-[#7a8fa6] mt-0.5">
                        Р РµРґР°РєС‚РёСЂСѓР№С‚Рµ С†РµРЅС‹, РЅР°Р·РІР°РЅРёСЏ, РєР°С‚РµРіРѕСЂРёРё, С„РѕС‚Рѕ РёР»Рё СѓРґР°Р»СЏР№С‚Рµ РІС‹Р±СЂР°РЅРЅС‹Рµ РїРѕР·РёС†РёРё РІ 1 РєР»РёРє
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setBulkModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0066ff] hover:bg-[#1a75ff] text-white text-xs font-bold transition-all shadow-lg shadow-[#0066ff]/30 active:scale-95"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>РњР°СЃСЃРѕРІРѕРµ СЂРµРґР°РєС‚РёСЂРѕРІР°РЅРёРµ</span>
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white text-xs font-semibold transition-all active:scale-95"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>РЈРґР°Р»РёС‚СЊ РІС‹Р±СЂР°РЅРЅС‹Рµ</span>
                    </button>
                    <button
                      onClick={() => setSelectedProductIds([])}
                      className="px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs text-white/70 hover:text-white transition-all"
                    >
                      РЎРЅСЏС‚СЊ РІС‹РґРµР»РµРЅРёРµ
                    </button>
                  </div>
                </div>
              )}

              {/* в”Ђв”Ђ DESKTOP PRODUCTS TABLE (Hidden on mobile) в”Ђв”Ђв”Ђв”Ђ */}
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
                      <th className="p-4 w-16">Р¤РѕС‚Рѕ</th>
                      <th className="p-4">РўРѕРІР°СЂ</th>
                      <th className="p-4">РљР°С‚РµРіРѕСЂРёСЏ</th>
                      <th className="p-4">РќР°Р»РёС‡РёРµ</th>
                      <th className="p-4 text-right">Р¦РµРЅР° (USD)</th>
                      <th className="p-4 text-center">Р РµР№С‚РёРЅРі</th>
                      <th className="p-4 text-right">Р”РµР№СЃС‚РІРёСЏ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#142340]">
                    {loading && (
                      <tr>
                        <td colSpan={9} className="p-12 text-center text-[#7a8fa6] font-mono text-xs">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0066ff]" />
                          РЎРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ СЃ Р±Р°Р·РѕР№ РґР°РЅРЅС‹С… Supabase...
                        </td>
                      </tr>
                    )}
                    {!loading && filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan={9} className="p-12 text-center text-[#7a8fa6] font-mono text-xs">
                          РџРѕ РІР°С€РµРјСѓ Р·Р°РїСЂРѕСЃСѓ РЅРёС‡РµРіРѕ РЅРµ РЅР°Р№РґРµРЅРѕ
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
                            {p.priority ?? "вЂ”"}
                          </td>

                          {/* Photo Thumbnail */}
                          <td className="p-4">
                            <div
                              onClick={() => handleImageClick(p.id)}
                              className="relative w-12 h-12 rounded-xl overflow-hidden border border-[#16274a] bg-[#070e1b] cursor-pointer group/img shrink-0"
                              title="РќР°Р¶РјРёС‚Рµ С‡С‚РѕР±С‹ Р·Р°РјРµРЅРёС‚СЊ С„РѕС‚Рѕ"
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
                              {activeEditingIds.has(p.id) ? (
                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="text"
                                    value={inlineEdits[p.id]?.name ?? p.name}
                                    onChange={(e) => updateInlineField(p.id, "name", e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") saveSingleProductInline(p.id);
                                      if (e.key === "Escape") cancelEditProduct(p.id);
                                    }}
                                    className="w-56 bg-[#070e1b] border border-[#0066ff] rounded px-2 py-1 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-[#0066ff]"
                                  />
                                  <button
                                    onClick={() => saveSingleProductInline(p.id)}
                                    className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                                    title="Сохранить этот товар"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => cancelEditProduct(p.id)}
                                    className="p-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                                    title="Отменить"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div
                                  onClick={() => startEditProduct(p, "name")}
                                  className="font-bold text-white text-xs sm:text-sm truncate max-w-[260px] cursor-pointer hover:text-[#3b82f6] transition-colors flex items-center gap-1.5 group/title"
                                  title="Кликните чтобы редактировать название (можно открыть сразу несколько)"
                                >
                                  <span>{p.name}</span>
                                  <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/title:opacity-100 text-[#5a6f8a]" />
                                </div>
                              )}
                              <div className="text-[10px] font-mono text-[#7a8fa6] mt-0.5 flex items-center gap-2">
                                <span>ID #{p.id}</span>
                                <span>В·</span>
                                <span>Р‘СЂРµРЅРґ: <strong className="text-white/80">{p.brand || "AlfaComp"}</strong></span>
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
                              title={p.in_stock ? "РќР°Р¶РјРёС‚Рµ С‡С‚РѕР±С‹ СЃРЅСЏС‚СЊ СЃ РїСЂРѕРґР°Р¶Рё" : "РќР°Р¶РјРёС‚Рµ С‡С‚РѕР±С‹ РїРµСЂРµРІРµСЃС‚Рё РІ РЅР°Р»РёС‡РёРµ"}
                            >
                              <span>{p.in_stock ? "в—Џ Р’ РЅР°Р»РёС‡РёРё" : "в—‹ РќРµ РІ РЅР°Р»РёС‡РёРё"}</span>
                            </button>
                          </td>

                          {/* Price USD Primary + UZS Subtitle */}
                          <td className="p-4 text-right font-mono">
                            {activeEditingIds.has(p.id) ? (
                              <div className="flex flex-col items-end gap-1" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="text-[#0066ff] font-bold text-sm">$</span>
                                  <input
                                    type="number"
                                    step="any"
                                    value={inlineEdits[p.id]?.priceUSD ?? String(priceUSD)}
                                    onChange={(e) => updateInlineField(p.id, "priceUSD", e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") saveSingleProductInline(p.id);
                                      if (e.key === "Escape") cancelEditProduct(p.id);
                                    }}
                                    className="w-24 bg-[#070e1b] border border-[#0066ff] rounded px-2 py-1 text-sm font-mono font-bold text-white text-right outline-none focus:ring-1 focus:ring-[#0066ff]"
                                  />
                                </div>
                                <div className="text-[10px] text-[#7a8fa6] mt-0.5 font-mono">
                                  ≈ {formatPrice(Math.round((parseFloat(inlineEdits[p.id]?.priceUSD) || priceUSD) * (exchangeRate || 14000)))} сум
                                </div>
                              </div>
                            ) : (
                              <div>
                                <button
                                  onClick={() => startEditProduct(p, "price")}
                                  className="font-bold text-sm text-white hover:text-[#3b82f6] transition-colors flex items-center justify-end gap-1 ml-auto group/price"
                                  title="Кликните чтобы изменить цену"
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
                                title="Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ С‚РѕРІР°СЂ"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDuplicateProduct(p)}
                                className="p-2 rounded-xl bg-[#070e1b] border border-[#16274a] hover:border-[#0066ff] text-white/70 hover:text-white transition-all"
                                title="Р”СѓР±Р»РёСЂРѕРІР°С‚СЊ С‚РѕРІР°СЂ"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.id, p.name)}
                                className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                                title="РЈРґР°Р»РёС‚СЊ С‚РѕРІР°СЂ"
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

                {/* Floating Multi-Edit Action Bar */}
                {activeEditingIds.size > 0 && (
                  <div className="sticky bottom-4 z-40 mx-auto my-3 max-w-xl bg-[#0b162c]/95 border border-[#0066ff] shadow-2xl backdrop-blur-md rounded-2xl px-5 py-3 flex items-center justify-between gap-4 text-white animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#0066ff] animate-pulse" />
                      <span className="text-xs sm:text-sm font-semibold">
                        Редактируется товаров: <strong className="text-[#3b82f6] font-mono text-sm">{activeEditingIds.size}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={cancelAllInlineEdits}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium text-white/80 transition-colors"
                      >
                        Отменить все
                      </button>
                      <button
                        onClick={saveAllInlineEdits}
                        disabled={isSavingAllInline}
                        className="px-4 py-1.5 rounded-xl bg-[#0066ff] hover:bg-[#0052cc] text-xs font-bold text-white flex items-center gap-1.5 shadow-lg shadow-[#0066ff]/30 transition-all disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {isSavingAllInline ? "Сохранение..." : `Сохранить все (${activeEditingIds.size})`}
                      </button>
                    </div>
                  </div>
                )}

                {/* Table Footer with Pagination */}
                <div className="bg-[#080f1e] px-5 py-3.5 border-t border-[#16274a] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-[#7a8fa6]">
                  <div>
                    РџРѕРєР°Р·Р°РЅРѕ{" "}
                    <strong className="text-white">
                      {filteredProducts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}-
                      {Math.min(currentPage * pageSize, filteredProducts.length)}
                    </strong>{" "}
                    РёР· <strong className="text-white">{filteredProducts.length}</strong>
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

          {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
          {/* в”Ђв”Ђ TAB 2: РђРќРђР›РРўРРљРђ Р’РРўР РРќР« в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
          {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
          {tab === "analytics" && (() => {
            const CHART_COLORS = ["#0066ff", "#ff8c42", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];
            const categoryChartData = Object.entries(metrics.categoryCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([name, value]) => ({ name, value }));

            const stockPieData = [
              { name: "Р’ РЅР°Р»РёС‡РёРё", value: metrics.inStockCount, color: "#10b981" },
              { name: "РќРµС‚ РІ РЅР°Р»РёС‡РёРё", value: metrics.outOfStockCount, color: "#f59e0b" },
            ].filter((d) => d.value > 0);

            return (
              <div className="space-y-6">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-[#0066ff]" />
                    <span>РђРЅР°Р»РёС‚РёРєР° РІРёС‚СЂРёРЅС‹</span>
                  </h1>
                  <p className="text-xs text-[#7a8fa6] mt-1">Р“СЂР°С„РёРєРё, СЃС‚Р°С‚РёСЃС‚РёРєР°, РїРѕРїСѓР»СЏСЂРЅРѕСЃС‚СЊ С‚РѕРІР°СЂРѕРІ</p>
                </div>

                {/* KPI Cards Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-5">
                    <div className="text-2xl sm:text-3xl font-mono font-bold text-white">
                      {metrics.totalViews.toLocaleString()}
                    </div>
                    <div className="text-[10px] font-mono uppercase text-[#7a8fa6] tracking-wider mt-1">
                      РџСЂРѕСЃРјРѕС‚СЂС‹ РІРёС‚СЂРёРЅС‹
                    </div>
                  </div>

                  <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-5">
                    <div className="text-2xl sm:text-3xl font-mono font-bold text-[#0066ff]">
                      {visitorStats.uniqueIps}
                    </div>
                    <div className="text-[10px] font-mono uppercase text-[#7a8fa6] tracking-wider mt-1">
                      РЈРЅРёРєР°Р»СЊРЅС‹Рµ IP
                    </div>
                  </div>

                  <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-5">
                    <div className="text-2xl sm:text-3xl font-mono font-bold text-emerald-400">
                      {visitorStats.todayCount}
                    </div>
                    <div className="text-[10px] font-mono uppercase text-[#7a8fa6] tracking-wider mt-1">
                      РЎРµРіРѕРґРЅСЏ РІРёР·РёС‚РѕРІ
                    </div>
                  </div>

                  <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-5">
                    <div className="text-2xl sm:text-3xl font-mono font-bold text-rose-400">
                      {metrics.totalLikes}
                    </div>
                    <div className="text-[10px] font-mono uppercase text-[#7a8fa6] tracking-wider mt-1">
                      Р›Р°Р№РєРѕРІ РїРѕРєСѓРїР°С‚РµР»РµР№
                    </div>
                  </div>
                </div>

                {/* Category Distribution Bar Chart */}
                <div className="bg-[#0b1528] border border-[#16274a] rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-[#0066ff]" />
                      <h3 className="font-mono uppercase tracking-wider text-xs text-white font-bold">
                        РўРѕРІР°СЂС‹ РїРѕ РєР°С‚РµРіРѕСЂРёСЏРј
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono text-[#7a8fa6]">Р’СЃРµРіРѕ {metrics.categoriesCount} РєР°С‚РµРіРѕСЂРёР№</span>
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
                      <Bar dataKey="value" name="РўРѕРІР°СЂРѕРІ" radius={[6, 6, 0, 0]}>
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
                        РўРѕРї-6 С‚РѕРІР°СЂРѕРІ РїРѕ РїСЂРѕСЃРјРѕС‚СЂР°Рј
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
                            <div className="text-[10px] text-[#7a8fa6]">РїСЂРѕСЃРјРѕС‚СЂРѕРІ</div>
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
                          РСЃС‚РѕС‡РЅРёРєРё С‚СЂР°С„РёРєР°
                        </h3>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-400">{visitors.length} РІРёР·РёС‚РѕРІ</span>
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

          {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
          {/* в”Ђв”Ђ ORDERS & CRM TAB в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
          {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
          {tab === "orders" && (
            <OrdersCrmTab
              products={products}
              exchangeRate={exchangeRate}
            />
          )}

          {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
          {/* в”Ђв”Ђ SEO AUDIT TAB в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
          {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
          {tab === "seo" && <SeoAuditTab />}

          {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
          {/* в”Ђв”Ђ CHANGE HISTORY TAB в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
          {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
          {tab === "history" && <ChangeHistoryTab />}

          {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
          {/* в”Ђв”Ђ TAB 3: РћРўРљРЈР”Рђ РџРћР›Р¬Р—РћР’РђРўР•Р›Р (РљРђР РўРђ & РўР РђР¤РРљ) в”Ђв”Ђв”Ђв”Ђ */}
          {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
          {tab === "stats" && (
            <UserGeographyTab
              visitors={visitors}
              loading={visitorsLoading}
              onRefresh={fetchVisitors}
            />
          )}

          {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
          {/* в”Ђв”Ђ TAB 4: TELEGRAM Р‘РћРў & CRM в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
          {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
          {tab === "telegram" && <TelegramBotTab />}

          {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
          {/* в”Ђв”Ђ TAB 5: РџРћР›Р¬Р—РћР’РђРўР•Р›Р в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
          {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
          {tab === "users" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <Users className="w-6 h-6 text-[#0066ff]" />
                  <span>РџРѕР»СЊР·РѕРІР°С‚РµР»Рё Рё РѕРїРµСЂР°С‚РѕСЂС‹</span>
                </h1>
                <p className="text-xs text-[#7a8fa6] mt-1">РљР»РёРµРЅС‚С‹ Р±РѕС‚Р° Рё РїСЂР°РІР° РґРѕСЃС‚СѓРїР° Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР°</p>
              </div>

              <div className="bg-[#0b1528] rounded-2xl border border-[#16274a] p-6 space-y-4">
                <h3 className="text-sm font-bold text-white">РЎРїРёСЃРѕРє РїРѕРєСѓРїР°С‚РµР»РµР№ РёР· Telegram ({tgUsers.length})</h3>
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
                        РћС‚РєСЂС‹С‚СЊ С‡Р°С‚
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
          {/* в”Ђв”Ђ TAB 6: РќРђРЎРўР РћР™РљР & РљРЈР РЎ Р¦Р‘ в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
          {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
          {tab === "settings" && (
            <SettingsTab
              currentExchangeRate={exchangeRate}
              onUpdateExchangeRate={updateExchangeRate}
            />
          )}
        </main>

        {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
        {/* в”Ђв”Ђ 3. MOBILE BOTTOM NAVIGATION BAR в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
        {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080f1e]/95 backdrop-blur-xl border-t border-[#142340] safe-area-inset-bottom">
          <div className="flex items-stretch h-16">
            {[
              { id: "overview" as AdminTab, label: "Р“Р»Р°РІРЅР°СЏ", icon: LayoutDashboard },
              { id: "products" as AdminTab, label: "РљР°С‚Р°Р»РѕРі", icon: Package },
              { id: "analytics" as AdminTab, label: "РђРЅР°Р»РёС‚РёРєР°", icon: BarChart3 },
              { id: "telegram" as AdminTab, label: "Р‘РѕС‚", icon: Send },
              { id: "settings" as AdminTab, label: "Р•С‰С‘", icon: Settings },
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

      {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
      {/* в”Ђв”Ђ 4. PRODUCT DRAWER EDITOR (FULL PROPS PRESERVED) в”Ђв”Ђ */}
      {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
      <ProductDrawerEditor
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        product={drawerProduct}
        categories={allCategories}
        exchangeRate={exchangeRate}
        onSave={handleSaveDrawerProduct}
      />

      {/* в”Ђв”Ђ Bulk Edit Modal в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
      <BulkEditModal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        selectedProductIds={selectedProductIds}
        products={products}
        onSuccess={() => {
          setSelectedProductIds([]);
          fetchProducts();
        }}
        categories={allCategories}
        exchangeRate={exchangeRate}
      />

      {/* в”Ђв”Ђ Export & Photos Modal в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        products={products}
      />
    </div>
  );
};

export default Admin;

