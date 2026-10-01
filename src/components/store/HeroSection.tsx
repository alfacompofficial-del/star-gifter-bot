import { useRef } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Send, ArrowUpRight, Zap, Shield, Truck } from "lucide-react";
import { CONTACTS } from "@/lib/constants";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import heroPcImage from "@/assets/hero-pc.png";

// ── Stagger animation helpers ──────────────────────────
const fadeUp = (delay: number = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] as const },
});

const HeroSection = () => {
  const { exchangeRate } = useExchangeRate();
  const sectionRef = useRef<HTMLElement>(null);

  const scrollToCatalog = () => {
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleCategoryJump = (categoryName: string) => {
    const catalogEl = document.getElementById("catalog");
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: "smooth" });
      window.dispatchEvent(new CustomEvent("select-category", { detail: categoryName }));
    }
  };

  const hardwarePills = [
    { label: "Мониторы 144–320 Гц", cat: "Мониторы" },
    { label: "ИБП Ion", cat: "ИБП" },
    { label: "Wi-Fi роутеры", cat: "Сеть" },
    { label: "Комплектующие", cat: "Комплектующие" },
    { label: "Моноблоки", cat: "Моноблоки" },
  ];

  const stats = [
    { label: "Курс USD/UZS", value: `${exchangeRate.toLocaleString()}`, unit: "сум" },
    { label: "Доставка Ташкент", value: "1 день", unit: "" },
    { label: "Оплата", value: "Click · Payme", unit: "" },
  ];

  return (
    <section
      id="home"
      ref={sectionRef}
      className="relative pt-24 pb-10 sm:pt-32 sm:pb-16 overflow-hidden"
    >
      {/* Subtle top accent line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#FF5A00]/20 to-transparent pointer-events-none" />

      <div className="container px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.88fr] gap-8 lg:gap-14 items-center">

          {/* ── LEFT: Copy & CTAs ─────────────────────── */}
          <div className="flex flex-col">

            {/* Section marker */}
            <motion.div {...fadeUp(0.05)} className="flex items-center gap-2.5 mb-5">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#0f1117] border border-white/[0.07] w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] status-dot-pulse" />
                <span className="text-data text-[10px] text-white/55 tracking-[0.1em] uppercase">
                  Ташкент · Склад
                </span>
              </div>
              <div className="h-px flex-1 max-w-[80px] bg-gradient-to-r from-white/[0.08] to-transparent hidden sm:block" />
            </motion.div>

            {/* Main headline */}
            <motion.div {...fadeUp(0.10)}>
              <h1 className="text-display mb-1">
                <span className="block text-[2.4rem] sm:text-[3.2rem] lg:text-[3rem] xl:text-[3.4rem] text-white leading-[1.06]">
                  Компьютеры<br />и оборудование
                </span>
              </h1>
              <h1 className="text-display">
                <span className="block text-[2.4rem] sm:text-[3.2rem] lg:text-[3rem] xl:text-[3.4rem] text-white/40 leading-[1.06] mb-5">
                  в Ташкенте.
                </span>
              </h1>
            </motion.div>

            {/* Descriptor */}
            <motion.p {...fadeUp(0.16)} className="text-[14px] sm:text-[15px] text-white/52 leading-[1.7] max-w-lg mb-6 font-normal tracking-[-0.005em]">
              Игровые и рабочие ПК, мониторы 144–320&nbsp;Гц, ИБП&nbsp;Ion,
              Wi‑Fi&nbsp;роутеры и комплектующие. Гарантия и доставка по&nbsp;Узбекистану.
            </motion.p>

            {/* Category quick-access pills */}
            <motion.div {...fadeUp(0.22)} className="flex flex-wrap gap-1.5 mb-7">
              {hardwarePills.map((pill) => (
                <button
                  key={pill.label}
                  onClick={() => handleCategoryJump(pill.cat)}
                  className="px-3 py-1.5 rounded-md text-[11.5px] font-medium tracking-[-0.01em]
                    text-white/55 bg-[#0f1117] border border-white/[0.07]
                    hover:border-[#FF5A00]/40 hover:text-white/90 hover:bg-[#14171E]
                    transition-all duration-200"
                >
                  {pill.label}
                </button>
              ))}
            </motion.div>

            {/* Primary CTAs */}
            <motion.div {...fadeUp(0.28)} className="flex flex-col sm:flex-row gap-3 mb-9">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={scrollToCatalog}
                className="btn-primary text-[13px] h-11 px-6 rounded-lg shadow-[0_4px_24px_rgba(255,90,0,0.20)] hover:shadow-[0_4px_28px_rgba(255,90,0,0.35)]"
              >
                <span>Смотреть каталог</span>
                <ChevronDown className="w-4 h-4" />
              </motion.button>

              <motion.a
                whileTap={{ scale: 0.97 }}
                href={CONTACTS.TELEGRAM}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost text-[13px] h-11 px-6 rounded-lg"
              >
                <Send className="w-3.5 h-3.5 text-[#FF5A00]" />
                <span>Консультация</span>
              </motion.a>
            </motion.div>

            {/* Stats bar */}
            <motion.div {...fadeUp(0.34)}>
              <div className="pt-5 border-t border-white/[0.07] grid grid-cols-3 gap-4 sm:gap-6">
                {stats.map((s) => (
                  <div key={s.label}>
                    <div className="text-label mb-1.5">{s.label}</div>
                    <div className="text-data text-[13px] sm:text-[14px] font-bold text-white leading-none">
                      {s.value}
                      {s.unit && <span className="text-white/40 text-[10px] ml-1 font-normal">{s.unit}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* ── RIGHT: Hardware Display ───────────────── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            {/* Outer frame */}
            <div className="relative rounded-2xl overflow-hidden border border-white/[0.1] bg-[#0c0e14] shadow-[0_32px_80px_rgba(0,0,0,0.80)]">
              {/* Top reflection */}
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.18] to-transparent z-10 pointer-events-none" />

              {/* Frame header bar */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-[#0f1016]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#22c55e] status-dot-pulse" />
                  <span className="text-data text-[10px] text-white/35 tracking-[0.08em] uppercase">
                    ALFACOMP // HARDWARE-EXHIBIT
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-data text-[10px] text-white/25">TASHKENT</span>
                  <ArrowUpRight className="w-3 h-3 text-white/20" />
                </div>
              </div>

              {/* Main product image stage */}
              <div className="relative bg-[#08090c] flex items-center justify-center overflow-hidden"
                style={{ aspectRatio: "4/3" }}>
                {/* Radial spotlight */}
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: "radial-gradient(ellipse 80% 70% at 50% 50%, rgba(255,90,0,0.04) 0%, transparent 70%)" }}
                />
                <img
                  src={heroPcImage}
                  alt="Компьютерные системы AlfaComp"
                  className="w-full h-full object-contain p-6 sm:p-8 transition-transform duration-700 hover:scale-[1.03]"
                  loading="eager"
                />
              </div>

              {/* Bottom spec grid */}
              <div className="grid grid-cols-2 gap-px bg-white/[0.05] border-t border-white/[0.05]">
                {[
                  { label: "Дисплеи", value: "IPS · 144–320 Гц · 2K / 4K" },
                  { label: "Электропитание", value: "ИБП Ion Line-Interactive" },
                ].map((spec) => (
                  <div key={spec.label} className="bg-[#0f1117] px-3.5 py-2.5">
                    <div className="text-label mb-1">{spec.label}</div>
                    <div className="text-[11.5px] font-semibold text-white leading-tight tracking-[-0.01em]">
                      {spec.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating trust badges */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="absolute -bottom-4 -left-3 sm:-left-5 flex flex-col gap-1.5 pointer-events-none"
            >
              {[
                { icon: Shield, text: "Гарантия до 36 мес." },
                { icon: Truck, text: "Доставка 1 день" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg
                  bg-[#0f1117]/95 border border-white/[0.09] backdrop-blur-sm
                  shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
                  <Icon className="w-3 h-3 text-[#FF5A00] shrink-0" />
                  <span className="text-[11px] font-medium text-white/75 whitespace-nowrap">{text}</span>
                </div>
              ))}
            </motion.div>

            {/* SKU tag */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.7 }}
              className="absolute -top-2.5 -right-2.5 sm:-right-4 px-2.5 py-1 rounded-md
                bg-[#14171E] border border-white/[0.08]
                text-data text-[9px] text-white/30 tracking-[0.1em] uppercase pointer-events-none"
            >
              ORIGINAL HARDWARE
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
