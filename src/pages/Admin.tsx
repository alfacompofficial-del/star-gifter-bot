import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Package, Plus, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EXCHANGE_RATE, formatPrice } from "@/lib/constants";

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
    name: "", image: "", price: "", old_price: "", category: "ИБП", brand: "", priority: "1"
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
    if (authenticated) fetchProducts();
  }, [authenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) setAuthenticated(true);
    else toast.error("Неверный пароль!");
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return toast.error("Заполните цену в долларах!");
    setLoading(true);
    
    const productData = {
      name: newProduct.name,
      category: selectedCategory,
      price: parseFloat(newProduct.price), // Сохраняем как доллары
      old_price: newProduct.old_price ? parseFloat(newProduct.old_price) : null,
      image: newProduct.image || "https://via.placeholder.com/300",
      brand: newProduct.brand || "AlfaComp",
      priority: parseInt(newProduct.priority || "999"),
      in_stock: true
    };

    const { error } = await supabase.from("products").insert([productData]);
    if (!error) {
      toast.success("Товар добавлен в долларах!");
      setNewProduct({ name: "", image: "", price: "", old_price: "", category: "ИБП", brand: "", priority: "1" });
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

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.brand || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-[#111] border border-white/5 p-12 rounded-[40px] w-full max-w-sm text-center">
          <Lock className="w-12 h-12 text-primary mx-auto mb-8" />
          <h1 className="text-2xl font-black mb-8 uppercase tracking-widest">ADMIN</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="PASSWORD" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 outline-none focus:border-primary text-white text-center" />
            <button className="w-full bg-primary text-black font-black py-5 rounded-2xl hover:brightness-110 transition-all uppercase">Login</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <header className="border-b border-white/5 h-24 flex items-center px-10 justify-between sticky top-0 bg-black/80 backdrop-blur-xl z-50">
        <div className="flex items-center gap-6">
           <button onClick={() => navigate("/")} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 hover:bg-white/10"><ArrowLeft className="w-5 h-5"/></button>
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
          {["products", "add"].map(t => (
            <button key={t} onClick={() => setTab(t as any)} className={`px-12 py-5 rounded-3xl font-black text-xs uppercase tracking-widest transition-all border ${tab === t ? 'bg-primary text-black border-primary' : 'bg-white/5 text-muted-foreground border-white/5'}`}>
              {t === 'products' ? 'База (в $)' : 'Добавить ($)'}
            </button>
          ))}
        </div>

        {tab === "products" && (
          <div className="space-y-8">
            <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input placeholder="Поиск по товарам..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-[#111] border border-white/5 rounded-[24px] pl-16 pr-6 py-6 outline-none focus:border-primary text-lg" />
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
                      <td className="p-8 flex items-center gap-6">
                        <img src={p.image} className="w-14 h-14 rounded-2xl object-cover border border-white/10" />
                        <div>
                           <div className="font-black text-white text-lg">{p.name}</div>
                           <div className="text-[10px] font-bold text-primary uppercase mt-2">POS: {p.priority} | {p.brand}</div>
                        </div>
                      </td>
                      <td className="p-8 text-right font-black text-xl text-blue-400">${p.price}</td>
                      <td className="p-8 text-right font-bold text-lg opacity-60">
                         {formatPrice(Math.round(p.price * EXCHANGE_RATE))} сум
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
          <div className="max-w-2xl mx-auto bg-[#111] p-16 rounded-[60px] border border-white/5">
            <h2 className="text-2xl font-black mb-12 uppercase">Добавление в Долларах ($)</h2>
            <form onSubmit={handleAddProduct} className="space-y-8">
              <input placeholder="Название" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 outline-none focus:border-primary font-bold" />
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-4">Цена в $ (напр: 72)</label>
                  <input type="number" placeholder="72" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 outline-none focus:border-primary font-black text-2xl text-blue-400" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-4">Старая цена в $</label>
                  <input type="number" placeholder="85" value={newProduct.old_price} onChange={e => setNewProduct({...newProduct, old_price: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 outline-none focus:border-red-500 font-bold text-red-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 outline-none focus:border-primary font-bold appearance-none">
                  {["ИБП", "Мониторы", "Сеть", "Аксессуары", "Смартфоны", "Комплектующие"].map(c => <option key={c} value={c} className="bg-black">{c}</option>)}
                </select>
                <input type="number" placeholder="Позиция (1, 2, 3...)" value={newProduct.priority} onChange={e => setNewProduct({...newProduct, priority: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 outline-none focus:border-primary font-bold" />
              </div>
              <input placeholder="URL Фото" value={newProduct.image} onChange={e => setNewProduct({...newProduct, image: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 outline-none focus:border-primary" />
              <button disabled={loading} className="w-full bg-primary text-black font-black py-8 rounded-[30px] uppercase tracking-[0.2em] hover:brightness-110 transition-all">Добавить товар</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;
