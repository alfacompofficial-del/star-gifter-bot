import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import promoPcCleanImg from "@/assets/promo-pc-clean.webp";

const PromoBanner = () => {
  const scrollToCatalog = () => {
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="w-full max-w-[1540px] mx-auto px-4 sm:px-8 xl:px-12 py-3 sm:py-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[#0066ff]/25 shadow-[0_16px_50px_rgba(0,0,0,0.55)] bg-[#050c1b]"
      >
        {/* Ambient background glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-[#0066ff]/20 blur-3xl" />
          <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 rounded-full bg-[#0052cc]/15 blur-[100px]" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[280px] sm:min-h-[320px] lg:min-h-[340px]">
          {/* ── LEFT: Text & CTA Elements (HTML/CSS) ── */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col justify-center items-start text-left p-6 sm:p-9 lg:p-11 z-20">
            {/* Trust badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0066ff]/15 border border-[#0066ff]/35 mb-4 sm:mb-5 shadow-[0_0_15px_rgba(0,102,255,0.2)]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span className="text-[11px] sm:text-[12px] font-semibold text-[#7dd3fc] tracking-wide">
                Только оригинальная продукция
              </span>
            </div>

            {/* Headline */}
            <h2 className="text-2xl sm:text-3xl lg:text-[38px] font-extrabold text-white leading-[1.15] tracking-tight mb-3">
              Выгодные предложения{" "}
              <span className="text-[#38bdf8] sm:text-[#0080ff] block sm:inline">
                и топовые товары
              </span>
            </h2>

            {/* Description */}
            <p className="text-[13px] sm:text-[14.5px] text-white/70 leading-relaxed mb-6 max-w-[480px]">
              Официальная гарантия до 3 лет на компьютеры и комплектующие. Быстрая доставка по Ташкенту и всему Узбекистану.
            </p>

            {/* CTA Button */}
            <button
              onClick={scrollToCatalog}
              className="inline-flex items-center gap-2.5 px-6 sm:px-7 py-3 sm:py-3.5 rounded-xl bg-[#0066ff] hover:bg-[#1a75ff] text-white font-semibold text-[13px] sm:text-[14px] shadow-[0_8px_24px_rgba(0,102,255,0.4)] hover:shadow-[0_12px_32px_rgba(0,102,255,0.6)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              <span>Смотреть товары</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* ── RIGHT: Realistic High-End Gaming PC Photograph ── */}
          <div className="lg:col-span-6 xl:col-span-6 relative flex items-center justify-end overflow-hidden min-h-[220px] sm:min-h-[280px] lg:min-h-[340px]">
            <img
              src={promoPcCleanImg}
              alt="Игровой компьютер AlfaComp — выгодные предложения"
              className="w-full h-full object-cover object-center lg:object-right"
              loading="lazy"
            />
            {/* Smooth gradient blend into navy background on left side */}
            <div className="absolute inset-y-0 left-0 w-28 sm:w-48 bg-gradient-to-r from-[#050c1b] via-[#050c1b]/80 to-transparent pointer-events-none hidden lg:block" />
            {/* Top gradient on mobile so photo blends into content */}
            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#050c1b] to-transparent pointer-events-none lg:hidden" />
            {/* Bottom gradient */}
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#050c1b]/70 to-transparent pointer-events-none" />
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default PromoBanner;
