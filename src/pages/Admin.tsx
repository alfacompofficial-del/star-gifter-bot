import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, Search, Upload, Check, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EXCHANGE_RATE, formatPrice } from "@/lib/constants";

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
  return String.fromCodePoint(...[...cc].map(c => 127397 + c.charCodeAt(0)));
};

const Admin = () => {
  const [tab, setTab] = useState<"products" | "add" | "stats">("products");
  const [visitors, setVisitors] = useState<VisitorRow[]>([]);
  const [visitorsLoading, setVisitorsLoading] = useState(false);
  const [visitorSearch, setVisitorSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Inline price editing
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState<string>("");

  // Inline image uploading
  const [uploadingImageId, setUploadingImageId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUploadProductId = useRef<number | null>(null);

  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState<string>("ИБП");
  const [newProduct, setNewProduct] = useState({
    name: "", image: "", price: "", old_price: "", category: "ИБП", brand: "", priority: "999"
  });

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("priority", { ascending: true })
      .order("id", { ascending: true });

    if (!error) setProducts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchVisitors = async () => {
    setVisitorsLoading(true);
    const { data, error } = await supabase
      .from("visitors" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (!error) setVisitors(((data as unknown) as VisitorRow[]) || []);
    setVisitorsLoading(false);
  };

  useEffect(() => {
    if (tab === "stats") fetchVisitors();
  }, [tab]);

  const visitorStats = useMemo(() => {
    const q = visitorSearch.trim().toLowerCase();
    const filtered = q
      ? visitors.filter(v =>
          v.ip.toLowerCase().includes(q) ||
          (v.country || "").toLowerCase().includes(q) ||
          (v.city || "").toLowerCase().includes(q))
      : visitors;
    const uniqueIps = new Set(visitors.map(v => v.ip)).size;
    const countryCounts: Record<string, number> = {};
    for (const v of visitors) {
      const key = v.country || "Неизвестно";
      countryCounts[key] = (countryCounts[key] || 0) + 1;
    }
    const topCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    return { filtered, uniqueIps, topCountries };
  }, [visitors, visitorSearch]);




  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return toast.error("Заполните цену в долларах!");
    setLoading(true);

    const productData = {
      name: newProduct.name,
      category: selectedCategory,
      price: parseFloat(newProduct.price),
      old_price: newProduct.old_price ? parseFloat(newProduct.old_price) : null,
      image: newProduct.image || "https://via.placeholder.com/300",
      brand: newProduct.brand || "Не указан",
      priority: parseInt(newProduct.priority || "999"),
      in_stock: true
    };

    const { error } = await supabase.from("products").insert([productData]);
    if (!error) {
      toast.success("Товар добавлен!");
      setNewProduct({ name: "", image: "", price: "", old_price: "", category: "ИБП", brand: "", priority: "999" });
      fetchProducts();
      setTab("products");
    } else {
      toast.error("Ошибка базы данных");
    }
    setLoading(false);
  };

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm("Удалить?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (!error) fetchProducts();
  };

  // ── Inline price editing ──────────────────────────────────────
  const startEditPrice = (p: any) => {
    setEditingPriceId(p.id);
    setEditingPriceValue(String(p.price));
  };

  const cancelEditPrice = () => {
    setEditingPriceId(null);
    setEditingPriceValue("");
  };

  const saveEditPrice = async (id: number) => {
    const val = parseFloat(editingPriceValue);
    if (isNaN(val) || val <= 0) return toast.error("Введите корректную цену");
    const { error } = await supabase.from("products").update({ price: val }).eq("id", id);
    if (!error) {
      toast.success("Цена обновлена!");
      setProducts(prev => prev.map(p => p.id === id ? { ...p, price: val } : p));
      cancelEditPrice();
    } else {
      toast.error("Ошибка сохранения");
    }
  };

  // ── Inline image upload ───────────────────────────────────────
  const handleImageClick = (productId: number) => {
    currentUploadProductId.current = productId;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const productId = currentUploadProductId.current;
    if (!file || !productId) return;

    // Reset input so same file can be re-selected
    e.target.value = "";

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return toast.error("Выберите файл изображения");
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return toast.error("Файл слишком большой (макс. 5MB)");
    }

    setUploadingImageId(productId);

    try {
      // Convert image to base64 data URL
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string;

        const { error } = await supabase
          .from("products")
          .update({ image: dataUrl })
          .eq("id", productId);

        if (!error) {
          toast.success("Фото обновлено!");
          setProducts(prev =>
            prev.map(p => p.id === productId ? { ...p, image: dataUrl } : p)
          );
        } else {
          toast.error("Ошибка загрузки фото");
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

  const filteredProducts = useMemo(() => {
    return products.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.brand || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);




  // ── Main admin panel ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080808] text-white">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <header className="border-b border-white/5 h-24 flex items-center px-10 justify-between sticky top-0 bg-black/80 backdrop-blur-xl z-50">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate("/")} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 hover:bg-white/10">
            <ArrowLeft className="w-5 h-5"/>
          </button>
          <h1 className="font-black tracking-[0.2em] text-xs uppercase">Store <span className="text-primary italic">Manager</span></h1>
        </div>
        <div className="flex items-center gap-10">
          <div className="text-right">
            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Курс USD</div>
            <div className="text-sm font-bold text-primary">1$ = {EXCHANGE_RATE} UZS</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Товаров</div>
            <div className="text-sm font-bold">{products.length}</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-10">
        <div className="flex gap-4 mb-12">
          {(["products", "add", "stats"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-12 py-5 rounded-3xl font-black text-xs uppercase tracking-widest transition-all border ${tab === t ? 'bg-primary text-black border-primary' : 'bg-white/5 text-muted-foreground border-white/5'}`}
            >
              {t === 'products' ? 'База (в $)' : t === 'add' ? 'Добавить ($)' : 'Статистика IP'}
            </button>
          ))}
        </div>

        {/* ── Products table ── */}
        {tab === "products" && (
          <div className="space-y-8">
            {/* Hints */}
            <div className="flex gap-6 text-xs text-white/40 font-bold px-2">
              <span className="flex items-center gap-2"><Upload className="w-3.5 h-3.5 text-primary/70"/>Нажмите на фото чтобы загрузить новое</span>
              <span className="flex items-center gap-2"><Pencil className="w-3.5 h-3.5 text-blue-400/70"/>Нажмите на цену чтобы изменить</span>
            </div>

            <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                placeholder="Поиск по товарам..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#111] border border-white/5 rounded-[24px] pl-16 pr-6 py-6 outline-none focus:border-primary text-lg"
              />
            </div>

            <div className="bg-[#111] rounded-[40px] border border-white/5 overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/[0.02] text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground border-b border-white/5">
                    <th className="p-8">Товар</th>
                    <th className="p-8 text-right">Цена USD ($)</th>
                    <th className="p-8 text-right">Цена СУМ (авто)</th>
                    <th className="p-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredProducts.map(p => (
                    <tr key={p.id} className="hover:bg-white/[0.01] transition-colors group">

                      {/* Image + Name */}
                      <td className="p-8 flex items-center gap-6">
                        {/* Clickable image */}
                        <div
                          className="relative w-14 h-14 rounded-2xl overflow-hidden border border-white/10 cursor-pointer group/img flex-shrink-0"
                          onClick={() => handleImageClick(p.id)}
                          title="Нажмите чтобы изменить фото"
                        >
                          {uploadingImageId === p.id ? (
                            <div className="w-full h-full flex items-center justify-center bg-black/80">
                              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                          ) : (
                            <>
                              <img
                                src={p.image}
                                className="w-full h-full object-cover transition-all group-hover/img:brightness-50"
                                onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/56"; }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                                <Upload className="w-5 h-5 text-white drop-shadow" />
                              </div>
                            </>
                          )}
                        </div>
                        <div>
                          <div className="font-black text-white text-lg">{p.name}</div>
                          <div className="text-[10px] font-bold text-primary uppercase mt-2">POS: {p.priority} | {p.brand}</div>
                        </div>
                      </td>

                      {/* Editable price */}
                      <td className="p-8 text-right">
                        {editingPriceId === p.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-blue-400 font-black text-xl">$</span>
                            <input
                              type="number"
                              value={editingPriceValue}
                              onChange={e => setEditingPriceValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === "Enter") saveEditPrice(p.id);
                                if (e.key === "Escape") cancelEditPrice();
                              }}
                              autoFocus
                              className="w-28 bg-white/10 border border-primary/50 rounded-xl px-3 py-2 text-right font-black text-xl text-blue-400 outline-none focus:border-primary"
                            />
                            <button
                              onClick={() => saveEditPrice(p.id)}
                              className="w-9 h-9 flex items-center justify-center bg-green-500/20 text-green-400 rounded-xl hover:bg-green-500 hover:text-white transition-all"
                            >
                              <Check className="w-4 h-4"/>
                            </button>
                            <button
                              onClick={cancelEditPrice}
                              className="w-9 h-9 flex items-center justify-center bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                            >
                              <X className="w-4 h-4"/>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditPrice(p)}
                            className="font-black text-xl text-blue-400 hover:text-primary transition-colors group/price flex items-center gap-2 ml-auto"
                            title="Нажмите чтобы изменить цену"
                          >
                            ${p.price}
                            <Pencil className="w-3.5 h-3.5 opacity-0 group-hover/price:opacity-60 transition-opacity"/>
                          </button>
                        )}
                      </td>

                      {/* Auto sum price */}
                      <td className="p-8 text-right font-bold text-lg opacity-60">
                        {formatPrice(Math.round(p.price * EXCHANGE_RATE))} сум
                      </td>

                      {/* Delete */}
                      <td className="p-8 text-right">
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="w-12 h-12 flex items-center justify-center bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-5 h-5"/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Add product form ── */}
        {tab === "add" && (
          <div className="max-w-2xl mx-auto bg-[#111] p-16 rounded-[60px] border border-white/5">
            <h2 className="text-2xl font-black mb-12 uppercase">Добавление в Долларах ($)</h2>
            <form onSubmit={handleAddProduct} className="space-y-8">
              <input
                placeholder="Название"
                value={newProduct.name}
                onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 outline-none focus:border-primary font-bold"
              />
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-4">Цена в $ (напр: 72)</label>
                  <input
                    type="number"
                    placeholder="72"
                    value={newProduct.price}
                    onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 outline-none focus:border-primary font-black text-2xl text-blue-400"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-4">Старая цена в $</label>
                  <input
                    type="number"
                    placeholder="85"
                    value={newProduct.old_price}
                    onChange={e => setNewProduct({...newProduct, old_price: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 outline-none focus:border-red-500 font-bold text-red-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <input
                  placeholder="Производитель (например: Lexar)"
                  value={newProduct.brand}
                  onChange={e => setNewProduct({...newProduct, brand: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 outline-none focus:border-primary font-bold"
                />
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 outline-none focus:border-primary font-bold appearance-none"
                >
                  {["ИБП", "Мониторы", "Сеть", "Аксессуары", "Смартфоны", "Комплектующие"].map(c => (
                    <option key={c} value={c} className="bg-black">{c}</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Позиция (1, 2, 3...)"
                  value={newProduct.priority}
                  onChange={e => setNewProduct({...newProduct, priority: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 outline-none focus:border-primary font-bold"
                />
              </div>
              <input
                placeholder="URL Фото"
                value={newProduct.image}
                onChange={e => setNewProduct({...newProduct, image: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 outline-none focus:border-primary"
              />
              <button
                disabled={loading}
                className="w-full bg-primary text-black font-black py-8 rounded-[30px] uppercase tracking-[0.2em] hover:brightness-110 transition-all"
              >
                Добавить товар
              </button>
            </form>
          </div>
        )}

        {/* ── Visitors stats ── */}
        {tab === "stats" && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#111] border border-white/5 rounded-3xl p-6">
                <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2">Всего визитов</div>
                <div className="text-3xl font-black text-primary">{visitors.length}</div>
              </div>
              <div className="bg-[#111] border border-white/5 rounded-3xl p-6">
                <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2">Уникальных IP</div>
                <div className="text-3xl font-black text-blue-400">{visitorStats.uniqueIps}</div>
              </div>
              <div className="bg-[#111] border border-white/5 rounded-3xl p-6 col-span-2">
                <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2">Топ стран</div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {visitorStats.topCountries.length === 0 && <span className="text-white/40 text-xs">—</span>}
                  {visitorStats.topCountries.map(([name, count]) => (
                    <span key={name} className="text-xs font-bold bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
                      {name} · <span className="text-primary">{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                placeholder="Поиск по IP, стране, городу..."
                value={visitorSearch}
                onChange={e => setVisitorSearch(e.target.value)}
                className="w-full bg-[#111] border border-white/5 rounded-[24px] pl-16 pr-6 py-6 outline-none focus:border-primary text-lg"
              />
            </div>

            <div className="bg-[#111] rounded-[40px] border border-white/5 overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/[0.02] text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground border-b border-white/5">
                    <th className="p-6">IP</th>
                    <th className="p-6">Страна / Город</th>
                    <th className="p-6">Страница</th>
                    <th className="p-6">Устройство</th>
                    <th className="p-6 text-right">Когда</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {visitorsLoading && (
                    <tr><td colSpan={5} className="p-10 text-center text-white/40">Загрузка…</td></tr>
                  )}
                  {!visitorsLoading && visitorStats.filtered.length === 0 && (
                    <tr><td colSpan={5} className="p-10 text-center text-white/40">Пока нет данных</td></tr>
                  )}
                  {visitorStats.filtered.map(v => (
                    <tr key={v.id} className="hover:bg-white/[0.01]">
                      <td className="p-6 font-mono font-bold text-blue-400">{v.ip}</td>
                      <td className="p-6">
                        <div className="font-bold">{flagEmoji(v.country_code)} {v.country || "Неизвестно"}</div>
                        <div className="text-xs text-white/40 mt-1">{[v.city, v.region].filter(Boolean).join(", ") || "—"}</div>
                      </td>
                      <td className="p-6 text-xs text-white/60 font-mono">{v.path || "/"}</td>
                      <td className="p-6 text-xs text-white/50 max-w-[280px] truncate" title={v.user_agent || ""}>{v.user_agent || "—"}</td>
                      <td className="p-6 text-right text-xs text-white/50 whitespace-nowrap">
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
    </div>
  );
};

export default Admin;
