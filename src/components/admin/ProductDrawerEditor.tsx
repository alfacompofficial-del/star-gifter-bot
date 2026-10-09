import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Upload, Check, AlertCircle, Trash2, Plus, Image as ImageIcon,
  DollarSign, Package, Layers, Sparkles, Sliders
} from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/constants";
import type { Product } from "@/hooks/useProducts";

interface ProductDrawerEditorProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null; // null means creating a new product
  categories: string[];
  exchangeRate: number;
  onSave: (productData: Partial<Product>, isNew: boolean) => Promise<boolean>;
}

export const ProductDrawerEditor: React.FC<ProductDrawerEditorProps> = ({
  isOpen,
  onClose,
  product,
  categories,
  exchangeRate,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<"general" | "pricing" | "media" | "specs">("general");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState(categories[0] || "ИБП");
  const [priority, setPriority] = useState("999");
  const [inStock, setInStock] = useState(true);
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [specs, setSpecs] = useState<Array<{ key: string; value: string }>>([]);
  const [newSpecKey, setNewSpecKey] = useState("");
  const [newSpecValue, setNewSpecValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state with product when opening
  useEffect(() => {
    if (product) {
      setName(product.name || "");
      setBrand(product.brand || "AlfaComp");
      setCategory(product.category || categories[0] || "ИБП");
      setPriority(String(product.priority ?? 999));
      setInStock(product.in_stock ?? true);
      setPrice(String(product.price || ""));
      setOldPrice(product.old_price ? String(product.old_price) : "");
      setImageUrl(product.image || "");

      // Normalize specs
      const specList: Array<{ key: string; value: string }> = [];
      if (product.specs) {
        if (Array.isArray(product.specs)) {
          product.specs.forEach((s: any) => {
            if (s && s.key) specList.push({ key: s.key, value: s.value || "" });
          });
        } else if (typeof product.specs === "object") {
          Object.entries(product.specs).forEach(([k, v]) => {
            specList.push({ key: k, value: String(v) });
          });
        }
      }
      setSpecs(specList);
    } else {
      // New product defaults
      setName("");
      setBrand("AlfaComp");
      setCategory(categories[0] || "ИБП");
      setPriority("1");
      setInStock(true);
      setPrice("");
      setOldPrice("");
      setImageUrl("");
      setSpecs([]);
    }
    setActiveTab("general");
  }, [product, categories, isOpen]);

  // File upload handler (Data URL)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (!file.type.startsWith("image/")) {
      toast.error("Выберите файл изображения (PNG, JPG, WebP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Файл слишком большой (максимум 5 МБ)");
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setImageUrl(dataUrl);
        setIsUploading(false);
        toast.success("Изображение загружено!");
      };
      reader.onerror = () => {
        toast.error("Ошибка при чтении файла");
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Не удалось обработать изображение");
      setIsUploading(false);
    }
  };

  const handleAddSpec = () => {
    if (!newSpecKey.trim()) {
      toast.error("Укажите параметр");
      return;
    }
    setSpecs(prev => [...prev, { key: newSpecKey.trim(), value: newSpecValue.trim() }]);
    setNewSpecKey("");
    setNewSpecValue("");
  };

  const handleRemoveSpec = (index: number) => {
    setSpecs(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Укажите наименование товара");
      setActiveTab("general");
      return;
    }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      toast.error("Укажите корректную цену в USD ($)");
      setActiveTab("pricing");
      return;
    }

    // Convert specs array back to Record or Array
    const specsRecord: Record<string, string> = {};
    specs.forEach(({ key, value }) => {
      if (key) specsRecord[key] = value;
    });

    const payload: Partial<Product> = {
      name: name.trim(),
      brand: brand.trim() || "AlfaComp",
      category,
      priority: parseInt(priority) || 999,
      in_stock: inStock,
      price: numPrice,
      old_price: oldPrice ? parseFloat(oldPrice) : null,
      image: imageUrl.trim() || "https://via.placeholder.com/400x300?text=Hardware",
      specs: specsRecord,
    };

    setIsSaving(true);
    const ok = await onSave(payload, !product);
    setIsSaving(false);
    if (ok) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer Inspector */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320, mass: 0.8 }}
            className="relative w-full sm:max-w-[560px] h-full bg-[#0a0c10] border-l border-white/[0.08] flex flex-col z-10 shadow-[-30px_0_80px_rgba(0,0,0,0.85)] select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/[0.07] bg-[#0e1117]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A00]" />
                  <span className="font-mono text-[10px] text-white/50 tracking-[0.18em] uppercase">
                    {product ? `RECORD // ID #${product.id}` : "NEW HARDWARE RECORD"}
                  </span>
                </div>
                <h2 className="text-base font-bold text-white tracking-tight mt-0.5 truncate max-w-[360px]">
                  {product ? product.name : "Добавление товара в каталог"}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-[#141720] border border-white/10 hover:border-white/25 flex items-center justify-center text-white/60 hover:text-white transition-all"
                title="Закрыть панель (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab navigation */}
            <div className="flex items-center border-b border-white/[0.06] bg-[#0c0e14] px-4 overflow-x-auto no-scrollbar">
              {[
                { id: "general", label: "Основные", icon: Package },
                { id: "pricing", label: "Цена ($ / UZS)", icon: DollarSign },
                { id: "media", label: "Медиа", icon: ImageIcon },
                { id: "specs", label: "Характеристики", icon: Sliders },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex items-center gap-2 px-3.5 py-3 text-xs font-semibold tracking-tight whitespace-nowrap transition-all border-b-2 -mb-px ${
                    activeTab === id
                      ? "border-[#FF5A00] text-white bg-white/[0.02]"
                      : "border-transparent text-white/45 hover:text-white/80"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${activeTab === id ? "text-[#FF5A00]" : "text-white/40"}`} />
                  {label}
                </button>
              ))}
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {/* TAB 1: GENERAL */}
              {activeTab === "general" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono uppercase text-white/60 tracking-wider">
                      Наименование оборудования *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Например: ИБP Ion 1000VA LCD"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#12151d] border border-white/10 rounded-lg p-3 text-sm text-white font-medium outline-none focus:border-[#FF5A00] transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono uppercase text-white/60 tracking-wider">
                        Категория *
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-[#12151d] border border-white/10 rounded-lg p-3 text-sm text-white font-medium outline-none focus:border-[#FF5A00] transition-all appearance-none cursor-pointer"
                      >
                        {categories.map((c) => (
                          <option key={c} value={c} className="bg-[#12151d] text-white">
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono uppercase text-white/60 tracking-wider">
                        Бренд / Производитель
                      </label>
                      <input
                        type="text"
                        placeholder="Ion, Asus, MSI, etc."
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        className="w-full bg-[#12151d] border border-white/10 rounded-lg p-3 text-sm text-white font-medium outline-none focus:border-[#FF5A00] transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono uppercase text-white/60 tracking-wider">
                        Позиция в каталоге (приоритет)
                      </label>
                      <input
                        type="number"
                        placeholder="1, 2, 3... 999"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="w-full bg-[#12151d] border border-white/10 rounded-lg p-3 text-sm font-mono text-white outline-none focus:border-[#FF5A00] transition-all"
                      />
                      <p className="text-[10px] text-white/35 font-mono">1 = самый верх каталога</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono uppercase text-white/60 tracking-wider">
                        Статус наличия
                      </label>
                      <button
                        type="button"
                        onClick={() => setInStock(!inStock)}
                        className={`w-full h-[46px] rounded-lg border font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                          inStock
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${inStock ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
                        {inStock ? "В наличии (Активен)" : "Снят с продажи"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PRICING */}
              {activeTab === "pricing" && (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-mono uppercase text-white/40">Текущий курс системы</div>
                      <div className="text-sm font-bold text-white mt-0.5">1 USD = {exchangeRate.toLocaleString()} UZS</div>
                    </div>
                    <span className="text-[10px] font-mono text-[#FF5A00] bg-[#FF5A00]/10 px-2 py-1 rounded border border-[#FF5A00]/20">
                      LIVE CONVERSION
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono uppercase text-white/60 tracking-wider">
                        Цена в долларах ($ USD) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-white/40">$</span>
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="85"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          className="w-full bg-[#12151d] border border-white/10 rounded-lg pl-8 pr-3 py-3 text-lg font-mono font-bold text-[#FF5A00] outline-none focus:border-[#FF5A00] transition-all"
                        />
                      </div>
                      {price && !isNaN(parseFloat(price)) && (
                        <p className="text-[11px] font-mono text-emerald-400/90 mt-1">
                          ≈ {formatPrice(Math.round(parseFloat(price) * exchangeRate))} сум
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono uppercase text-white/60 tracking-wider">
                        Старая цена ($ скидка)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-white/30">$</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="100"
                          value={oldPrice}
                          onChange={(e) => setOldPrice(e.target.value)}
                          className="w-full bg-[#12151d] border border-white/10 rounded-lg pl-8 pr-3 py-3 text-sm font-mono text-red-400 outline-none focus:border-red-500 transition-all"
                        />
                      </div>
                      {oldPrice && !isNaN(parseFloat(oldPrice)) && (
                        <p className="text-[10px] font-mono text-white/30 mt-1">
                          Зачеркнутая цена для скидки
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: MEDIA */}
              {activeTab === "media" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono uppercase text-white/60 tracking-wider">
                      URL Изображения (или загрузка файла ниже)
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full bg-[#12151d] border border-white/10 rounded-lg p-3 text-xs font-mono text-white outline-none focus:border-[#FF5A00] transition-all"
                    />
                  </div>

                  {/* Dropzone & File button */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-white/10 hover:border-[#FF5A00]/50 rounded-xl p-6 text-center cursor-pointer transition-all bg-white/[0.01] hover:bg-white/[0.03]"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#141720] border border-white/10 flex items-center justify-center mx-auto mb-2 text-[#FF5A00]">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-white">Загрузить файл с устройства</div>
                    <p className="text-[10px] text-white/40 mt-1 font-mono">PNG, JPG, WebP до 5 МБ</p>
                  </div>

                  {/* Image Preview Box */}
                  {imageUrl && (
                    <div className="p-3 rounded-xl bg-[#12151d] border border-white/10 space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-mono text-white/40">
                        <span>ПРЕДПРОСМОТР</span>
                        <button
                          type="button"
                          onClick={() => setImageUrl("")}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          Удалить фото
                        </button>
                      </div>
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-black/40 flex items-center justify-center border border-white/5">
                        <img
                          src={imageUrl}
                          alt="Предпросмотр"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://via.placeholder.com/300x200?text=Preview+Error";
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: SPECS */}
              {activeTab === "specs" && (
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] text-xs text-white/60">
                    Технические параметры отображаются в карточке и модальном окне товара.
                  </div>

                  {/* Add spec inline form */}
                  <div className="grid grid-cols-5 gap-2">
                    <input
                      type="text"
                      placeholder="Параметр (напр. Мощность)"
                      value={newSpecKey}
                      onChange={(e) => setNewSpecKey(e.target.value)}
                      className="col-span-2 bg-[#12151d] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#FF5A00]"
                    />
                    <input
                      type="text"
                      placeholder="Значение (напр. 1000 ВА / 600 Вт)"
                      value={newSpecValue}
                      onChange={(e) => setNewSpecValue(e.target.value)}
                      className="col-span-2 bg-[#12151d] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#FF5A00]"
                    />
                    <button
                      type="button"
                      onClick={handleAddSpec}
                      className="col-span-1 bg-[#181d28] hover:bg-[#FF5A00] text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 border border-white/10"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Specs list */}
                  <div className="space-y-1.5 pt-2">
                    {specs.length === 0 ? (
                      <p className="text-xs font-mono text-white/30 text-center py-4">Характеристики не добавлены</p>
                    ) : (
                      specs.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-[#12151d] border border-white/5 text-xs"
                        >
                          <span className="font-mono text-white/50">{item.key}</span>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-white">{item.value}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSpec(idx)}
                              className="text-white/30 hover:text-red-400 transition-colors"
                              title="Удалить строку"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </form>

            {/* Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-white/[0.08] bg-[#0e1117] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2.5 rounded-lg border border-white/10 hover:border-white/20 text-xs font-mono text-white/70 hover:text-white transition-all uppercase tracking-wider"
              >
                Отмена
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSaving || isUploading}
                className="px-6 py-2.5 rounded-lg bg-[#FF5A00] hover:bg-[#FF6A15] text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-[#FF5A00]/20 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Сохранение...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{product ? "Сохранить изменения" : "Создать товар"}</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ProductDrawerEditor;
