import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Eye, Lock, Package, Plus, Trash2, Users, 
  Sparkles, Save, Search, RefreshCw, Layers 
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

const ADMIN_PASSWORD = "Bilol2013/";

const Admin = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<"stats" | "products" | "add" | "ai">("products");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState<string>("ИБП");
  const [newProduct, setNewProduct] = useState({
    name: "",
    image: "",
    price: "",
    category: "ИБП",
    brand: ""
  });

  // 1. Fetch products from Supabase
  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      toast.error("Ошибка загрузки: " + error.message);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (authenticated) {
      fetchProducts();
    }
  }, [authenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      toast.success("Добро пожаловать, Билол!");
    } else {
      toast.error("Неверный пароль!");
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) {
      toast.error("Заполните обязательные поля!");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .insert([{
        name: newProduct.name,
        category: selectedCategory,
        price: parseFloat(newProduct.price),
        image: newProduct.image || "https://via.placeholder.com/300",
        brand: newProduct.brand || "Generic",
        in_stock: true
      }])
      .select();

    if (error) {
      toast.error("Ошибка: " + error.message);
    } else {
      toast.success("Товар добавлен!");
      setNewProduct({ name: "", image: "", price: "", category: "ИБП", brand: "" });
      fetchProducts();
      setTab("products");
    }
    setLoading(false);
  };

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm("Удалить этот товар?")) return;

    setLoading(true);
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Ошибка удаления");
    } else {
      toast.success("Удалено");
      fetchProducts();
    }
    setLoading(false);
  };

  const handleAISearch = async () => {
    if (!aiPrompt.trim()) return;
    
    setLoading(true);
    toast.info("ИИ анализирует запрос...");

    const prompt = aiPrompt.toLowerCase();
    
    // Имитация работы ИИ (парсинг команд)
    try {
      if (prompt.includes("удали") || prompt.includes("delete")) {
        const namePart = prompt.split("товар")[1]?.trim() || prompt.split("удали")[1]?.trim();
        if (namePart) {
          const { error } = await supabase.from("products").delete().ilike("name", `%${namePart}%`);
          if (error) throw error;
          toast.success(`ИИ удалил товары, похожие на "${namePart}"`);
        }
      } else if (prompt.includes("цена") || prompt.includes("подними") || prompt.includes("снизь")) {
        // Логика изменения цен...
        toast.warning("Функция массового изменения цен через ИИ в разработке");
      } else {
        toast.error("ИИ пока не понимает эту команду. Попробуйте 'Удали товар [название]'");
      }
    } catch (err) {
      toast.error("Ошибка ИИ");
    }
    
    fetchProducts();
    setLoading(false);
    setAiPrompt("");
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#111] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl"
        >
          <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-primary/20">
            <Lock className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-black text-center mb-2 text-white">AlfaComp Panel</h1>
          <p className="text-muted-foreground text-center mb-8 text-sm">Введите пароль администратора</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm outline-none focus:border-primary transition-all text-white"
                autoFocus
              />
            </div>
            <button className="w-full bg-primary text-primary-foreground rounded-2xl py-4 font-bold hover:brightness-110 transition-all shadow-lg shadow-primary/20">
              Войти в систему
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white selection:bg-primary/30">
      {/* Sidebar / Header */}
      <nav className="glass border-b border-white/5 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/")} className="p-2 hover:bg-white/5 rounded-xl transition-all">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="h-8 w-[1px] bg-white/10 mx-2" />
            <h1 className="text-xl font-black tracking-tight">ADMIN <span className="text-primary">CORE</span></h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">System Online</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-3 mb-10">
          {[
            { id: "products", icon: Package, label: "Товары" },
            { id: "add", icon: Plus, label: "Добавить" },
            { id: "ai", icon: Sparkles, label: "AI Ассистент" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id as any)}
              className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-bold text-sm transition-all border ${
                tab === item.id 
                  ? "bg-primary border-primary text-primary-foreground shadow-xl shadow-primary/20 scale-105" 
                  : "bg-white/5 border-white/5 hover:bg-white/10"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === "products" && (
            <motion.div 
              key="products"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="Поиск по базе..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:border-primary"
                  />
                </div>
                <button 
                  onClick={fetchProducts} 
                  className="flex items-center gap-2 px-6 py-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/5"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Обновить данные
                </button>
              </div>

              <div className="bg-[#111] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.02]">
                        <th className="p-6 text-xs font-bold uppercase tracking-widest text-muted-foreground">Товар</th>
                        <th className="p-6 text-xs font-bold uppercase tracking-widest text-muted-foreground">Категория</th>
                        <th className="p-6 text-xs font-bold uppercase tracking-widest text-muted-foreground text-right">Цена</th>
                        <th className="p-6 text-xs font-bold uppercase tracking-widest text-muted-foreground text-right">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="p-6">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-white/5 overflow-hidden border border-white/10">
                                <img src={p.image} alt="" className="w-full h-full object-cover" />
                              </div>
                              <div>
                                <div className="font-bold text-white">{p.name}</div>
                                <div className="text-[10px] text-muted-foreground uppercase tracking-tight mt-1">{p.brand}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-6">
                            <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold border border-white/5 text-primary">
                              {p.category}
                            </span>
                          </td>
                          <td className="p-6 text-right font-black text-white">
                            {new Intl.NumberFormat('ru-RU').format(p.price)} <span className="text-[10px] text-muted-foreground ml-1">СУМ</span>
                          </td>
                          <td className="p-6 text-right">
                            <button 
                              onClick={() => handleDeleteProduct(p.id)}
                              className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all scale-0 group-hover:scale-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {tab === "add" && (
            <motion.div 
              key="add"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-[#111] border border-white/5 rounded-[32px] p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                   <Plus className="w-32 h-32" />
                </div>
                
                <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                    <Plus className="w-5 h-5 text-primary" />
                  </div>
                  Новый товар
                </h2>

                <form onSubmit={handleAddProduct} className="space-y-6">
                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Основная информация</label>
                    <input 
                      placeholder="Название товара"
                      value={newProduct.name}
                      onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-primary"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <input 
                        placeholder="Бренд"
                        value={newProduct.brand}
                        onChange={e => setNewProduct({...newProduct, brand: e.target.value})}
                        className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-primary"
                      />
                      <select 
                        value={selectedCategory}
                        onChange={e => setSelectedCategory(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-primary appearance-none cursor-pointer"
                      >
                        {["ИБП", "Мониторы", "Сеть", "Аксессуары", "Смартфоны"].map(c => (
                          <option key={c} value={c} className="bg-[#111]">{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Цена и Фото</label>
                    <input 
                      type="number"
                      placeholder="Цена в сумах"
                      value={newProduct.price}
                      onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-primary font-black text-primary"
                    />
                    <input 
                      placeholder="Ссылка на изображение (URL)"
                      value={newProduct.image}
                      onChange={e => setNewProduct({...newProduct, image: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-primary"
                    />
                  </div>

                  <button className="w-full bg-primary text-primary-foreground py-5 rounded-[20px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:brightness-110 transition-all active:scale-95">
                    Опубликовать на сайте
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {tab === "ai" && (
            <motion.div 
              key="ai"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl mx-auto"
            >
              <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-[40px] p-12 shadow-2xl text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
                
                <div className="w-24 h-24 bg-primary/20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                  <Sparkles className="w-12 h-12 text-primary animate-pulse" />
                </div>
                
                <h2 className="text-4xl font-black mb-4 tracking-tighter">AI COMMAND CENTER</h2>
                <p className="text-muted-foreground mb-12 max-w-md mx-auto leading-relaxed">
                  Просто напишите, что нужно сделать с товарами, и наш ИИ выполнит это за секунду.
                </p>

                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-600 rounded-[30px] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
                  <textarea 
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    placeholder="Например: Удали все товары где есть слово 'Router'..."
                    className="relative w-full bg-[#111] border border-white/10 rounded-[28px] px-8 py-6 h-40 outline-none focus:border-primary text-lg resize-none shadow-2xl"
                  />
                </div>

                <div className="mt-8 flex flex-col gap-4">
                  <button 
                    onClick={handleAISearch}
                    disabled={loading}
                    className="bg-primary text-primary-foreground px-12 py-5 rounded-[24px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-primary/30"
                  >
                    {loading ? "Выполняю..." : "Выполнить команду"}
                  </button>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-50">
                    Совет: Пишите четко, например "Измени цену на 500000"
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Admin;
