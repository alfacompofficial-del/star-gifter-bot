import { useState, useEffect, useCallback, useRef } from "react";
import { X, Heart, Share2, ShoppingCart, Zap, ZoomIn, CheckCircle, Copy, Check, Pencil, Plus, Trash2, Eye } from "lucide-react";
import { formatPrice, EXCHANGE_RATE } from "@/lib/constants";
import { getProductUrl } from "@/lib/slugify";
import type { Product } from "@/hooks/useProducts";
import { toast } from "sonner";

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
  isAdmin?: boolean;
}

const ProductModal = ({ product, onClose, onAddToCart, isAdmin }: ProductModalProps) => {
  const [liked, setLiked] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [isZooming, setIsZooming] = useState(false);
  const imgContainerRef = useRef<HTMLDivElement>(null);

  // Admin: inline price editing
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceValue, setPriceValue] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);

  // Admin: specs editing
  const [specs, setSpecs] = useState<Record<string, string>>({});
  const [editingSpecKey, setEditingSpecKey] = useState<string | null>(null);
  const [editingSpecValue, setEditingSpecValue] = useState("");
  const [addingSpec, setAddingSpec] = useState(false);
  const [newSpecKey, setNewSpecKey] = useState("");
  const [newSpecValue, setNewSpecValue] = useState("");
  const [savingSpec, setSavingSpec] = useState(false);

  // Load liked state
  useEffect(() => {
    if (!product) return;
    const likes = JSON.parse(localStorage.getItem("liked_products") || "[]");
    setLiked(likes.includes(product.id));
  }, [product]);

  // Load specs from product
  useEffect(() => {
    if (!product) return;
    
    // Normalize specs if it comes from DB as an array of {key, value}
    let normalizedSpecs: Record<string, string> = {};
    if (Array.isArray(product.specs)) {
      product.specs.forEach((s: any) => {
        if (s && typeof s === 'object' && s.key) {
          normalizedSpecs[s.key] = s.value || "";
        }
      });
    } else if (product.specs && typeof product.specs === 'object') {
      normalizedSpecs = product.specs as Record<string, string>;
    }
    
    setSpecs(normalizedSpecs);
    setEditingPrice(false);
    setEditingSpecKey(null);
    setAddingSpec(false);

    // Increment views
    const incrementView = async () => {
      if (isAdmin) return; // don't count admin views
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        await supabase.from("products").update({ views: (product.views || 0) + 1 }).eq("id", product.id);
      } catch {}
    };
    incrementView();
  }, [product, isAdmin]);

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (lightboxOpen) setLightboxOpen(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, lightboxOpen]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleLike = useCallback(async () => {
    if (!product) return;
    const likes: number[] = JSON.parse(localStorage.getItem("liked_products") || "[]");
    const isLiking = !likes.includes(product.id);
    const newLikes = isLiking
      ? [...likes, product.id]
      : likes.filter((id) => id !== product.id);
      
    localStorage.setItem("liked_products", JSON.stringify(newLikes));
    setLiked(isLiking);

    // Update global likes in DB
    try {
      const newGlobalLikes = Math.max(0, (product.likes || 0) + (isLiking ? 1 : -1));
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.from("products").update({ likes: newGlobalLikes }).eq("id", product.id);
      product.likes = newGlobalLikes;
    } catch {}
  }, [product]);

  const handleShare = useCallback(async () => {
    if (!product) return;
    const url = window.location.origin + window.location.pathname + getProductUrl(product.id, product.category).replace("/#", "#");
    const shareData = {
      title: product.name,
      text: `${product.name} — ${formatPrice(Math.round(product.price * EXCHANGE_RATE))} сум`,
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // fallback silent
      }
    }
  }, [product]);

  const handleAddToCart = () => {
    if (!product) return;
    onAddToCart(product);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleBuyNow = () => {
    if (!product) return;
    const text = encodeURIComponent(
      `Хочу купить: ${product.name}\nЦена: ${formatPrice(Math.round(product.price * EXCHANGE_RATE))} сум (~$${product.price})`
    );
    window.open(`https://t.me/ALIBABO777?text=${text}`, "_blank");
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgContainerRef.current) return;
    const rect = imgContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  };

  // ── Admin: price editing ───────────────────────────────────────
  const handlePriceClick = () => {
    if (!isAdmin || !product) return;
    setPriceValue(String(product.price));
    setEditingPrice(true);
  };

  const handlePriceSave = async () => {
    if (!product) return;
    const val = parseFloat(priceValue);
    if (isNaN(val) || val <= 0) { toast.error("Введите корректную цену"); return; }
    setSavingPrice(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { QueryClient } = await import("@tanstack/react-query");
      const { error } = await supabase.from("products").update({ price: val }).eq("id", product.id);
      if (!error) {
        toast.success("Цена обновлена!");
        product.price = val;
        setEditingPrice(false);
        // Refresh product list in background
        window.dispatchEvent(new CustomEvent("products-updated"));
      } else {
        toast.error("Ошибка сохранения");
      }
    } catch {
      toast.error("Ошибка соединения");
    }
    setSavingPrice(false);
  };

  const handleEditField = async (field: 'name' | 'brand' | 'category' | 'image', currentValue: string) => {
    if (!isAdmin || !product) return;
    const newValue = window.prompt(`Изменить ${field}:`, currentValue);
    if (newValue !== null && newValue.trim() !== "" && newValue !== currentValue) {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { error } = await supabase.from("products").update({ [field]: newValue.trim() }).eq("id", product.id);
        if (!error) {
          toast.success("Обновлено!");
          (product as any)[field] = newValue.trim();
          window.dispatchEvent(new CustomEvent("products-updated"));
        } else {
          toast.error("Ошибка сохранения");
        }
      } catch {
        toast.error("Ошибка соединения");
      }
    }
  };

  const handleDuplicate = async () => {
    if (!isAdmin || !product) return;
    
    // Copy to clipboard memory for Ctrl+V
    localStorage.setItem("copied_product", JSON.stringify(product));
    toast.success(`Товар "${product.name}" скопирован! Теперь перейдите в нужную вкладку и нажмите Ctrl+V для вставки.`, { duration: 5000 });
    
    // Legacy behavior: also ask to duplicate right here
    if (!window.confirm("Создать копию этого товара в текущей категории прямо сейчас?")) return;
    
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { id, created_at, ...productData } = product;
      
      const { data, error } = await supabase.from("products").insert({
        ...productData,
        name: `${product.name} (Копия)`
      }).select().single();
      
      if (!error && data) {
        toast.success("Товар продублирован!");
        window.dispatchEvent(new CustomEvent("products-updated"));
        onClose();
      } else {
        toast.error("Ошибка при дублировании");
      }
    } catch {
      toast.error("Ошибка соединения");
    }
  };

  // ── Admin: specs helpers ───────────────────────────────────────
  const saveSpecs = async (newSpecs: Record<string, string>) => {
    if (!product) return false;
    setSavingSpec(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.from("products").update({ specs: newSpecs } as any).eq("id", product.id);
      if (!error) {
        setSpecs(newSpecs);
        product.specs = newSpecs;
        window.dispatchEvent(new CustomEvent("products-updated"));
        setSavingSpec(false);
        return true;
      } else {
        toast.error("Ошибка сохранения характеристики");
      }
    } catch {
      toast.error("Ошибка соединения");
    }
    setSavingSpec(false);
    return false;
  };

  const handleEditSpec = (key: string) => {
    setEditingSpecKey(key);
    setEditingSpecValue(specs[key] ?? "");
  };

  const handleSaveSpec = async (key: string) => {
    const updated = { ...specs, [key]: editingSpecValue };
    const ok = await saveSpecs(updated);
    if (ok) {
      toast.success("Характеристика обновлена!");
      setEditingSpecKey(null);
    }
  };

  const handleDeleteSpec = async (key: string) => {
    const updated = { ...specs };
    delete updated[key];
    const ok = await saveSpecs(updated);
    if (ok) toast.success("Характеристика удалена!");
  };

  const handleAddSpec = async () => {
    const k = newSpecKey.trim();
    const v = newSpecValue.trim();
    if (!k || !v) { toast.error("Введите название и значение"); return; }
    if (specs[k] !== undefined) { toast.error("Такая характеристика уже есть"); return; }
    const updated = { ...specs, [k]: v };
    const ok = await saveSpecs(updated);
    if (ok) {
      toast.success("Характеристика добавлена!");
      setNewSpecKey("");
      setNewSpecValue("");
      setAddingSpec(false);
    }
  };

  if (!product) return null;

  const priceUZS = formatPrice(Math.round(product.price * EXCHANGE_RATE));
  const oldPriceUZS = product.old_price ? formatPrice(Math.round(product.old_price * EXCHANGE_RATE)) : null;

  // Static specs (always shown)
  const staticSpecs = [
    { key: "Производитель", value: product.brand },
    { key: "Категория", value: product.category },
    { key: "Наличие", value: product.in_stock ? "Есть в наличии" : "Нет в наличии", colorClass: product.in_stock ? "text-emerald-400" : "text-red-400" },
  ];

  // Dynamic specs from DB
  const dynamicSpecEntries = Object.entries(specs);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[201] flex items-center justify-center p-2 sm:p-4 pointer-events-none">
        <div
          className="relative w-full max-w-4xl max-h-[95vh] overflow-y-auto bg-[#0d0d0d] rounded-2xl sm:rounded-3xl border border-white/10 shadow-2xl pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top gradient border */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#ff0080]/60 to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {/* LEFT: Image */}
            <div className="relative bg-[#080808] rounded-t-2xl sm:rounded-tl-3xl md:rounded-l-3xl md:rounded-tr-none overflow-hidden">
              {/* Image container with zoom */}
              <div
                ref={imgContainerRef}
                className="relative aspect-square flex items-center justify-center p-6 sm:p-10 cursor-zoom-in overflow-hidden group"
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setIsZooming(true)}
                onMouseLeave={() => setIsZooming(false)}
                onClick={() => setLightboxOpen(true)}
              >
                {/* Background glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#ff0080]/5 via-transparent to-[#00f2ff]/5" />

                {/* Main image */}
                <img
                  src={product.image}
                  alt={product.name}
                  className="max-w-full max-h-full object-contain relative z-10 transition-transform duration-200"
                  style={
                    isZooming
                      ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`, transform: "scale(1.8)" }
                      : {}
                  }
                  onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                />
                
                {/* Admin image edit hint */}
                {isAdmin && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleEditField('image', product.image); }}
                    className="absolute top-3 right-3 z-30 bg-black/50 hover:bg-black/80 text-white p-2 rounded-xl backdrop-blur-sm border border-white/10 transition-all opacity-0 group-hover:opacity-100"
                    title="Изменить ссылку на картинку"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}

                {/* Zoom icon overlay */}
                <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-black/60 backdrop-blur-sm rounded-2xl px-4 py-2 flex items-center gap-2 text-white border border-white/20">
                    <ZoomIn className="w-4 h-4" />
                    <span className="text-xs font-bold">Нажмите для просмотра</span>
                  </div>
                </div>
              </div>

              {/* Stock badge */}
              <div className="absolute top-3 left-3">
                {product.in_stock ? (
                  <span className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest backdrop-blur-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    В наличии
                  </span>
                ) : (
                  <span className="bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest backdrop-blur-md">
                    Нет в наличии
                  </span>
                )}
              </div>
            </div>

            {/* RIGHT: Info */}
            <div className="p-5 sm:p-8 flex flex-col justify-between gap-4 sm:gap-6">
              
              {/* Admin Analytics & Actions */}
              {isAdmin && (
                <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-3 -mt-2">
                  <div className="flex gap-3 text-xs font-black text-white/60">
                    <span className="flex items-center gap-1.5" title="Просмотры"><Eye className="w-4 h-4 text-[#00f2ff]"/> {product.views || 0}</span>
                    <span className="flex items-center gap-1.5" title="Добавлено в избранное"><Heart className="w-4 h-4 text-[#ff0080]"/> {product.likes || 0}</span>
                  </div>
                  <button 
                    onClick={handleDuplicate} 
                    className="ml-auto text-blue-400 flex items-center gap-1.5 hover:text-blue-300 text-xs font-bold uppercase tracking-wider bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20"
                  >
                    <Copy className="w-3.5 h-3.5"/> Дублировать
                  </button>
                </div>
              )}

              {/* Brand + Name */}
              <div>
                <p 
                  className={`text-[10px] font-black text-[#ff0080] uppercase tracking-[0.2em] mb-2 ${isAdmin ? 'cursor-pointer hover:text-[#ff3399]' : ''}`}
                  onClick={() => isAdmin && handleEditField('brand', product.brand || '')}
                  title={isAdmin ? "Изменить бренд" : undefined}
                >
                  {product.brand || "БЕЗ БРЕНДА"} {isAdmin && <Pencil className="w-2.5 h-2.5 inline-block opacity-50 ml-1"/>}
                </p>
                <h2 
                  className={`text-xl sm:text-2xl font-black leading-tight text-white mb-1 ${isAdmin ? 'cursor-pointer hover:text-gray-300' : ''}`}
                  onClick={() => isAdmin && handleEditField('name', product.name)}
                  title={isAdmin ? "Изменить название" : undefined}
                >
                  {product.name} {isAdmin && <Pencil className="w-4 h-4 inline-block opacity-50 ml-2"/>}
                </h2>
                <p 
                  className={`text-xs text-white/40 font-medium ${isAdmin ? 'cursor-pointer hover:text-white/80' : ''}`}
                  onClick={() => isAdmin && handleEditField('category', product.category || '')}
                  title={isAdmin ? "Изменить категорию" : undefined}
                >
                  {product.category || "Без категории"} {isAdmin && <Pencil className="w-3 h-3 inline-block opacity-50 ml-1"/>}
                </p>
              </div>

              {/* Price + Like/Share */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  {oldPriceUZS && (
                    <p className="text-sm text-red-400/70 line-through font-bold mb-0.5">
                      {oldPriceUZS} сум
                    </p>
                  )}

                  {/* Admin: inline price edit */}
                  {isAdmin && editingPrice ? (
                    <div className="flex items-center gap-2">
                      <span className="text-blue-400 font-black">$</span>
                      <input
                        type="number"
                        value={priceValue}
                        onChange={(e) => setPriceValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handlePriceSave();
                          if (e.key === "Escape") setEditingPrice(false);
                        }}
                        autoFocus
                        className="w-28 bg-white/10 border border-primary/60 rounded-xl px-3 py-1.5 text-right font-black text-xl text-blue-400 outline-none focus:border-primary"
                      />
                      <button
                        onClick={handlePriceSave}
                        disabled={savingPrice}
                        className="w-8 h-8 flex items-center justify-center bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500 hover:text-white transition-all"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingPrice(false)}
                        className="w-8 h-8 flex items-center justify-center bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <p
                      className={`text-2xl sm:text-3xl font-black text-white leading-none ${isAdmin ? "cursor-pointer hover:text-[#00f2ff] transition-colors group/price flex items-center gap-2" : ""}`}
                      onClick={handlePriceClick}
                      title={isAdmin ? "Нажмите чтобы изменить цену" : undefined}
                    >
                      {priceUZS}
                      <span className="text-sm text-white/40 ml-1 font-medium">сум</span>
                      {isAdmin && <Pencil className="w-3.5 h-3.5 opacity-0 group-hover/price:opacity-60 transition-opacity text-[#00f2ff]" />}
                    </p>
                  )}

                  <p className="text-sm font-bold text-[#00f2ff]/80 mt-1">≈ ${product.price}</p>
                </div>

                {/* Like + Share */}
                <div className="flex flex-col gap-2 mt-1">
                  <button
                    onClick={handleLike}
                    title={liked ? "Убрать из избранного" : "В избранное"}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${
                      liked
                        ? "bg-[#ff0080]/20 border-[#ff0080]/50 text-[#ff0080] shadow-[0_0_15px_rgba(255,0,128,0.3)]"
                        : "bg-white/5 border-white/10 text-white/40 hover:text-[#ff0080] hover:border-[#ff0080]/40 hover:bg-[#ff0080]/10"
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
                  </button>
                  <button
                    onClick={handleShare}
                    title="Поделиться"
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all border bg-white/5 border-white/10 text-white/40 hover:text-[#00f2ff] hover:border-[#00f2ff]/40 hover:bg-[#00f2ff]/10"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Copy link notification */}
              {copied && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 -mt-2">
                  <Copy className="w-3 h-3" />
                  Ссылка скопирована!
                </div>
              )}

              {/* Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleBuyNow}
                  className="w-full py-3.5 rounded-xl border border-white/20 text-white font-bold text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4 text-[#ff0080]" />
                  Купить в один клик
                </button>
                <button
                  onClick={handleAddToCart}
                  disabled={!product.in_stock}
                  className={`w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    !product.in_stock
                      ? "bg-white/5 text-white/20 cursor-not-allowed"
                      : addedToCart
                      ? "bg-emerald-500 text-white shadow-[0_0_25px_rgba(16,185,129,0.4)]"
                      : "bg-gradient-to-r from-[#ff0080] to-[#ff3399] text-white hover:shadow-[0_0_30px_rgba(255,0,128,0.5)] hover:brightness-110"
                  }`}
                >
                  {addedToCart ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Добавлено!
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" />
                      В Корзину
                    </>
                  )}
                </button>
              </div>

              {/* Specs */}
              <div className="border-t border-white/5 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Характеристики</p>
                  {isAdmin && (
                    <button
                      onClick={() => { setAddingSpec(true); setNewSpecKey(""); setNewSpecValue(""); }}
                      className="flex items-center gap-1 text-[10px] font-black text-[#00f2ff]/60 hover:text-[#00f2ff] transition-colors uppercase tracking-widest"
                      title="Добавить характеристику"
                    >
                      <Plus className="w-3 h-3" /> Добавить
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {/* Static specs */}
                  {staticSpecs.map(({ key, value, colorClass }) => (
                    <div key={key} className="flex justify-between items-center py-1.5 border-b border-white/5">
                      <span className="text-xs text-white/40 font-medium">{key}</span>
                      <span className={`text-xs font-bold ${colorClass ?? "text-white"}`}>{value}</span>
                    </div>
                  ))}

                  {/* Dynamic specs from DB */}
                  {dynamicSpecEntries.map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center py-1.5 border-b border-white/5 group/spec">
                      <span className="text-xs text-white/40 font-medium">{key}</span>
                      <div className="flex items-center gap-2">
                        {isAdmin && editingSpecKey === key ? (
                          <>
                            <input
                              type="text"
                              value={editingSpecValue}
                              onChange={(e) => setEditingSpecValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveSpec(key);
                                if (e.key === "Escape") setEditingSpecKey(null);
                              }}
                              autoFocus
                              className="w-36 bg-white/10 border border-primary/50 rounded-lg px-2 py-1 text-xs font-bold text-white outline-none focus:border-primary text-right"
                            />
                            <button
                              onClick={() => handleSaveSpec(key)}
                              disabled={savingSpec}
                              className="w-6 h-6 flex items-center justify-center bg-green-500/20 text-green-400 rounded-md hover:bg-green-500 hover:text-white transition-all"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setEditingSpecKey(null)}
                              className="w-6 h-6 flex items-center justify-center bg-red-500/10 text-red-400 rounded-md hover:bg-red-500 hover:text-white transition-all"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span
                              className={`text-xs font-bold text-white ${isAdmin ? "cursor-pointer hover:text-[#00f2ff] transition-colors" : ""}`}
                              onClick={() => isAdmin && handleEditSpec(key)}
                              title={isAdmin ? "Нажмите чтобы изменить" : undefined}
                            >
                              {value}
                            </span>
                            {isAdmin && (
                              <>
                                <button
                                  onClick={() => handleEditSpec(key)}
                                  className="opacity-0 group-hover/spec:opacity-60 hover:!opacity-100 transition-opacity text-white/40 hover:text-[#00f2ff]"
                                  title="Изменить"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSpec(key)}
                                  className="opacity-0 group-hover/spec:opacity-60 hover:!opacity-100 transition-opacity text-white/40 hover:text-red-400"
                                  title="Удалить"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Add new spec form */}
                  {isAdmin && addingSpec && (
                    <div className="mt-3 p-3 bg-white/5 border border-[#00f2ff]/20 rounded-xl space-y-2">
                      <p className="text-[10px] font-black text-[#00f2ff]/60 uppercase tracking-widest">Новая характеристика</p>
                      <input
                        type="text"
                        value={newSpecKey}
                        onChange={(e) => setNewSpecKey(e.target.value)}
                        placeholder="Название (напр: Частота)"
                        className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-white outline-none focus:border-[#00f2ff]/50 placeholder:text-white/30"
                      />
                      <input
                        type="text"
                        value={newSpecValue}
                        onChange={(e) => setNewSpecValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleAddSpec(); if (e.key === "Escape") setAddingSpec(false); }}
                        placeholder="Значение (напр: 144 Гц)"
                        className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-white outline-none focus:border-[#00f2ff]/50 placeholder:text-white/30"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddSpec}
                          disabled={savingSpec}
                          className="flex-1 py-2 bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-[#00f2ff] hover:text-black transition-all"
                        >
                          {savingSpec ? "Сохраняю..." : "Добавить"}
                        </button>
                        <button
                          onClick={() => setAddingSpec(false)}
                          className="px-4 py-2 bg-white/5 text-white/40 border border-white/10 rounded-lg text-xs font-black hover:bg-white/10 transition-all"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center cursor-zoom-out p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-10"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={product.image}
            alt={product.name}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
            onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
          />
        </div>
      )}
    </>
  );
};

export default ProductModal;
