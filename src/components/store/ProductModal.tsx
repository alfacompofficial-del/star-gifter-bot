import { useState, useEffect, useCallback, useRef } from "react";
import {
  X, Heart, Share2, ShoppingCart, Zap, ZoomIn, CheckCircle,
  Copy, Check, Pencil, Upload, Save, ToggleLeft, ToggleRight,
  Plus, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { formatPrice, EXCHANGE_RATE } from "@/lib/constants";
import { getProductUrl } from "@/lib/slugify";
import type { Product, ProductSpec } from "@/hooks/useProducts";
import { useFavorites } from "@/hooks/useFavorites";
import { supabase } from "@/integrations/supabase/client";

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
  isAdmin?: boolean;
  onProductUpdated?: (updated: Product) => void;
}

// ── Undo-aware save ───────────────────────────────────────────────
const withUndo = (
  label: string,
  saveNew: () => Promise<void>,
  revertOld: () => Promise<void>
) => {
  saveNew()
    .then(() => {
      toast.success(label, {
        duration: 5000,
        action: {
          label: "Отменить",
          onClick: () => {
            revertOld().then(() => toast.info("Изменение отменено"));
          },
        },
      });
    })
    .catch(() => toast.error("Ошибка сохранения"));
};

const CATEGORIES = [
  "ИБП", "Мониторы", "Сеть", "Аксессуары", "Смартфоны",
  "Комплектующие", "Моноблоки", "Колонки", "Кронштейны", "Deco", "Wi-Fi роутеры",
];

// ── Specs Editor Component ────────────────────────────────────────
const SpecsEditor = ({
  specs,
  onChange,
}: {
  specs: ProductSpec[];
  onChange: (updated: ProductSpec[]) => void;
}) => {
  const addRow = () => {
    onChange([...specs, { key: "", value: "" }]);
  };

  const updateRow = (idx: number, field: "key" | "value", val: string) => {
    const updated = specs.map((s, i) =>
      i === idx ? { ...s, [field]: val } : s
    );
    onChange(updated);
  };

  const removeRow = (idx: number) => {
    onChange(specs.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      {specs.length === 0 && (
        <p className="text-xs text-white/30 italic px-1">
          Нет характеристик. Нажмите «+» чтобы добавить.
        </p>
      )}
      {specs.map((s, idx) => (
        <div key={idx} className="flex gap-2 items-center group">
          <input
            value={s.key}
            onChange={(e) => updateRow(idx, "key", e.target.value)}
            placeholder="Параметр (напр. Объём)"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/80 font-medium outline-none focus:border-primary placeholder:text-white/20"
          />
          <input
            value={s.value}
            onChange={(e) => updateRow(idx, "value", e.target.value)}
            placeholder="Значение (напр. 64 GB)"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-bold outline-none focus:border-primary placeholder:text-white/20"
          />
          <button
            onClick={() => removeRow(idx)}
            className="w-8 h-8 flex items-center justify-center bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all flex-shrink-0 opacity-50 group-hover:opacity-100"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button
        onClick={addRow}
        className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-white/15 rounded-lg text-xs text-white/40 hover:text-primary hover:border-primary/40 transition-all"
      >
        <Plus className="w-3.5 h-3.5" />
        Добавить характеристику
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
const ProductModal = ({
  product,
  onClose,
  onAddToCart,
  isAdmin = false,
  onProductUpdated,
}: ProductModalProps) => {
  const { items: favorites, toggleFavorite } = useFavorites();
  const liked = product ? favorites.includes(product.id) : false;
  const [addedToCart, setAddedToCart] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [isZooming, setIsZooming] = useState(false);
  const imgContainerRef = useRef<HTMLDivElement>(null);

  // ── Admin edit mode ────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState<Partial<Product>>({});
  const [editSpecs, setEditSpecs] = useState<ProductSpec[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (product && editMode) {
      setEditValues({
        name: product.name,
        brand: product.brand,
        category: product.category,
        price: product.price,
        old_price: product.old_price,
        in_stock: product.in_stock,
        priority: product.priority,
        image: product.image,
      });
      setEditSpecs(
        Array.isArray(product.specs) ? [...product.specs] : []
      );
    }
  }, [editMode, product]);

  // SEO URL when product opens
  useEffect(() => {
    if (!product) return;
    const productHash = getProductUrl(product.id, product.category).replace("/#", "");
    const prev = window.location.hash;
    window.location.hash = productHash;
    return () => {
      if (prev === "" || prev === "#/") {
        window.location.hash = "/";
      } else {
        window.location.hash = prev.replace(/^#/, "");
      }
    };
  }, [product]);

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (lightboxOpen) { setLightboxOpen(false); return; }
        if (editMode) { setEditMode(false); return; }
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, lightboxOpen, editMode]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleLike = useCallback(() => {
    if (!product) return;
    toggleFavorite(product.id);
  }, [product, toggleFavorite]);

  const handleShare = useCallback(async () => {
    if (!product) return;
    const url =
      window.location.origin +
      window.location.pathname +
      getProductUrl(product.id, product.category).replace("/#", "#");
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
      } catch { /* silent */ }
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

  // ── Admin: image upload in edit mode ──────────────────────────
  const handleAdminImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!file.type.startsWith("image/")) return toast.error("Выберите изображение");
    if (file.size > 5 * 1024 * 1024) return toast.error("Макс. 5MB");
    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setEditValues((prev) => ({ ...prev, image: dataUrl }));
      setUploadingImage(false);
      toast.success("Фото загружено (ещё не сохранено)");
    };
    reader.readAsDataURL(file);
  };

  // ── Admin: save all edits ─────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!product) return;
    setSavingEdit(true);

    // Filter out empty spec rows
    const cleanedSpecs = editSpecs.filter((s) => s.key.trim() || s.value.trim());

    const updates: Record<string, any> = {};
    const fields: (keyof typeof editValues)[] = [
      "name", "brand", "category", "price", "old_price",
      "in_stock", "priority", "image",
    ];
    for (const f of fields) {
      if (editValues[f] !== undefined) updates[f] = editValues[f];
    }
    updates.specs = cleanedSpecs;

    const oldSnapshot = { ...product };
    const newProduct: Product = { ...product, ...updates, specs: cleanedSpecs };

    setEditMode(false);
    onProductUpdated?.(newProduct);

    withUndo(
      "Товар обновлён",
      async () => {
        await supabase.from("products").update(updates).eq("id", product.id);
      },
      async () => {
        const revert: Record<string, any> = {};
        for (const f of fields) revert[f] = (oldSnapshot as any)[f];
        revert.specs = oldSnapshot.specs ?? [];
        await supabase.from("products").update(revert).eq("id", product.id);
        onProductUpdated?.(oldSnapshot);
      }
    );
    setSavingEdit(false);
  };

  if (!product) return null;

  const displayProduct = editMode ? { ...product, ...editValues } : product;
  const displaySpecs: ProductSpec[] = editMode
    ? editSpecs
    : (Array.isArray(product.specs) ? product.specs : []);

  const priceUZS = formatPrice(Math.round((displayProduct.price ?? 0) * EXCHANGE_RATE));
  const oldPriceUZS = displayProduct.old_price
    ? formatPrice(Math.round(displayProduct.old_price * EXCHANGE_RATE))
    : null;

  // Fixed base specs always shown in view mode
  const baseSpecs: ProductSpec[] = [
    { key: "Производитель", value: displayProduct.brand ?? "" },
    { key: "Категория", value: displayProduct.category ?? "" },
    { key: "Наличие", value: displayProduct.in_stock ? "Есть в наличии" : "Нет в наличии" },
  ];

  return (
    <>
      {/* Hidden file input */}
      {isAdmin && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAdminImageUpload}
        />
      )}

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm"
        onClick={() => {
          if (editMode) return;
          onClose();
        }}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[201] flex items-center justify-center p-2 sm:p-4 pointer-events-none">
        <div
          className={`relative w-full max-w-4xl max-h-[95vh] overflow-y-auto bg-[#0d0d0d] rounded-2xl sm:rounded-3xl border shadow-2xl pointer-events-auto transition-all ${
            editMode ? "border-primary/50 shadow-primary/10" : "border-white/10"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top gradient border */}
          <div
            className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${
              editMode
                ? "from-transparent via-primary/80 to-transparent"
                : "from-transparent via-[#ff0080]/60 to-transparent"
            }`}
          />

          {/* Admin edit mode banner */}
          {isAdmin && editMode && (
            <div className="bg-primary/10 border-b border-primary/20 px-5 py-3 flex items-center justify-between">
              <span className="text-primary font-black text-xs uppercase tracking-widest flex items-center gap-2">
                <Pencil className="w-3.5 h-3.5" />
                Режим редактирования
              </span>
              <span className="text-white/40 text-xs">ESC — выйти без сохранения</span>
            </div>
          )}

          {/* Close / exit edit button */}
          <button
            onClick={() => {
              if (editMode) { setEditMode(false); return; }
              onClose();
            }}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {/* LEFT: Image */}
            <div className="relative bg-[#080808] rounded-t-2xl sm:rounded-tl-3xl md:rounded-l-3xl md:rounded-tr-none overflow-hidden">
              <div
                ref={imgContainerRef}
                className={`relative aspect-square flex items-center justify-center p-6 sm:p-10 overflow-hidden group ${
                  editMode ? "cursor-pointer" : "cursor-zoom-in"
                }`}
                onMouseMove={!editMode ? handleMouseMove : undefined}
                onMouseEnter={() => !editMode && setIsZooming(true)}
                onMouseLeave={() => setIsZooming(false)}
                onClick={() => {
                  if (editMode) { fileInputRef.current?.click(); }
                  else { setLightboxOpen(true); }
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#ff0080]/5 via-transparent to-[#00f2ff]/5" />

                {uploadingImage ? (
                  <div className="flex flex-col items-center gap-3 text-white/50">
                    <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-bold">Обработка фото...</span>
                  </div>
                ) : (
                  <img
                    src={displayProduct.image}
                    alt={displayProduct.name}
                    className="max-w-full max-h-full object-contain relative z-10 transition-transform duration-200"
                    style={
                      isZooming && !editMode
                        ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`, transform: "scale(1.8)" }
                        : {}
                    }
                    onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                  />
                )}

                <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-black/60 backdrop-blur-sm rounded-2xl px-4 py-2 flex items-center gap-2 text-white border border-white/20">
                    {editMode ? (
                      <><Upload className="w-4 h-4" /><span className="text-xs font-bold">Изменить фото</span></>
                    ) : (
                      <><ZoomIn className="w-4 h-4" /><span className="text-xs font-bold">Нажмите для просмотра</span></>
                    )}
                  </div>
                </div>

                {editMode && (
                  <div className="absolute inset-0 border-2 border-primary/30 pointer-events-none" />
                )}
              </div>

              {/* Stock badge / admin toggle */}
              <div className="absolute top-3 left-3">
                {editMode ? (
                  <button
                    onClick={() => setEditValues((prev) => ({ ...prev, in_stock: !prev.in_stock }))}
                    className={`flex items-center gap-2 text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-widest border backdrop-blur-md transition-all ${
                      editValues.in_stock
                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                        : "bg-red-500/10 border-red-500/30 text-red-400"
                    }`}
                  >
                    {editValues.in_stock
                      ? <><ToggleRight className="w-4 h-4" />В наличии</>
                      : <><ToggleLeft className="w-4 h-4" />Нет в наличии</>}
                  </button>
                ) : displayProduct.in_stock ? (
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

              {/* Admin edit button (view mode) */}
              {isAdmin && !editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  className="absolute bottom-3 right-3 flex items-center gap-2 px-4 py-2 bg-primary/20 border border-primary/40 text-primary rounded-xl text-xs font-black hover:bg-primary hover:text-black transition-all"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Редактировать
                </button>
              )}
            </div>

            {/* RIGHT: Info / Edit */}
            <div className="p-5 sm:p-8 flex flex-col justify-between gap-4 sm:gap-5">

              {/* ── EDIT MODE ── */}
              {editMode ? (
                <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1">
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                    Редактирование товара
                  </p>

                  {/* Name */}
                  <div>
                    <label className="text-[10px] font-black uppercase text-white/40 mb-1 block">Название</label>
                    <input
                      value={editValues.name ?? ""}
                      onChange={(e) => setEditValues((p) => ({ ...p, name: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white font-bold outline-none focus:border-primary text-sm"
                    />
                  </div>

                  {/* Brand + Category */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-black uppercase text-white/40 mb-1 block">Производитель</label>
                      <input
                        value={editValues.brand ?? ""}
                        onChange={(e) => setEditValues((p) => ({ ...p, brand: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white font-bold outline-none focus:border-primary text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-white/40 mb-1 block">Категория</label>
                      <select
                        value={editValues.category ?? ""}
                        onChange={(e) => setEditValues((p) => ({ ...p, category: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white font-bold outline-none focus:border-primary appearance-none text-sm"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c} className="bg-black">{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Price + Old price */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-black uppercase text-white/40 mb-1 block">Цена ($)</label>
                      <input
                        type="number"
                        value={editValues.price ?? ""}
                        onChange={(e) => setEditValues((p) => ({ ...p, price: parseFloat(e.target.value) }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-blue-400 font-black outline-none focus:border-primary text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-white/40 mb-1 block">Старая цена ($)</label>
                      <input
                        type="number"
                        value={editValues.old_price ?? ""}
                        onChange={(e) =>
                          setEditValues((p) => ({
                            ...p,
                            old_price: e.target.value ? parseFloat(e.target.value) : null,
                          }))
                        }
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-red-400 font-bold outline-none focus:border-red-400 text-sm"
                      />
                    </div>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="text-[10px] font-black uppercase text-white/40 mb-1 block">Позиция (приоритет)</label>
                    <input
                      type="number"
                      value={editValues.priority ?? ""}
                      onChange={(e) => setEditValues((p) => ({ ...p, priority: parseInt(e.target.value) }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white font-bold outline-none focus:border-primary text-sm"
                    />
                  </div>

                  {/* ── CHARACTERISTICS EDITOR ── */}
                  <div className="border border-white/8 rounded-xl p-3 bg-white/[0.02]">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-black uppercase text-white/50 tracking-widest">
                        Характеристики
                      </p>
                      <span className="text-[9px] font-bold text-white/25 uppercase tracking-wider">
                        {editSpecs.length} строк
                      </span>
                    </div>
                    <SpecsEditor specs={editSpecs} onChange={setEditSpecs} />
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => setEditMode(false)}
                      className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 font-bold text-sm hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Отмена
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={savingEdit}
                      className="flex-1 py-3 rounded-xl bg-primary text-black font-black text-sm hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {savingEdit ? (
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Сохранить
                    </button>
                  </div>
                </div>
              ) : (
                /* ── VIEW MODE ── */
                <>
                  {/* Brand + Name */}
                  <div>
                    <p className="text-[10px] font-black text-[#ff0080] uppercase tracking-[0.2em] mb-2">
                      {displayProduct.brand}
                    </p>
                    <h2 className="text-xl sm:text-2xl font-black leading-tight text-white mb-1">
                      {displayProduct.name}
                    </h2>
                    <p className="text-xs text-white/40 font-medium">{displayProduct.category}</p>
                  </div>

                  {/* Price + Like/Share */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      {oldPriceUZS && (
                        <p className="text-sm text-red-400/70 line-through font-bold mb-0.5">
                          {oldPriceUZS} сум
                        </p>
                      )}
                      <p className="text-2xl sm:text-3xl font-black text-white leading-none">
                        {priceUZS}
                        <span className="text-sm text-white/40 ml-1 font-medium">сум</span>
                      </p>
                      <p className="text-sm font-bold text-[#00f2ff]/80 mt-1">≈ ${displayProduct.price}</p>
                    </div>

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
                      disabled={!displayProduct.in_stock}
                      className={`w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                        !displayProduct.in_stock
                          ? "bg-white/5 text-white/20 cursor-not-allowed"
                          : addedToCart
                          ? "bg-emerald-500 text-white shadow-[0_0_25px_rgba(16,185,129,0.4)]"
                          : "bg-gradient-to-r from-[#ff0080] to-[#ff3399] text-white hover:shadow-[0_0_30px_rgba(255,0,128,0.5)] hover:brightness-110"
                      }`}
                    >
                      {addedToCart ? (
                        <><CheckCircle className="w-4 h-4" />Добавлено!</>
                      ) : (
                        <><ShoppingCart className="w-4 h-4" />В Корзину</>
                      )}
                    </button>
                  </div>

                  {/* Characteristics (view mode) */}
                  <div className="border-t border-white/5 pt-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">
                      Характеристики
                    </p>
                    <div className="space-y-0">
                      {/* Fixed base rows */}
                      {baseSpecs.map((s, i) => (
                        <div
                          key={`base-${i}`}
                          className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-b-0"
                        >
                          <span className="text-xs text-white/40 font-medium">{s.key}</span>
                          <span
                            className={`text-xs font-bold ${
                              s.key === "Наличие"
                                ? displayProduct.in_stock
                                  ? "text-emerald-400"
                                  : "text-red-400"
                                : "text-white"
                            }`}
                          >
                            {s.value}
                          </span>
                        </div>
                      ))}

                      {/* Custom specs rows */}
                      {displaySpecs.filter((s) => s.key || s.value).map((s, i) => (
                        <div
                          key={`spec-${i}`}
                          className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-b-0"
                        >
                          <span className="text-xs text-white/40 font-medium">{s.key}</span>
                          <span className="text-xs font-bold text-white text-right max-w-[55%]">{s.value}</span>
                        </div>
                      ))}

                      {/* Admin hint when no custom specs */}
                      {isAdmin && displaySpecs.length === 0 && (
                        <div className="flex items-center gap-2 mt-2 text-[10px] text-primary/50 font-bold">
                          <Pencil className="w-3 h-3" />
                          Нажмите «Редактировать» чтобы добавить характеристики
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
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
            src={displayProduct.image}
            alt={displayProduct.name}
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
