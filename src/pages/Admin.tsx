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
    console.log("Admin: Starting fetch...");
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error("CRITICAL ADMIN ERROR:", error);
      toast.error("ОШИБКА БАЗЫ: " + error.message);
    } else {
      console.log("Admin: Received data:", data);
      setProducts(data || []);
      if (data?.length === 0) {
        toast.info("База данных пока пуста");
      }
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
      toast.success("Доступ разрешен!");
    } else {
      toast.error("Неверный пароль!");
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) {
      toast.error("Заполните название и цену!");
      return;
    }

    setLoading(true);
    const p = {
      name: newProduct.name,
      category: selectedCategory,
      price: parseFloat(newProduct.price),
      image: newProduct.image || "https://via.placeholder.com/300",
      brand: newProduct.brand || "AlfaComp",
      in_stock: true
    };

    console.log("Admin: Inserting product...", p);

    const { error } = await supabase.from("products").insert([p]);

    if (error) {
      console.error("INSERT ERROR:", error);
      toast.error("Ошибка при добавлении: " + error.message);
    } else {
      toast.success("Товар успешно добавлен!");
      setNewProduct({ name: "", image: "", price: "", category: "ИБП", brand: "" });
      fetchProducts();
      setTab("products");
    }
    setLoading(false);
  };

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm("Удалить?")) return;
    setLoading(true);
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error("Ошибка удаления");
    else fetchProducts();
    setLoading(false);
  };

  const handleAISearch = async () => {
    if (!aiPrompt.trim()) return;
    setLoading(true);
    const cmd = aiPrompt.toLowerCase();
    toast.info("Нейросеть обрабатывает запрос...");

    try {
      if (cmd.includes("удали все")) {
        if (window.confirm("Удалить ВСЕ товары?")) {
           await supabase.from("products").delete().neq("id", 0);
           toast.success("База очищена");
        }
      } else if (cmd.includes("скидк") || cmd.includes("цен")) {
        const { data } = await supabase.from("products").select("*");
        if (data) {
          for (const item of data) {
            await supabase.from("products").update({ price: Math.round(item.price * 0.9) }).eq("id", item.id);
          }
          toast.success("Цены снижены на 10%");
        }
      } else {
        toast.error("ИИ пока не знает такую команду");
      }
    } catch (err) { toast.error("Ошибка ИИ"); }
    
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
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-[#111] border border-white/10 p-10 rounded-[30px] w-full max-w-sm text-center">
          <Lock className="w-12 h-12 text-primary mx-auto mb-6" />
          <h1 className="text-2xl font-black mb-8">ALFA ADMIN V2</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-primary text-white"
            />
            <button className="w-full bg-primary text-black font-black py-4 rounded-2xl hover:scale-105 transition-all">ВХОД</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <header className="border-b border-white/5 h-20 flex items-center px-6 justify-between sticky top-0 bg-black/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
           <button onClick={() => navigate("/")} className="p-2 bg-white/5 rounded-lg"><ArrowLeft className="w-4 h-4"/></button>
           <h1 className="font-black tracking-widest text-sm uppercase">Admin <span className="text-primary">v2.1</span></h1>
        </div>
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Connected: {products.length} Items</div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="flex gap-4 mb-10 overflow-x-auto pb-2">
          {["products", "add", "ai"].map(t => (
            <button 
              key={t}
              onClick={() => setTab(t as any)}
              className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${tab === t ? 'bg-white text-black' : 'bg-white/5 text-muted-foreground'}`}
            >
              {t === 'products' ? 'Каталог' : t === 'add' ? 'Добавить' : 'ИИ'}
            </button>
          ))}
        </div>

        {tab === "products" && (
          <div className="space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                placeholder="Поиск..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 outline-none focus:border-primary"
              />
            </div>

            <div className="bg-[#111] rounded-[24px] border border-white/5 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-white/5 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                    <th className="p-6">Название</th>
                    <th className="p-6">Категория</th>
                    <th className="p-6 text-right">Цена</th>
                    <th className="p-6"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredProducts.length > 0 ? filteredProducts.map(p => (
                    <tr key={p.id} className="hover:bg-white/5">
                      <td className="p-6 font-bold flex items-center gap-4">
                        <img src={p.image} className="w-10 h-10 rounded-lg object-cover" />
                        {p.name}
                      </td>
                      <td className="p-6 opacity-60 text-xs">{p.category}</td>
                      <td className="p-6 text-right font-black text-primary">{new Intl.NumberFormat().format(p.price)}</td>
                      <td className="p-6 text-right">
                        <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="p-20 text-center text-muted-foreground font-bold uppercase tracking-widest text-xs opacity-20">
                        <Package className="w-10 h-10 mx-auto mb-4" />
                        База данных пуста или не загружена
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "add" && (
          <div className="max-w-xl mx-auto bg-[#111] p-10 rounded-[40px] border border-white/5">
            <h2 className="text-xl font-black mb-8">ДОБАВИТЬ ТОВАР</h2>
            <form onSubmit={handleAddProduct} className="space-y-6">
              <input placeholder="Название" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-primary" />
              <input placeholder="Цена (СУМ)" type="number" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-primary" />
              <input placeholder="Бренд" value={newProduct.brand} onChange={e => setNewProduct({...newProduct, brand: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-primary" />
              <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-primary">
                 {["ИБП", "Мониторы", "Сеть", "Аксессуары", "Смартфоны"].map(c => <option key={c} value={c} className="bg-black">{c}</option>)}
              </select>
              <input placeholder="URL Картинки" value={newProduct.image} onChange={e => setNewProduct({...newProduct, image: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-primary" />
              <button disabled={loading} className="w-full bg-primary text-black font-black py-4 rounded-2xl hover:brightness-125 transition-all">ОПУБЛИКОВАТЬ</button>
            </form>
          </div>
        )}

        {tab === "ai" && (
          <div className="max-w-2xl mx-auto text-center py-10">
             <Sparkles className="w-16 h-16 text-primary mx-auto mb-6 animate-pulse" />
             <h2 className="text-3xl font-black mb-4 uppercase">AI КОМАНДЫ</h2>
             <p className="text-muted-foreground mb-10">Напишите "Удали все" или "Сделай скидку"</p>
             <textarea 
               value={aiPrompt}
               onChange={e => setAiPrompt(e.target.value)}
               placeholder="Ваша команда..."
               className="w-full bg-white/5 border border-white/10 rounded-[30px] p-8 h-40 outline-none focus:border-primary text-lg"
             />
             <button onClick={handleAISearch} className="mt-8 bg-primary text-black font-black px-12 py-4 rounded-2xl hover:scale-110 transition-all">ЗАПУСТИТЬ ИИ</button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;
