import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Trash2, Search, Upload, Check, X, Pencil,
  BarChart3, Package, Plus, Eye, Heart, Download,
  ToggleLeft, ToggleRight, RefreshCw, TrendingUp, Users,
  Globe, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EXCHANGE_RATE, formatPrice } from "@/lib/constants";

type VisitorRow = {
  id: number; ip: string; country: string | null; country_code: string | null;
  city: string | null; region: string | null; user_agent: string | null;
  path: string | null; referrer: string | null; created_at: string;
};

const flagEmoji = (code?: string | null) => {
  if (!code || code.length !== 2) return "🌐";
  const cc = code.toUpperCase();
  return String.fromCodePoint(...[...cc].map(c => 127397 + c.charCodeAt(0)));
};

const Admin = () => {
  const [tab, setTab] = useState<"products"|"add"|"analytics"|"stats">("products");
  const [visitors, setVisitors] = useState<VisitorRow[]>([]);
  const [visitorsLoading, setVisitorsLoading] = useState(false);
  const [visitorSearch, setVisitorSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingPriceId, setEditingPriceId] = useState<number|null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState<string>("");
  const [editingNameId, setEditingNameId] = useState<number|null>(null);
  const [editingNameValue, setEditingNameValue] = useState<string>("");
  const [uploadingImageId, setUploadingImageId] = useState<number|null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUploadProductId = useRef<number|null>(null);
  const [draggedId, setDraggedId] = useState<number|null>(null);
  const [dragOverId, setDragOverId] = useState<number|null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>("ИБП");
  const [newProduct, setNewProduct] = useState({
    name:"",image:"",price:"",old_price:"",category:"ИБП",brand:"",priority:"1"
  });

  const fetchProducts = async (showRefresh=false) => {
    if(showRefresh) setIsRefreshing(true); else setLoading(true);
    const {data,error} = await supabase.from("products").select("*")
      .order("priority",{ascending:true}).order("id",{ascending:true});
    if(!error) setProducts(data||[]);
    if(showRefresh) setIsRefreshing(false); else setLoading(false);
  };
  useEffect(()=>{fetchProducts();},[]);

  const fetchVisitors = async () => {
    setVisitorsLoading(true);
    const {data,error} = await supabase.from("visitors" as any).select("*")
      .order("created_at",{ascending:false}).limit(2000);
    if(!error) setVisitors(((data as unknown) as VisitorRow[])||[]);
    setVisitorsLoading(false);
  };
  useEffect(()=>{ if(tab==="stats") fetchVisitors(); },[tab]);

  const visitorStats = useMemo(()=>{
    const q=visitorSearch.trim().toLowerCase();
    const filtered=q?visitors.filter(v=>
      v.ip.toLowerCase().includes(q)||(v.country||"").toLowerCase().includes(q)||(v.city||"").toLowerCase().includes(q)
    ):visitors;
    const uniqueIps=new Set(visitors.map(v=>v.ip)).size;
    const countryCounts:Record<string,number>={};
    for(const v of visitors){const k=v.country||"Неизвестно";countryCounts[k]=(countryCounts[k]||0)+1;}
    const topCountries=Object.entries(countryCounts).sort((a,b)=>b[1]-a[1]).slice(0,6);
    const today=new Date().toISOString().slice(0,10);
    const todayCount=visitors.filter(v=>v.created_at.startsWith(today)).length;
    return{filtered,uniqueIps,topCountries,todayCount};
  },[visitors,visitorSearch]);

  const analyticsData = useMemo(()=>{
    const topByViews=[...products].sort((a,b)=>(b.views||0)-(a.views||0)).slice(0,10);
    const topByLikes=[...products].sort((a,b)=>(b.likes||0)-(a.likes||0)).slice(0,10);
    const inStockCount=products.filter(p=>p.in_stock).length;
    const outOfStockCount=products.filter(p=>!p.in_stock).length;
    const categoryCounts:Record<string,number>={};
    for(const p of products){categoryCounts[p.category]=(categoryCounts[p.category]||0)+1;}
    const totalViews=products.reduce((s,p)=>s+(p.views||0),0);
    const totalLikes=products.reduce((s,p)=>s+(p.likes||0),0);
    return{topByViews,topByLikes,inStockCount,outOfStockCount,categoryCounts,totalViews,totalLikes};
  },[products]);
  const handleAddProduct = async (e:React.FormEvent) => {
    e.preventDefault();
    if(!newProduct.name||!newProduct.price) return toast.error("Заполните цену в долларах!");
    setLoading(true);
    const productData={
      name:newProduct.name,category:selectedCategory,price:parseFloat(newProduct.price),
      old_price:newProduct.old_price?parseFloat(newProduct.old_price):null,
      image:newProduct.image||"https://via.placeholder.com/300",
      brand:newProduct.brand||"AlfaComp",priority:parseInt(newProduct.priority||"999"),in_stock:true
    };
    const{error}=await supabase.from("products").insert([productData]);
    if(!error){
      toast.success("Товар добавлен!");
      setNewProduct({name:"",image:"",price:"",old_price:"",category:"ИБП",brand:"",priority:"1"});
      fetchProducts(); setTab("products");
    } else toast.error("Ошибка базы данных");
    setLoading(false);
  };

  const handleDeleteProduct=async(id:number)=>{
    if(!window.confirm("Удалить?")) return;
    const{error}=await supabase.from("products").delete().eq("id",id);
    if(!error) fetchProducts();
  };

  const startEditPrice=(p:any)=>{setEditingPriceId(p.id);setEditingPriceValue(String(p.price));};
  const cancelEditPrice=()=>{setEditingPriceId(null);setEditingPriceValue("");};
  const saveEditPrice=async(id:number)=>{
    const val=parseFloat(editingPriceValue);
    if(isNaN(val)||val<=0) return toast.error("Введите корректную цену");
    const{error}=await supabase.from("products").update({price:val}).eq("id",id);
    if(!error){toast.success("Цена обновлена!");setProducts(prev=>prev.map(p=>p.id===id?{...p,price:val}:p));cancelEditPrice();}
    else toast.error("Ошибка сохранения");
  };

  const startEditName=(p:any)=>{setEditingNameId(p.id);setEditingNameValue(p.name);};
  const cancelEditName=()=>{setEditingNameId(null);setEditingNameValue("");};
  const saveEditName=async(id:number)=>{
    const val=editingNameValue.trim();
    if(!val) return toast.error("Название не может быть пустым");
    const{error}=await supabase.from("products").update({name:val}).eq("id",id);
    if(!error){toast.success("Название обновлено!");setProducts(prev=>prev.map(p=>p.id===id?{...p,name:val}:p));cancelEditName();}
    else toast.error("Ошибка сохранения");
  };

  const handleToggleStock=async(id:number,current:boolean)=>{
    const{error}=await supabase.from("products").update({in_stock:!current}).eq("id",id);
    if(!error){toast.success(!current?"Товар в наличии!":"Снято с продажи");setProducts(prev=>prev.map(p=>p.id===id?{...p,in_stock:!current}:p));}
    else toast.error("Ошибка обновления");
  };

  const handleImageClick=(productId:number)=>{currentUploadProductId.current=productId;fileInputRef.current?.click();};
  const handleFileChange=async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0];const productId=currentUploadProductId.current;
    if(!file||!productId) return; e.target.value="";
    if(!file.type.startsWith("image/")) return toast.error("Выберите файл изображения");
    if(file.size>5*1024*1024) return toast.error("Файл слишком большой (макс. 5MB)");
    setUploadingImageId(productId);
    try{
      const reader=new FileReader();
      reader.onload=async(ev)=>{
        const dataUrl=ev.target?.result as string;
        const{error}=await supabase.from("products").update({image:dataUrl}).eq("id",productId);
        if(!error){toast.success("Фото обновлено!");setProducts(prev=>prev.map(p=>p.id===productId?{...p,image:dataUrl}:p));}
        else toast.error("Ошибка загрузки фото");
        setUploadingImageId(null);currentUploadProductId.current=null;
      };
      reader.readAsDataURL(file);
    }catch{toast.error("Ошибка при обработке файла");setUploadingImageId(null);}
  };

  const filteredProducts=useMemo(()=>products.filter(p=>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())||(p.brand||"").toLowerCase().includes(searchQuery.toLowerCase())
  ),[products,searchQuery]);

  const handleDragStart=(e:React.DragEvent,id:number)=>{setDraggedId(id);e.dataTransfer.effectAllowed="move";};
  const handleDragOver=(e:React.DragEvent,id:number)=>{e.preventDefault();e.dataTransfer.dropEffect="move";if(id!==draggedId) setDragOverId(id);};
  const handleDrop=async(e:React.DragEvent,targetId:number)=>{
    e.preventDefault();
    if(!draggedId||draggedId===targetId){setDraggedId(null);setDragOverId(null);return;}
    const list=[...products];
    const fromIdx=list.findIndex(p=>p.id===draggedId);const toIdx=list.findIndex(p=>p.id===targetId);
    if(fromIdx===-1||toIdx===-1) return;
    const reordered=[...list];const[moved]=reordered.splice(fromIdx,1);reordered.splice(toIdx,0,moved);
    const updates=reordered.map((p,idx)=>({id:p.id,priority:idx+1}));
    setProducts(reordered.map((p,idx)=>({...p,priority:idx+1})));
    setDraggedId(null);setDragOverId(null);
    try{
      await Promise.all(updates.map(({id,priority})=>supabase.from("products").update({priority}).eq("id",id)));
      toast.success("Порядок товаров сохранён!");
    }catch{toast.error("Ошибка при сохранении порядка");fetchProducts();}
  };
  const handleDragEnd=()=>{setDraggedId(null);setDragOverId(null);};

  const handleExportCSV=()=>{
    const headers=["ID","Название","Бренд","Категория","Цена ($)","Цена (сум)","В наличии","Приоритет","Просмотры","Лайки"];
    const rows=products.map(p=>[p.id,`"${p.name.replace(/"/g,'""')}"`,`"${(p.brand||"").replace(/"/g,'""')}"`,
      `"${p.category}"`,p.price,Math.round(p.price*EXCHANGE_RATE),p.in_stock?"Да":"Нет",p.priority||"",p.views||0,p.likes||0]);
    const csv=[headers.join(","),...rows.map(r=>r.join(","))].join("\n");
    const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");
    a.href=url;a.download=`alfacomp_${new Date().toISOString().slice(0,10)}.csv`;a.click();
    URL.revokeObjectURL(url);toast.success("CSV экспортирован!");
  };

  const MiniBarChart=({items,valueKey,label}:{items:any[];valueKey:string;label:string})=>{
    const max=Math.max(...items.map(i=>i[valueKey]||0),1);
    return(
      <div className="space-y-3">
        {items.slice(0,8).map((item,idx)=>{
          const val=item[valueKey]||0;const pct=(val/max)*100;
          return(
            <div key={item.id||idx}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white/70 truncate max-w-[65%]" title={item.name}>{idx+1}. {item.name}</span>
                <span className="text-xs font-black text-[#00f2ff]">{val} {label}</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#00f2ff] to-[#ff0080] rounded-full transition-all duration-700" style={{width:`${pct}%`}}/>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange}/>
      <header className="border-b border-white/5 h-20 flex items-center px-6 sm:px-10 justify-between sticky top-0 bg-black/80 backdrop-blur-xl z-50">
        <div className="flex items-center gap-4">
          <button onClick={()=>navigate("/")} className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 hover:bg-white/10 transition-all">
            <ArrowLeft className="w-4 h-4"/>
          </button>
          <div>
            <h1 className="font-black tracking-[0.15em] text-xs uppercase">Store <span className="text-primary italic">Manager</span></h1>
            <p className="text-[10px] text-white/30 font-medium mt-0.5">AlfaComp Admin Panel</p>
          </div>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="hidden sm:block text-right">
            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Курс USD</div>
            <div className="text-sm font-bold text-primary">1$ = {EXCHANGE_RATE.toLocaleString()} UZS</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Товаров</div>
            <div className="text-sm font-bold">{products.length}</div>
          </div>
          <button onClick={()=>fetchProducts(true)} className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 hover:bg-white/10 transition-all" title="Обновить">
            <RefreshCw className={`w-4 h-4 ${isRefreshing?"animate-spin text-primary":""}`}/>
          </button>
          <button onClick={handleExportCSV} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-white/10 transition-all">
            <Download className="w-3.5 h-3.5 text-[#00f2ff]"/> CSV
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-8 lg:p-10">
        <div className="flex gap-2 sm:gap-3 mb-8 overflow-x-auto pb-2">
          {(["products","add","analytics","stats"] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              className={`flex items-center gap-2 px-5 sm:px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border whitespace-nowrap flex-shrink-0 ${tab===t?"bg-primary text-black border-primary shadow-[0_0_20px_rgba(0,242,255,0.3)]":"bg-white/5 text-muted-foreground border-white/5 hover:bg-white/10"}`}>
              {t==="products"&&<Package className="w-4 h-4"/>}
              {t==="add"&&<Plus className="w-4 h-4"/>}
              {t==="analytics"&&<BarChart3 className="w-4 h-4"/>}
              {t==="stats"&&<Users className="w-4 h-4"/>}
              {t==="products"?"База товаров":t==="add"?"Добавить":t==="analytics"?"Аналитика":"Статистика IP"}
            </button>
          ))}
        </div>

        {/* PRODUCTS TAB */}
        {tab==="products"&&(
          <div className="space-y-6">
            <div className="flex flex-wrap gap-3 text-xs text-white/40 font-bold px-2">
              <span className="flex items-center gap-2"><Upload className="w-3.5 h-3.5 text-primary/70"/>Фото — загрузить</span>
              <span className="flex items-center gap-2"><Pencil className="w-3.5 h-3.5 text-blue-400/70"/>Цена/Название — изменить</span>
              <span className="flex items-center gap-2">⠿ Строка — порядок</span>
              <span className="flex items-center gap-2"><ToggleRight className="w-3.5 h-3.5 text-emerald-400/70"/>Переключатель — наличие</span>
            </div>
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"/>
              <input placeholder="Поиск по товарам..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
                className="w-full bg-[#111] border border-white/5 rounded-[24px] pl-14 pr-6 py-5 outline-none focus:border-primary text-sm transition-all"/>
            </div>
            <div className="bg-[#111] rounded-[36px] border border-white/5 overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/[0.02] text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground border-b border-white/5">
                    <th className="p-5 sm:p-6">Товар</th>
                    <th className="p-5 sm:p-6">Наличие</th>
                    <th className="p-5 sm:p-6 text-right">Цена USD</th>
                    <th className="p-5 sm:p-6 text-right">Цена СУМ</th>
                    <th className="p-5 sm:p-6 text-center hidden lg:table-cell">Стат.</th>
                    <th className="p-5 sm:p-6"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading&&<tr><td colSpan={6} className="p-10 text-center text-white/40">Загрузка…</td></tr>}
                  {filteredProducts.map(p=>(
                    <tr key={p.id} draggable
                      onDragStart={(e)=>handleDragStart(e,p.id)}
                      onDragOver={(e)=>handleDragOver(e,p.id)}
                      onDrop={(e)=>handleDrop(e,p.id)}
                      onDragEnd={handleDragEnd}
                      className={`transition-all group cursor-grab active:cursor-grabbing ${draggedId===p.id?"opacity-40 scale-[0.99]":dragOverId===p.id?"bg-primary/10 border-l-2 border-primary":"hover:bg-white/[0.015]"}`}>
                      <td className="p-5 sm:p-6">
                        <div className="flex items-center gap-4">
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-white/10 cursor-pointer group/img flex-shrink-0"
                            onClick={()=>handleImageClick(p.id)} title="Нажмите чтобы изменить фото">
                            {uploadingImageId===p.id?(
                              <div className="w-full h-full flex items-center justify-center bg-black/80">
                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
                              </div>
                            ):(
                              <>
                                <img src={p.image} className="w-full h-full object-cover transition-all group-hover/img:brightness-50"
                                  onError={(e)=>{(e.target as HTMLImageElement).src="https://via.placeholder.com/48";}}/>
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                                  <Upload className="w-4 h-4 text-white"/>
                                </div>
                              </>
                            )}
                          </div>
                          <div className="min-w-0">
                            {editingNameId===p.id?(
                              <div className="flex items-center gap-1.5" onClick={e=>e.stopPropagation()}>
                                <input type="text" value={editingNameValue} onChange={e=>setEditingNameValue(e.target.value)}
                                  onKeyDown={e=>{if(e.key==="Enter") saveEditName(p.id);if(e.key==="Escape") cancelEditName();}}
                                  autoFocus className="w-40 bg-white/10 border border-primary/50 rounded-lg px-2 py-1 text-sm font-bold text-white outline-none focus:border-primary"/>
                                <button onClick={()=>saveEditName(p.id)} className="w-7 h-7 flex items-center justify-center bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500 hover:text-white transition-all"><Check className="w-3 h-3"/></button>
                                <button onClick={cancelEditName} className="w-7 h-7 flex items-center justify-center bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"><X className="w-3 h-3"/></button>
                              </div>
                            ):(
                              <div className="font-black text-white text-sm truncate max-w-[180px] cursor-pointer hover:text-[#00f2ff] transition-colors group/name flex items-center gap-1"
                                onClick={()=>startEditName(p)} title="Нажмите чтобы изменить название">
                                {p.name}<Pencil className="w-3 h-3 opacity-0 group-hover/name:opacity-50 transition-opacity flex-shrink-0"/>
                              </div>
                            )}
                            <div className="text-[10px] font-bold text-primary/60 uppercase mt-0.5">#{p.priority} · {p.brand}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-5 sm:p-6">
                        <button onClick={()=>handleToggleStock(p.id,p.in_stock)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border transition-all ${p.in_stock?"bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20":"bg-red-500/10 text-red-400 border-red-500/20 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20"}`}
                          title={p.in_stock?"Снять с продажи":"Добавить в наличие"}>
                          {p.in_stock?<ToggleRight className="w-3.5 h-3.5"/>:<ToggleLeft className="w-3.5 h-3.5"/>}
                          {p.in_stock?"В наличии":"Нет"}
                        </button>
                      </td>
                      <td className="p-5 sm:p-6 text-right">
                        {editingPriceId===p.id?(
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-blue-400 font-black">$</span>
                            <input type="number" value={editingPriceValue} onChange={e=>setEditingPriceValue(e.target.value)}
                              onKeyDown={e=>{if(e.key==="Enter") saveEditPrice(p.id);if(e.key==="Escape") cancelEditPrice();}}
                              autoFocus className="w-24 bg-white/10 border border-primary/50 rounded-xl px-3 py-2 text-right font-black text-lg text-blue-400 outline-none focus:border-primary"/>
                            <button onClick={()=>saveEditPrice(p.id)} className="w-8 h-8 flex items-center justify-center bg-green-500/20 text-green-400 rounded-xl hover:bg-green-500 hover:text-white transition-all"><Check className="w-3.5 h-3.5"/></button>
                            <button onClick={cancelEditPrice} className="w-8 h-8 flex items-center justify-center bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"><X className="w-3.5 h-3.5"/></button>
                          </div>
                        ):(
                          <button onClick={()=>startEditPrice(p)} className="font-black text-lg text-blue-400 hover:text-primary transition-colors group/price flex items-center gap-1.5 ml-auto" title="Нажмите чтобы изменить цену">
                            ${p.price}<Pencil className="w-3 h-3 opacity-0 group-hover/price:opacity-60 transition-opacity"/>
                          </button>
                        )}
                      </td>
                      <td className="p-5 sm:p-6 text-right font-bold text-sm opacity-60">{formatPrice(Math.round(p.price*EXCHANGE_RATE))} сум</td>
                      <td className="p-5 sm:p-6 text-center hidden lg:table-cell">
                        <div className="flex items-center justify-center gap-3 text-xs font-bold text-white/40">
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3 text-[#00f2ff]/60"/> {p.views||0}</span>
                          <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-[#ff0080]/60"/> {p.likes||0}</span>
                        </div>
                      </td>
                      <td className="p-5 sm:p-6 text-right">
                        <button onClick={()=>handleDeleteProduct(p.id)} className="w-10 h-10 flex items-center justify-center bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-4 h-4"/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ADD TAB */}
        {tab==="add"&&(
          <div className="max-w-2xl mx-auto bg-[#111] p-10 sm:p-14 rounded-[48px] border border-white/5">
            <h2 className="text-2xl font-black mb-10 uppercase">Добавление товара в $</h2>
            <form onSubmit={handleAddProduct} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground ml-4">Название</label>
                <input placeholder="Например: APC Smart-UPS 1500VA" value={newProduct.name} onChange={e=>setNewProduct({...newProduct,name:e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-3xl p-5 outline-none focus:border-primary font-bold transition-all"/>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-4">Цена $</label>
                  <input type="number" placeholder="72" value={newProduct.price} onChange={e=>setNewProduct({...newProduct,price:e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-3xl p-5 outline-none focus:border-primary font-black text-2xl text-blue-400 transition-all"/>
                  {newProduct.price&&<p className="text-xs text-primary/60 ml-4">≈ {formatPrice(Math.round(parseFloat(newProduct.price||"0")*EXCHANGE_RATE))} сум</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-4">Старая цена $</label>
                  <input type="number" placeholder="85" value={newProduct.old_price} onChange={e=>setNewProduct({...newProduct,old_price:e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-3xl p-5 outline-none focus:border-red-500 font-bold text-red-500 transition-all"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-4">Категория</label>
                  <select value={selectedCategory} onChange={e=>setSelectedCategory(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-3xl p-5 outline-none focus:border-primary font-bold appearance-none transition-all">
                    {["ИБП","Мониторы","Сеть","Аксессуары","Смартфоны","Комплектующие","Колонки","Моноблоки"].map(c=>(
                      <option key={c} value={c} className="bg-black">{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-4">Позиция</label>
                  <input type="number" placeholder="999" value={newProduct.priority} onChange={e=>setNewProduct({...newProduct,priority:e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-3xl p-5 outline-none focus:border-primary font-bold transition-all"/>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground ml-4">Бренд</label>
                <input placeholder="APC, ION, TP-Link..." value={newProduct.brand} onChange={e=>setNewProduct({...newProduct,brand:e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-3xl p-5 outline-none focus:border-primary font-bold transition-all"/>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground ml-4">URL Фото (необязательно)</label>
                <input placeholder="https://..." value={newProduct.image} onChange={e=>setNewProduct({...newProduct,image:e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-3xl p-5 outline-none focus:border-primary transition-all"/>
              </div>
              <button disabled={loading} className="w-full bg-primary text-black font-black py-7 rounded-[28px] uppercase tracking-[0.2em] hover:brightness-110 transition-all disabled:opacity-50">
                {loading?"Добавляю...":"Добавить товар"}
              </button>
            </form>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {tab==="analytics"&&(
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {label:"Всего товаров",value:products.length,color:"text-white"},
                {label:"В наличии",value:analyticsData.inStockCount,color:"text-emerald-400"},
                {label:"Просмотры (всего)",value:analyticsData.totalViews,color:"text-[#00f2ff]"},
                {label:"Лайки (всего)",value:analyticsData.totalLikes,color:"text-[#ff0080]"},
              ].map(({label,value,color})=>(
                <div key={label} className="bg-[#111] border border-white/5 rounded-3xl p-6">
                  <div className={`text-3xl font-black ${color}`}>{value}</div>
                  <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-1">{label}</div>
                </div>
              ))}
            </div>
            {analyticsData.outOfStockCount>0&&(
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0"/>
                <p className="text-sm font-bold text-yellow-400">{analyticsData.outOfStockCount} товаров не в наличии. Обновите статус во вкладке «База товаров».</p>
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#111] border border-white/5 rounded-3xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <TrendingUp className="w-5 h-5 text-[#00f2ff]"/>
                  <h3 className="font-black uppercase tracking-widest text-xs text-white/70">Топ по просмотрам</h3>
                </div>
                {analyticsData.topByViews.every(p=>!p.views)
                  ?<p className="text-sm text-white/30 text-center py-8">Данные появятся после посещений</p>
                  :<MiniBarChart items={analyticsData.topByViews} valueKey="views" label="просм."/>}
              </div>
              <div className="bg-[#111] border border-white/5 rounded-3xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Heart className="w-5 h-5 text-[#ff0080]"/>
                  <h3 className="font-black uppercase tracking-widest text-xs text-white/70">Топ по лайкам</h3>
                </div>
                {analyticsData.topByLikes.every(p=>!p.likes)
                  ?<p className="text-sm text-white/30 text-center py-8">Данные появятся после активности</p>
                  :<MiniBarChart items={analyticsData.topByLikes} valueKey="likes" label="лайков"/>}
              </div>
            </div>
            <div className="bg-[#111] border border-white/5 rounded-3xl p-8">
              <h3 className="font-black uppercase tracking-widest text-xs text-white/70 mb-6">Товаров по категориям</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {Object.entries(analyticsData.categoryCounts).map(([cat,count])=>(
                  <div key={cat} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
                    <div className="text-2xl font-black text-primary">{count as number}</div>
                    <div className="text-xs font-bold text-white/50 mt-1">{cat}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={handleExportCSV} className="flex items-center gap-2 px-6 py-3 bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/20 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-[#00f2ff] hover:text-black transition-all">
                <Download className="w-4 h-4"/> Экспортировать в CSV
              </button>
            </div>
          </div>
        )}

        {/* STATS TAB */}
        {tab==="stats"&&(
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#111] border border-white/5 rounded-3xl p-6">
                <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5"/>Всего визитов</div>
                <div className="text-3xl font-black text-primary">{visitors.length}</div>
              </div>
              <div className="bg-[#111] border border-white/5 rounded-3xl p-6">
                <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2">Уникальных IP</div>
                <div className="text-3xl font-black text-blue-400">{visitorStats.uniqueIps}</div>
              </div>
              <div className="bg-[#111] border border-white/5 rounded-3xl p-6">
                <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2">Сегодня</div>
                <div className="text-3xl font-black text-emerald-400">{visitorStats.todayCount}</div>
              </div>
              <div className="bg-[#111] border border-white/5 rounded-3xl p-6">
                <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2">Топ стран</div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {visitorStats.topCountries.length===0&&<span className="text-white/40 text-xs">—</span>}
                  {visitorStats.topCountries.map(([name,count])=>(
                    <span key={name} className="text-xs font-bold bg-white/5 border border-white/10 rounded-full px-2.5 py-1">{name} · <span className="text-primary">{count}</span></span>
                  ))}
                </div>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"/>
              <input placeholder="Поиск по IP, стране, городу..." value={visitorSearch} onChange={e=>setVisitorSearch(e.target.value)}
                className="w-full bg-[#111] border border-white/5 rounded-[24px] pl-14 pr-6 py-5 outline-none focus:border-primary text-sm transition-all"/>
            </div>
            <div className="bg-[#111] rounded-[36px] border border-white/5 overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/[0.02] text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground border-b border-white/5">
                    <th className="p-5 sm:p-6">IP</th>
                    <th className="p-5 sm:p-6">Страна / Город</th>
                    <th className="p-5 sm:p-6 hidden sm:table-cell">Страница</th>
                    <th className="p-5 sm:p-6 hidden md:table-cell">Устройство</th>
                    <th className="p-5 sm:p-6 text-right">Когда</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {visitorsLoading&&<tr><td colSpan={5} className="p-10 text-center text-white/40">Загрузка…</td></tr>}
                  {!visitorsLoading&&visitorStats.filtered.length===0&&<tr><td colSpan={5} className="p-10 text-center text-white/40">Пока нет данных</td></tr>}
                  {visitorStats.filtered.map(v=>(
                    <tr key={v.id} className="hover:bg-white/[0.01]">
                      <td className="p-5 sm:p-6 font-mono font-bold text-blue-400">{v.ip}</td>
                      <td className="p-5 sm:p-6">
                        <div className="font-bold">{flagEmoji(v.country_code)} {v.country||"Неизвестно"}</div>
                        <div className="text-xs text-white/40 mt-0.5">{[v.city,v.region].filter(Boolean).join(", ")||"—"}</div>
                      </td>
                      <td className="p-5 sm:p-6 text-xs text-white/60 font-mono hidden sm:table-cell">{v.path||"/"}</td>
                      <td className="p-5 sm:p-6 text-xs text-white/50 max-w-[240px] truncate hidden md:table-cell" title={v.user_agent||""}>{v.user_agent||"—"}</td>
                      <td className="p-5 sm:p-6 text-right text-xs text-white/50 whitespace-nowrap">{new Date(v.created_at).toLocaleString("ru-RU")}</td>
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
