import { useRef } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import heroDeskImage from "@/assets/hero-desk-setup.png";
import heroDeskWebp from "@/assets/hero-desk-setup.webp";

interface HeroSectionProps {
  asSubheading?: boolean;
}

const HeroSection = ({ asSubheading = false }: HeroSectionProps) => {
  const sectionRef = useRef<HTMLElement>(null);

  const scrollToCatalog = () => {
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="home"
      ref={sectionRef}
      className="w-full max-w-[1540px] mx-auto px-4 sm:px-8 xl:px-12 pt-4 pb-6"
    >
      <div
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[#0066ff]/20 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
        style={{
          background: "linear-gradient(135deg, #050a16 0%, #071226 50%, #060b18 100%)",
        }}
      >
        {/* Ambient radial glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#0066ff]/20 blur-3xl" />
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[450px] h-[300px] rounded-full bg-[#0052cc]/15 blur-[100px]" />
          <div className="absolute -bottom-24 right-1/4 w-80 h-80 rounded-full bg-[#0070f3]/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[340px] sm:min-h-[380px]">
          {/* ── LEFT: Content (5 cols on lg) ── */}
          <div className="lg:col-span-6 flex flex-col justify-center items-start text-left p-6 sm:p-10 lg:p-12 z-20">
            {/* Category tag */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0066ff]/15 border border-[#0066ff]/35 mb-4 sm:mb-6 shadow-[0_0_15px_rgba(0,102,255,0.15)]"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span className="text-[12px] font-medium text-[#60a5fa] tracking-wide">
                Комплектующие для ПК
              </span>
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
            >
              {asSubheading ? (
                <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-white leading-[1.12] tracking-tight mb-4">
                  Собери свой<br />
                  <span className="text-[#0080ff] sm:text-[#38bdf8]">идеальный ПК</span>
                </h2>
              ) : (
                <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-white leading-[1.12] tracking-tight mb-4">
                  Собери свой<br />
                  <span className="text-[#0080ff] sm:text-[#38bdf8]">идеальный ПК</span>
                </h1>
              )}
            </motion.div>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.15 }}
              className="text-[14px] sm:text-[15px] text-white/60 leading-relaxed mb-6 sm:mb-8 max-w-[440px]"
            >
              Мощные комплектующие, проверенные бренды и профессиональная помощь в подборе
            </motion.p>

            {/* CTA Button */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.22 }}
              onClick={scrollToCatalog}
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-[#0066ff] hover:bg-[#1a75ff] text-white font-semibold text-[14px] shadow-[0_8px_28px_rgba(0,102,255,0.45)] hover:shadow-[0_10px_36px_rgba(0,102,255,0.6)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
            >
              <span>Перейти в каталог</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>

          {/* ── RIGHT: Panoramic Gaming PC Desk Setup Photo (6 cols on lg) ── */}
          <div className="lg:col-span-6 relative flex items-center justify-end overflow-hidden min-h-[260px] sm:min-h-[340px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="relative w-full h-full flex items-center justify-end"
            >
              <picture className="w-full h-full flex items-center justify-end">
                <source srcSet={heroDeskWebp} type="image/webp" />
                <img
                  src={heroDeskImage}
                  alt="Игровой компьютер и рабочее место AlfaComp"
                  className="w-full h-full object-cover object-right sm:object-center"
                  loading="eager"
                  width={1920}
                  height={1071}
                  // @ts-expect-error fetchpriority
                  fetchpriority="high"
                />
              </picture>
              {/* Left-edge smooth fade into dark navy */}
              <div className="absolute inset-y-0 left-0 w-24 sm:w-40 bg-gradient-to-r from-[#050a16] via-[#050a16]/70 to-transparent pointer-events-none" />
              {/* Bottom subtle fade */}
              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#050a16]/60 to-transparent pointer-events-none" />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
