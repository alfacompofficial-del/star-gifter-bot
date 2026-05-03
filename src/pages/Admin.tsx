import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Lock, Package, Plus, Trash2, 
  Search, DollarSign, ListOrdered, Tag
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EXCHANGE_RATE } from "@/lib/constants";

const ADMIN_PASSWORD = "Bilol2013/";

const Admin = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<"products" | "add">("products");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState<string>("ИБП");
  const [newProduct, setNewProduct] = useState({
    name: "", image: "", price: "", old_price: "", category: "ИБП", brand: "", priority: "0"
  });

  const fetchProducts = async () => {
    setLoading(true);
    // Сортировка: Сначала по приоритету (если есть), потом по ID от первого к последнему
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("priority", { ascending: false })
      .order("id", { ascending: true });
      
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
    if (!newProduct.name || !newProduct.price) return toast.error("Заполните название и цену!");
    setLoading(true);
    
    const productData = {
      name: newProduct.name,
      category: selectedCategory,
      price: parseFloat(newProduct.price),
      old_price: newProduct.old_price ? parseFloat(newProduct.old_price) : null,
      image: newProduct.image || "https://via.placeholder.com/300",
      brand: newProduct.brand || "AlfaComp",
      priority: parseInt(newProduct.priority || "0"),
      in_stock: true
    };

    const { error } = await supabase.from("products").insert([productData]);
    if (error) {
       console.error(error);
       toast.error("Ошибка при сохранении. Возможно, нужно обновить таблицу в Supabase.");
    } else {
      toast.success("Товар добавлен!");
      setNewProduct({ name: "", image: "", price: "", old_price: "", category: "ИБП", brand: "", priority: "0" });
      fetchProducts();
      setTab("products");
    }
    setLoading(false);
  };

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm("Удалить этот товар?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (!error) fetchProducts();
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <div className="bg-[#111] border border-white/5 p-12 rounded-[40px] w-full max-w-sm text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
          <Lock className="w-12 h-12 text-primary mx-auto mb-8" />
          <h1 className="text-2xl font-black mb-8 tracking-widest uppercase">ALFA CONTROL</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="PASSWORD" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 outline-none focus:border-primary text-white text-center font-bold tracking-widest" />
            <button className="w-full bg-primary text-black font-black py-5 rounded-2xl hover:brightness-125 transition-all shadow-xl shadow-primary/20 uppercase tracking-widest">Login</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white selection:bg-primary selection:text-black">
      <header className="border-b border-white/5 h-24 flex items-center px-10 justify-between sticky top-0 bg-black/80 backdrop-blur-xl z-50">
        <div className="flex items-center gap-6">
           <button onClick={() => navigate("/")} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 hover:bg-white/10 transition-all"><ArrowLeft className="w-5 h-5"/></button>
           <h1 className="font-black tracking-[0.2em] text-xs uppercase">Store <span className="text-primary italic">Manager</span></h1>
        </div>
        <div className="flex items-center gap-10">
           <div className="text-right">
              <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Rate</div>
              <div className="text-sm font-bold text-primary">1$ = {EXCHANGE_RATE} UZS</div>
           </div>
           <div className="h-10 w-[1px] bg-white/10" />
           <div className="text-right">
              <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Items</div>
              <div className="text-sm font-bold">{products.length}</div>
           </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-10">
        <div className="flex gap-4 mb-12">
          {["products", "add"].map(t => (
            <button key={t} onClick={() => setTab(t as any)} className={`px-12 py-5 rounded-3xl font-black text-xs uppercase tracking-widest transition-all border ${tab === t ? 'bg-primary text-black border-primary shadow-xl shadow-primary/20' : 'bg-white/5 text-muted-foreground border-white/5 hover:bg-white/10'}`}>
              {t === 'products' ? 'Каталог' : 'Добавить Товар'}
            </button>
          ))}
        </div>

        {tab === "products" && (
          <div className="space-y-8">
            <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input placeholder="Поиск по базе данных..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-[#111] border border-white/5 rounded-[24px] pl-16 pr-6 py-6 outline-none focus:border-primary text-lg transition-all" />
            </div>
            <div className="bg-[#111] rounded-[40px] border border-white/5 overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/[0.02] text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground border-b border-white/5">
                    <th className="p-8">Товар</th>
                    <th className="p-8">Категория</th>
                    <th className="p-8 text-right">Текущая Цена</th>
                    <th className="p-8 text-right">Старая Цена</th>
                    <th className="p-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredProducts.map(p => (
                    <tr key={p.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="p-8 flex items-center gap-6">
                        <img src={p.image} className="w-14 h-14 rounded-2xl object-cover border border-white/10" />
                        <div>
                           <div className="font-black text-white text-lg leading-tight">{p.name}</div>
                           <div className="flex items-center gap-3 mt-2">
                             <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{p.brand}</span>
                             {p.priority > 0 && <span className="bg-primary/10 text-primary text-[8px] px-2 py-0.5 rounded-full font-black">POS: {p.priority}</span>}
                           </div>
                        </div>
                      </td>
                      <td className="p-8 font-bold text-[10px] opacity-60 uppercase tracking-widest">{p.category}</td>
                      <td className="p-8 text-right">
                         <div className="font-black text-lg text-white">{new Intl.NumberFormat().format(p.price)}</div>
                         <div className="text-[10px] font-bold text-blue-400 mt-1">${(p.price / EXCHANGE_RATE).toFixed(0)}</div>
                      </td>
                      <td className="p-8 text-right">
                         {p.old_price ? (
                           <div className="font-bold text-sm text-red-500 line-through opacity-50">{new Intl.NumberFormat().format(p.old_price)}</div>
                         ) : <span className="text-white/5">—</span>}
                      </td>
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
          <div className="max-w-3xl mx-auto bg-[#111] p-16 rounded-[60px] border border-white/5 shadow-2xl relative">
            <h2 className="text-3xl font-black mb-12 uppercase tracking-tighter flex items-center gap-4">
               <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20"><Plus className="w-8 h-8 text-primary"/></div>
               Создание товара
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
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4">Текущая цена (СУМ)</label>
                  <input type="number" placeholder="860400" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 outline-none focus:border-primary font-black text-2xl text-primary" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4">Старая цена (СУМ) - Опционально</label>
                  <input type="number" placeholder="1000000" value={newProduct.old_price} onChange={e => setNewProduct({...newProduct, old_price: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 outline-none focus:border-red-500 font-bold text-red-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4">Категория</label>
                  <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 outline-none focus:border-primary font-bold appearance-none">
                    {["ИБП", "Мониторы", "Сеть", "Аксессуары", "Смартфоны", "Комплектующие"].map(c => <option key={c} value={c} className="bg-black">{c}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4">Позиция (чем выше число, тем раньше в списке)</label>
                  <input type="number" placeholder="0" value={newProduct.priority} onChange={e => setNewProduct({...newProduct, priority: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 outline-none focus:border-primary font-bold" />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4">Ссылка на фото</label>
                <input placeholder="https://..." value={newProduct.image} onChange={e => setNewProduct({...newProduct, image: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 outline-none focus:border-primary" />
              </div>

              <button disabled={loading} className="w-full bg-primary text-black font-black py-8 rounded-[30px] text-sm uppercase tracking-[0.4em] shadow-2xl shadow-primary/20 hover:brightness-110 transition-all active:scale-95">Опубликовать Товар</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;
