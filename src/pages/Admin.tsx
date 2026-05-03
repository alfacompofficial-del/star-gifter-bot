import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Eye, Lock, Package, Plus, Trash2, Users, 
  Sparkles, Save, Search, RefreshCw, Layers, AlertCircle
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
      console.error("Supabase fetch error:", error);
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
    const productData = {
      name: newProduct.name,
      category: selectedCategory,
      price: parseFloat(newProduct.price),
      image: newProduct.image || "https://via.placeholder.com/300",
      brand: newProduct.brand || "Generic",
      in_stock: true
    };

    console.log("Attempting to insert:", productData);

    const { data, error } = await supabase
      .from("products")
      .insert([productData])
      .select();

    if (error) {
      console.error("Supabase insert error:", error);
      toast.error("Ошибка сервера: " + error.message);
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
      console.error("Supabase delete error:", error);
      toast.error("Ошибка удаления");
    } else {
      toast.success("Удалено");
      fetchProducts();
    }
    setLoading(false);
  };

  // МОЗГ ИИ (Smart Command Parser)
  const handleAISearch = async () => {
    if (!aiPrompt.trim()) return;
    
    setLoading(true);
    const cmd = aiPrompt.toLowerCase();
    toast.info("ИИ обрабатывает команду...");

    try {
      // 1. Команда "Удали всё"
      if (cmd.includes("удали все") || cmd.includes("очисти базу")) {
        if (window.confirm("ИИ ХОЧЕТ УДАЛИТЬ ВСЕ ТОВАРЫ. Вы уверены?")) {
           const { error } = await supabase.from("products").delete().neq("id", 0);
           if (error) throw error;
           toast.success("ИИ успешно очистил базу данных");
        }
      } 
      // 2. Команда "Удали [название]"
      else if (cmd.includes("удали")) {
        const target = cmd.replace("удали", "").replace("товар", "").trim();
        const { error } = await supabase.from("products").delete().ilike("name", `%${target}%`);
        if (error) throw error;
        toast.success(`ИИ удалил товары, где есть "${target}"`);
      }
      // 3. Команда "Скидка" или "Измени цену"
      else if (cmd.includes("скидк") || cmd.includes("снизь цену") || cmd.includes("дешевле")) {
        const percentMatch = cmd.match(/\d+/);
        const percent = percentMatch ? parseInt(percentMatch[0]) : 10;
        
        // Получаем все товары
        const { data: allProducts } = await supabase.from("products").select("*");
        if (allProducts) {
          for (const p of allProducts) {
            const newPrice = Math.round(p.price * (1 - percent / 100));
            await supabase.from("products").update({ price: newPrice }).eq("id", p.id);
          }
          toast.success(`ИИ применил скидку ${percent}% ко всем товарам`);
        }
      }
      // 4. Поиск / Фильтр через ИИ
      else if (cmd.includes("покажи") || cmd.includes("найди")) {
        const target = cmd.replace("покажи", "").replace("найди", "").trim();
        setSearchQuery(target);
        setTab("products");
        toast.success(`ИИ нашел для вас: ${target}`);
      }
      else {
        toast.error("ИИ не понял. Попробуйте: 'Удали все', 'Скидка 20%', 'Удали товар [имя]'");
      }
    } catch (err: any) {
      console.error("AI execution error:", err);
      toast.error("Ошибка ИИ: " + (err.message || "Неизвестная ошибка"));
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
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#111] border border-white/10 rounded-[40px] p-10 w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)]"
        >
          <div className="w-24 h-24 bg-gradient-to-tr from-primary to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-10 shadow-xl rotate-3">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-center mb-2 text-white tracking-tighter">ALFA ADMIN</h1>
          <p className="text-muted-foreground text-center mb-10 text-sm font-medium">Введите секретный код</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-center text-xl tracking-[0.5em] outline-none focus:border-primary transition-all text-white"
              autoFocus
            />
            <button className="w-full bg-primary text-primary-foreground rounded-2xl py-5 font-black text-sm uppercase tracking-widest hover:brightness-125 transition-all shadow-lg shadow-primary/20 active:scale-95">
              Авторизация
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white selection:bg-primary/30 font-sans">
      <nav className="border-b border-white/5 sticky top-0 z-50 bg-[#080808]/80 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={() => navigate("/")} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all border border-white/10">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-black tracking-tighter uppercase">Admin <span className="text-primary italic">OS</span></h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">System Status</span>
              <span className="text-xs font-bold text-green-500 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                Active & Encrypted
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-wrap gap-4 mb-16">
          {[
            { id: "products", icon: Package, label: "Каталог" },
            { id: "add", icon: Plus, label: "Добавить" },
            { id: "ai", icon: Sparkles, label: "AI Команды" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id as any)}
              className={`flex items-center gap-4 px-8 py-5 rounded-3xl font-black text-xs uppercase tracking-widest transition-all border ${
                tab === item.id 
                  ? "bg-white text-black border-white shadow-[0_10px_30px_rgba(255,255,255,0.1)] scale-105" 
                  : "bg-white/5 border-white/5 hover:bg-white/10 text-muted-foreground hover:text-white"
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="Быстрый поиск по названию или категории..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-[24px] pl-16 pr-6 py-5 text-base outline-none focus:border-primary transition-all shadow-inner"
                  />
                </div>
                <button 
                  onClick={fetchProducts} 
                  className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-5 bg-white/5 rounded-[24px] hover:bg-white/10 transition-all border border-white/10 font-bold text-sm"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Синхронизировать
                </button>
              </div>

              <div className="bg-[#111] border border-white/5 rounded-[40px] overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.02]">
                        <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Продукт</th>
                        <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Категория</th>
                        <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">Стоимость</th>
                        <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">Опции</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredProducts.length > 0 ? filteredProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-white/[0.03] transition-all group">
                          <td className="p-8">
                            <div className="flex items-center gap-6">
                              <div className="w-16 h-16 rounded-[20px] bg-white/5 overflow-hidden border border-white/10 shadow-lg">
                                <img src={p.image} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                              </div>
                              <div>
                                <div className="font-black text-lg text-white leading-tight">{p.name}</div>
                                <div className="text-[10px] text-primary font-black uppercase tracking-widest mt-2">{p.brand}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-8">
                            <span className="px-4 py-2 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10">
                              {p.category}
                            </span>
                          </td>
                          <td className="p-8 text-right">
                            <div className="font-black text-xl text-white">
                              {new Intl.NumberFormat('ru-RU').format(p.price)}
                            </div>
                            <div className="text-[9px] font-bold text-muted-foreground mt-1 uppercase tracking-tighter">СУМ (UZS)</div>
                          </td>
                          <td className="p-8 text-right">
                            <button 
                              onClick={() => handleDeleteProduct(p.id)}
                              className="w-12 h-12 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center mx-auto md:ml-auto md:mr-0 opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={4} className="p-20 text-center">
                             <div className="flex flex-col items-center gap-4 opacity-20">
                                <Package className="w-16 h-16" />
                                <p className="font-bold uppercase tracking-[0.3em]">База данных пуста</p>
                             </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {tab === "add" && (
            <motion.div 
              key="add"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-3xl mx-auto"
            >
              <div className="bg-[#111] border border-white/5 rounded-[48px] p-12 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                
                <h2 className="text-3xl font-black mb-12 flex items-center gap-4">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                    <Plus className="w-7 h-7 text-primary" />
                  </div>
                  Создать товар
                </h2>

                <form onSubmit={handleAddProduct} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Название устройства</label>
                      <input 
                        placeholder="Напр: TP-Link Archer AX73"
                        value={newProduct.name}
                        onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-[24px] px-8 py-5 outline-none focus:border-primary transition-all font-bold"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Бренд</label>
                      <input 
                        placeholder="Напр: TP-Link"
                        value={newProduct.brand}
                        onChange={e => setNewProduct({...newProduct, brand: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-[24px] px-8 py-5 outline-none focus:border-primary transition-all font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Категория</label>
                      <select 
                        value={selectedCategory}
                        onChange={e => setSelectedCategory(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-[24px] px-8 py-5 outline-none focus:border-primary appearance-none cursor-pointer font-bold"
                      >
                        {["ИБП", "Мониторы", "Сеть", "Аксессуары", "Смартфоны", "Комплектующие"].map(c => (
                          <option key={c} value={c} className="bg-[#111]">{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Стоимость (СУМ)</label>
                      <input 
                        type="number"
                        placeholder="0"
                        value={newProduct.price}
                        onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-[24px] px-8 py-5 outline-none focus:border-primary font-black text-xl text-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">URL Изображения</label>
                    <input 
                      placeholder="https://..."
                      value={newProduct.image}
                      onChange={e => setNewProduct({...newProduct, image: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-[24px] px-8 py-5 outline-none focus:border-primary transition-all font-medium"
                    />
                  </div>

                  <button 
                    disabled={loading}
                    className="w-full bg-primary text-primary-foreground py-6 rounded-[28px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:brightness-110 transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-3"
                  >
                    {loading ? <RefreshCw className="animate-spin w-5 h-5" /> : "Запустить в продажу"}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {tab === "ai" && (
            <motion.div 
              key="ai"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-4xl mx-auto"
            >
              <div className="bg-gradient-to-b from-primary/20 to-[#111] border border-primary/30 rounded-[60px] p-16 shadow-[0_30px_100px_rgba(var(--primary),0.1)] text-center relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(var(--primary),0.1),transparent)] pointer-events-none" />
                
                <div className="w-32 h-32 bg-primary/20 rounded-[40px] flex items-center justify-center mx-auto mb-10 shadow-2xl border border-primary/30 rotate-12 group-hover:rotate-0 transition-transform duration-700">
                  <Sparkles className="w-16 h-16 text-primary animate-pulse" />
                </div>
                
                <h2 className="text-5xl font-black mb-6 tracking-tight uppercase italic">Neural <span className="text-primary">Control</span></h2>
                <p className="text-lg text-muted-foreground mb-16 max-w-lg mx-auto font-medium leading-relaxed">
                  Голосовой или текстовый интерфейс для прямого управления базой данных. 
                  Пишите любые команды, и наш алгоритм выполнит их мгновенно.
                </p>

                <div className="relative group max-w-2xl mx-auto">
                  <div className="absolute -inset-2 bg-gradient-to-r from-primary via-blue-500 to-purple-600 rounded-[40px] blur-xl opacity-20 group-hover:opacity-40 transition duration-1000" />
                  <textarea 
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    placeholder="Например: 'Снизь цены на все роутеры на 15%' или 'Удали товары Asus'..."
                    className="relative w-full bg-[#080808]/80 border border-white/10 rounded-[35px] px-10 py-10 h-52 outline-none focus:border-primary text-xl font-bold resize-none shadow-2xl backdrop-blur-md transition-all placeholder:opacity-30"
                  />
                </div>

                <div className="mt-12 flex flex-col items-center gap-6">
                  <button 
                    onClick={handleAISearch}
                    disabled={loading}
                    className="bg-primary text-primary-foreground px-20 py-7 rounded-[30px] font-black uppercase tracking-[0.3em] hover:scale-110 hover:shadow-[0_20px_50px_rgba(var(--primary),0.4)] transition-all active:scale-95 disabled:opacity-50"
                  >
                    {loading ? "Анализирую нейронную сеть..." : "Запустить протокол"}
                  </button>
                  
                  <div className="flex gap-10 opacity-40">
                     <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" /> Natural Language
                     </div>
                     <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" /> Mass Update
                     </div>
                     <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" /> Direct SQL
                     </div>
                  </div>
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
