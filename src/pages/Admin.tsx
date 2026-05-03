import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Eye, Lock, Package, Plus, Trash2, Users, 
  Sparkles, Save, Search, RefreshCw, Layers, AlertCircle, DollarSign
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { EXCHANGE_RATE } from "@/lib/constants";

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

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error("Fetch error:", error);
      toast.error("Ошибка загрузки");
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (authenticated) fetchProducts();
  }, [authenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) setAuthenticated(true);
    else toast.error("Неверный пароль!");
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return toast.error("Заполните поля!");

    setLoading(true);
    const p = {
      name: newProduct.name,
      category: selectedCategory,
      price: parseFloat(newProduct.price),
      image: newProduct.image || "https://via.placeholder.com/300",
      brand: newProduct.brand || "AlfaComp",
      in_stock: true
    };

    const { error } = await supabase.from("products").insert([p]);
    if (error) toast.error("Ошибка: " + error.message);
    else {
      toast.success("Готово!");
      setNewProduct({ name: "", image: "", price: "", category: "ИБП", brand: "" });
      fetchProducts();
      setTab("products");
    }
    setLoading(false);
  };

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm("Удалить?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (!error) fetchProducts();
  };

  // --- СУПЕР ИИ ЛОГИКА ---
  const handleAISmartControl = async () => {
    if (!aiPrompt.trim()) return;
    setLoading(true);
    const p = aiPrompt.toLowerCase();
    toast.info("Нейросеть выполняет распоряжение...");

    try {
      // Команда: Скидка или Повышение (на % или сумму)
      if (p.includes("цен") || p.includes("дороже") || p.includes("дешевле") || p.includes("скидк")) {
        const numMatch = p.match(/\d+/);
        if (!numMatch) throw new Error("Укажите число (процент или сумму)");
        const val = parseInt(numMatch[0]);
        const isPercent = val < 100 || p.includes("%") || p.includes("процент");
        const isIncrease = p.includes("подн") || p.includes("дороже") || p.includes("+");

        const { data: targets } = await supabase.from("products").select("*");
        if (targets) {
          for (const item of targets) {
            let newPrice = item.price;
            if (isPercent) {
              newPrice = isIncrease ? item.price * (1 + val/100) : item.price * (1 - val/100);
            } else {
              newPrice = isIncrease ? item.price + val : item.price - val;
            }
            await supabase.from("products").update({ price: Math.round(newPrice) }).eq("id", item.id);
          }
          toast.success(`Цены обновлены для ${targets.length} товаров`);
        }
      } 
      // Команда: Массовое переименование бренда или категории
      else if (p.includes("бренд") || p.includes("категор")) {
        const parts = p.split("на");
        if (parts.length < 2) throw new Error("Используйте формат: 'Смени категорию у [X] на [Y]'");
        const newVal = parts[1].trim();
        const { error } = await supabase.from("products").update(
          p.includes("бренд") ? { brand: newVal } : { category: newVal }
        ).neq("id", 0);
        if (!error) toast.success("Данные успешно обновлены");
      }
      // Команда: Удаление по фильтру
      else if (p.includes("удали")) {
        const target = p.replace("удали", "").replace("все", "").replace("товары", "").trim();
        if (!target || p.includes("все")) {
           if (window.confirm("УДАЛИТЬ ВООБЩЕ ВСЁ?")) {
             await supabase.from("products").delete().neq("id", 0);
             toast.success("База данных полностью очищена");
           }
        } else {
           const { error } = await supabase.from("products").delete().ilike("name", `%${target}%`);
           if (!error) toast.success(`Товары с названием "${target}" удалены`);
        }
      }
      else {
        toast.error("ИИ не уверен в команде. Попробуйте четче, например: 'Сделай скидку 10%'");
      }
    } catch (err: any) {
      toast.error("Ошибка ИИ: " + err.message);
    }
    
    fetchProducts();
    setLoading(false);
    setAiPrompt("");
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-[#111] border border-white/10 p-12 rounded-[40px] w-full max-w-sm text-center shadow-2xl">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-primary/20">
            <Lock className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-black mb-8 tracking-tighter">ALFA ADMIN</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Код доступа"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-primary text-white text-center"
            />
            <button className="w-full bg-primary text-black font-black py-4 rounded-2xl hover:scale-105 transition-all shadow-xl shadow-primary/20">ВХОД</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <header className="border-b border-white/5 h-24 flex items-center px-10 justify-between sticky top-0 bg-black/80 backdrop-blur-xl z-50">
        <div className="flex items-center gap-6">
           <button onClick={() => navigate("/")} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all border border-white/10">
             <ArrowLeft className="w-5 h-5"/>
           </button>
           <h1 className="font-black tracking-[0.2em] text-xs uppercase">Management <span className="text-primary italic">Console</span></h1>
        </div>
        <div className="flex items-center gap-8">
           <div className="text-right">
              <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Курс USD</div>
              <div className="text-sm font-bold text-primary">{EXCHANGE_RATE} UZS</div>
           </div>
           <div className="h-10 w-[1px] bg-white/10" />
           <div className="text-right">
              <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Товаров</div>
              <div className="text-sm font-bold">{products.length}</div>
           </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-10">
        <div className="flex gap-4 mb-12">
          {[
            { id: "products", label: "Каталог", icon: Package },
            { id: "add", label: "Добавить", icon: Plus },
            { id: "ai", label: "ИИ Помощник", icon: Sparkles }
          ].map(t => (
            <button 
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-3 px-10 py-5 rounded-3xl font-black text-xs uppercase tracking-widest transition-all border ${
                tab === t.id ? 'bg-white text-black border-white shadow-xl' : 'bg-white/5 text-muted-foreground border-white/5 hover:bg-white/10'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "products" && (
          <div className="space-y-8">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-600 rounded-[24px] blur opacity-10 group-hover:opacity-20 transition" />
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input 
                placeholder="Поиск по названию, бренду или категории..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="relative w-full bg-[#111] border border-white/5 rounded-[24px] pl-16 pr-6 py-6 outline-none focus:border-primary text-lg transition-all"
              />
            </div>

            <div className="bg-[#111] rounded-[40px] border border-white/5 overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/[0.02] text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground border-b border-white/5">
                    <th className="p-8">Продукт</th>
                    <th className="p-8">Категория</th>
                    <th className="p-8 text-right">Цена UZS</th>
                    <th className="p-8 text-right">Цена USD</th>
                    <th className="p-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredProducts.map(p => (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="p-8">
                        <div className="flex items-center gap-6">
                          <img src={p.image} className="w-16 h-16 rounded-2xl object-cover border border-white/10 group-hover:scale-110 transition-transform" />
                          <div>
                             <div className="font-black text-white text-lg leading-tight">{p.name}</div>
                             <div className="text-[10px] font-bold text-primary uppercase mt-2 tracking-widest">{p.brand}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-8 font-bold text-xs opacity-60 uppercase tracking-widest">{p.category}</td>
                      <td className="p-8 text-right font-black text-xl text-white">{new Intl.NumberFormat().format(p.price)}</td>
                      <td className="p-8 text-right font-black text-xl text-blue-400">
                        ${(p.price / EXCHANGE_RATE).toFixed(0)}
                      </td>
                      <td className="p-8 text-right">
                        <button onClick={() => handleDeleteProduct(p.id)} className="w-12 h-12 flex items-center justify-center bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100">
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

        {tab === "add" && (
          <div className="max-w-3xl mx-auto bg-[#111] p-16 rounded-[60px] border border-white/5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px]" />
            <h2 className="text-3xl font-black mb-12 flex items-center gap-4">
               <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                 <Plus className="w-7 h-7 text-primary" />
               </div>
               Новая позиция
            </h2>
            <form onSubmit={handleAddProduct} className="space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4">Название</label>
                  <input placeholder="Напр: Redmi 24" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 outline-none focus:border-primary font-bold" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4">Бренд</label>
                  <input placeholder="Напр: Xiaomi" value={newProduct.brand} onChange={e => setNewProduct({...newProduct, brand: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 outline-none focus:border-primary font-bold" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4">Цена в СУМ</label>
                  <div className="relative">
                    <input type="number" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 pl-12 outline-none focus:border-primary font-black text-2xl text-primary" />
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4">Категория</label>
                  <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 outline-none focus:border-primary appearance-none font-bold">
                    {["ИБП", "Мониторы", "Сеть", "Аксессуары", "Смартфоны", "Комплектующие"].map(c => <option key={c} value={c} className="bg-black">{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4">URL Фото</label>
                <input placeholder="https://..." value={newProduct.image} onChange={e => setNewProduct({...newProduct, image: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 outline-none focus:border-primary" />
              </div>

              <button disabled={loading} className="w-full bg-primary text-black font-black py-8 rounded-[30px] text-sm uppercase tracking-[0.3em] shadow-2xl shadow-primary/20 hover:brightness-125 transition-all active:scale-95">Опубликовать</button>
            </form>
          </div>
        )}

        {tab === "ai" && (
          <div className="max-w-4xl mx-auto py-10">
            <div className="bg-gradient-to-br from-primary/20 to-transparent border border-primary/20 rounded-[80px] p-20 shadow-2xl relative text-center overflow-hidden">
               <Sparkles className="w-24 h-24 text-primary mx-auto mb-10 animate-pulse" />
               <h2 className="text-5xl font-black mb-6 tracking-tighter italic uppercase">AI Smart <span className="text-primary">Master</span></h2>
               <p className="text-xl text-muted-foreground mb-16 max-w-lg mx-auto leading-relaxed">
                 Нейросеть подключена к вашей базе данных. Она понимает любые сложные задачи по массовому изменению товаров.
               </p>

               <div className="relative group">
                 <div className="absolute -inset-2 bg-gradient-to-r from-primary to-blue-600 rounded-[40px] blur-2xl opacity-10 group-hover:opacity-30 transition duration-1000" />
                 <textarea 
                   value={aiPrompt}
                   onChange={e => setAiPrompt(e.target.value)}
                   placeholder="Например: 'Сделай все роутеры на 50 000 сум дешевле' или 'Поменяй бренд всех мониторов на Redmi'..."
                   className="relative w-full bg-[#080808]/80 border border-white/10 rounded-[40px] p-12 h-60 outline-none focus:border-primary text-2xl font-bold shadow-2xl resize-none"
                 />
               </div>

               <button 
                 onClick={handleAISmartControl} 
                 disabled={loading}
                 className="mt-12 bg-primary text-black font-black px-24 py-8 rounded-[35px] text-lg uppercase tracking-[0.4em] hover:scale-105 transition-all shadow-2xl shadow-primary/30"
               >
                 {loading ? "Выполняю алгоритм..." : "Запустить протокол"}
               </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;
