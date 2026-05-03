import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Eye, Lock, Package, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

// ПОДКЛЮЧАЕМ FIREBASE (убедитесь, что файл firebaseConfig.js создан в src/)
import { database } from "../firebaseConfig";
import { ref, onValue, push, set, remove, update } from "firebase/database";

// Константы (можете изменить под себя)
const ADMIN_PASSWORD = "Xojakbar777";
const EXCHANGE_RATE = 12800; // Пример курса доллара

const Admin = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<"stats" | "products" | "add">("stats");
  
  // Состояния для данных из Firebase
  const [stats, setStats] = useState({ online_now: 0, total_devices: 0 });
  const [products, setProducts] = useState<any[]>([]);
  
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState<string>("Смартфоны");
  const [addPosition, setAddPosition] = useState<"begin" | "end">("end");

  const [newProduct, setNewProduct] = useState({
    name: "",
    image: "",
    priceSum: "",
    priceUsd: "",
  });

  const [showAddCategoryInput, setShowAddCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Категории из имеющихся товаров
  const categories = useMemo(() => {
    const base = [...new Set(products.map((p) => p.category))];
    if (base.length === 0) return ["Смартфоны", "Ноутбуки"];
    return base;
  }, [products]);

  // 1. Получение данных из Firebase (Статистика и Товары)
  useEffect(() => {
    if (!authenticated) return;

    // Слушаем статистику (online и total)
    const statsRef = ref(database, 'stats');
    onValue(statsRef, (snapshot) => {
      if (snapshot.exists()) {
        setStats(snapshot.val());
      }
    });

    // Слушаем товары
    const productsRef = ref(database, 'products');
    onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setProducts(Object.values(data));
      } else {
        setProducts([]);
      }
    });
  }, [authenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
    } else {
      toast.error("Неверный пароль!");
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.priceSum || !newProduct.image) {
      toast.error("Заполните все поля!");
      return;
    }

    const productsRef = ref(database, 'products');
    const newProductRef = push(productsRef); // Генерируем ID
    
    const productData = {
      id: newProductRef.key,
      name: newProduct.name,
      category: selectedCategory,
      price_sum: newProduct.priceSum,
      price_usd: newProduct.priceUsd,
      photo: newProduct.image,
      timestamp: addPosition === "begin" ? -Date.now() : Date.now(), // Трюк для сортировки
    };

    set(newProductRef, productData)
      .then(() => {
        toast.success("Товар добавлен на сайт!");
        setNewProduct({ name: "", image: "", priceSum: "", priceUsd: "" });
        setTab("products");
      })
      .catch((err) => toast.error("Ошибка: " + err.message));
  };

  const handleDeleteProduct = (id: string) => {
    if (window.confirm("Удалить этот товар?")) {
      remove(ref(database, `products/${id}`))
        .then(() => toast.success("Товар удален"))
        .catch((err) => toast.error("Ошибка удаления"));
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 w-full max-w-sm">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto mb-6">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-center mb-6">AlfaComp Admin</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary text-white"
              autoFocus
            />
            <button className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-bold text-sm hover:scale-[1.02] transition-transform">
              Войти
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white">
      <header className="glass border-b border-border sticky top-0 z-40">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="glass rounded-lg w-9 h-9 flex items-center justify-center hover:border-primary transition-all">
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>
            <h1 className="text-lg font-bold">📊 AlfaComp Admin</h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            В сети: {stats.online_now}
          </div>
        </div>
      </header>

      <div className="container py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-xl p-5">
            <Eye className="w-5 h-5 text-green-400 mb-2" />
            <p className="text-2xl font-extrabold">{stats.online_now}</p>
            <p className="text-xs text-muted-foreground mt-1">Онлайн сейчас</p>
          </div>
          <div className="glass rounded-xl p-5">
            <Users className="w-5 h-5 text-primary mb-2" />
            <p className="text-2xl font-extrabold">{stats.total_devices}</p>
            <p className="text-xs text-muted-foreground mt-1">Всего заходов</p>
          </div>
          <div className="glass rounded-xl p-5">
            <Package className="w-5 h-5 text-accent mb-2" />
            <p className="text-2xl font-extrabold">{products.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Товаров в базе</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: "stats" as const, label: "Обзор" },
            { id: "products" as const, label: "Товары" },
            { id: "add" as const, label: "Добавить +" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                tab === t.id ? "bg-primary text-primary-foreground shadow-lg" : "glass glass-hover"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Products List */}
        {tab === "products" && (
          <div className="glass rounded-xl overflow-hidden border border-white/5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="text-left p-4">Товар</th>
                    <th className="text-left p-4">Категория</th>
                    <th className="text-right p-4">Цена</th>
                    <th className="text-right p-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        <img src={p.photo} className="w-10 h-10 rounded-lg object-cover" />
                        <span className="font-medium">{p.name}</span>
                      </td>
                      <td className="p-4 text-muted-foreground">{p.category}</td>
                      <td className="p-4 text-right font-bold text-blue-400">{p.price_sum} сум</td>
                      <td className="p-4 text-right">
                        <button onClick={() => handleDeleteProduct(p.id)} className="p-2 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Product Form */}
        {tab === "add" && (
          <form onSubmit={handleAddProduct} className="glass rounded-2xl p-6 max-w-2xl mx-auto space-y-6 border border-white/10 shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
               <Plus className="text-primary w-6 h-6" />
               <h3 className="text-xl font-bold">Добавить на сайт</h3>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Выберите вкладку</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedCategory(c)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                      selectedCategory === c ? "bg-primary border-primary" : "bg-slate-900 border-white/10 hover:border-white/30"
                    }`}
                  >
                    {c}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowAddCategoryInput(!showAddCategoryInput)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 border border-dashed border-white/30 hover:border-primary transition-all"
                >
                  + новая вкладка
                </button>
              </div>
              
              {showAddCategoryInput && (
                <div className="flex gap-2 mt-2">
                  <input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Название новой вкладки"
                    className="flex-1 bg-slate-900 rounded-xl px-4 py-3 text-sm border border-white/10 outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newCategoryName.trim()) {
                        setSelectedCategory(newCategoryName.trim());
                        setNewCategoryName("");
                        setShowAddCategoryInput(false);
                      }
                    }}
                    className="bg-primary px-4 rounded-xl text-sm font-bold"
                  >
                    OK
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">ФОТО (URL)</label>
                <input
                  value={newProduct.image}
                  onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-slate-900 rounded-xl px-4 py-3 text-sm border border-white/10 outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">НАЗВАНИЕ</label>
                <input
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="Напр: PC Gaming X"
                  className="w-full bg-slate-900 rounded-xl px-4 py-3 text-sm border border-white/10 outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">ЦЕНА (СУМ)</label>
                <input
                  type="number"
                  value={newProduct.priceSum}
                  onChange={(e) => {
                    const sum = e.target.value;
                    const usd = sum ? String(Math.round(parseInt(sum) / EXCHANGE_RATE)) : "";
                    setNewProduct({ ...newProduct, priceSum: sum, priceUsd: usd });
                  }}
                  className="w-full bg-slate-900 rounded-xl px-4 py-3 text-sm border border-white/10 outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">ЦЕНА (USD)</label>
                <input
                  type="number"
                  value={newProduct.priceUsd}
                  onChange={(e) => {
                    const usd = e.target.value;
                    const sum = usd ? String(Math.round(parseInt(usd) * EXCHANGE_RATE)) : "";
                    setNewProduct({ ...newProduct, priceSum: sum, priceUsd: usd });
                  }}
                  className="w-full bg-slate-900 rounded-xl px-4 py-3 text-sm border border-white/10 outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setAddPosition("begin")}
                className={`flex-1 py-3 rounded-xl text-xs font-bold border transition-all ${addPosition === "begin" ? "bg-primary border-primary" : "bg-slate-900 border-white/10"}`}
              >
                В НАЧАЛО
              </button>
              <button
                type="button"
                onClick={() => setAddPosition("end")}
                className={`flex-1 py-3 rounded-xl text-xs font-bold border transition-all ${addPosition === "end" ? "bg-primary border-primary" : "bg-slate-900 border-white/10"}`}
              >
                В КОНЕЦ
              </button>
            </div>

            <button className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-black text-sm transition-all shadow-xl shadow-blue-500/20">
              УСТАНОВИТЬ НА САЙТ
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Admin;
