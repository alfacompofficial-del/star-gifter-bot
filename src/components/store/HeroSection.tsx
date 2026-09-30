import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Send, Zap, ChevronRight, ShieldCheck } from "lucide-react";
import { CONTACTS } from "@/lib/constants";

import heroPcImage from "@/assets/hero-pc.png";

const HeroSection = () => {
  const scrollToCatalog = () => {
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
  };

  // 3D Parallax Tilt Effect
  const cardRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 220, damping: 25 });
  const mouseYSpring = useSpring(y, { stiffness: 220, damping: 25 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["14deg", "-14deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-14deg", "14deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / rect.width - 0.5;
    const yPct = mouseY / rect.height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <section id="home" className="min-h-screen flex flex-col justify-center pt-24 pb-8 relative overflow-hidden mesh-bg">
      {/* Living animated glow effects */}
      <motion.div
        animate={{
          x: [0, 30, -25, 0],
          y: [0, -35, 20, 0],
          scale: [1, 1.12, 0.95, 1],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 right-0 w-[320px] sm:w-[550px] h-[320px] sm:h-[550px] bg-[#00f2ff]/15 rounded-full blur-[130px] pointer-events-none"
      />
      <motion.div
        animate={{
          x: [0, -35, 25, 0],
          y: [0, 30, -25, 0],
          scale: [1, 0.92, 1.15, 1],
        }}
        transition={{ duration: 17, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-12 left-1/4 w-[280px] sm:w-[480px] h-[280px] sm:h-[480px] bg-[#ff0080]/15 rounded-full blur-[120px] pointer-events-none"
      />

      <div className="container relative z-10 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 sm:gap-10 lg:gap-8 items-center">
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.8, 0.25, 1] }}
            className="order-2 lg:order-1"
          >
            <motion.div 
              whileHover={{ scale: 1.03 }}
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full glass border-[#00f2ff]/30 mb-5 sm:mb-8 shadow-[0_0_15px_rgba(0,242,255,0.15)] cursor-default"
            >
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00f2ff] animate-pulse" />
              <span className="text-[11px] sm:text-sm font-bold text-white/90">Официальный поставщик в Узбекистане</span>
            </motion.div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-5 sm:mb-8">
              Создай свою <br />
              <span className="relative inline-block mt-2">
                <span className="absolute -inset-2 bg-gradient-to-r from-[#00f2ff]/40 via-[#9d00ff]/30 to-[#ff0080]/40 blur-2xl opacity-60"></span>
                <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-[#00f2ff] via-[#00c8ff] to-[#ff0080]">Мечту</span>
              </span>
            </h1>
            
            <p className="text-sm sm:text-base lg:text-lg text-white/60 mb-7 sm:mb-10 max-w-xl leading-relaxed font-medium">
              Eng zo'r kompyuterlar, monitorlar, UPS, Wi-Fi routerlar va elektronikalar. 
              Премиальная электроника — мониторы 144–320 Гц, Wi-Fi 6/7, SSD NVMe, мощные видеокарты с официальной гарантией.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8 sm:mb-12">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={scrollToCatalog}
                className="group flex items-center justify-center gap-2 bg-gradient-to-r from-[#00f2ff] to-[#009dff] text-black px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-black text-sm sm:text-base transition-all shadow-[0_0_25px_rgba(0,242,255,0.3)] hover:shadow-[0_0_40px_rgba(0,242,255,0.55)]"
              >
                В каталог товаров
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1.5 transition-transform" />
              </motion.button>
              
              <motion.a
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                href={CONTACTS.TELEGRAM}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 glass px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-bold text-sm sm:text-base hover:bg-white/10 hover:border-white/25 transition-all group shadow-sm hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
              >
                <Send className="w-4 h-4 sm:w-5 sm:h-5 text-[#00f2ff] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                Связаться в TG
              </motion.a>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-6 pt-5 sm:pt-6 border-t border-white/10">
              {[
                { value: "80+", label: "Товаров" },
                { value: "1–3 Года", label: "Гарантия" },
                { value: "24/7", label: "Поддержка" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-xl sm:text-2xl lg:text-3xl font-black text-white">{s.value}</div>
                  <div className="text-[10px] sm:text-xs font-semibold text-[#00f2ff] uppercase tracking-wider mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, rotate: -3 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.25, 0.8, 0.25, 1] }}
            className="order-1 lg:order-2 relative"
            style={{ perspective: 1200 }}
          >
            {/* Decorative background elements behind image */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#00f2ff]/25 to-[#ff0080]/25 rounded-3xl blur-2xl transform rotate-6 scale-105 pointer-events-none" />
            
            <motion.div 
              ref={cardRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
              }}
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="group relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/15 bg-card/60 backdrop-blur-md p-2 sm:p-4 shadow-2xl shadow-black/80 cursor-pointer select-none transition-shadow duration-300 hover:shadow-[0_20px_60px_rgba(0,242,255,0.22)]"
            >
              {/* 3D Floating Badge 1 - Original */}
              <div 
                style={{ transform: "translateZ(50px)" }}
                className="absolute top-4 right-4 sm:top-8 sm:right-8 z-20 flex items-center gap-1.5 sm:gap-2 bg-black/80 backdrop-blur-md border border-[#00f2ff]/30 text-white px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-sm font-bold shadow-[0_8px_20px_rgba(0,0,0,0.6)]"
              >
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00f2ff]" />
                Оригинал 100%
              </div>
              
              {/* 3D Depth Image */}
              <div style={{ transform: "translateZ(20px)" }} className="relative overflow-hidden rounded-xl sm:rounded-2xl">
                <img
                  src={heroPcImage}
                  alt="Premium PC Setup"
                  className="w-full h-auto rounded-xl sm:rounded-2xl object-cover aspect-[4/3] transform transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              
              {/* 3D Floating Badge 2 - Best Seller */}
              <div 
                style={{ transform: "translateZ(55px)" }}
                className="absolute bottom-4 left-4 sm:bottom-8 sm:left-8 z-20 glass px-3 sm:px-6 py-2 sm:py-4 rounded-xl sm:rounded-2xl border-white/20 shadow-[0_12px_30px_rgba(0,0,0,0.6)]"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-[#ff0080] to-purple-600 flex items-center justify-center text-white font-black text-base sm:text-xl shadow-lg shadow-[#ff0080]/40">
                    🔥
                  </div>
                  <div>
                    <div className="text-[9px] sm:text-xs font-bold text-white/60 uppercase tracking-wider mb-0.5 sm:mb-1">Хит продаж</div>
                    <div className="text-sm sm:text-lg font-black text-white">Игровые сборки</div>
                  </div>
                </div>
              </div>

              {/* Dynamic Glare light reflection on hover */}
              <div
                className="pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30"
                style={{
                  background: "radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.12) 0%, transparent 65%)",
                }}
              />
            </motion.div>
          </motion.div>
          
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
