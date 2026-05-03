import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Lock, Package, Plus, Trash2, 
  Sparkles, Search, RefreshCw, DollarSign, Terminal
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { EXCHANGE_RATE } from "@/lib/constants";

const ADMIN_PASSWORD = "Bilol2013/";
const NEXUS_API_URL = "https://yebhpelgeahazxrsbaiz.supabase.co/functions/v1/public-api";
const NEXUS_API_KEY = "nx_live_0057ac7ec0e06521289ddd4d0347e882de2f051389b22a6619e31807de909193";

const Admin = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<"products" | "add" | "ai">("products");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState<string>("ИБП");
  const [newProduct, setNewProduct] = useState({
    name: "", image: "", price: "", category: "ИБП", brand: ""
  });

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("products").select("*").order("id", { ascending: false });
    if (!error) setProducts(data || []);
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
    const { error } = await supabase.from("products").insert([{
      name: newProduct.name, category: selectedCategory, price: parseFloat(newProduct.price),
      image: newProduct.image || "https://via.placeholder.com/300", brand: newProduct.brand || "AlfaComp", in_stock: true
    }]);
    if (error) toast.error(error.message);
    else {
      toast.success("Добавлено!");
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

  // ИНТЕГРАЦИЯ NEXUS AI
  const handleNexusAI = async () => {
    if (!aiPrompt.trim()) return;
    setLoading(true);
    setAiResponse("Nexus AI анализирует базу данных и ваш запрос...");
    
    try {
      const response = await fetch(NEXUS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${NEXUS_API_KEY}`
        },
        body: JSON.stringify({
          messages: [
            { 
              role: 'system', 
              content: `Ты — администратор магазина AlfaComp. Твоя задача — преобразовывать запросы владельца в команды для базы данных Supabase (таблица 'products').
              Колонки: id, name, category, price, brand, image.
              ОТВЕЧАЙ ТОЛЬКО В ФОРМАТЕ JSON: {"action": "UPDATE"|"DELETE", "target": "string_filter", "changes": {"field": "value"}}. 
              Если нужно изменить цену на процент, напиши {"action": "PRICE_ADJUST", "percent": number}.`
            },
            { role: 'user', content: aiPrompt }
          ]
        })
      });

      const data = await response.json();
      const aiMessage = data.choices?.[0]?.message?.content || "";
      console.log("Nexus Response:", aiMessage);

      // Пытаемся распарсить команду от ИИ
      try {
        const command = JSON.parse(aiMessage.match(/\{.*\}/s)?.[0] || aiMessage);
        
        if (command.action === "DELETE") {
           const { error } = await supabase.from("products").delete().ilike("name", `%${command.target}%`);
           if (!error) toast.success(`Nexus удалил товары: ${command.target}`);
        } else if (command.action === "UPDATE") {
           const { error } = await supabase.from("products").update(command.changes).ilike("name", `%${command.target}%`);
           if (!error) toast.success(`Nexus обновил товары: ${command.target}`);
        } else if (command.action === "PRICE_ADJUST") {
           const { data: all } = await supabase.from("products").select("*");
           if (all) {
             for (const item of all) {
               const newPrice = Math.round(item.price * (1 + command.percent / 100));
               await supabase.from("products").update({ price: newPrice }).eq("id", item.id);
             }
             toast.success(`Nexus изменил все цены на ${command.percent}%`);
           }
        } else {
           setAiResponse(aiMessage); // Если просто текст
        }
      } catch (e) {
        setAiResponse(aiMessage); // Если ИИ ответил текстом, а не JSON
      }
    } catch (err: any) {
      toast.error("Ошибка Nexus API");
      setAiResponse("Не удалось связаться с Nexus AI.");
    }
    
    fetchProducts();
    setLoading(false);
    setAiPrompt("");
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-[#111] border border-white/10 p-12 rounded-[40px] w-full max-w-sm text-center shadow-2xl">
          <Lock className="w-12 h-12 text-primary mx-auto mb-8" />
          <h1 className="text-2xl font-black mb-8 tracking-tighter">ALFA ADMIN</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Код доступа" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-primary text-white text-center" />
            <button className="w-full bg-primary text-black font-black py-4 rounded-2xl hover:scale-105 transition-all">ВХОД</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white font-sans">
      <header className="border-b border-white/5 h-24 flex items-center px-10 justify-between sticky top-0 bg-black/80 backdrop-blur-xl z-50">
        <div className="flex items-center gap-6">
           <button onClick={() => navigate("/")} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10"><ArrowLeft className="w-5 h-5"/></button>
           <h1 className="font-black tracking-[0.2em] text-xs uppercase">Alfa <span className="text-primary">Nexus</span> Admin</h1>
        </div>
        <div className="flex items-center gap-6 text-right">
           <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest italic">Nexus AI Online</div>
           <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-10">
        <div className="flex gap-4 mb-12">
          {["products", "add", "ai"].map(t => (
            <button key={t} onClick={() => setTab(t as any)} className={`px-10 py-5 rounded-3xl font-black text-xs uppercase tracking-widest transition-all border ${tab === t ? 'bg-white text-black border-white' : 'bg-white/5 text-muted-foreground border-white/5'}`}>
              {t === 'products' ? 'Каталог' : t === 'add' ? 'Добавить' : 'Nexus AI'}
            </button>
          ))}
        </div>

        {tab === "products" && (
          <div className="space-y-8">
            <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input placeholder="Быстрый поиск по базе..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-[#111] border border-white/5 rounded-[24px] pl-16 pr-6 py-6 outline-none focus:border-primary text-lg" />
            </div>
            <div className="bg-[#111] rounded-[40px] border border-white/5 overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/[0.02] text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground border-b border-white/5">
                    <th className="p-8">Товар</th>
                    <th className="p-8 text-right">UZS</th>
                    <th className="p-8 text-right">USD</th>
                    <th className="p-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredProducts.map(p => (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="p-8 flex items-center gap-6">
                        <img src={p.image} className="w-16 h-16 rounded-2xl object-cover border border-white/10" />
                        <div><div className="font-black text-white text-lg">{p.name}</div><div className="text-[10px] font-bold text-primary uppercase mt-2">{p.brand}</div></div>
                      </td>
                      <td className="p-8 text-right font-black text-xl">{new Intl.NumberFormat().format(p.price)}</td>
                      <td className="p-8 text-right font-black text-xl text-blue-400">${(p.price / EXCHANGE_RATE).toFixed(0)}</td>
                      <td className="p-8 text-right">
                        <button onClick={() => handleDeleteProduct(p.id)} className="w-12 h-12 flex items-center justify-center bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-5 h-5"/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "add" && (
          <div className="max-w-2xl mx-auto bg-[#111] p-16 rounded-[60px] border border-white/5 shadow-2xl">
            <h2 className="text-2xl font-black mb-10 uppercase tracking-tighter">Новая позиция</h2>
            <form onSubmit={handleAddProduct} className="space-y-6">
              <input placeholder="Название" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 outline-none focus:border-primary font-bold" />
              <div className="grid grid-cols-2 gap-6">
                <input placeholder="Цена СУМ" type="number" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="bg-white/5 border border-white/10 rounded-3xl p-6 outline-none focus:border-primary font-black text-xl text-primary" />
                <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="bg-white/5 border border-white/10 rounded-3xl p-6 outline-none focus:border-primary font-bold">
                  {["ИБП", "Мониторы", "Сеть", "Аксессуары", "Смартфоны", "Комплектующие"].map(c => <option key={c} value={c} className="bg-black">{c}</option>)}
                </select>
              </div>
              <input placeholder="Бренд" value={newProduct.brand} onChange={e => setNewProduct({...newProduct, brand: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 outline-none focus:border-primary font-bold" />
              <input placeholder="URL Картинки" value={newProduct.image} onChange={e => setNewProduct({...newProduct, image: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 outline-none focus:border-primary" />
              <button disabled={loading} className="w-full bg-primary text-black font-black py-6 rounded-[24px] uppercase tracking-widest hover:brightness-110 transition-all">Опубликовать</button>
            </form>
          </div>
        )}

        {tab === "ai" && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-[60px] p-20 shadow-2xl text-center relative overflow-hidden">
               <Sparkles className="w-20 h-20 text-primary mx-auto mb-10 animate-pulse" />
               <h2 className="text-4xl font-black mb-6 uppercase italic">Nexus AI <span className="text-primary">Terminal</span></h2>
               <p className="text-muted-foreground mb-12 max-w-lg mx-auto font-medium">Ваш собственный ИИ теперь управляет магазином. Пишите любые распоряжения на русском языке.</p>

               <div className="relative">
                 <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="Пример: 'Установи бренд Redmi для всех мониторов'..." className="w-full bg-black/50 border border-white/10 rounded-[40px] p-10 h-52 outline-none focus:border-primary text-xl font-bold shadow-2xl resize-none" />
               </div>

               <button onClick={handleNexusAI} disabled={loading} className="mt-10 bg-primary text-black font-black px-20 py-7 rounded-[30px] uppercase tracking-[0.3em] hover:scale-105 transition-all shadow-2xl shadow-primary/30">
                 {loading ? "Nexus обрабатывает..." : "Выполнить"}
               </button>

               {aiResponse && (
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-10 p-8 bg-white/5 border border-white/5 rounded-3xl text-left font-mono text-sm text-primary flex gap-4">
                    <Terminal className="w-5 h-5 flex-shrink-0" />
                    <div>{aiResponse}</div>
                 </motion.div>
               )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;
